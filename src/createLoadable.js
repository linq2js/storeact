import createEmitter from "./createEmitter";
import { loadableType } from "./types";

export default function createLoadable(promise, customOnChange, customOnDone) {
  const emitter = createEmitter();
  function onChange(listener) {
    if (customOnChange) {
      emitter.on("dispose", customOnChange(listener));
    } else {
      emitter.on("change", listener);
    }
  }

  function done() {
    emitter.fire("change", promise.__loadable);
    emitter.fire("dispose");
    emitter.clear();
    customOnDone && customOnDone();
  }

  promise.__loadable = {
    type: loadableType,
    state: "loading",
    promise,
    onChange,
  };

  promise.then(
    (value) => {
      promise.__loadable = {
        type: loadableType,
        state: "hasValue",
        value,
        promise,
        onChange,
      };
      done();
    },
    (error) => {
      promise.__loadable = {
        type: loadableType,
        state: "hasError",
        error,
        promise,
        onChange,
      };
      done();
    }
  );

  return promise.__loadable;
}
