import { renderHook, act, cleanup } from "@testing-library/react-hooks";
import storeact from "../src/index";

const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

test("should throw an error if loadable is not completed", async () => {
  const Store = ({ loader }) => {
    const asyncData = loader();
    return {
      state: () => asyncData.loadable,
      init() {
        asyncData.load(delay(5, 100));
      },
    };
  };

  const hook = renderHook(() => storeact(Store, (x) => x.state.$value));
  expect(hook.result.error).not.toBeUndefined();
  await act(() => delay(10));
  hook.rerender();
  expect(hook.result.error).toBeUndefined();
  expect(hook.result.current).toBe(100);
});

test("multiple loaders", async () => {
  const Store = ({ loader }) => {
    const asyncProp1 = loader();
    const asyncProp2 = loader();
    return {
      state: () => ({
        prop1: asyncProp1.loadable,
        prop2: asyncProp2.loadable,
      }),
      init() {
        asyncProp1.load(delay(5, 100));
        asyncProp2.load(delay(5, 101));
      },
    };
  };

  const hook = renderHook(() =>
    storeact(Store, (store) => ({
      prop1: store.state.prop1.$value,
      prop2: store.state.prop2.$value,
    }))
  );
  expect(hook.result.error).not.toBeUndefined();
  hook.rerender();
  await act(() => delay(15));
  expect(hook.result.error).toBeUndefined();
  expect(hook.result.current).toEqual({
    prop1: 100,
    prop2: 101,
  });
});
