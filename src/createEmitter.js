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
    function fire(payload) {
      listeners.forEach((listener) => listener(payload));
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
      fire,
      clear,
      once,
    });
  }

  function on(event, listener = noop) {
    return get(event).on(listener);
  }

  function fire(event, payload) {
    return get(event).fire(payload);
  }

  function once(event, listener = noop) {
    return get(event).once(listener);
  }

  return {
    on,
    once,
    fire,
    get,
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
