import createArrayKeyedMap from "./createArrayKeyedMap";
import createStore from "./createStore";

export default function initStore(definition, args = []) {
  if (!definition.__stores) {
    definition.__stores = createArrayKeyedMap();
  }
  if (!args.length && definition.__defaultStore) {
    return definition.__defaultStore;
  }
  return definition.__stores.getOrAdd(args, () => {
    const store = createStore(definition, args);
    if (!args.length) {
      definition.__defaultStore = store;
    }
    return store;
  });
}
