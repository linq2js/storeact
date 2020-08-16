import createActionFlow from "./createActionFlow";
import createStoreApi from "./createStoreApi";
import { boundActionType } from "./types";
import uniScope from "./uniScope";
import isEqual from "./isEqual";
import isPromiseLike from "./isPromiseLike";
import { noop, unset } from "./types";
import { initScopeName, dispatchScopeName } from "./scopeNames";

export default function createStore(definition, args) {
  const { fireOnChange, fireOnDispatch, ...storeApi } = createStoreApi({
    forceUpdate,
  });
  const store = uniScope(initScopeName, (scope) => {
    scope.api = storeApi;
    scope.update = update;
    return definition(...args);
  });
  const { state = noop, flow: flowFactory, ...actions } = store;
  const flowDefinition =
    typeof flowFactory === "function" ? flowFactory() : flowFactory;
  const flow = flowDefinition ? createActionFlow(flowDefinition) : undefined;
  let currentState = unset;

  if (typeof state !== "function") {
    throw new Error("State method must be function");
  }

  Object.assign(store, {
    ...storeApi,
  });

  function forceUpdate(...functions) {
    if (!functions.length) {
      update();
      return;
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

  function update() {
    const scope = uniScope(dispatchScopeName);

    if (scope) {
      if (!scope.updates) {
        scope.updates = new Set();
        scope.onDispose = runAllUpdates;
      }
      scope.updates.add(update);
      return;
    }

    const nextState = state();
    if (currentState === unset) {
      currentState = nextState;
      return;
    }

    if (isEqual(nextState, currentState)) {
      return;
    }
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
        store,
      });
      return forceUpdate(
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
