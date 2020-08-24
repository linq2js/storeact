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

let currentContext;

export function getStoreContext() {
  return currentContext;
}

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
  let error;
  let shouldUpdateAfterInit = false;
  let runningActions = 0;
  let loading = false;

  try {
    currentContext = context;
    instance = definition(context, options) || {};
  } finally {
    currentContext = undefined;
  }
  let state = instance.state || noop;

  if (typeof instance.handleChange === "function") {
    emitter.on("change", instance.handleChange);
  }
  if (typeof instance.handleDispatch === "function") {
    emitter.on("dispatch", instance.handleDispatch);
  }
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
    get busy() {
      shouldUpdateAfterInit = true;
      return !!runningActions;
    },
    get loading() {
      shouldUpdateAfterInit = true;
      return loading;
    },
    get error() {
      shouldUpdateAfterInit = false;
      return error;
    },
    subscribe: emitter.get("update").on,
    onChange,
  };
  let updateCount = 0;

  function detectChange() {
    if (!emitter.has("change")) return;
    const nextState = getState();
    if (prevState === unset) {
      prevState = nextState;
      return;
    }
    if (isEqual(prevState, nextState)) {
      return;
    }
    emitter.emit("change", { store, state: nextState, prevState });
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
  }

  function update(func, onFinally) {
    cachedState = unset;
    let isAsync = false;
    try {
      updateCount++;
      if (typeof func === "function") {
        const result = func();
        if (isPromiseLike(result)) {
          isAsync = true;
          return result.finally(() => {
            onFinally && onFinally();
            updateWithDebounce();
          });
        }
        return result;
      }
    } finally {
      updateCount--;
      if (!isAsync && onFinally) {
        onFinally();
      }
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
    let runningInstances = 0;
    const wrappedAction = (payload, parentTask) => {
      if (task) {
        const lock = task.lock();
        if (lock !== unset) return lock;
      }

      return update(
        () => {
          runningInstances++;
          runningActions++;
          task = createTask({
            prevTask: task,
            parentTask,
            subscribe,
            update,
          });
          try {
            task.onCancel(() => {
              runningInstances--;
              runningActions--;
            });
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
        },
        () => {
          if (task.cancelled()) return;
          runningInstances--;
          runningActions--;
        }
      );
    };
    wrappedAction.type = actionType;
    wrappedAction.displayName = propName;
    Object.defineProperty(wrappedAction, "running", {
      get() {
        return !!runningInstances;
      },
    });
    store[propName] = isPrivate ? accessDenied : wrappedAction;
    instance[propName] = wrappedAction;
  });

  if (store.init) {
    const initResult = store.init(unset);
    if (isPromiseLike(initResult)) {
      loading = true;
      initResult.finally(() => {
        loading = false;
        shouldUpdateAfterInit && update();
      });
    }
    delete store.init;
  }

  return store;
}

function accessDenied() {
  throw new Error("Cannot access private action or property");
}
