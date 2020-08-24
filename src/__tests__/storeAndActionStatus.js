import createStore from "../createStore";

const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

test("running status", async () => {
  const store = createStore(() => {
    let data = 0;

    return {
      state() {
        return data;
      },
      async init() {
        await delay(10);
        data++;
      },
      async increase() {
        await delay(10);
        data++;
      },
    };
  });

  expect(store.state).toBe(0);
  expect(store.busy).toBe(true);
  await delay(15);
  expect(store.state).toBe(1);
  store.increase();
  expect(store.busy).toBe(true);
  expect(store.increase.running).toBe(true);
  await delay(15);
  expect(store.busy).toBe(false);
  expect(store.increase.running).toBe(false);
});
