import { add } from "./module";
import isHookEnabled from "./isHookEnabled";
import storeHook from "./useStore";
import initStore from "./initStore";
export { default as createTask } from "./createTask";
export { default as createAtom } from "./createAtom";
import { currentContext } from "./createStore";

export default function storeact() {
  if (!arguments.length) {
    if (!currentContext) {
      throw new Error("No store context found");
    }
    return currentContext;
  }
  if (isHookEnabled()) return storeHook(...arguments);
  return initStore(...arguments);
}

Object.assign(storeact, {
  module: add,
});
