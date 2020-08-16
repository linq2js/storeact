export default function isPromiseLike(obj) {
  return obj && typeof obj.then === "function";
}
