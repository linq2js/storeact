import createEmitter from "./createEmitter";
import isPromiseLike from "./isPromiseLike";
import { actionType, noop, unset } from "./types";
import createMatcher from "./createMatcher";

export default function createTask(options = {}) {
  const emitter = createEmitter();
  const subscribeAsync = options.subscribeAsync || options.subscribe;
  const subscribeSync = options.subscribeSync || options.subscribe;

  let isCancelled = false;
  let isLocking = false;
  let lockResult = false;

  function cancel() {
    if (isCancelled) return;
    isCancelled = true;
    emitter.emit("cancel");
  }

  function cancelled() {
    return isCancelled;
  }

  function when(input, { sync, onSuccess, onError, onDone } = {}) {
    let isMultiple = false;
    let isAsyncRace = false;
    if (Array.isArray(input)) {
      isMultiple = true;
      input = Object.entries(input);
    } else if (
      typeof input === "function" ||
      typeof input === "string" ||
      isPromiseLike(input)
    ) {
      isAsyncRace = false;
      input = Object.entries([input]);
    } else if (typeof input === "object") {
      isMultiple = true;
      isAsyncRace = true;
      input = Object.entries(input);
    } else {
      throw new Error("Invalid when input");
    }

    return new Promise((resolve, reject) => {
      const result = isAsyncRace ? {} : [];
      const actionMatchers = [];
      const removeCancelListener = emitter.once("cancel", dispose);
      let doneCount = 0;
      let isDone = false;
      let removeActionDispatchingListener = noop;

      function dispose() {
        removeCancelListener();
        removeActionDispatchingListener();
      }

      function handleDone(result, error, fallback) {
        if (!fallback && cancelled()) return;
        isDone = true;
        dispose();
        onDone && onDone();
        error ? reject(error) : resolve(result);
      }

      function handleSuccess(key, type, payload) {
        if (isDone) return;
        if (isAsyncRace) {
          result[key] = { type, payload };
        } else {
          result[key] = payload;
          doneCount++;
          if (doneCount < input.length) return;
        }
        onSuccess && onSuccess(isMultiple ? result : result[0]);
        handleDone(isMultiple ? result : result[0]);
      }

      function handleError(error) {
        if (isDone) return;
        if (!isMultiple) return;
        onError && onError(error);
        handleDone(undefined, error);
      }

      function handleActionDispatch({ action, payload }) {
        const removedIndexes = [];
        actionMatchers.forEach(({ key, match }, index) => {
          if (match(action)) {
            handleSuccess(key, action, payload);
            // remove processed matcher
            removedIndexes.unshift(index);
          }
        });
        while (removedIndexes.length) {
          actionMatchers.splice(removedIndexes.shift());
        }
      }

      input.forEach(([key, target]) => {
        if (typeof target === "function" && target.type === actionType) {
          target = target.displayName;
        }
        if (typeof target === "string") {
          actionMatchers.push({
            key,
            match: createMatcher(target),
          });
        } else if (isPromiseLike(target)) {
          target.then(
            (payload) => handleSuccess(key, target, payload),
            (error) => handleError(error)
          );
        }
      });

      if (actionMatchers.length) {
        removeActionDispatchingListener = (sync
          ? subscribeSync
          : subscribeAsync)(handleActionDispatch);
      }
    });
  }

  function delay(ms = 0, value) {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms, value);
      emitter.once("cancel", () => clearTimeout(timer));
    });
  }

  function call(func, ...args) {
    if (!isCancelled) {
      if (func.type === actionType) {
        // passing parent task automatically
        func(...args.concat(task));
      } else {
        func(...args);
      }
    }
    return task;
  }

  function on(action, listener) {
    if (typeof action === "function" && action.type === actionType) {
      action = action.displayName;
    }
    const matcher = createMatcher(action);
    const unsubscribe = subscribeSync(({ action, payload }) => {
      if (!matcher(action)) return;
      listener({ action, payload });
    });
    const dispose = () => {
      removeCancelListener();
      unsubscribe();
    };
    const removeCancelListener = emitter.on("cancel", dispose);
    return dispose;
  }

  function once(action, listener) {
    if (typeof action === "function" && action.type === actionType) {
      action = action.displayName;
    }
    const matcher = createMatcher(action);
    const unsubscribe = subscribeSync(({ action, payload }) => {
      if (!matcher(action)) return;
      dispose();
      listener({ action, payload });
    });
    const dispose = () => {
      removeCancelListener();
      unsubscribe();
    };
    const removeCancelListener = emitter.on("cancel", dispose);
    return dispose;
  }

  async function debounce(ms) {
    if (options.prevTask) options.prevTask.cancel();
    return delay(ms);
  }

  function cancelOn(...cancelActions) {
    const input = {};
    cancelActions.forEach((value, index) => {
      input[index] = value;
    });
    when(input, {
      onSuccess() {
        cancel();
      },
    });
    return task;
  }

  function mutate(asyncData, value, normalizer) {
    if (cancelled()) return;

    if (typeof asyncData === "function") {
      return options.update(asyncData);
    }

    if (typeof value === "function") {
      value = value(asyncData.value);
    }

    if (isPromiseLike(value)) {
      const promise = (asyncData.value = new Promise((resolve, reject) => {
        const dispose = emitter.once("cancel", cancelLoading);
        value
          .then(
            (payload) => {
              if (cancelled()) return;
              resolve(
                typeof normalizer === "function"
                  ? normalizer(payload, asyncData.value)
                  : payload
              );
            },
            (error) => {
              if (cancelled()) return;
              reject(error);
            }
          )
          .finally(dispose);

        function cancelLoading() {
          dispose();
          if (asyncData.promise === promise) {
            asyncData.cancel();
          }
        }
      }));
    } else {
      asyncData.value =
        typeof normalizer === "function"
          ? normalizer(value, asyncData.value)
          : value;
    }
    return asyncData.ready;
  }

  function latest() {
    options.prevTask && options.prevTask.cancel();
  }

  function lock(fn) {
    if (!arguments.length) {
      if (isLocking) {
        return lockResult;
      }
      return unset;
    }
    let isAsync = false;
    try {
      isLocking = true;
      const result = fn();
      if (isPromiseLike(result)) {
        isAsync = true;
        return (lockResult = result.finally(() => {
          isLocking = false;
          emitter.emit("unlock", task);
        }));
      }
      return result;
    } finally {
      if (!isAsync) {
        isLocking = false;
      }
    }
  }

  options.onCancel && emitter.once("cancel", options.onCancel);
  options.cancelOn && cancelOn(...[].concat(options.cancelOn));
  options.latest && latest();
  options.parentTask && options.parentTask.onCancel(cancel);

  const task = {
    on,
    once,
    delay,
    debounce,
    when,
    cancelOn,
    latest,
    mutate,

    lock,
    onCancel: emitter.get("cancel").once,
    onUnlock: emitter.get("unlock").once,
    call,
    cancel,
    cancelled,
  };

  return task;
}
