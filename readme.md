# Storeact

A tiny store for React. One API rule them all

## Installation

```text
npm i storeact --save
```

## Get started

## ES2015+ and Typescript:

```jsx harmony
import storeact from "storeact";
```

### Example

Let's make an increment/decrement simple application with React:

First, create your store. This is where your application state will live:

```jsx harmony
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CounterStore = () => {
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
    async increaseAsync() {
      await delay(1000);
      this.increase();
    },
  };
};
```

The store is just pure function, we define some APIs and export count value via state() method

Now create your component.
With Storeact your component can focus 100% on the UI and just call the actions that will automatically update the state:

```jsx harmony
function App() {
  const { count, increase, decrease, increaseAsync } = storeact(
    // the first argument is store function
    CounterStore,
    // the second argument is selector, that selects pie of store state or methods
    ({ increase, decrease, state }) => ({
      count: state,
      increase,
      decrease,
    })
  );
  return (
    <div className="App">
      <h1>{count}</h1>
      <div>
        <button onClick={() => increase()}>Increase</button>
        <button onClick={() => decrease()}>Decrease</button>
        <button onClick={() => increaseAsync()}>Increase Async</button>
      </div>
    </div>
  );
}
```

## Storeact 's cool features

1. Simple setup
1. Simple API (only one)
1. Store definition is pure function
1. Less boilerplate
1. Readability
1. Configurable
1. Easy to test
1. Asynchronous action
1. Future actions awaiting
1. High performance
1. Compatible with Immutable JS

## Advanced Usages

### Using action context

When an action is dispatching, storeact creates a task for each action call then pass that task as second argument of action.
Using action task to control execution flow more easily.

### Delay execution using task.delay(ms)

```jsx harmony
const Store = () => {
  let count = 0;

  return {
    increase() {
      count++;
    },
    async increaseAsync(payload, task) {
      await task.delay(1000);
      this.increase();
    },
  };
};
```

## Using task.cancelOn(...cancelActions)

```jsx harmony
const Store = () => {
  return {
    cancel() {},
    async search(payload, task) {
      task.cancelOn(this.cancel);
      await task.delay(3000);
      if (task.cancelled()) return;
      // update state logic here
    },
  };
};
```

## Using task.debounce(ms)

You can use debounce to wait certain amount of time before next execution block

```jsx harmony
const Store = () => {
  return {
    cancel() {},
    async search(payload, task) {
      await task.debounce(500);
      // update state logic here
    },
  };
};
```

### Wait for future action dispatching

```jsx harmony
const Store = () => {
  return {
    async startDataFetching() {
      const data = await fetch("api");
      this.dataFetched(data);
    },
    dataFetched() {},
    async search(payload, task) {
      this.startDataFetching();
      // wait until dataFetched action dispatched
      const data = await task.when(this.dataFetched);
      // do something
    },
  };
};
```

You can improve above example with cancellable searching logic

```jsx harmony
const Store = () => {
  return {
    async startDataFetching() {
      const data = await fetch("api");
      this.dataFetched(data);
    },
    dataFetched() {},
    cancel() {},
    async search(term, task) {
      // search progress will be cancelled if cancel action dispatched
      task.cancelOn(this.cancel);
      await task.debounce(500);
      this.startDataFetching(term);
      // wait until dataFetched action dispatched
      const data = await task.when(this.dataFetched);
      // do something
    },
  };
};
```

### Handling async data loading

You can use AsyncValue to handle async data loading easily

```jsx harmony
const TodoStore = ({ async }) => {
  // create async value object with empty array as default value
  const list = async([]);

  return {
    init(task) {
      // start data loading
      task.mutate(list, fetch("todo-api"));
    },
    state() {
      // return todos state is promise
      return { todos: list.promise };
    },
  };
};
```

In React component, to retrieve promised value we use selector util

```jsx harmony
const TodoCount = () => {
  const count = storeact(TodoStore, (store, util) => {
    return util.value(store.state.todos).length;
  });
  return <h1>Todos ({count})</h1>;
};

const App = () => {
  return (
    <React.Suspense fallback="Loading...">
      <TodoCount />
    </React.Suspense>
  );
};
```

A "Loading..." message will show if todos promise still not fulfilled

**util.loadable()**

Using util.loadable() to retrieve Loadable object to render loading progress manually

```jsx harmony
const TodoCount = () => {
  const loadable = storeact(TodoStore, (store, util) => {
    return util.loadable(store.state.todos);
  });
  if (loadable.state === "loading") return <div>Loading...</div>;
  if (loadable.state === "hasError")
    return <div>Oops, something went wrong. {loadable.error.message}</div>;
  // loadable.state === 'hasValue'
  return <h1>Todos ({count})</h1>;
};
```

## Real World Examples

1. [Shopping cart](https://codesandbox.io/s/storeact-v2-shopping-cart-sr5zj?file=/src/stores/CartStore.js)
1. [Shopping cart with code splitting for store](https://codesandbox.io/s/storeact-v2-shopping-cart-with-code-splitting-60mrj?file=/src/stores/CartStore/index.js)
