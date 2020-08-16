import isPromiseLike from "./isPromiseLike";
import { noop, unset } from "./types";

const anyMatcher = () => true;
const rootId = "#";

export default function createActionFlow(rootFlow) {
  const flowMap = {};
  let currentFlows = new Set();
  let isDispatching = false;
  let lastState = unset;
  const { onDispatch } = rootFlow.$options || {};
  delete rootFlow.$options;

  function findFlow(id) {
    if (id === rootId) return rootFlow;
    if (id in flowMap) return flowMap[id];
    throw new Error("Cannot find sub flow " + id);
  }

  function normalizeFlow(originalFlow, name) {
    const {
      $id,
      $then,
      $fork = true,
      $block = true,
      $cancel,
      $debounce,
      $state,
      ...props
    } = originalFlow;
    const result = {
      id: $id,
      name,
      fork: $fork,
      block: $block,
      hasChild: false,
      children: [],
      debounce: $debounce,
      state: $state,
      cancel: $cancel
        ? (Array.isArray($cancel) ? $cancel : [$cancel]).map((key) =>
            createEmptyFlow({
              name: key,
              match: createMatcher(key),
            })
          )
        : undefined,
    };
    Object.entries(props).forEach(([key, value]) => {
      if (typeof value !== "object") {
        throw new Error("Invalid sub flow. " + typeof value);
      }
      result.hasChild = true;
      let child;
      // create flow chain
      if (/^chain:/.test(key)) {
        let lastKey;
        const keys = key
          .substr(6)
          .split(">")
          .map((x) => x.trim());
        key = keys.shift();
        const f = keys.reduceRight((prev, key) => {
          lastKey = key;
          return { [key]: prev };
        }, value);
        child = normalizeFlow(f, key);
        child.match = createMatcher(key);
      } else {
        child = normalizeFlow(value, key);
        child.match = createMatcher(key);
      }

      result.children.push(child);
    });

    if ($id) {
      flowMap[$id] = result;
    }

    if ($then) {
      if (typeof $then === "function") {
        result.then = (...args) => {
          const thenResult = $then(...args);
          if (typeof thenResult === "string") {
            return findFlow(thenResult);
          }
          return normalizeFlow(thenResult);
        };
      } else if (typeof $then === "string") {
        result.then = () => findFlow($then);
      } else if (typeof $then === "object") {
        result.then = () => $then;
      } else {
        throw new Error("Invalid $then " + typeof $then);
      }
    }

    return result;
  }

  rootFlow = normalizeFlow(rootFlow, "#root");

  function processFlow(flow, options, addFlow, removeFlow) {
    // clear previous timer if any
    if (flow.onProcess) {
      flow.onProcess(options);
    }

    const { action, invoke = noop, args = [] } = options;

    flow.children.forEach((childFlow) => {
      if (!childFlow.match(action)) return;

      if (flow.onMatch) {
        flow.onMatch(childFlow);
      }
      let cancelled = false;

      function execute() {
        if (cancelled) return;

        if (onDispatch) {
          onDispatch(childFlow);
        }

        const result = invoke(...args);
        const isPromise = isPromiseLike(result);
        if (childFlow.then) {
          function next() {
            if (cancelled) return;
            const nextFlow = childFlow.then(...args);
            if (!nextFlow) return;
            if (typeof nextFlow === "string") {
              addFlow(findFlow(nextFlow));
            } else if (typeof nextFlow === "object") {
              addFlow(normalizeFlow(nextFlow));
            } else {
              throw new Error("Invalid $then. " + typeof nextFlow);
            }
          }

          if (isPromise && childFlow.block) {
            result.finally(next);
          } else {
            next();
          }
        } else if (childFlow.hasChild) {
          if (isPromise) {
            result.then(() => addFlow(childFlow));
          } else {
            addFlow(childFlow);
          }
        }
        // re-add current flow
        if (flow.fork && flow) {
          addFlow(flow);
        }
      }

      if (childFlow.cancel && childFlow.cancel.length) {
        const cancelFlow = createEmptyFlow({
          children: childFlow.cancel,
          onProcess() {
            // re-add cancel flow whenever processing
            !cancelled && addFlow(cancelFlow);
          },
          onMatch() {
            cancelled = true;
            removeFlow(cancelFlow);
          },
        });
        addFlow(cancelFlow);
      }

      if (childFlow.debounce) {
        // create empty flow to handle cancel debouncing if this childFlow is dispatched again
        const emptyFlow = createEmptyFlowFrom(childFlow, {
          onProcess() {
            clearTimeout(timerId);
          },
        });
        const timerId = setTimeout(() => {
          removeFlow(emptyFlow);
          execute();
        }, childFlow.debounce);

        addFlow(emptyFlow);
      } else {
        execute();
      }
    });
  }

  return {
    get length() {
      return currentFlows.size;
    },
    reset() {
      if (isDispatching) throw new Error("Cannot reset flow while dispatching");
      currentFlows = new Set();
    },
    state() {
      if (lastState !== unset) return lastState;
      if (typeof rootFlow.state === "function") {
        const states = [];
        currentFlows.forEach((flow) => {
          if (typeof flow.state === "undefined") return;
          if (typeof flow.state === "function") {
            states.push(flow.state());
          } else {
            states.push(flow.state);
          }
        });
        return (lastState = rootFlow.state(states));
      }
      return (lastState = rootFlow.state);
    },
    dispatch(options) {
      if (typeof options === "string") {
        options = { action: options };
      }
      const newFlows = new Set();
      isDispatching = true;

      function addFlow(flow) {
        if (flow === rootFlow) return;
        if (isDispatching) {
          newFlows.add(flow);
        } else {
          currentFlows.add(flow);
        }
      }

      function removeFlow(flow) {
        if (flow === rootFlow) return;
        if (isDispatching) {
          newFlows.delete(flow);
        } else {
          currentFlows.delete(flow);
        }
      }

      try {
        processFlow(rootFlow, options, addFlow, removeFlow);
        currentFlows.forEach((flow) =>
          processFlow(flow, options, addFlow, removeFlow)
        );
        currentFlows = newFlows;
      } finally {
        lastState = unset;
        isDispatching = false;
      }
    },
  };
}

function createEmptyFlow(props) {
  return {
    hasChild: false,
    children: [],
    ...props,
  };
}

function createEmptyFlowFrom({ match }, props) {
  return createEmptyFlow({ match, ...props });
}

function createMatcher(key) {
  if (key === "*") return anyMatcher;
  if (/^regex:/.test(key)) {
    const regex = new RegExp(key.substr(6));
    return (x) => regex.test(x);
  }
  const not = /^not:/.test(key);
  if (not) {
    key = key.substr(4);
  }
  const keys = key.split("|").map((x) => x.trim());
  if (keys.length === 1) {
    key = keys[0];
    if (not) return (x) => x !== key;
    return (x) => x === key;
  }
  if (not) return (x) => !keys.includes(x);
  return (x) => keys.includes(x);
}
