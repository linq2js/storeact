import storeact from "../index";

const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

test("should get store context properly", () => {
  const store = storeact((context1) => {
    const context2 = storeact();
    expect(context1).toBe(context2);
  });
});

test("should get an error when try to get store context outside store definition", () => {
  expect(() => storeact()).toThrowError();
});

test("should not allow to dispatch or access private prop from outside store", () => {
  const store = storeact(() => {
    return {
      _privateProp: "private",
      _privateMethod() {},
      publicProp: "public",
      publicMethod() {},
    };
  });

  store.publicMethod();
  expect(store.publicProp).toBe("public");

  expect(() => store._privateMethod()).toThrowError();
  expect(() => store._privateProp).toThrowError();
});

test("dynamic prop", () => {
  const testData = [1, 2, 3];
  const store = storeact(() => {
    return {
      get data() {
        return testData.shift();
      },
    };
  });

  // ignore first value
  expect(store.data).toBe(2);
  expect(store.data).toBe(3);
});

test("should prevent action dispatching if store is initializing", async () => {
  const store = storeact(() => {
    let count = 0;
    return {
      state: () => count,
      async init({ delay }) {
        await delay(10);
      },
      increase() {
        count++;
      },
    };
  });

  store.increase();
  store.increase();
  store.increase();

  expect(store.state).toBe(0);

  await delay(15);
  expect(store.state).toBe(0);
  store.increase();
  expect(store.state).toBe(1);
});
