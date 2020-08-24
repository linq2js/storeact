import { noop } from "./types";

export default function createEmitter() {
  let all = {};

  function get(event) {
    if (event in all) {
      return all[event];
    }
    const listeners = (all[event] = []);

    function on(listener) {
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
    function emit(payload) {
      listeners.slice(0).forEach((listener) => listener(payload));
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

    return Object.assign(listeners, {
      on,
      emit,
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
