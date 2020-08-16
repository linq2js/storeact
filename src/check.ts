import storeact, { Flow } from "./index";

function StoreHook() {
  return {
    state() {
      return { p1: 1, pr2: 2 };
    },
    otherMethods() {},
  };
}

function Store() {
  const { async } = storeact();
  const { state: hookState, ...hookActions } = StoreHook();
  let results: Promise<number>;
  const value = async.value(true);

  const that = {
    flow() {
      return {
        $cancel: "cancel",
        search: {
          $block: true,
        },
      } as Flow;
    },
    init() {},
    state() {
      return {
        results,
        value,
        ...hookState(),
      };
    },
    ...hookActions,
    async search(term: string) {
      const success = await async.debounce(0, that.search, that.cancel);
      if (!success) return;
      const searchCT = async.cancellable(that.search, that.cancel);
      results = searchCT.wrap(that.fetch(term));
    },
    cancel() {},
    fetch(term: string) {
      return Promise.resolve(1100);
    },
  };

  return that;
}

const store = storeact(Store);

const result = storeact(Store, ({ valueOf, loadableOf, state }) => ({
  results: valueOf(state.results),
  loadable: loadableOf(state.results),
  otherValue: valueOf(state.value),
}));

console.log(store.cancel(), result.results, result.loadable);

const useCounter = () => {
  let count = 0;
  return {
    state() {
      return count;
    },
    increase() {
      count++;
    },
    decrease() {
      count--;
    },
  };
};

const ParentStore = () => {
  const { state: counterState, ...counterProps } = useCounter();

  return {
    state() {
      return {
        parent: true,
        count: counterState(),
      };
    },
    ...counterProps,
  };
};

const ChildStore = () => {
  const parentStore = storeact(ParentStore);

  return {
    state() {
      return {
        ...parentStore.state,
        child: true,
      };
    },
    increase() {
      parentStore.increase();
    },
    decrease() {
      parentStore.decrease();
    },
    parentIncrease: parentStore.increase,
  };
};

const child = storeact(ChildStore);
console.log(child.state);
