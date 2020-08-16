import { renderHook } from "@testing-library/react-hooks";
import storeact from "../index";

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

beforeEach(() => {
  delete ChildStore.__stores;
  delete ChildStore.__defaultStore;
  delete ParentStore.__stores;
  delete ParentStore.__defaultStore;
});

test("store hook", () => {
  const { result } = renderHook(() => storeact(ParentStore));
  result.current.increase();
  result.current.increase();
  result.current.increase();
  expect(result.current.state).toEqual({ parent: true, count: 3 });
});

test("parent & child store", () => {
  const { result } = renderHook(() => storeact(ChildStore));
  result.current.increase();
  result.current.increase();
  result.current.increase();
  result.current.parentIncrease();
  expect(result.current.state).toEqual({ parent: true, child: true, count: 4 });
});
