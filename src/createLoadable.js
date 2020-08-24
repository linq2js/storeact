import createEmitter from "./createEmitter";

export default function createLoadable(promise) {
  if (promise.__loadable) return promise.__loadable;
  const emitter = createEmitter();
  const onDone = emitter.get("done").on;
  let state = "loading";
  let value;
  let error;

  function tryGetValue(defaultValue) {
    if (state !== "hasValue") return defaultValue;
    return value;
  }

  function cancelled() {
    return typeof promise.cancelled === "function" && promise.cancelled();
  }

  Object.assign(promise, {
    cancel() {
      const loadable = promise.__loadable;
      delete promise.__loadable;
      emitter.emit("done", loadable);
      emitter.clear();
    },
    dispose() {
      delete promise.__loadable;
      emitter.clear();
    },
    __loadable: {
      state,
      onDone,
      promise,
      tryGetValue
    }
  });

  promise
    .then(
      (result) => {
        state = "hasValue";
        value = result;
      },
      (result) => {
        state = "hasError";
        error = result;
      }
    )
    .finally(() => {
      if (cancelled()) {
        // if promise cancelled, we do not update loadable object
        return;
      } else {
        promise.__loadable = {
          state,
          error,
          value,
          onDone,
          promise,
          tryGetValue
        };
      }

      emitter.emit("done", promise.__loadable);
      emitter.clear();
    });

  return promise.__loadable;
}
