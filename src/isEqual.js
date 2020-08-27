import isPromiseLike from "./isPromiseLike";
import { atomType } from "./types";

export default function isEqual(a, b, snapshots = {}) {
  if (a === b) {
    return isAtomEqual(a, snapshots);
  }
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    isPromiseLike(a) ||
    isPromiseLike(b) ||
    Array.isArray(a) ||
    Array.isArray(b)
  )
    return false;
  const comparer = (key) => {
    if (a[key] === b[key]) {
      return isAtomEqual(a[key], snapshots);
    }
    return false;
  };
  return Object.keys(a).every(comparer) && Object.keys(b).every(comparer);
}

/**
 * support comparing atom
 * @param atom
 * @param snapshots
 * @return {boolean}
 */
function isAtomEqual(atom, snapshots) {
  if (atom && atom.type === atomType) {
    if (!snapshots.__atomValues) {
      snapshots.__atomValues = new WeakMap();
    }
    if (snapshots.__atomValues.has(atom)) {
      if (snapshots.__atomValues.get(atom) !== atom.value) {
        snapshots.__atomValues.set(atom, atom.value);
        return false;
      }
    } else {
      snapshots.__atomValues.set(atom, atom.value);
      return false;
    }
  }
  return true;
}
