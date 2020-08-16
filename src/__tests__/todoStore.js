import { renderHook } from "@testing-library/react-hooks";
import storeact from "../index";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TodoStore = () => {
  const { async, lock } = storeact();

  function generateId() {
    return Math.random().toString(16);
  }

  async function loadData() {
    await async.delay(5);
    return [
      { id: 1, title: "todo 1", isCompleted: false },
      { id: 2, title: "todo 2", isCompleted: true },
    ];
  }

  // set default value for todos
  // use autoUpdate() option to make sure store re-update whenever list changed
  const list = async.value([]).autoUpdate();

  return {
    state() {
      return list.value;
    },
    init() {
      // load todos from remote server
      list.load(loadData()).onReady(() => this.listLoaded());
      // lock actions until list loaded
      lock([this.add, this.remove, this.toggle], list);
    },
    listLoaded() {},
    add({ title }) {
      list.update((prev) =>
        prev.concat({ title, id: generateId(), isCompleted: false })
      );
    },
    remove({ id }) {
      list.update((prev) => prev.filter((x) => x.id !== id));
    },
    toggle({ id }) {
      list.update((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, isCompleted: !x.isCompleted } : x
        )
      );
    },
  };
};

test("load todo list", async () => {
  const { result } = renderHook(() => storeact(TodoStore));
  await delay(15);
  expect(result.current.state.length).toBe(2);
});

test("add todo", async () => {
  const { result } = renderHook(() => storeact(TodoStore));
  await delay(15);
  result.current.add({ title: "todo 3" });
  await delay();
  result.current.add({ title: "todo 4" });
  await delay();
  expect(result.current.state.length).toBe(4);
});
