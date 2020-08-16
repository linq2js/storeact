import { renderHook } from "@testing-library/react-hooks";
import storeact from "storeact";

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

const TestStore = () => {
  const { async } = storeact();

  let count = 1;
  let initialized = false;
  let latestSearchValue = 0;
  let debouncedSearchValue = 0;
  let clickResult;

  return {
    init() {
      initialized = true;
    },
    state: () => ({
      initialized,
      count,
      latestSearchValue,
      debouncedSearchValue,
      clickResult
    }),
    increase() {
      count++;
    },
    decrease() {
      count--;
    },
    async latestSearch() {
      const cancellable = async.cancellable(this.latestSearch);
      await async.delay(10);
      // latestSearch is called twice
      if (cancellable.cancelled) return;
      latestSearchValue++;
    },
    async debouncedSearch() {
      const cancelled = await async.debounce(
        10,
        this.cancel,
        this.debouncedSearch
      );
      if (cancelled) return;
      debouncedSearchValue++;
    },
    cancel() {},
    async increaseAsync() {
      await async.delay(10);
      this.increase();
    },
    click1() {},
    click2() {},
    click3() {},
    async testClick() {
      clickResult = await async.race(this.click1, this.click2, this.click3);
    }
  };
};

beforeEach(() => {
  delete TestStore.__stores;
  delete TestStore.__defaultStore;
});

test("store.state", async () => {
  const { result } = renderHook(() => storeact(TestStore));

  expect(result.current.state.initialized).toBe(true);
  expect(result.current.state.count).toBe(1);
  result.current.increase();
  result.current.increase();
  expect(result.current.state.count).toBe(3);
  result.current.increaseAsync();
  await delay(15);
  expect(result.current.state.count).toBe(4);
});

test("store.onDispatch(listener)", async () => {
  const callback = jest.fn();
  const { result } = renderHook(() => storeact(TestStore));
  result.current.onDispatch(callback);
  result.current.increase();
  result.current.increaseAsync();
  await delay(15);
  expect(callback).toBeCalledTimes(3);
});

test("store.onDispatch(action, listener)", () => {
  const callback = jest.fn();
  const { result } = renderHook(() => storeact(TestStore));
  result.current.onDispatch("increase", callback);
  result.current.increase();
  result.current.decrease();
  expect(callback).toBeCalledTimes(1);
});

test("async.debounce", async () => {
  const { result } = renderHook(() => storeact(TestStore));
  result.current.debouncedSearch();
  result.current.debouncedSearch();
  result.current.debouncedSearch();
  await delay(30);
  expect(result.current.state.debouncedSearchValue).toBe(1);
});

test("async.cancellable", async () => {
  const { result } = renderHook(() => storeact(TestStore));
  result.current.latestSearch();
  result.current.latestSearch();
  result.current.latestSearch();
  await delay(30);
  expect(result.current.state.latestSearchValue).toBe(1);
});

test("async.race: multiple targets", async () => {
  const { result } = renderHook(() => storeact(TestStore));
  result.current.testClick();
  result.current.click1(1);
  await delay();
  expect(result.current.state.clickResult).toBe(1);

  result.current.testClick();
  result.current.click2(2);
  result.current.click1(1);
  await delay();
  expect(result.current.state.clickResult).toBe(2);

  result.current.testClick();
  result.current.click3(3);
  await delay();
  expect(result.current.state.clickResult).toBe(3);
});
