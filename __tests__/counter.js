import { renderHook, act, cleanup } from "@testing-library/react-hooks";
import storeact from "../src/index";

let initCallback = undefined;
const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

const Store = () => {
  let count = 0;

  const store = {
    state: () => count,
    async init() {
      initCallback && initCallback();
    },
    increase: () => count++,
    decrease: () => count--,
    increaseAsync: async () => {
      await delay(5);
      store.increase();
    },
  };
  return store;
};

beforeEach(() => {
  initCallback = undefined;
  delete Store.__instance;
});

test("handle init action", () => {
  initCallback = jest.fn();
  const hook = renderHook(() => storeact(Store));
  // try to render hook many times
  hook.rerender();
  hook.rerender();
  // make sure init is called once
  expect(initCallback).toBeCalledTimes(1);
});

test("sync action dispatching", () => {
  const { result } = renderHook(() => storeact(Store));
  expect(result.current.state).toBe(0);
  result.current.increase();
  expect(result.current.state).toBe(1);
});

test("async action dispatching", async () => {
  const { result } = renderHook(() => storeact(Store));
  expect(result.current.state).toBe(0);
  result.current.increaseAsync();
  expect(result.current.state).toBe(0);
  await delay(10);
  expect(result.current.state).toBe(1);
});
