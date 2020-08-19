import { act, renderHook } from "@testing-library/react-hooks";
import storeact from "../index";

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

test("loadableOf", async () => {
  const Store = () => {
    const { async } = storeact();
    const value = async.value(true);
    return {
      init() {
        value.load(delay(10, 1));
        return value.promise;
      },
      state() {
        return value;
      },
      changeValue() {
        value.load(delay(10, 2));
      },
    };
  };
  const { result } = renderHook(() =>
    storeact(Store, (store) => store.loadableOf(store.state))
  );

  expect(result.current.state).toBe("loading");

  await act(() => delay(15));

  expect(result.current.state).toBe("hasValue");

  act(() => {
    storeact(Store).changeValue();
  });

  expect(result.current.state).toBe("loading");

  await act(() => delay(15));

  expect(result.current.state).toBe("hasValue");
});
