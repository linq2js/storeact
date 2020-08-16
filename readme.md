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

### Using store context

You can call storeact() to retrieve store context

```jsx harmony
const context = storeact();
```

Store context contains many utilities (async, cache...). You can use object destructing to simplify code

```jsx harmony
const { async, cache } = storeact();
```

### Delay execution using async.delay(ms)

```jsx harmony
const Store = () => {
  const { async } = storeact();
  let count = storeact();

  return {
    increase() {
      count++;
    },
    async increaseAsync() {
      await async.delay(1000);
      this.increase();
    },
  };
};
```

## Using async.cancellable(...cancelActions)

```jsx harmony
const Store = () => {
  const { async } = storeact();

  return {
    cancel() {},
    async search() {
      // cancellable object will be cancelled if this.search or this.cancel are dispatched
      // that means search() call is always last one
      const cancellable = async.cancellable(this.search, this.cancel);
      await async.delay(3000);
      if (cancellable.cancelled) return;
      // update state logic here
    },
  };
};
```

## Using async.debounce(ms, ...cancelActions)

You can use debounce to wait certain amount of time before next execution block

```jsx harmony
const Store = () => {
  const { async } = storeact();

  return {
    cancel() {},
    async search() {
      // A resolved value is true if it passed 500ms or search(), cancel() dispatched
      const debounceCancelled = await async.debounce(
        500,
        this.search,
        this.cancel
      );
      if (debounceCancelled) return;
      // you can combine cancellable latest logic (example above) here
    },
  };
};
```

### Wait for future action dispatching

```jsx harmony
const Store = () => {
  const { async } = storeact();

  return {
    async startDataFetching() {
      await fetch("");
      this.dataFetched();
    },
    dataFetched() {},
    async search() {
      this.startDataFetching();
      // wait until dataFetched action dispatched
      await async.race(this.dataFetched);
      // do something
    },
  };
};
```

You can improve above example with cancellable searching logic

```jsx harmony
const Store = () => {
  const { async } = storeact();

  return {
    cancel() {},
    async startDataFetching() {
      await fetch("");
      this.dataFetched();
    },
    dataFetched() {},
    async search() {
      this.startDataFetching();
      // wait until dataFetched action dispatched
      const { cancelled } = await async.race({
        cancelled: this.cancel,
        done: this.dataFetched,
      });
      // if cancel action dispatched before dataFetched
      if (cancelled) return;

      // do something
    },
  };
};
```

### Handling async data loading

You can use async.value() to handle async data loading easily

```jsx harmony
const TodoStore = () => {
  const { async } = storeact();
  // create async value object with empty array as default value
  const list = async.value([]);

  return {
    init() {
      // start data loading
      list.load(fetch("todo-api"));
    },
    state() {
      // return todos state is promise
      return { todos: list.promise };
    },
  };
};
```

In React component, to retrieve promised value we use store.valueOf()

```jsx harmony
const TodoCount = () => {
  const count = storeact(TodoStore, (store) => {
    return store.valueOf(store.state.todos).length;
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

**loadableOf**

Using loadableOf() to retrieve Loadable object to render loading progress manually

```jsx harmony
const TodoCount = () => {
  const loadable = storeact(TodoStore, (store) => {
    return store.loadableOf(store.state.todos);
  });
  if (loadable.state === "loading") return <div>Loading...</div>;
  if (loadable.state === "hasError")
    return <div>Oops, something went wrong. {loadable.error.message}</div>;
  // loadable.state === 'hasValue'
  return <h1>Todos ({count})</h1>;
};
```

## Real World Examples
