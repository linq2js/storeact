export default function (ms, func) {
  if (!func) {
    return undefined;
  }
  if (!ms) {
    return func;
  }
  let lastTime;
  let lastResult;
  return function () {
    const now = new Date().getTime();
    if (!lastTime || now - lastTime >= ms) {
      lastTime = now;
      lastResult = func(...arguments);
    }
    return lastResult;
  };
}
