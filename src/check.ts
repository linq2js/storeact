import storeact, { StoreContext } from "./index";

const CounterStore = ({ any }: StoreContext) => {
  let count = 0;

  return {
    state: () => ({ count }),
    async init() {
      console.log("app start");
      const [payload] = await any("increase");
      console.log(payload);
    },
    increase: () => count++,
    decrease: () => count--,
    increaseAsync: async () => {
      count++;
    },
  };
};

const store = storeact(CounterStore);
const count = storeact(CounterStore, (store) => store.count);
