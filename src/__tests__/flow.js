import createActionFlow from "../createActionFlow";
import storeact from "../index";
import { renderHook } from "@testing-library/react-hooks";

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

function createCounterActions(initial = 0) {
  let count = initial;
  return {
    get: () => count,
    increase: { action: "increase", invoke: () => count++ },
    decrease: { action: "decrease", invoke: () => count-- },
    cancel: { action: "cancel" },
  };
}

test("simple flow", () => {
  const flow = createActionFlow({
    increase: {},
    decrease: {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
  flow.dispatch(actions.decrease);
  expect(actions.get()).toBe(0);
});

test("blocking flow", async () => {
  let initInstanceDone = 0;
  const flow = createActionFlow({
    init: {
      increase: {},
      decrease: {},
    },
  });
  const actions = createCounterActions();
  flow.dispatch({
    action: "init",
    invoke: () => delay(10).then(() => initInstanceDone++),
  });
  flow.dispatch({
    action: "init",
    invoke: () => delay(50).then(() => initInstanceDone++),
  });
  flow.dispatch(actions.increase);
  // nothing change because both init instances are running
  expect(actions.get()).toBe(0);
  await delay(15);
  // first init instance is done but the other still not done so we cannot invoke increase
  expect(initInstanceDone).toBe(1);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  // at this time, both init instances are done
  await delay(55);
  expect(initInstanceDone).toBe(2);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(2);
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

test("debounce", async () => {
  const flow = createActionFlow({
    $options: {
      debounce: {
        increase: 10,
      },
    },
    increase: {},
  });
  const actions = createCounterActions();
  flow.dispatch(actions.increase);
  flow.dispatch(actions.increase);
  flow.dispatch(actions.increase);
  flow.dispatch(actions.increase);

  expect(actions.get()).toBe(0);
  await delay(20);
  expect(actions.get()).toBe(1);
});

test("handle success", async () => {
  const flow = createActionFlow({
    increaseAsync: {
      $success: "#shadowFlow",
    },
    "#shadowFlow": {
      increase: {},
    },
  });

  const actions = createCounterActions();
  // cannot dispatch increase
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  // increaseAsync will init __shadowFlow
  flow.dispatch({ action: "increaseAsync", invoke: () => delay(10) });
  // but we need to wait until increaseAsync done
  // so we cannot dispatch increase at this time
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  await delay(20);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});

test("handle error", async () => {
  const flow = createActionFlow({
    increaseAsync: {
      $error: "#shadowFlow",
    },
    "#shadowFlow": {
      increase: {},
    },
  });

  const actions = createCounterActions();
  // cannot dispatch increase
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  // increaseAsync will init __shadowFlow
  flow.dispatch({
    action: "increaseAsync",
    invoke: () => delay(10).then(() => Promise.reject()),
  });
  // but we need to wait until increaseAsync done
  // so we cannot dispatch increase at this time
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  await delay(20);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});

test("handle done", async () => {
  const flow = createActionFlow({
    increaseAsync: {
      $done: "#shadowFlow",
    },
    "#shadowFlow": {
      increase: {},
    },
  });

  const actions = createCounterActions();
  // cannot dispatch increase
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  // increaseAsync will init __shadowFlow
  flow.dispatch({
    action: "increaseAsync",
    invoke: () => delay(10).then(() => Promise.reject()),
  });
  // but we need to wait until increaseAsync done
  // so we cannot dispatch increase at this time
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  await delay(20);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});

test("short hand for $success", async () => {
  const flow = createActionFlow({
    increaseAsync: "#shadowFlow",
    "#shadowFlow": {
      increase: {},
    },
  });

  const actions = createCounterActions();
  // cannot dispatch increase
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  // increaseAsync will init __shadowFlow
  flow.dispatch({ action: "increaseAsync", invoke: () => delay(10) });
  // but we need to wait until increaseAsync done
  // so we cannot dispatch increase at this time
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  await delay(20);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});

test("inline shadow flow", async () => {
  const flow = createActionFlow({
    increaseAsync: {
      $success: {
        increase: {},
      },
    },
  });

  const actions = createCounterActions();
  // cannot dispatch increase
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  // increaseAsync will init __shadowFlow
  flow.dispatch({ action: "increaseAsync", invoke: () => delay(10) });
  // but we need to wait until increaseAsync done
  // so we cannot dispatch increase at this time
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(0);
  await delay(20);
  flow.dispatch(actions.increase);
  expect(actions.get()).toBe(1);
});
