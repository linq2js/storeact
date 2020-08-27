import createAtom from "../createAtom";
import createStore from "../createStore";

test("mapped atom", () => {
  const original = createAtom(1);
  const double = original.map((value) => value * 2);

  expect(double.value).toBe(2);

  original.value++;

  expect(double.value).toBe(4);
});

test("compare two atoms using isEqual", () => {
  const callback = jest.fn();
  const store = createStore(({ atom }) => {
    const count = atom(0);
    return {
      state() {
        return count;
      },
      increase() {
        count.value++;
      },
      handleChange({ state }) {
        callback(state.value);
      },
    };
  });

  expect(callback).toBeCalledTimes(0);
  store.increase();
  store.increase();
  store.increase();
  expect(callback).toBeCalledTimes(2);
});
