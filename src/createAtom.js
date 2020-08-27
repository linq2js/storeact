import createEmitter from "./createEmitter";
import isPromiseLike from "./isPromiseLike";
import { atomType, unset, noop } from "./types";

export default function createAtom(
  defaultValue,
  { update: updateStore = noop } = {}
) {
  const emitter = createEmitter();
  let atom;
  let currentValue = defaultValue;
  let currentPromise = Promise.resolve(defaultValue);
  let currentError = undefined;
  let currentState = "hasValue";

  function update() {
    updateStore();
    emitter.emit("update", atom);
  }

  return (atom = {
    type: atomType,
    onChange: emitter.get("change").on,
    onReady: emitter.get("ready").on,
    onUpdate: emitter.get("update").on,
    get state() {
      return currentState;
    },
    get error() {
      return currentError;
    },
    get value() {
      return currentValue;
    },
    get ready() {
      if (currentState !== "loading") return currentPromise;
      return new Promise((resolve) =>
        emitter.once("ready", () => resolve(currentValue))
      );
    },
    get changed() {
      return new Promise((resolve) =>
        emitter.once("change", () => resolve(currentValue))
      );
    },
    get hasError() {
      return currentState === "hasError";
    },
    get hasValue() {
      return currentState === "hasValue";
    },
    get loading() {
      return currentState === "loading";
    },
    set value(value) {
      if (currentValue === value) return;

      currentError = undefined;

      if (isPromiseLike(value)) {
        currentPromise = value;
        currentState = "loading";
        const promise = currentPromise;
        promise.then(
          (payload) => {
            if (promise !== currentPromise || payload === currentValue) return;
            promise.dispose && promise.dispose();
            currentValue = payload;
            currentState = "hasValue";
            update();
            emitter.emit("change", atom);
            emitter.emit("ready", atom);
          },
          (error) => {
            if (promise !== currentPromise) return;
            promise.dispose && promise.dispose();
            currentError = error;
            currentState = "hasError";
            update();
            emitter.emit("ready", atom);
          }
        );
      } else {
        currentValue = value;
        currentPromise = Promise.resolve(value);
        currentState = "hasValue";
        emitter.emit("change", atom);
        emitter.emit("ready", atom);
      }
      update();
    },
    get promise() {
      return currentPromise;
    },
    reset() {
      if (atom.state !== "loading" && currentValue === defaultValue) return;
      atom.value = defaultValue;
    },
    cancel() {
      if (currentState !== "loading") return;
      currentError = undefined;
      currentState = "hasValue";
      if (currentPromise && typeof currentPromise.cancel === "function") {
        currentPromise.cancel();
      }
      currentPromise = Promise.resolve(currentValue);
      update();
      emitter.emit("ready", atom);
    },
    map(mapper) {
      return createMappedAtom(atom, mapper);
    },
  });
}

function createMappedAtom(source, mapper) {
  let atom;
  let cachedValue = unset;
  let cachedPromise = unset;

  source.onUpdate(() => {
    cachedPromise = undefined;
    cachedValue = unset;
  });

  return (atom = {
    type: atomType,
    onChange: (listener) => source.onChange(() => listener(atom)),
    onReady: (listener) => source.onReady(() => listener(atom)),
    onUpdate: (listener) => source.onUpdate(() => listener(atom)),
    get hasError() {
      return source.hasError;
    },
    get hasValue() {
      return source.hasValue;
    },
    get loading() {
      return source.loading;
    },
    get state() {
      return source.state;
    },
    get error() {
      return source.error;
    },
    get value() {
      if (cachedValue !== unset) return cachedValue;
      return (cachedValue = mapper(source.value));
    },
    get ready() {
      if (source.state !== "loading") return atom.promise;
      return new Promise((resolve) =>
        source.onReady(() => resolve(atom.value))
      );
    },
    get changed() {
      return source.changed.then(() => atom.value);
    },
    get promise() {
      if (!cachedPromise) {
        cachedPromise = source.promise.then(mapper);
      }
      return cachedPromise;
    },
    reset: source.reset,
    cancel: source.cancel,
  });
}
