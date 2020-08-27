import { getStoreContext } from "./createStore";
import { add } from "./module";
import isHookEnabled from "./isHookEnabled";
import { storeMetadataProps, storeType } from "./types";
import storeHook from "./useStore";
import initStore from "./initStore";
export { default as createTask } from "./createTask";
export { default as createAtom } from "./createAtom";

export default function storeact(definitionOrStore, ...args) {
  if (!arguments.length) {
    const context = getStoreContext();
    if (!context) {
      throw new Error("No store context found");
    }
    return context;
  }

  if (definitionOrStore && definitionOrStore.type === storeType) {
    definitionOrStore = definitionOrStore[storeMetadataProps].definition;
  }

  if (isHookEnabled()) return storeHook(definitionOrStore, ...args);
  return initStore(definitionOrStore, ...args);
}

Object.assign(storeact, {
  module: add,
  reset(storeOrDefinition) {
    const store =
      // is definition
      typeof storeOrDefinition === "function" && storeOrDefinition.__store
        ? storeOrDefinition.__store
        : // is store
        storeOrDefinition && storeOrDefinition.type === storeType
        ? storeOrDefinition
        : undefined;
    if (!store) {
      throw new Error("Store or store definition required");
    }
    storeOrDefinition[storeMetadataProps].reset();
  },
});
