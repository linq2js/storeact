export default function (ms, func) {
  if (!func) {
    return undefined;
  }
  if (ms === false || typeof ms === "undefined" || ms === null) {
    return func;
  }
  if (isNaN(ms)) {
    ms = 0;
  }
  let timeoutId;

  function cancel() {
    clearTimeout(timeoutId);
  }

  return function () {
    cancel();
    timeoutId = setTimeout(func, ms, ...arguments);
    return {
      cancel,
    };
  };
}
