import createStore from "../createStore";

test("no arg selector, it should return current state", () => {
  const store = createStore(() => {
    return {
      state() {
        return {};
      },
      selectors: {
        getState(state) {
          return state;
        },
      },
    };
  });

  expect(store.state).toBe(store.getState());
});

test("selector dependency 1 level", () => {
  const sumCallback = jest.fn();
  const store = createStore(() => {
    return {
      state() {
        return {};
      },
      selectors: {
        one(by) {
          return 1 * by;
        },
        two(by) {
          return 2 * by;
        },
        three(by) {
          return 3 * by;
        },
        sum: [
          "one",
          "two",
          "three",
          (one, two, three) => {
            sumCallback();
            return one + two + three;
          },
        ],
      },
    };
  });

  expect(store.sum(1)).toBe(6);
  expect(store.sum(2)).toBe(12);
  expect(store.sum(3)).toBe(18);
  expect(sumCallback).toBeCalledTimes(3);
  expect(store.sum(3)).toBe(18);
  expect(store.sum(3)).toBe(18);
  expect(store.sum(3)).toBe(18);
  expect(sumCallback).toBeCalledTimes(3);
});

test("complexity selectors using selectorMap", () => {
  const store = createStore(() => {
    let products = [];
    let quantityById = {};

    return {
      state() {
        return {
          products,
          quantityById,
        };
      },
      selectors: {
        selectQuantityById(state) {
          return state.quantityById;
        },
        selectCartProductIds: [
          "selectQuantityById",
          (quantityById) => Object.keys(quantityById),
        ],
        selectCartProducts: [
          "selectCartProductIds",
          "selectProductMap",
          "selectQuantityById",
          (productIds, productMap, quantityById) => {
            return productIds.map((id) => ({
              ...productMap[id],
              quantity: quantityById[id] || 0,
            }));
          },
        ],
        selectProducts(state) {
          return state.products;
        },
        selectProductMap: [
          "selectProducts",
          (products) => {
            return products.reduce((result, product) => {
              result[product.id] = product;
              return result;
            }, {});
          },
        ],
      },
      addProduct(product) {
        products = products.concat(product);
      },
      addToCart(productId) {
        quantityById = {
          ...quantityById,
          [productId]: (quantityById[productId] || 0) + 1,
        };
      },
    };
  });

  expect(store.selectProductMap()).toEqual({});

  store.addProduct({ id: 1, title: "product 1" });
  store.addProduct({ id: 2, title: "product 2" });

  expect(store.selectProductMap()).toEqual({
    1: { id: 1, title: "product 1" },
    2: { id: 2, title: "product 2" },
  });

  expect(store.selectCartProducts()).toEqual([]);

  store.addToCart(1);

  expect(store.selectCartProducts()).toEqual([
    { id: 1, title: "product 1", quantity: 1 },
  ]);

  store.addToCart(1);

  expect(store.selectCartProducts()).toEqual([
    { id: 1, title: "product 1", quantity: 2 },
  ]);

  store.addToCart(2);

  expect(store.selectCartProducts()).toEqual([
    { id: 1, title: "product 1", quantity: 2 },
    { id: 2, title: "product 2", quantity: 1 },
  ]);
});

test("complexity selectors using list of pure function", () => {
  function selectQuantityById(state) {
    return state.quantityById;
  }

  function selectProducts(state) {
    return state.products;
  }

  const selectCartProductIds = [
    selectQuantityById,
    (quantityById) => Object.keys(quantityById),
  ];

  const selectProductMap = [
    selectProducts,
    (products) => {
      return products.reduce((result, product) => {
        result[product.id] = product;
        return result;
      }, {});
    },
  ];

  const selectCartProducts = [
    selectCartProductIds,
    selectProductMap,
    selectQuantityById,
    (productIds, productMap, quantityById) => {
      return productIds.map((id) => ({
        ...productMap[id],
        quantity: quantityById[id] || 0,
      }));
    },
  ];

  const store = createStore(() => {
    let products = [];
    let quantityById = {};

    return {
      state() {
        return {
          products,
          quantityById,
        };
      },
      selectors: {
        selectProductMap,
        selectCartProducts,
      },
      addProduct(product) {
        products = products.concat(product);
      },
      addToCart(productId) {
        quantityById = {
          ...quantityById,
          [productId]: (quantityById[productId] || 0) + 1,
        };
      },
    };
  });

  expect(store.selectProductMap()).toEqual({});

  store.addProduct({ id: 1, title: "product 1" });
  store.addProduct({ id: 2, title: "product 2" });

  expect(store.selectProductMap()).toEqual({
    1: { id: 1, title: "product 1" },
    2: { id: 2, title: "product 2" },
  });

  expect(store.selectCartProducts()).toEqual([]);

  store.addToCart(1);

  expect(store.selectCartProducts()).toEqual([
    { id: 1, title: "product 1", quantity: 1 },
  ]);

  store.addToCart(1);

  expect(store.selectCartProducts()).toEqual([
    { id: 1, title: "product 1", quantity: 2 },
  ]);

  store.addToCart(2);

  expect(store.selectCartProducts()).toEqual([
    { id: 1, title: "product 1", quantity: 2 },
    { id: 2, title: "product 2", quantity: 1 },
  ]);
});
