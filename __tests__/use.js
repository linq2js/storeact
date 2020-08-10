import { renderHook, act, cleanup } from "@testing-library/react-hooks";
import storeact from "../src/index";

const ParentCounterStore = () => {
  let count = 1;

  return {
    state: () => count,
    increase: () => count++,
  };
};

const ChildCounterStore = ({ use }) => {
  const parent = use(ParentCounterStore);
  let count = 2;

  return {
    state: () => ({
      childCount: count,
      parentCount: parent.state,
    }),
    increase: () => count++,
  };
};

beforeEach(() => {
  delete ChildCounterStore.__instance;
  delete ParentCounterStore.__instance;
});

test("use parent store", () => {
  const childHook = renderHook(() => storeact(ChildCounterStore));
  expect(childHook.result.current.state).toEqual({
    parentCount: 1,
    childCount: 2,
  });
  const parentHook = renderHook(() => storeact(ParentCounterStore));
  expect(parentHook.result.current.state).toEqual(1);
  parentHook.result.current.increase();
  expect(childHook.result.current.state).toEqual({
    parentCount: 2,
    childCount: 2,
  });
});
