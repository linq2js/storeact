import getStoreContext from "./getStoreContext";
import uniScope from "./uniScope";
import initStore from "./initStore";
import { initScopeName } from "./scopeNames";
import isHookEnabled from "./isHookEnabled";
import storeHook from "./useStore";

export default function storeact() {
  // storeact() => context
  if (!arguments.length) {
    return getStoreContext();
  }
  // storeact(definition)
  if (arguments.length < 2) {
    // initializing store
    if (uniScope(initScopeName) || !isHookEnabled()) {
      return initStore(arguments[0]);
    }
  }
  return storeHook(...arguments);
}
