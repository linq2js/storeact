import createStore from "../createStore";

const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

function increase(by = 1, task, { state }) {
  state.count += by;
}

async function increaseAsync(by, task, { increase }) {
  await task.delay(10);
  increase();
}

const CounterStore = () => {
  let count = 0;

  return {
    state: {
      get count() {
        return count;
      },
      set count(value) {
        count = value;
      },
    },
    increase,
    increaseAsync,
  };
};

test("increase", () => {
  const store = createStore(CounterStore);
  store.increase();
  store.increase();
  store.increase();
  expect(store.state.count).toBe(3);
});

test("increase async", async () => {
  const store = createStore(CounterStore);
  store.increaseAsync();
  store.increaseAsync();
  store.increaseAsync();
  await delay(15);
  expect(store.state.count).toBe(3);
});
