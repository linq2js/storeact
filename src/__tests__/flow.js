import createActionFlow from "../createActionFlow";
import storeact from "../index";
import { renderHook } from "@testing-library/react-hooks";

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

function createCounterActions() {
  let count = 0;
  return {
    get: () => count,
    increase: { action: "increase", invoke: () => count++ },
    decrease: { action: "decrease", invoke: () => count-- },
    cancel: { action: "cancel" },
  };
}

function flowShouldBeEmpty(flow) {
  expect(flow.length).toBe(0);
}

test("with fork", () => {
  const flow = createActionFlow({
    increase: {},
    decrease: {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
  flow.dispatch(actions.decrease);
  expect(actions.get()).toBe(0);
  flowShouldBeEmpty(flow);
});

test("without fork", () => {
  const flow = createActionFlow({
    init: {
      $fork: false,
      increase: {},
      decrease: {},
    },
  });
  const actions = createCounterActions();
  flow.dispatch({ action: "init" });
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
  flow.dispatch(actions.decrease);
  expect(actions.get()).toBe(1);

  flow.reset();
  // cannot increase if init was not called
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);

  flow.dispatch({ action: "init" });
  flow.dispatch(actions.decrease);
  expect(actions.get()).toBe(0);
  flowShouldBeEmpty(flow);
});

test("debounce", async () => {
  const flow = createActionFlow({
    increase: {
      $debounce: 10,
    },
    decrease: {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  flow.dispatch(actions.increase);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  await delay(15);
  expect(actions.get()).toBe(1);

  flow.dispatch(actions.increase);
  await delay(15);
  expect(actions.get()).toBe(2);
  flowShouldBeEmpty(flow);
});

test("cancel", async () => {
  const flow = createActionFlow({
    increase: {
      $debounce: 10,
    },
    decrease: {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  flow.dispatch(actions.cancel);
  expect(actions.get()).toBe(0);
  await delay(15);
  expect(actions.get()).toBe(0);
  flowShouldBeEmpty(flow);
});

test("action groups", () => {
  const flow = createActionFlow({
    // increase or decrease
    "increase|decrease": {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  flow.dispatch(actions.decrease);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});

test("exclude actions", () => {
  const flow = createActionFlow({
    // not decrease action
    "not:decrease": {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  flow.dispatch(actions.decrease);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(2);
});

test("any action", () => {
  const flow = createActionFlow({
    "*": {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  flow.dispatch(actions.decrease);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});

test("konami", () => {
  const flow = createActionFlow({
    "chain:up > up > down > down > left > right > left > right > A > B": {
      done: {},
    },
  });
  let count = 0;
  flow.dispatch("up");
  flow.dispatch("up");
  flow.dispatch("down");
  flow.dispatch("down");
  flow.dispatch("left");
  flow.dispatch("right");
  flow.dispatch("left");
  flow.dispatch("right");
  flow.dispatch("A");
  flow.dispatch("B");
  flow.dispatch({ action: "done", invoke: () => count++ });

  flow.dispatch("up");
  flow.dispatch("up");
  flow.dispatch("down");
  flow.dispatch("down");
  flow.dispatch("left");
  flow.dispatch("right");
  flow.dispatch("left");
  flow.dispatch("B");
  flow.dispatch("right");
  flow.dispatch("A");

  expect(count).toBe(1);
});

test("integrate with store", async () => {
  const searchCallback = jest.fn();
  const loadTodos = async () => {
    await delay(10);
    return ["todo 1", "todo 2"];
  };
  const TodoStore = () => {
    const { async } = storeact();
    const list = async.value([]).autoUpdate();
    return {
      flow: {
        init: {
          // add action will be available after init
          add: {},
          search: {},
        },
      },
      state() {
        return list.value;
      },
      init() {
        return list.load(loadTodos()).promise;
      },
      add(item) {
        list.update((prev) => prev.concat(item));
      },
      async search() {
        const cancellable = async.cancellable(this.search);
        await delay(10);
        if (cancellable.cancelled) {
          return;
        }
        searchCallback();
      },
    };
  };
  const { result } = renderHook(() => storeact(TodoStore));
  expect(result.current.state).toEqual([]);
  result.current.add("todo 3");
  expect(result.current.state).toEqual([]);
  await delay(100);
  expect(result.current.state).toEqual(["todo 1", "todo 2"]);
  result.current.add("todo 3");
  expect(result.current.state).toEqual(["todo 1", "todo 2", "todo 3"]);
  result.current.search();
  result.current.search();
  result.current.search();
  expect(searchCallback).toBeCalledTimes(0);
  await delay(20);
  expect(searchCallback).toBeCalledTimes(1);
});
