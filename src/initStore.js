import createStore from "./createStore";

export default function initStore(definition) {
  if (definition.__store) return definition.__store;
  definition.__store = createStore(definition);
  return definition.__store;
}
