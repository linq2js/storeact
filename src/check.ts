import storeact, { StoreContext, Task } from "./index";

const CounterStore = (context: StoreContext) => {
  let count = 0;

  console.log(
    context.atom(100).value,
    context.cache((a: number) => 100)(1),
    context.task.when("aa")
  );

  const that = {
    state() {
      return count;
    },
    increase(payload: number) {
      return true;
    },
    someData: true,
    async increaseAsync(payload: number, task: Task) {
      const result = await task.when(that.increase);
      console.log(result);
      return 1000;
    },
  };

  return that;
};

const store = storeact(CounterStore);
const result = storeact(CounterStore, (store, util) => ({
  increase: store.increase,
  count: util.loadable(store.state),
}));

console.log(
  store.increase(),
  store.state,
  result.increase,
  result.count,
  store.someData
);
