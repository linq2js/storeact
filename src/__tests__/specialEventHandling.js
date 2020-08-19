import { renderHook } from "@testing-library/react-hooks";
import storeact from "../index";

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

test("onChange", () => {
  const callback = jest.fn();
  const Store = () => {
    let count = 0;

    return {
      state() {
        return count;
      },
      increase() {
        count++;
      },
      onChange: callback,
    };
  };
  const { result } = renderHook(() => storeact(Store));

  result.current.increase();
  result.current.increase();
  result.current.increase();

  expect(callback.mock.calls).toEqual([[1], [2], [3]]);
});

test("onDispatch", () => {
  const callback = jest.fn();
  const Store = () => {
    let count = 0;

    return {
      state() {
        return count;
      },
      increase() {
        count++;
      },
      onDispatch: callback,
    };
  };
  const { result } = renderHook(() => storeact(Store));

  result.current.increase(1);
  result.current.increase(2);
  result.current.increase(3);

  expect(callback.mock.calls).toEqual([
    [{ action: "increase", payload: 1, args: [1] }],
    [{ action: "increase", payload: 2, args: [2] }],
    [{ action: "increase", payload: 3, args: [3] }],
  ]);
});
