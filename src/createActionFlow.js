import createEmitter from "./createEmitter";
import isPromiseLike from "./isPromiseLike";
import { flowType } from "./types";

const anyMatcher = () => true;
const rootId = "#";
let shadowFlowUniqueId = 0;

export default function createActionFlow(rootFlow) {
  const flowMap = {};
  const emitter = createEmitter();
  const options = rootFlow.$options || {};
  const { debounce: debounceOptions = {} } = options;
  const timers = {};
  delete rootFlow.$options;

  function findFlow(id) {
    if (id.charAt(0) !== "#") {
      throw new Error("flow id must start with # " + id);
    }
    if (id === rootId) return rootFlow;
    if (id in flowMap) return flowMap[id];
    throw new Error("Cannot find sub flow " + id);
  }

  rootFlow = normalizeFlow({ $root: true, ...rootFlow }, "#root", flowMap);

  function initFlow(flow) {
    if (flow.initialized) return;
    flow.initialized = true;
    const removeListener = emitter.on("dispatch", (options) => {
      if (!flow.fork) removeListener();

      const { action } = options;
      // do not handle child flow until current flow done
      if (flow.block && flow.running) return;
      flow.children.forEach((child) => {
        if (!child.match(action)) return;

        if (child.success) {
          options.onSuccess.add(child.success);
        }

        if (child.error) {
          options.onError.add(child.error);
        }

        if (child.done) {
          options.onDone.add(child.done);
        }

        if (child.block) {
          options.approvers.add(child);
        } else {
          initFlow(child);
        }

        options.approved = true;
      });
    });
  }

  function invoke(options) {
    if (options.action in debounceOptions) {
      clearTimeout(timers[options.action]);
      timers[options.action] = setTimeout(
        internalInvoke,
        debounceOptions[options.action]
      );
    } else {
      internalInvoke();
    }

    function internalInvoke() {
      const { approvers, onSuccess, onError, onDone, args = [] } = options;
      const flowIds = new Set();
      let invokeSuccess = false;

      function collectFlowId(handler) {
        const flowId =
          typeof handler === "function" ? handler(...args) : handler;
        flowId && flowIds.add(flowId);
      }

      function handleSuccess() {
        approvers.forEach(initFlow);
        onSuccess.forEach(collectFlowId);
      }

      function handleError() {
        onError.forEach(collectFlowId);
      }

      function handleDone() {
        approvers.forEach((flow) => flow.running--);
        onDone.forEach(collectFlowId);
        flowIds.forEach((flowId) => {
          if (typeof flowId !== "string")
            throw new Error("Invalid flow id " + typeof flowId);

          const flow = findFlow(flowId);
          initFlow(flow);
        });
      }

      try {
        const invokeResult = options.invoke
          ? options.invoke(...args)
          : undefined;
        invokeSuccess = true;
        if (isPromiseLike(invokeResult)) {
          approvers.forEach((flow) => {
            if (typeof flow.running === "undefined") {
              flow.running = 0;
            }
            flow.running++;
          });
          invokeResult.then(handleSuccess, handleError).finally(handleDone);
        } else {
          handleSuccess();
          handleDone();
        }
      } catch (e) {
        if (!invokeSuccess) {
          handleError();
          handleDone();
        } else {
          throw e;
        }
      }
    }
  }

  return {
    options,
    dispatch(options) {
      if (typeof options === "string") {
        options = { action: options };
      }
      const approvers = new Set();
      const onSuccess = new Set();
      const onDone = new Set();
      const onError = new Set();
      options = {
        ...options,
        approvers,
        onSuccess,
        onDone,
        onError,
      };
      initFlow(rootFlow);
      emitter.fire("dispatch", options);
      if (options.approved) {
        invoke(options);
      }
    },
  };
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

function createShadowFlowIfPossible(flow, flowMap) {
  if (typeof flow !== "object") return flow;
  const shadowId = "#shadow" + shadowFlowUniqueId++;
  flowMap[shadowId] = normalizeFlow(flow, shadowId, flowMap);
  return shadowId;
}

function normalizeFlow(originalFlow, name, flowMap) {
  if (originalFlow && originalFlow.type === flowType) return originalFlow;
  const {
    $root,
    $id,
    $block = true,
    $success,
    $error,
    $done,
    $fork = true,
    $state,
    ...props
  } = originalFlow;
  const result = {
    id: $id,
    name,
    success: createShadowFlowIfPossible($success, flowMap),
    error: createShadowFlowIfPossible($error, flowMap),
    done: createShadowFlowIfPossible($done, flowMap),
    type: flowType,
    fork: $fork,
    block: $block,
    hasChild: false,
    children: [],
  };

  Object.entries(props).forEach(([key, value]) => {
    // is shadow flow
    if (key.charAt(0) === "#") {
      if (!$root) {
        throw new Error("Shadow flow must be nested in root flow");
      }
      flowMap[key] = normalizeFlow(value, key, flowMap);
      return;
    }
    if (typeof value === "string") {
      const flowId = value;
      value = () => flowId;
    }

    if (typeof value === "function") {
      value = {
        $success: value,
      };
    }

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
      child = normalizeFlow(f, key, flowMap);
      child.match = createMatcher(key);
    } else {
      child = normalizeFlow(value, key, flowMap);
      child.match = createMatcher(key);
    }

    result.children.push(child);
  });

  if ($id) {
    flowMap[$id] = result;
  }

  return result;
}
