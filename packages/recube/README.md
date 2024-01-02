# Recube - State Management Library

`recube` is a streamlined state management library for React applications. It focuses on simplifying state structuring and enhancing rendering optimization, making it an effective choice for developers building scalable and maintainable React projects.

## Installation

```bash
npm install recube

# or

yarn add recube
```

## Features

`recube` is designed to enhance your React application with a range of powerful features:

- **Maximized State Decomposition:** Breaks down application state into the smallest manageable units, promoting a cleaner and more organized structure.
- **Interdependent State:** Enables reactive state management where states can be derived from other states, creating a dynamic and responsive application ecosystem. This feature ensures that changes in one part of the state can intelligently influence related states.
- **Simplified State-Component Connection:** Eliminates the need for hooks or Providers to link state with components, streamlining the integration process.
- **Effortless Async Task Handling:** Provides an easy-to-use structure for managing asynchronous tasks, simplifying complex state changes and data fetching.
- **Seamless Async Data Rendering:** Enhances handling of rendering when dealing with asynchronous data, ensuring a smooth user experience.
- **Optimized Component Rendering:** Reduces the need and potential errors in using useCallback, useMemo, and useEffect, through powerful rendering optimization strategies. This results in more efficient component updates.
- **Compatibility with Suspense and ErrorBoundary:** Fully supports React's Suspense and ErrorBoundary, ensuring that your application is robust and user-friendly, even in the face of unexpected errors or data loading states.

## Getting started

### First create Counter app

Let's dive into creating a streamlined counter application using `recube`, where we'll define a `count` state and an `increment` action. This setup will demonstrate how effortlessly the 'count' state is updated in response to executing the `increment` action, highlighting the seamless state management capabilities of `recube`.

```js
import { state, action } from 'recube';
import { cube } from 'cube';

const increment = action();
const count = state(0).when(increment, x => x + 1);
const Counter = cube(() => <h1 onClick={() => increment()}>{count()}</h1>);
```

Breaking down the code, let's explore each line to understand how recube manages state and actions effectively.
Declaring an action (line 4) with recube is quite straightforward. An action acts like an event occurring within the app.
Use the `when(listenable, reducer)` method of the state (line 5) to indicate that the state will listen for action dispatching and call the reducer to update with its new value.
Use the `cube(renderFn)` function to create a cube, which is a React component but with special optimizations for rendering. The connection between the state and the cube is done automatically without the need for hooks. With a design that doesn't utilize any hooks, you can easily employ conditional rendering in combination with state without having to concern yourself with how components and state are connected.

```js
// other lib
const Comp = props => {
  // we have to connect 3 atoms/states
  const v1 = useAtom(atom1);
  const v2 = useAtom(atom1);
  const v3 = useAtom(atom1);

  // consider which one will be rendered
  return <div>{v1 === 'condition' ? v2 : v3}</div>;
};

const Comp = cube(props => {
  // depending on the value of state1, the component will connect to either state2 or state3
  // Cube makes the rendering logic much simpler
  return <div>{state1() === 'condition' ? state2() : state3()}</div>;
});
```

In terms of rendering performance, `recube` significantly enhances the performance for `cube`. Notably, in the Counter component which has no props, `recube` will skip all subsequent re-renders, even if the parent component attempts to pass different props. This level of optimization goes beyond what is achieved with `memo()`

```js
import { memo } from 'react';

const MemoizedComp = memo(() => {
  console.log('render');
});

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <>
      <button onClick={() => setCount(prev => prev + 1)}>Rerender</button>
      <Counter count={count} />
      <MemoizedComp count={count} />
    </>
  );
};
```

Even when the `Counter` component consumes some callbacks from props, `recube` is intelligently designed to skip all subsequent re-renders.

```js
const Counter = cube(props => {
  const handleClick = () => {
    // a props object always is up to date
    props.onIncrement?.();
    increment();
  };
  return <h1 onClick={handleClick}>{count()}</h1>;
});

const App = () => {
  const [count, setCount] = useState(0);
  // this callback re-creates for every rendering
  const onIncrement = () => {
    alert(count);
  };

  return (
    <>
      <button onClick={() => setCount(prev => prev + 1)}>Rerender</button>
      <Counter count={count} onIncrement={onIncrement} />
    </>
  );
};
```

So, when does the `Counter` component actually re-render?

The Counter component only re-renders when the non-function props it consumes change. In below example, it demonstrates Counter component only re-renders when we change `name` prop, and skip re-rendering if we change other props (count, onIncrement)

```js
// In this case, the Counter component consumes 2 props: name and onIncrement
const Counter = cube(({ name, onIncrement }) => {
  const handleClick = () => {
    // a props object always is up to date
    onIncrement?.();
    increment();
  };

  return (
    <h1 onClick={handleClick}>
      {name}: {count()}
    </h1>
  );
});

const App = () => {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('Counter');

  // this callback re-creates for every rendering
  const onIncrement = () => {
    alert(count);
  };

  const changeName = () => {
    setName(`Counter ${Math.random()}`);
  };

  return (
    <>
      <button onClick={() => setCount(prev => prev + 1)}>Rerender</button>
      <button onClick={changeName}>Change name</button>
      <Counter count={count} onIncrement={onIncrement} />
    </>
  );
};
```

Next up, we'll define `incrementAsync` action. The `incrementAsync` action does delay in 1 second and call `increment` action

```js
// the incrementAsync action has body where we can put execution logic
const incrementAsync = action(async () => {
  await delay(1000);
  increment();
});

// dispatching incrementAsync is very similar to increment action
incrementAsync();
```

The `incrementAsync` action returns a promise object. To disable the increment button while `incrementAsync` is dispatching, we can use the `loadable()` function to obtain a `Loadable` object of the action result. This object includes properties such as `loading`, `data`, and `error`, which inform us about the current status of the action dispatch. If the action result is not Promise object, the loadable function returns an object `{ data: actionResult, loading: false, error: undefined }`

```js
import { loadable } from 'recube';

const Counter = cube(() => {
  const { loading } = loadable(incrementAsync.result);

  return (
    <>
      <div>Count: {count()}</div>
      <button disabled={loading} onClick={() => incrementAsync()}></button>
    </>
  );
});
```

`Recube` provides a `loadable` function to handle any promise object; we can use `loadable` with the result of the `fetch` function, for example:

```js
const UserProfile = cube(() => {
  const [profile, setProfile] = useState();
  // the component will re-render when a profile promise object has been fulfilled or rejected
  const { loading, data, error } = loadable(profile);
  const handleLoad = () => {
    setProfile(
      fetch('https://jsonplaceholder.typicode.com/users/1').then(res =>
        res.json(),
      ),
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Something went wrong</div>;
  }

  return <pre>{JSON.stringify(data)}</pre>;
});
```

Returning to the `Counter` app, occasionally we may need to create a state that is derived from another state; `recube` robustly supports such operations.

```js
// A state function can also retrieve computeFn, and under the hood, recube makes the state reactive. The derived state will be updated whenever its dependent states change
const doubledCount = state(() => count() * 2);
const Counter = cube(() => {
  return (
    <>
      <div>Count: {count()}</div>
      <div>Doubled Count: {doubledCount()}</div>
      <button onClick={() => incrementAsync()}></button>
    </>
  );
});
```

## Core Concepts

- **State**: The `State` monitors dispatches from Action and adjusts its value in response. The `State` also does reactively update whenever its dependency states has been changed.
- **Action**: Action is just an event that describes something that happened in the application. In some cases, the `Action` used for handling data retrieval or submission processes.
- **Cube**: The `Cube` displays the state values it's connected to and updates reactively to any changes in these states. Additionally, Cube implements certain optimizations for renderingsome optimization for rendering under the hood.

`Recube` operates like the flow chart shown below

```text

dispatch ─────┐                      ┌────── update
    │         │                      │          │
    │    ┌────┴────┐            ┌────▼────┐     │
    └────►  ACTION ├── mutate ──►  STATE  ├─────┘
         └────▲────┘            └────┬────┘
              │                      │
           dispatch                update
              │      ┌─────────┐     │
              └──────│  CUBE   ◄─────┘
                     └─────────┘

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

// derived state, it can retrieves compute function
const doubledCount = state(() => count() * 2);
```

State is function, invoke it as function to get state value

```ts
console.log(count());
```

`Recube` also supports family of state

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
