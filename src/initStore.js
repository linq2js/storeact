import createStore from "./createStore";

export default function initStore(definition, options) {
  if (arguments.length > 1) {
    return createStore(definition, options);
  }
  if (definition.__store) return definition.__store;
  definition.__store = createStore(definition);
  return definition.__store;
}
