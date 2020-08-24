import createTask from "./createTask";

export default function taskModule({
  subscribe,
  subscribeAsync,
  subscribeSync,
  update
}) {
  const staticMethods = ["on", "once", "delay", "debounce", "when"];
  const create = (options) =>
    createTask({
      ...options,
      subscribe,
      subscribeAsync,
      subscribeSync,
      update
    });
  staticMethods.forEach((method) => {
    create[method] = (...args) => create()[method](...args);
  });
  return create;
}
