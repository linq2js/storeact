import { useRef, useEffect, useState } from "react";
const refHook = useRef;
const defaultSelector = (store) => store;
export default (...args) =>
  isHookEnabled() ? useStore(...args) : initStore(...args);
function initStore(store) {
  if (store.__instance) return store.__instance;
  const observers = [];
  const instance = {};
  const listeners = {};
  const listenersOf = (event) => listeners[event] || (listeners[event] = []);
  const api = {
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
      return addListner(list, listener);
    },
    all(...events) {
      return new Promise((resolve) => {
        let count = 0;
        const results = [];
        events.forEach((event, index) => {
          const removeListener = api.on(event, (result) => {
            removeListener();
            results[index] = result;
            count++;
            if (count === events.length) resolve(results);
          });
          return removeListener;
        });
      });
    },
    any(...events) {
      return new Promise((resolve) => {
        const removeListeners = events.map((event) =>
          api.on(event, (result) => {
            removeListeners.forEach((x) => x());
            resolve([result, event]);
          })
        );
      });
    },
  };
  const { init, state, ...methods } = store(api);
  let currentState;
  instance.subscribe = (observer) => addListner(observers, observer);
  function update() {
    const nextState = state();
    if (!currentState) {
      currentState = nextState;
      Object.assign(instance, currentState);
    } else if (objectDiff(currentState, nextState)) {
      currentState = nextState;
      // notify change
      Object.assign(instance, currentState);
      observers.forEach((observer) => observer(instance));
    }
  }
  Object.entries(methods).forEach(([key, method]) => {
    instance[key] = function () {
      const payload = arguments[0];
      let isAsync = true;
      try {
        const result = method(...arguments);
        if (result && typeof result.then === "function")
          return result.finally(() => {
            update();
            api.emit(key, payload);
          });
        isAsync = false;
        return result;
      } finally {
        update();
        !isAsync && api.emit(key, payload);
      }
    };
  });
  init && init();
  update();
  return (store.__instance = instance);
}
function addListner(list, listener) {
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
      if (
        next === data.prev ||
        (typeof next === "object" &&
          typeof data.prev === "object" &&
          !objectDiff(data.prev, next))
      )
        return;
    } catch (e) {
      data.error = e;
    }
    data.rerender({});
  };
  useEffect(() => () => void (data.unmount = true), [data]);
  useEffect(() => instance.subscribe(data.onChange), [data, instance]);
  if (data.error) throw data.error;
  return (data.prev = data.selector(instance));
}
function objectDiff(a, b) {
  const comparer = (key) => a[key] !== b[key];
  return Object.keys(a).some(comparer) || Object.keys(b).some(comparer);
}
function isHookEnabled() {
  try {
    return refHook(true).current;
  } catch (e) {
    return false;
  }
}
