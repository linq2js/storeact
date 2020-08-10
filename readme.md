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
