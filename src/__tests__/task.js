import createTask from "../createTask";
import createEmitter from "../createEmitter";

const delay = (ms = 0, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

function createTestTask(options) {
  const emitter = createEmitter();
  const subscribeSync = emitter.get("dispatchSync").on;
  const subscribeAsync = (subscription) => {
    if (dispatchQueue.length) {
      dispatchQueue.slice(0).forEach(subscription);
    }
    return emitter.on("dispatchAsync", subscription);
  };
  const dispatchQueue = [];
  let isFlushing = false;

  function dispatchAsync(args) {
    dispatchQueue.push(args);
    if (isFlushing) return;
    isFlushing = true;
    Promise.resolve().then(flush);
  }

  function flush() {
    const args = dispatchQueue.shift();
    emitter.emit("dispatchAsync", args);
    if (dispatchQueue.length) {
      Promise.resolve().then(flush);
    } else {
      isFlushing = false;
    }
  }

  return {
    task: createTask({
      ...options,
      subscribeSync,
      subscribeAsync,
    }),
    dispatch(action, payload) {
      const args = { action, payload };
      emitter.emit("dispatchSync", args);
      dispatchAsync(args);
    },
  };
}

test("should cancel properly", () => {
  const { task } = createTestTask();

  expect(task.cancelled()).toBeFalsy();
  task.cancel();
  expect(task.cancelled()).toBeTruthy();
});

test("should not call specified func if task is cancelled", () => {
  const { task } = createTestTask();
  const callback = jest.fn();
  task.cancel();
  task.call(callback);
  expect(callback).toBeCalledTimes(0);
});

test("should resolve delayed promise if task is active", async () => {
  const { task } = createTestTask();
  let count = 0;
  async function increase() {
    await task.delay(10);
    count++;
  }
  increase();
  expect(count).toBe(0);
  await delay(15);
  expect(count).toBe(1);
});

test("should not resolve delayed promise if task is cancelled", async () => {
  const { task } = createTestTask();
  let count = 0;
  async function increase() {
    await task.delay(10);
    count++;
  }
  increase();
  task.cancel();
  expect(count).toBe(0);
  await delay(15);
  expect(count).toBe(0);
});

test("latest", async () => {
  let searchTask;
  let searchResults = 0;
  async function search() {
    searchTask && searchTask.cancel();
    const { delay } = (searchTask = createTestTask().task);
    await delay(10);
    searchResults++;
  }

  search();
  search();
  search();

  await delay(15);
  expect(searchResults).toBe(1);

  search();

  await delay(15);
  expect(searchResults).toBe(2);
});

test("debounce", async () => {
  const { task, dispatch } = createTestTask();
  let searchResults = 0;
  async function search() {
    task.cancelOn("cancel", "search");
    await task.debounce(10);
    searchResults++;
  }

  search();
  expect(searchResults).toBe(0);
  await delay();
  dispatch("cancel");
  await delay(15);
  expect(searchResults).toBe(0);

  search();
  await delay(15);
  expect(searchResults).toBe(1);
});

test("async race", async () => {
  const { task, dispatch } = createTestTask();
  const dispatchedActions = [];
  async function epic() {
    while (true) {
      const { action1, action2 } = await task.when({
        action1: "action1",
        action2: "action2",
      });
      action1 && dispatchedActions.push(action1);
      action2 && dispatchedActions.push(action2);
    }
  }

  epic();
  // await delay();
  dispatch("action1", 1);
  // await delay();
  dispatch("action2", 2);
  await delay(2);
  expect(dispatchedActions).toEqual([
    { type: "action1", payload: 1 },
    { type: "action2", payload: 2 },
  ]);
});

test("single action awaiting", async () => {
  const { task, dispatch } = createTestTask();
  const dispatchedActions = [];
  async function epic() {
    while (true) {
      const payload = await task.when("update");
      dispatchedActions.push(payload);
    }
  }

  epic();
  // await delay();
  dispatch("update", 1);
  // await delay();
  dispatch("update", 2);
  await delay(3);
  expect(dispatchedActions).toEqual([1, 2]);
});

test("konami code", async () => {
  const { task, dispatch } = createTestTask();
  const dispatchedActions = [];
  async function epic() {
    while (true) {
      const payload = await task.when(
        "up>up>down>down>left>right>left>right>B>A"
      );
      dispatchedActions.push(payload);
    }
  }
  epic();
  // await delay();
  dispatch("up");
  dispatch("up");
  dispatch("down");
  dispatch("down");
  dispatch("left");
  dispatch("right");
  dispatch("left");
  dispatch("right");
  dispatch("B");
  dispatch("A", 1);
  await delay();
  expect(dispatchedActions).toEqual([1]);

  // await delay();
  dispatch("up");
  dispatch("up");
  dispatch("down");
  dispatch("down");
  dispatch("left");
  dispatch("right");
  dispatch("left");
  dispatch("right");
  dispatch("B");
  dispatch("A", 2);
  await delay();
  expect(dispatchedActions).toEqual([1, 2]);

  // await delay();
  dispatch("up");
  dispatch("up");
  dispatch("down");
  dispatch("down");
  dispatch("left");
  dispatch("right");
  dispatch("left");
  dispatch("B");
  dispatch("right");
  dispatch("A", 2);
  await delay();
  expect(dispatchedActions).toEqual([1, 2]);
});
