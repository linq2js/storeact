import { useEffect, useRef, useState } from "react";
import initStore from "./initStore";
import isEqual from "./isEqual";
import isPromiseLike from "./isPromiseLike";
import createLoadable from "./createLoadable";
import { atomType } from "./types";

const defaultSelector = (store) => store;

export default function useStore(definition, selector = defaultSelector) {
  const store = initStore(definition);
  const data = useRef({}).current;
  data.store = store;
  data.rerender = useState(undefined)[1];
  if (!data.handleChange) {
    data.handleChange = () => {
      if (data.unmount) return;
      const hasError = data.error;
      delete data.error;
      try {
        const next = data.selector();

        if (hasError) {
          // should re-render if previous rendering has an error
        } else if (isEqual(data.prev, next)) {
          return;
        }
      } catch (e) {
        data.error = e;
      }
      data.rerender({});
    };
  }

  data.selector = createSelector(data, selector);
  data.effect = () => {
    // do not handleChange if user selects store object
    if (data.prev === definition.__store) return;
    return store.subscribe(data.handleChange);
  };
  useEffect(() => () => void (data.unmount = true), [data]);
  useEffect(() => data.effect(), [data, store]);
  if (data.error) throw data.error;
  data.prev = data.selector();
  return data.prev;
}

function createSelector(data, selector) {
  if (data.prevSelector === selector) return data.selectorWrapper;
  data.prevSelector = selector;
  const loadableListeners = [];
  const handledLoadables = new Set();

  const context = {
    value: getValue,
    loadable: getLoadable,
  };

  function getLoadable(value) {
    if (value && value.type === atomType) {
      value = value.promise;
    }
    if (isPromiseLike(value)) {
      const loadable = createLoadable(value);
      if (!handledLoadables.has(value)) {
        handledLoadables.add(value);
        loadableListeners.push(
          loadable.onDone(() => {
            data.handleChange();
          })
        );
      }
      return loadable;
    }
    return {
      state: "hasValue",
      value,
    };
  }

  function getValue(value, defaultValue) {
    if (value && value.type === atomType) {
      if (value.state === "hasValue") return value.value;
      value = value.promise;
    }

    if (isPromiseLike(value)) {
      const loadable = getLoadable(value);
      if (arguments.length > 1) return loadable.tryGetValue(defaultValue);
      if (loadable.state === "loading") {
        throw loadable.promise;
      }
      if (loadable.state === "hasError") {
        throw loadable.error;
      }
      return loadable.value;
    }
    return value;
  }

  return (data.selectorWrapper = function () {
    // remove previous loadable listeners
    loadableListeners.forEach((x) => x());
    handledLoadables.clear();
    return selector(data.store, context);
  });
}
