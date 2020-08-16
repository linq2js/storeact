import createEmitter from "./createEmitter";

export default function createStoreApi(props) {
  const emitter = createEmitter();

  return {
    ...props,
    fireOnChange: emitter.get("@change").fire,
    fireOnDispatch(args) {
      emitter.fire("@dispatch", args);
      emitter.fire(args.action.displayName, args);
    },
    onChange: emitter.get("@change").on,
    onDispatch(action, listener) {
      if (arguments.length < 2) {
        return emitter.on("@dispatch", arguments[0]);
      }
      if (typeof action === "function") {
        action = action.displayName || action.name;
      }
      return emitter.on(action, listener);
    }
  };
}
