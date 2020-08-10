import { renderHook, act, cleanup } from "@testing-library/react-hooks";
import storeact from "../src/index";

test("should avoid to call update() multiple times", () => {
  const store = () => {
    let count = 0;
    const result = {
      state: () => count,
      increase: () => count++,
      increaseTwice() {
        result.increase();
        result.increase();
      },
    };
    return result;
  };
  const callback = jest.fn();
  const { result } = renderHook(() => storeact(store));

  result.current.subscribe(callback);
  result.current.increaseTwice();

  expect(result.current.state).toBe(2);
  expect(callback).toBeCalledTimes(1);
});
