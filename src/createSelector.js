const selectorType = {};
const defaultSelectorMap = {};

export default function createSelector(
  definition,
  selectorMap = defaultSelectorMap
) {
  let freeArgs = false;
  if (typeof definition === "function") {
    freeArgs = true;
    definition = [definition];
  }
  let lastResult;
  let lastArgs;
  let selectors;
  let body = definition[definition.length - 1];
  definition = definition.slice(0, definition.length - 1);

  return function (...inputArgs) {
    if (!selectors) {
      selectors = definition.map((selector) => {
        if (typeof selector === "function" || Array.isArray(selector)) {
          if (selector.type === selectorType) return selector;
          if (!selector.__selector) {
            selector.__selector = createSelector(selector, selectorMap);
          }
          return selector.__selector;
        }

        if (typeof selector === "string" && selector.charAt(0) === "@") {
          selector = selector.substr(1);
          return (...args) => selectorMap[selector](...args);
        }
        return selectorMap[selector];
      });
    }
    const mappedArgs = (freeArgs
      ? inputArgs
      : selectors.map((selector) => selector(...inputArgs))
    ).map((arg) => {
      // do loadable logic here
      return arg;
    });

    if (
      lastArgs &&
      lastArgs.length === mappedArgs.length &&
      lastArgs.every((x, i) => x === mappedArgs[i])
    )
      return lastResult;
    lastArgs = mappedArgs;
    const result = body(...mappedArgs);
    if (typeof result === "function") return (lastResult = result(selectorMap));
    return (lastResult = result);
  };
}
