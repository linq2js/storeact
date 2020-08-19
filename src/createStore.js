import createActionFlow from "./createActionFlow";
import createStoreApi from "./createStoreApi";
import { boundActionType } from "./types";
import uniScope from "./uniScope";
import isEqual from "./isEqual";
import isPromiseLike from "./isPromiseLike";
import { noop, unset } from "./types";
import { initScopeName, dispatchScopeName } from "./scopeNames";

export default function createStore(definition, args) {
  const parents = new Set();
  const { fireOnChange, fireOnDispatch, ...storeApi } = createStoreApi({
    parents,
    forceUpdate: callUpdate,
  });

  const store = uniScope(initScopeName, (scope) => {
    scope.parents = parents;
    scope.api = storeApi;
    scope.update = update;
    return definition(...args);
  });
  const {
    state = noop,
    flow: flowFactory,
    onChange,
    onDispatch,
    ...actions
  } = store;
  const flowDefinition =
    typeof flowFactory === "function" ? flowFactory() : flowFactory;
  const flow = flowDefinition ? createActionFlow(flowDefinition) : undefined;
  let currentState = unset;

  if (onChange) {
    storeApi.onChange(() => onChange(currentState));
  }
  if (onDispatch) {
    // we remove store instance to avoid circular dispatching
    storeApi.onDispatch(({ action, payload, args }) =>
      onDispatch({ action: action.displayName, payload, args })
    );
  }

  parents.forEach((parent) => {
    parent.onChange(update);
  });

  if (typeof state !== "function") {
    throw new Error("State method must be function");
  }

  Object.assign(store, {
    ...storeApi,
  });

  function forceUpdate() {
    return update(true);
  }

  function callUpdate(...functions) {
    if (functions[0] === true) {
      return update(true);
    }
    if (!functions.length) {
      return update();
    }
    return uniScope(
      dispatchScopeName,
      () => {
        const result = functions.reduce((prev, current) => {
          if (!current) return prev;
          if (isPromiseLike(prev)) {
            return prev.finally(current);
          }
          return current();
        }, undefined);
        if (isPromiseLike(result)) {
          return result.finally(update);
        }
        return result;
      },
      update
    );
  }

  function shouldUpdate(force) {
    const scope = uniScope(dispatchScopeName);

    if (scope) {
      if (!scope.updates) {
        scope.updates = new Set();
        scope.onDispose = runAllUpdates;
      }
      scope.updates.add(force ? forceUpdate : update);
      return false;
    }
    return true;
  }

  function update(force) {
    if (!shouldUpdate(force)) {
      return;
    }

    const nextState = state();
    // if (currentState === unset) {
    //   currentState = nextState;
    //   return;
    // }

    // if (force !== true) {
    //   if (currentState !== unset && isEqual(nextState, currentState)) {
    //     return;
    //   }
    // }
    currentState = nextState;
    fireOnChange(store);
  }

  Object.entries(actions).forEach(([actionName, originalAction]) => {
    let lastResult;
    let locked = false;
    let lockOwner;
    const invoke = (...inputArgs) => {
      fireOnDispatch({
        action: boundAction,
        payload: inputArgs[0],
        args: inputArgs,
        store,
      });
      return callUpdate(
        () => (lastResult = originalAction.apply(store, inputArgs))
      );
    };
    const boundAction = (...inputArgs) => {
      if (locked) return lastResult;
      if (flow) {
        flow.dispatch({ action: actionName, invoke, args: inputArgs });
        return lastResult;
      }
      return invoke(...inputArgs);
    };
    Object.assign(boundAction, {
      type: boundActionType,
      displayName: actionName,
      lock(owner) {
        locked = true;
        lockOwner = owner;
      },
      unlock(owner) {
        if (!owner || lockOwner === owner) {
          locked = false;
        }
      },
    });
    store[actionName] = boundAction;
  });

  Object.defineProperties(store, {
    state: {
      get() {
        if (uniScope(dispatchScopeName)) {
          throw new Error("Cannot access state inside action dispatching");
        }

        // lazy computing state
        if (currentState === unset) {
          currentState = state();
        }

        return currentState;
      },
    },
  });

  if (store.init) {
    store.init();
    delete store.init;
  }

  return store;
}

function runAllUpdates({ updates }) {
  updates.forEach((update) => update());
}
