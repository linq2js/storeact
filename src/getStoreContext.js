import uniScope from "./uniScope";
import { initScopeName } from "./scopeNames";
import createStoreContext from "./createStoreContext";

export default function getStoreContext() {
  const scope = uniScope(initScopeName);
  if (!scope) {
    throw new Error(
      "Cannot get store context. storeact() must be called inside store initializing"
    );
  }
  if (!scope.context) {
    scope.context = createStoreContext(scope.api);
  }
  return scope.context;
}
