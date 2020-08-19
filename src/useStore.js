import { useEffect, useRef, useState } from "react";
import createLoadable from "./createLoadable";
import initStore from "./initStore";
import isEqual from "./isEqual";
import isPromiseLike from "./isPromiseLike";
import { asyncValueType } from "./types";
import createEmitter from "./createEmitter";

const defaultSelector = (store) => store;
const loadableType = () => {};

export default function useStore(definition, selector) {
  const store = initStore(definition);
  const data = useRef({}).current;
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

  data.selector = createSelector(store, selector, data.handleChange);
  data.effect = () => {
    if (data.prev === definition.__instance) return;
    return store.onChange(data.handleChange);
  };
  useEffect(() => () => void (data.unmount = true), [data]);
  useEffect(data.effect, [data, store]);
  if (data.error) throw data.error;
  data.prev = data.selector();
  return data.prev;
}

function createSelector(store, selector = defaultSelector, fireStateChange) {
  function loadableOf(input) {
    if (!input) {
      throw new Error("promise is required. ");
    }

    if (input.type === asyncValueType) {
      input = input.promise;
    }

    if (!isPromiseLike(input)) {
      throw new Error("promise is required. ");
    }

    let loadable = input.__loadable;
    if (!loadable) {
      loadable = createLoadable(input);
    }
    loadable.onChange(fireStateChange);
    return loadable;
  }

  function valueOf(input, defaultValue) {
    const loadable = loadableOf(input);
    if (loadable.state === "loading") {
      if (arguments.length > 1) return defaultValue;
      throw loadable.promise;
    }
    if (loadable.state === "hasError") throw loadable.error;
    return loadable.value;
  }

  return () => {
    store.valueOf = valueOf;
    store.loadableOf = loadableOf;
    try {
      return selector(store);
    } finally {
      // rollback extensions
      delete store.valueOf;
      delete store.loadableOf;
    }
  };
}
