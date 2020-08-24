import isEqual from "./isEqual";
import { add, all, use } from "./module";
import taskModule from "./taskModule";
import isPromiseLike from "./isPromiseLike";
import createEmitter from "./createEmitter";
import { noop, unset, actionType } from "./types";
import createTask from "./createTask";
import cacheModule from "./cacheModule";
import atomModule from "./atomModule";

add("task", taskModule);
add("cache", cacheModule);
add("atom", atomModule);

export let currentContext;

export default function createStore(definition, options) {
  const emitter = createEmitter();
  const onChange = emitter.get("change").on;
  const moduleEntries = Object.entries(all());
  const context = {
    update,
    subscribe,
    onChange,
  };
  const moduleContext = {
    subscribe,
    update,
  };
  moduleEntries.forEach(([key, module]) => {
    context[key] = use(module, moduleContext);
  });
  let cachedState = unset;
  let lastUpdater;
  let currentState = unset;
  let prevState = unset;
  let vars = {};
  let instance;

  try {
    currentContext = context;
    instance = definition(context, options) || {};
  } finally {
    currentContext = undefined;
  }
  let state = instance.state || noop;
  const handleDispatch = instance.handleDispatch || noop;
  const handleChange = instance.handleChange;
  // remove special methods to prevent direct calls from outside store
  delete instance.state;
  delete instance.handleDispatch;
  delete instance.handleChange;
  const storePropNames = Object.keys(instance);

  if (typeof state !== "function") {
    vars = state;
    const props = Object.keys(vars);
    state = () => {
      const result = {};
      props.forEach((prop) => (result[prop] = vars[prop]));
      return result;
    };
    Object.defineProperty(instance, "state", {
      get: () => {
        return vars;
      },
    });
  } else {
    Object.defineProperty(instance, "state", {
      get: getState,
    });
  }

  const store = {
    get state() {
      return getState();
    },
    subscribe: emitter.get("update").on,
    onChange,
  };
  let updateCount = 0;

  function detectChange() {
    if (!handleChange || !emitter.has("change")) return;
    const nextState = getState();
    if (prevState === unset) {
      prevState = nextState;
      return;
    }
    if (isEqual(prevState, nextState)) {
      return;
    }
    const args = { store, prevState };
    handleChange && handleChange.call(instance, args);
    emitter.emit("change", { store, prevState });
  }

  function getState() {
    if (currentState === unset) {
      currentState = state();
    }
    return currentState;
  }

  function subscribe(subscription) {
    return emitter.on("dispatch", subscription);
  }

  function dispatch(action, payload) {
    const args = { action, payload, store };
    emitter.emit("dispatch", args);
    action !== "init" && handleDispatch(args);
  }

  function update(func) {
    cachedState = unset;
    try {
      updateCount++;
      if (typeof func === "function") {
        const result = func();
        if (isPromiseLike(result)) {
          return result.then(updateWithDebounce);
        }
        return result;
      }
    } finally {
      updateCount--;
      if (!updateCount) {
        currentState = unset;
        detectChange();
        emitter.emit("update", { store });
      }
    }
  }

  function updateWithDebounce() {
    lastUpdater && (lastUpdater.cancelled = true);
    const updater = () => !updater.cancelled && update();
    lastUpdater = updater;
    Promise.resolve().then(updater);
  }

  storePropNames.forEach((propName) => {
    const invoke = instance[propName];
    const isPrivate = propName.charAt(0) === "_" || propName.charAt(0) === "$";
    // non functional prop
    if (typeof invoke !== "function") {
      Object.defineProperty(store, propName, {
        get: isPrivate ? accessDenied : () => instance[propName],
      });
      return;
    }

    let task;

    const wrappedAction = (payload, parentTask) => {
      if (task) {
        const lock = task.lock();
        if (lock !== unset) return lock;
      }

      return update(() => {
        task = createTask({
          prevTask: task,
          parentTask,
          subscribe,
          update,
        });
        try {
          const args =
            payload === unset ? [task, instance] : [payload, task, instance];
          const result = invoke.apply(instance, args);
          if (typeof result === "function") {
            return result(instance);
          }
          return result;
        } finally {
          dispatch(propName, payload);
        }
      });
    };
    wrappedAction.type = actionType;
    wrappedAction.displayName = propName;
    store[propName] = isPrivate ? accessDenied : wrappedAction;
    instance[propName] = wrappedAction;
  });

  if (store.init) {
    store.init(unset);
    delete store.init;
  }

  return store;
}

function accessDenied() {
  throw new Error("Cannot access private action or property");
}
