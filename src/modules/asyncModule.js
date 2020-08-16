import createEmitter from "../createEmitter";
import isPromiseLike from "../isPromiseLike";
import { asyncValueType, taskType, unset } from "../types";

const forever = new Promise(() => {});
const defaultCancellable = { cancelled: false };

export default function ({ use }) {
  const value = use(valueModule);
  const delay = use(delayModule);
  const cancellable = use(cancellableModule);
  const debounce = use(debounceModule);
  const race = use(raceModule);

  return {
    name: "async",
    impl: {
      value,
      delay,
      cancellable,
      debounce,
      race,
      forever,
    },
  };
}

export function delayModule(context) {
  return function (ms, value) {
    let cancelled = false;
    let timer;
    return Object.assign(
      new Promise((resolve) => {
        timer = setTimeout(() => !cancelled && resolve(value), ms);
      }),
      {
        cancel() {
          if (cancelled) return;
          cancelled = true;
          clearTimeout(timer);
        },
      }
    );
  };
}

export function valueModule({ forceUpdate }) {
  return function (value) {
    const emitter = createEmitter();
    let autoUpdate = false;
    let currentValue = value;
    let currentLoading;
    let currentPromise = unset;
    let error = undefined;

    return {
      type: asyncValueType,
      get error() {
        return error;
      },
      get loading() {
        return !!currentLoading;
      },
      get value() {
        return currentValue;
      },
      set value(newValue) {
        if (currentValue !== newValue) {
          currentValue = newValue;
          currentPromise = unset;
          emitter.fire("change", this);
          emitter.fire("ready", this);
          if (autoUpdate) {
            forceUpdate();
          }
        }
      },
      get dirty() {
        return value === currentValue;
      },
      get promise() {
        if (this.loading) {
          return (currentPromise = new Promise((resolve) =>
            this.onReady(() => resolve(this.value))
          ));
        }
        if (currentPromise === unset) {
          currentPromise = Promise.resolve(currentValue);
        }
        return currentPromise;
      },
      autoUpdate() {
        autoUpdate = true;
        return this;
      },
      onChange: emitter.get("change").on,
      onReady(listener) {
        if (this.loading) {
          return emitter.once("ready", listener);
        } else {
          listener(this);
          return noop;
        }
      },
      cancel() {
        currentLoading = undefined;
        emitter.fire("ready", this);
        currentPromise = unset;
        return this;
      },
      load(newLoading, cancellable = defaultCancellable) {
        if (!newLoading) {
          currentLoading = undefined;
          return this;
        }
        if (!isPromiseLike(newLoading)) {
          throw new Error("Value must be promise");
        }
        const current = (currentLoading = newLoading);
        error = undefined;
        currentLoading.then(
          (payload) => {
            if (current !== currentLoading || cancellable.cancelled) return;
            currentLoading = undefined;
            this.value = payload;
          },
          (e) => {
            if (current !== currentLoading || cancellable.cancelled) return;
            currentLoading = undefined;
            error = e;
          }
        );

        return this;
      },
      update(reducerOrValue, onChange) {
        currentLoading = undefined;
        const prev = currentValue;
        if (typeof reducerOrValue === "function") {
          this.value = reducerOrValue(this.value);
        } else {
          this.value = reducerOrValue;
        }
        if (onChange && prev !== currentValue) {
          onChange(this);
        }

        return this;
      },
      reset() {
        this.value = value;
        currentLoading = undefined;
        return this;
      },
    };
  };
}

export function cancellableModule({ forceUpdate, use }) {
  const race = use(raceModule);

  return function (...cancelActions) {
    const task = race(cancelActions);
    const emitter = createEmitter();
    let cancelled = false;

    function isCancelled() {
      return cancelled || task.done;
    }

    function cancel() {
      if (cancelled) return;
      cancelled = true;
      emitter.fire("cancel");
      task.cancel();
    }

    function call(func, ...args) {
      if (isCancelled()) {
        return;
      }
      forceUpdate(() => func(...args));
    }

    function wrap(obj, options = {}) {
      if (typeof options === "function") {
        options = { onResolve: options };
      }
      const { onResolve, onReject, onDone, onCancel } = options;
      if (isPromiseLike(obj)) {
        const promise = obj;
        if (onCancel) {
          emitter.on("cancel", () => {
            forceUpdate(onCancel);
          });
        }
        return new Promise((resolve, reject) => {
          promise.then(
            (value) => {
              if (isCancelled()) return;
              resolve(value);
              if (onResolve || onDone) {
                forceUpdate(onResolve, onDone);
              }
            },
            (error) => {
              if (isCancelled()) return;
              reject(error);
              if (onReject || onDone) {
                forceUpdate(onReject, onDone);
              }
            }
          );
        });
      }
      const func = obj;
      return (...args) => call(func, ...args);
    }

    task.finally(cancel);

    return {
      get cancelled() {
        return isCancelled();
      },
      cancel,
      wrap,
      call,
    };
  };
}

export function debounceModule({ use }) {
  const race = use(raceModule);
  const delay = use(delayModule);
  return async function (ms, ...cancelActions) {
    const { cancelled } = await race({
      cancelled: cancelActions,
      debounced: delay(ms),
    });
    return cancelled;
  };
}

export function raceModule({ onDispatch }) {
  return function race() {
    const emitter = createEmitter();
    const onDispose = emitter.get("dispose").on;
    let map = arguments[0];
    let valueOnly = false;
    // race(eventName)
    // race(this.action)
    // race(...targets)
    if (
      isPromiseLike(arguments[0]) ||
      typeof arguments[0] !== "object" ||
      (arguments[0] && arguments[0].type === asyncValueType)
    ) {
      valueOnly = true;
      map = Array.from(arguments);
    }

    function cancel() {
      if (task.cancelled) return;
      task.cancelled = true;
      dispose();
    }

    function dispose() {
      if (task.disposed) return;
      task.disposed = true;
    }

    // race({ prop1, prop2 });
    function handleSuccess(resolve, key, type, payload) {
      if (task.cancelled) return;
      dispose();
      if (valueOnly) {
        task.result = payload;
      } else {
        task.result = { [key]: { type, payload } };
      }
      task.success = true;
      task.done = true;
      resolve(task.result);
    }

    function handleError(error) {
      if (task.cancelled) return;
      dispose();
      task.fail = true;
      task.error = error;
      task.done = true;
    }

    const task = Object.assign(
      new Promise((resolve) => {
        Object.entries(map).forEach(([key, value]) => {
          function handleEvent(event) {
            if (!event) {
              throw new Error("Invalid race event");
            }
            if (isPromiseLike(event)) {
              const promise = event;
              if (typeof promise.cancel === "function") {
                onDispose(promise.cancel);
              }
              promise.then(
                (payload) => handleSuccess(resolve, key, event, payload),
                (error) => handleError(error)
              );
              return;
            }
            let removeListener;
            if (event.type === asyncValueType) {
              const asyncValue = event;
              removeListener = asyncValue.onReady(() =>
                handleSuccess(resolve, key, asyncValue, asyncValue.value)
              );
            } else {
              removeListener = onDispatch(event, ({ payload }) => {
                handleSuccess(resolve, key, event, payload);
              });
            }
            if (removeListener) {
              onDispose(removeListener);
            }
          }

          if (Array.isArray(value)) {
            value.forEach(handleEvent);
          } else {
            handleEvent(value);
          }
        });
      }),
      {
        type: taskType,
        cancel,
        dispose,
      }
    );

    return task;
  };
}
