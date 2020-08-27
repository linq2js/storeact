import { noop } from "./types";

export default function createEmitter() {
  let all = {};

  function get(event) {
    if (event in all) {
      return all[event];
    }
    const listeners = (all[event] = []);
    let lastPayload;
    let sealed = false;

    function on(listener) {
      if (sealed) {
        listener(lastPayload);
        return noop;
      }
      let isActive = true;
      listeners.push(listener);

      return () => {
        if (!isActive) {
          return;
        }
        isActive = false;
        const index = listeners.indexOf(listener);
        index !== -1 && listeners.splice(index, 1);
      };
    }

    function notify(payload) {
      listeners.slice(0).forEach((listener) => listener(payload));
    }

    function emit(payload) {
      if (sealed) return;
      notify(payload);
    }
    function clear() {
      listeners.length = 0;
    }
    function once(listener) {
      const remove = on(function () {
        remove();
        return listener.apply(this, arguments);
      });
      return remove;
    }

    function emitOnce(payload) {
      if (sealed) return;
      sealed = true;
      lastPayload = payload;
      notify(payload);
      clear();
    }

    return Object.assign(listeners, {
      on,
      emit,
      emitOnce,
      clear,
      once,
    });
  }

  function on(event, listener = noop) {
    return get(event).on(listener);
  }

  function emit(event, payload) {
    return get(event).emit(payload);
  }

  function emitOnce(event, payload) {
    return get(event).emitOnce(payload);
  }

  function once(event, listener = noop) {
    return get(event).once(listener);
  }

  function has(event) {
    return all[event] && all[event].length;
  }

  return {
    on,
    once,
    emit,
    emitOnce,
    get,
    has,
    clear(event) {
      if (event) {
        // clear specified event listeners
        get(event).clear();
        delete all[event];
      } else {
        // clear all event listeners
        all = {};
      }
    },
  };
}
