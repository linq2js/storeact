import createArrayKeyedMap from "./createArrayKeyedMap";
import createStore from "./createStore";
import { initScopeName } from "./scopeNames";
import uniScope from "./uniScope";

export default function initStore(definition, args = []) {
  let result;
  if (!definition.__stores) {
    definition.__stores = createArrayKeyedMap();
  }

  const childScope = uniScope(initScopeName);

  if (!args.length && definition.__defaultStore) {
    result = definition.__defaultStore;
  } else {
    result = definition.__stores.getOrAdd(args, () => {
      const store = createStore(definition, args);
      if (!args.length) {
        definition.__defaultStore = store;
      }
      return store;
    });
  }

  if (childScope) {
    childScope.parents.add(result);
  }

  return result;
}
