import createStore from "../createStore";
import storeact from "../index";

const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

const CartStore = ({ atom }) => {
  const getProducts = () =>
    delay(10, [
      { id: 1, name: "product 1" },
      { id: 2, name: "product 2" },
    ]);
  const products = atom({});
  let checkoutResult = undefined;

  return {
    async init() {
      // wait until all products ready
      await this._getAllProducts();
    },
    state() {
      return { products, checkoutResult };
    },
    // private actions
    _getAllProducts(_, { mutate }) {
      return mutate(products, getProducts(), (result, prev) => ({
        ...prev,
        ...result.reduce((obj, product) => {
          obj[product.id] = product;
          return obj;
        }, {}),
      }));
    },
    // public actions
    checkout(cart, { lock }) {
      async function doCheckout() {
        delay(10);
        checkoutResult = cart;
      }

      return lock(doCheckout);
    },
  };
};

test("should not call specified func if task is cancelled", () => {
  const store = createStore(() => {
    let count = 0;
    return {
      state() {
        return count;
      },
      increase(cancel, t) {
        cancel && t.cancel();
        t.call(() => count++);
      },
    };
  });
  store.increase(true);
  expect(store.state).toBe(0);

  store.increase(false);
  expect(store.state).toBe(1);
});

test("should resolve delayed promise if task is active", async () => {
  const store = createStore(() => {
    let count = 0;
    return {
      state() {
        return count;
      },
      async increaseAsync(cancel, t) {
        cancel && t.cancel();
        await t.delay(10);
        count++;
      },
    };
  });

  store.increaseAsync();
  expect(store.state).toBe(0);
  await delay(15);
  expect(store.state).toBe(1);
});

test("latest", async () => {
  const store = createStore(() => {
    let count = 0;
    return {
      state() {
        return count;
      },
      async increaseAsync(_, { latest, delay }) {
        latest();
        await delay(10);
        count++;
      },
    };
  });

  store.increaseAsync();
  store.increaseAsync();
  store.increaseAsync();

  await delay(20);
  expect(store.state).toBe(1);
});

test("search", async () => {
  const store = createStore(() => {
    let results = [];

    return {
      state() {
        return results;
      },
      async fetchData(term) {
        await delay(10);
        this.dataFetched(term);
      },
      async search(term, { debounce, cancelOn, when }) {
        cancelOn(this.cancel);
        await debounce(10);

        // start data fetching, do not block current execution with await this.fetchData(term);
        this.fetchData(term);

        const result = await when(this.dataFetched);
        results = results.concat(result);
      },
      dataFetched() {},
      cancel() {},
    };
  });
  expect(store.state).toEqual([]);
  store.search(0);
  store.search(1);
  store.search(2);
  await delay(25);
  expect(store.state).toEqual([2]);
  store.search(0);
  // cancel searching before it done
  store.cancel();
  await delay(25);
  // so nothing new in results
  expect(store.state).toEqual([2]);
});

test("mutate", async () => {
  const store = storeact(CartStore);
  await delay(15);
  expect(store.state.products.value).toEqual({
    1: { id: 1, name: "product 1" },
    2: { id: 2, name: "product 2" },
  });
});

test("lock", async () => {
  const store = storeact(CartStore);
  store.checkout(1);
  store.checkout(2);
  store.checkout(3);
  await delay(15);
  expect(store.state.checkoutResult).toBe(1);
});
