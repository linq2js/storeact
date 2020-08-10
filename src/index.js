import { useRef, useEffect, useState } from "react";
const refHook = useRef;
const defaultSelector = (store) => store;
export default (store, selector) =>
  isHookEnabled() ? useStore(store, selector) : initStore(store);

function initStore(store) {
  if (store.__instance) return store.__instance;
  let dispatchingScopes = 0;
  let hasChange = false;
  const onChange = [];
  const listeners = {};
  const listenersOf = (event) => listeners[event] || (listeners[event] = []);
  const context = {
    loader() {
      let unsubscribe;
      const loader = new Loader(() => unsubscribe && unsubscribe());
      unsubscribe = loader.subscribe(update);
      return loader;
    },
    use(parentStore) {
      const isArray = Array.isArray(parentStore);
      const parentStores = isArray ? parentStore : [parentStore];
      const parents = parentStores.map((x) => {
        const parent = initStore(x);
        parent.subscribe(update);
        return parent;
      });
      return isArray ? parents : parents[0];
    },
    emit(event, data) {
      const list = listenersOf(event);
      list.forEach((listener) => listener(data));
    },
    on(event, listener) {
      if (typeof event.then === "function") {
        let cancelled = false;
        event.then((result) => {
          !cancelled && listener(result);
        });
        return () => (cancelled = true);
      }
      const list = listenersOf(event);
      return addListener(list, listener);
    },
    chain: (...events) =>
      new Promise((resolve) => {
        let index = 0;
        const results = [];
        const removeListener = context.on("*", ({ action, payload }) => {
          if (action !== events[index]) return;
          results[index] = payload;
          index++;
          if (index < events.length) return;
          removeListener();
          resolve(results);
        });
      }),
    all: (...events) =>
      new Promise((resolve) => {
        let count = 0;
        const results = [];
        events.forEach((event, index) => {
          const removeListener = context.on(event, (result) => {
            removeListener();
            results[index] = result.payload;
            count++;
            if (count === events.length) resolve(results);
          });
          return removeListener;
        });
      }),
    any: (...events) =>
      new Promise((resolve) => {
        const removeListeners = events.map((event) =>
          context.on(event, (result) => {
            removeListeners.forEach((x) => x());
            resolve([result.payload, result.action]);
          })
        );
      }),
  };
  const instance = (context.actions = store(context));
  const { init, state, hooks, ...methods } = instance;
  let currentState = state();
  instance.subscribe = (observer) => addListener(onChange, observer);
  function update() {
    const nextState = state();
    if (!isEqual(currentState, nextState)) {
      currentState = nextState;
      if (dispatchingScopes) {
        hasChange = true;
      } else {
        onChange.forEach((observer) => observer(instance));
      }
    }
  }
  Object.entries(methods).forEach(([action, method]) => {
    instance[action] = function () {
      const payload = arguments[0];
      let isAsync = true;
      try {
        dispatchingScopes++;
        const result = method.apply(instance, arguments);
        if (result && typeof result.then === "function")
          return result.finally(() => {
            update();
            context.emit(action, { action, payload });
            context.emit("*", { action, payload });
          });
        isAsync = false;
        return result;
      } finally {
        try {
          update();
        } finally {
          dispatchingScopes--;
          if (hasChange && !dispatchingScopes) {
            hasChange = false;
            onChange.forEach((observer) => observer(instance));
          }
        }
        if (!isAsync) {
          context.emit(action, { action, payload });
          context.emit("*", { action, payload });
        }
      }
    };
  });
  delete instance.init;
  delete instance.state;
  Object.defineProperty(instance, "state", { get: () => currentState });
  init && init();
  update();
  Object.assign(instance, context);
  return (store.__instance = instance);
}
function addListener(list, listener) {
  list.push(listener);
  return () => {
    const index = list.indexOf(listener);
    index !== -1 && list.splice(index, 1);
  };
}
function useStore(store, selector) {
  const instance = initStore(store);
  const data = useRef({}).current;
  data.selector = selector || defaultSelector;
  data.rerender = useState()[1];
  data.onChange = () => {
    if (data.unmount) return;
    delete data.error;
    try {
      const next = data.selector(instance);
      if (isEqual(data.prev, next)) return;
    } catch (e) {
      data.error = e;
    }
    data.rerender({});
  };
  data.effect = () => {
    if (data.prev === store.__instance) return;
    return instance.subscribe(data.onChange);
  };
  useEffect(() => () => void (data.unmount = true), [data]);
  useEffect(data.effect, [data, instance]);
  if (data.error) throw data.error;
  return (data.prev = data.selector(instance));
}
function isEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const comparer = (key) => a[key] === b[key];
  return Object.keys(a).every(comparer) && Object.keys(b).every(comparer);
}
function isHookEnabled() {
  try {
    return refHook(true).current;
  } catch (e) {
    return false;
  }
}
class Loader {
  constructor(onDetach) {
    this.loadable = { state: "hasValue", value: undefined, error: undefined };
    this.onChange = [];
    this._onDetach = onDetach;
    this.subscribe = (observer) => {
      return addListener(this.onChange, observer);
    };
  }
  _update(state, value, error) {
    const loadable = this.loadable;
    if (
      state === loadable.state &&
      value === loadable.value &&
      error === loadable.error
    )
      return;
    this.loadable = new Loadable(this, state, value, error);
    this.onChange.forEach((x) => x(this.loadable));
  }
  detach() {
    this._onDetach && this._onDetach();
    return this;
  }
  get ready() {
    const loadable = this.loadable;
    if (loadable.state === "loading")
      return new Promise((resolve, reject) => {
        const unsubscribe = this.subscribe((currentLoadable) => {
          unsubscribe();
          currentLoadable.state === "hasError"
            ? reject(currentLoadable.error)
            : resolve(currentLoadable.value);
        });
      });
    return loadable.state === "hasError"
      ? Promise.reject(loadable.error)
      : Promise.resolve(loadable.value);
  }
  cancel() {
    delete this._token;
    return this;
  }
  load(targets) {
    const isArray = Array.isArray(targets);
    !isArray && (targets = [targets]);
    let doneCount = false;
    const results = [];
    const token = (this._token = {});
    const unsubscribes = [];
    const unsubscribeAll = () => unsubscribes.forEach((x) => x());
    this._update("loading");
    targets.forEach((target, index) => {
      const handleSuccess = (result) => {
        if (token !== this._token) return;
        doneCount++;
        results[index] = result;
        if (doneCount === targets.length) {
          delete this._token;
          unsubscribeAll();
          this._update("hasValue", isArray ? results : results[0]);
        }
      };
      const handleError = (error) => {
        if (token !== this._token) return;
        delete this._token;
        unsubscribeAll();
        this._update("hasError", undefined, error);
      };
      if (target && typeof target.then === "function") {
        target.then((result) => handleSuccess(result), handleError);
      } else if (target instanceof Loadable || target instanceof Loader) {
        unsubscribes.push(
          target.subscribe((loadable) => {
            if (loadable.state === "hasError") {
              handleError(loadable.error);
            } else {
              handleSuccess(loadable.value);
            }
          })
        );
      }
    });
    return this;
  }
}
class Loadable {
  constructor(loader, state, value, error) {
    this.state = state;
    this.value = value;
    this.error = error;
    this._loader = loader;
  }

  get $value() {
    if (this.state === "hasError") throw this.error;
    if (this.state === "hasValue") return this.value;
    throw this._loader.ready;
  }

  get subscribe() {
    return this._loader.subscribe;
  }
}
