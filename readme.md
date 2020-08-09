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
const CounterStore = () => {
  let count = 0;
  return {
    state() {
      return { count };
    },
    increase() {
      count++;
    },
    decrease() {
      count--;
    },
  };
};
```

The store is just pure function, we define some APIs and export count value via state() method

Now create your component.
With Storeact your component can focus 100% on the UI and just call the actions that will automatically update the state:

```jsx harmony
const CounterValue = () => {
  const count = storeact(CounterStore, (store) => store.count);
  return <h1>{count}</h1>;
};

const CounterActions = () => {
  const { increase, decrease, increaseAsync } = storeact(
    // the first argument is store function
    CounterStore,
    // the second argument is selector, that selects pie of state or store methods
    (store) => ({
      // ofcourse we can select store.count here
      // but CounterActions does not need to show count value
      increase: store.increase,
      decrease: store.decrease,
    })
  );

  return (
    <div>
      <button onClick={() => increase()}>Increase</button>
      <button onClick={() => decrease()}>Decrease</button>
      <button onClick={() => increaseAsync()}>Increase Async</button>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <CounterValue />
      <CounterActions />
    </div>
  );
}
```

## Storeact 's cool features

1. Simple setup
1. Simple API (only one)
1. Store declaration is pure function
1. Less boilerplate
1. Readability
1. Configurable
1. Easy to test
1. Asynchronous action
1. Future actions awaiting
1. High performance
1. Compatible with Immutable JS

## Advanced Usages

## Real World Examples
