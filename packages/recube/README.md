# Recube - State Management Library

---

## Introduction

Recube is a state management library designed for React applications. It offers a unique approach to managing application state, optimizing component rendering, and handling asynchronous operations. With its intuitive API and highly optimization, Recube simplifies state management while enhancing performance.

## Getting started

### Installation

```bash
npm install recube

# or

yarn add recube
```

### First create an action and state

```ts
import { action, state } from 'recube';

type Mode = 'count' | 'doubledCount';

// create an simple action with no body and retrieves no parameter
const increment = action();

// create an action has payload
const changeMode = action<Mode>();

// create state with default value is 0
const count = state(0)
  // when increment action dispatched, we do increment `count` value by passing state reducer
  .when(increment, prev => prev + 1);

// create derived state. A derived state retrieves computeFn, when execute computeFn, `recube` detects what states are dependencies and listen all of them, re-compute doubledCount whenever dependency states changed
const doubledCount = state(() => {
  return count() * 2;
});

// create a state indicate what we want to show
const mode = state<Mode>('count')
  // unlike `count` state, we dont pass reducer to handle changeMode action, this means recube uses action payload/result as next state value
  .when(changeMode);
```

### Then bind your components, and that's it&#33;

```tsx
import { cube } from 'recube/react';
import { count, doubledCount, increment, changeMode } from './counterLogic';

// wrap render function with cube(), `cube` does all state bindings automatically, no hooks needed
const CounterValue = cube(() => {
  // `recube` does not use hook, it reduces code complexity too much
  // you don't need to bind 3 states like other state management libs, ex:
  // const modeValue = useAtom(mode)
  // const countValue = useAtom(count)
  // const doubledCountValue = useAtom(doubledCount)
  // const finalValue = modeValue === 'count' ? countValue : doubledCountValue
  // with recube, you can use conditional binding easily
  // a state is function, invoke the function to retrieve current state value
  return <h1>{mode() === 'count' ? count() : doubledCount()}</h1>;
});

const CounterActions = cube(
  ({ extraAction }: { extraAction: VoidCallback }) => {
    return (
      <>
        <button onClick={() => increment()}>Increment</button>
        <button
          onClick={() =>
            changeMode(mode() === 'count' ? 'doubledCount' : 'count')
          }
        >
          Change mode ({mode()})
        </button>
        <button onClick={extraAction}>Extra Action</button>
      </>
    );
  },
);

const App = () => {
  const rerender = useState({})[1];
  const extraAction = () => {
    alert('Extra Action');
  };

  return (
    <>
      <button onClick={() => rerender({})}>Rerender</button>
      {/* the CounterValue component does not utilize any props so it renders once and it does nothing when parent component re-renders */}
      <CounterValue />
      {/* The CounterActions component utilizes extraAction during its rendering phase. However, due to the `cube` converts extraAction into a stable callback automatically, CounterActions remains unaffected by re-renders of the parent component. This stability holds true even if the extraAction callback changes frequently, ensuring that such alterations do not trigger re-renders of CounterActions */}
      <CounterActions extraAction={extraAction} />
    </>
  );
};
```

## Features

### Why `recube` over other state management libs?

- Simple and un-opinionated
- Doesn't wrap your app in context providers
- Support immer for reducing state value
- Support Suspense and ErrorBoundary
- Support async actions and states
- Including a lot of component rendering optimizing
- Support action middleware to control action dispatching flow in various ways
- Free from React hooks (useEffect, useCallback, useMemo, useRef), thus circumventing issues related to hook dependencies.
- No binding hooks needed and support condition binding

### Why `recube` over context?

- Less boilerplate
- Highly optimizing for rendering. The `cube` re-renders only its states changed or utilized props changed
- Decentralized, action-based state management. Easy for code splitting

## Core Concepts

- **State**: The `State` monitors dispatches from Action and adjusts its value in response. The `State` also does reactively update whenever its dependency states has been changed.
- **Action**: Action is just an event that describes something that happened in the application. In some cases, the `Action` used for handling data retrieval or submission processes.
- **Cube**: The `Cube` displays the state values it's connected to and updates reactively to any changes in these states. Additionally, Cube implements certain optimizations for renderingsome optimization for rendering under the hood.

The recube is similar to Flux implementation

```js
Action -> State -> Cube/View -> Action
// extra flow
State -> Derived States
```

### Actions

Defining an action is very easy

```ts
import { action } from 'recube';

// action has no payload
const increment = action();
// dispatch
increment();

// action has number type payload
const incrementBy = action<number>();
// dispatch
incrementBy(1);
incrementBy(2);
incrementBy(); // Typescript error

// action has body
const fetchTodo = action((id: number) => {
  return getTodoById(id); // Promise<Todo>
});
// dispatch
fetchTodo(1); // Promise<Todo>
```

### States

There are 2 kinds of state: normal state and derived state

```ts
// normal state
const count = state(1);

// derived state
const doubledCount = state(
  // compute function
  () => {
    return count() * 2;
  },
);
```

State is function, invoke it as function to get state value

```ts
console.log(count());
```

Recube also supports family of state

```ts
const searchResult = state(
  // passing compute function with params
  (type: string) => {
    return; // search result of specified type
  },
);

console.log(searchResult('list1'));
console.log(searchResult('list2'));
console.log(searchResult('list3'));

searchResult.wipe(); // remove all state data
searchResult('list1'); // the compute function will be called again for computing state value of `list1`
```

### Cubes

Cubes are just components with rendering optimizations and state bindings

```tsx
import { cube } from 'recube/react';
import { count } from './states/count';

// this component does not utilize any props, it renders once and re-render when `count` state changed or its useState hooks update
const Counter = cube(props => {
  return <div>{count()}</div>;
});

// this component renders once as well because it utilizes `text` props lazily in callback (not rendering phase)
const Alert = cube((props: { text: string }) => {
  return <button onClick={() => alert(props.text)}>click me</button>;
});

// this component utilizes text and onClick in rendering phase, it will re-renders if text props changed. Changing onClick does no trigger re-rendering because cube makes all callback props as stable
const Button = cube((props: { text: string; onClick: VoidFunction }) => {
  return <button onClick={props.onClick}>{props.text}</button>;
});
```

> Note: The cube re-renders exclusively when there are changes in the non-callback props it utilizes.

## Recipes

## API References

## Contributing

We welcome contributions to `Recube`! If you're interested in contributing, please read our contributing guidelines.

## License

Recube is MIT licensed.
