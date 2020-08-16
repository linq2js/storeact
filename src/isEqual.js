import isPromiseLike from "./isPromiseLike";

export default function isEqual(a, b) {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    isPromiseLike(a) ||
    isPromiseLike(b) ||
    Array.isArray(a) ||
    Array.isArray(b)
  )
    return false;
  const comparer = (key) => a[key] === b[key];
  return Object.keys(a).every(comparer) && Object.keys(b).every(comparer);
}
