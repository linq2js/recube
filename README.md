# Recube - State Management Library

`Recube` is a streamlined state management library for React applications. It focuses on simplifying state structuring and enhancing rendering optimization, making it an effective choice for developers building scalable and maintainable React projects.

## Introduction

Managing state in JavaScript applications can be challenging, especially when it comes to tracking state changes and updating related states accordingly. Recube offers an elegant solution to manage reactive state effortlessly and efficiently. At its core, Recube is built around two main concepts: state and action. The state serves as the application's data store, while actions function like app events. The state listens for action dispatches and updates its value in response to each specific action.

```js
import { state, action } from 'recube';

// define actions
const increment = action();
const decrement = action();

// define states
const count = state(1)
  // using chaining method to describe how state reacts with actions
  .when(increment, x => x + 1)
  .when(decrement, x => x - 1);

// state is function, call it to get current value of the state
console.log(count()); // 1

// action is also a function, therefore, calling a function equates to dispatching an action
increment();

console.log(count()); // 2

decrement();

console.log(count()); // 1
```

`Recube` `state` and `action` can be used with VanillaJS apps. If we want to use it with a React app, we need to import `cube`. `Cube` is a React component that tracks state changes and then re-renders. `Cube` automatically connects to the state, so you don't need to use any other hooks.

```js
import { state, action } from 'recube';
import { cube } from 'recube/react';

// just 3 lines for Counter app
const increment = action();
const count = state(1).when(increment, x => x + 1);
const App = cube(() => <h1 onClick={increment}>Count: {count()}</h1>);
```

When working with other state management libraries, you often need to explicitly define how many states or stores a component must connect to. Recube simplifies connecting to the state as much as possible, helping to minimize code and improve rendering performance.

```js
// without recube
const App = () => {
  // the component have to connect to 3 atoms
  const s1 = useAtom(atom1);
  const s2 = useAtom(atom2);
  const s3 = useAtom(atom3);

  return <div>{s1 === condition ? s2 : s3}</div>;
};

// with recube
const App = cube(() => {
  // The component only connects to state1 and state2, or state1 and state3
  return <div>{state1() === condition ? state2() : state3()}</div>;
});
```

## Installation

`Recube` can be installed by adding the `recube` package to your project:

```bash
npm install recube

# or

yarn add recube
```

Once installed via your package manager of choice, you're ready to import it in your app.

## Basic Usage

Let's use `recube` in a real world scenario. We're going to build a todo list app, where you can add and remove items in a todo list. We'll start by modeling the state. We're going to need a state that holds a list of todos first, which we can represent with an Array:

```js
import { state, action } from 'recube';

// define actions
// assuming that the action has a payload as todo text
const addTodo = action();
// assuming that the action has a payload as todo object
const removeTodo = action();
const todos = state([{ text: 'Buy groceries' }, { text: 'Walk the dog' }])
  .when(
    addTodo,
    // the first parameter is prev state value
    // the second parameter is action result (if the action has body) or action payload (if the action has no body)
    (prev, text) => [...prev, { text }],
  )
  .when(removeTodo, (prev, todo) => prev.filter(x => x !== todo));

// simulate adding a new todo
addTodo('Tidy up'); // dispatch addTodo with payload
// Check that it added the new item
console.log(todos());
// Logs: [{text: "Buy groceries"}, {text: "Walk the dog"}, {text: "Tidy up"}]
```

Start building UI

```js
import { cube } from 'recube/react';

const TodoList = cube(() => {
  const inputRef = useRef();
  const handleClick = () => {
    addTodo(inputRef.current.value);
    inputRef.current.value = '';
  };

  return (
    <>
      <input ref={inputRef} />
      <button onClick={handleClick}>Add</button>
      <ul>
        {todos().map(todo => (
          <li>
            {todo.text} <button onClick={() => removeTodo(todo)}>❌</button>
          </li>
        ))}
      </ul>
    </>
  );
});
```

And with that we have a fully working todo app!

## Deriving states

Let's add one more feature to our todo app: each todo item can be checked off as completed, and we'll show the user the number of items they've completed. To do that we'll use computed state, which is computed based on the values of other states.

```js
import { state } from 'recube';

const todos = state([
  { text: 'Buy groceries', completed: true },
  { text: 'Walk the dog', completed: false },
]);

// create a computed state from other states
const completed = state(() => {
  // When `todos` changes, this re-runs automatically:
  return todos().filter(todo => todo.completed).length;
});

// Logs: 1, because one todo is marked as being completed
console.log(completed());
```

## How does Recube optimize rendering for components?

## Optimizing component props

To reduce unnecessary rendering for components, we commonly utilize the memoization technique by utilize the `memo()` function

```js
const MemoizedComp = memo(props => {
  return <button onClick={props.onClick}>Click me</button>;
});
```

This way has the drawback that we need to memoize all callbacks passed to the MemoizedComp. If we neglect to memoize a callback somewhere, the process of memoization becomes ineffective.

```js
const Page1 = () => {
  const handleClick = useCallback(() => {}, [dependencies]);
  return <MemoizedComp onClick={handleClick} />;
};

const Page2 = () => {
  // no memoization for the callback, MemoizedComp still renders unnecessary
  const handleClick = () => {};
  return <MemoizedComp onClick={handleClick} />;
};
```

With Recube, we don't need to worry about memoizing callbacks.

```js
const MemoizedComp = cube(props => {
  return <button onClick={props.onClick}>Click me</button>;
});

const Page1 = () => {
  // no useCallback needed
  const handleClick = () => {};
  return <MemoizedComp onClick={handleClick} />;
};

const Page2 = () => {
  // no useCallback needed
  const handleClick = () => {};
  return <MemoizedComp onClick={handleClick} />;
};
```

`Cube` can detect which props a component are using and will re-render only when those props change. In cases where a component doesn't use any props, `Cube` will never re-render

```js
const UserName = cube(props => {
  // the component utilizes text prop in rendering phase, this means it only re-renders if text prop changed
  return <div>{props.text}</div>;
});

const Alert = cube(props => {
  // the component does not utilize any props in rendering phase but in callback
  // so the component will never re-render no matter its parent component force re-render
  return <button onClick={() => alert(props.text)}>Click me</button>;
});

const Parent = () => {
  const [count, setCount] = useState(1);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>Rerender</button>
      {/* even, if the parent component tries to pass unutilized props to the Alert, the Alert does not re-render*/}
      <Alert text="Hi Ging" count={count} />
      <UserName text="Ging" count={count}>
    </>
  );
};
```

> Caveat: Rendering optimization is automatically handled by Recube. In `development` environment, using `hot module reloading` may not be effective with `cube`. Therefore, we can disable this feature by using the `propsChangeOptimization` function.

```js
import { propsChangeOptimization } from 'recube/react';

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  propsChangeOptimization(false);
}
```

### Memoizing stuff inside component and local states

`Recube` does rendering optimizing for externally passed props. However, to optimize data changes within the component, we still need to use `useCallback`, `useRef`, `useState`, `useEffect`, and `useMemo` for handling them.

```js
const MemoizedComp = cube(props => {
  const [count, setCount] = useState(0);
  const numberList = useMemo(
    () => new Array(count).fill().map((x, i) => i),
    [count],
  );
  const increment = useCallback(() => {
    // actually we can call setCount(prev => prev + 1) but this is for demonstration how hard to manage dependencies with useCallback
    setCount(count + 1);
  }, [count, setCount]);

  useEffect(() => {
    // do something on mount

    return () => {
      // do something on unmount
    };
  }, []);

  return (
    <>
      <ul>
        {numberList.map(x => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <NonCubeButton onClick={increment} />
    </>
  );
});
```

`Recube` provides `useStable` hook. With this hook, we can easily optimize data changes within the component

```js
import { useStable } from 'recube/react';
import { createRef } from 'react';

const MemoizedComp = cube(props => {
  // the init function will be called once
  const stable = useStable(() => {
    // local actions
    const increment = action();
    // local states
    const count = state(0).when(increment, x => x + 1);
    const numberList = state(() => new Array(count()).fill().map((x, i) => i));

    // creating ref for later use
    const buttonRef = createRef();

    return {
      count,
      numberList,
      buttonRef,
      increment,
      // even we can access component props in stable scope
      greeting() {
        alert(props.greeting);
      },
      onMount() {
        // do something on mount
        // the onMount function can return unmount action like useEffect
        return () => {
          // do something on unmount
        };
      },
      onUnmount() {
        // do something on unmount
      },
    };
  });

  return (
    <>
      <ul>
        {stable.numberList.map(x => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <NonCubeButton ref={stable.buttonRef} onClick={stable.increment} />
    </>
  );
});
```

With each component re-render, the hooks inside the component won't need to excessively check for dependencies changes.

We can modularize the logic, using local or global state as needed.

```js
import { useStable } from 'recube/react';
import { createRef } from 'react';

const counterLogic = () => {
  const increment = action();
  const count = state(0).when(increment, x => x + 1);
  return { increment, count };
};

const MemoizedComp = cube(props => {
  // the init function will be called once
  const stable = useStable(() => {
    const counter = counterLogic();
    const numberList = state(() =>
      new Array(counter.count()).fill().map((x, i) => i),
    );

    // creating ref for later use
    const buttonRef = createRef();

    return {
      ...counter,
      numberList,
      buttonRef,
      // even we can access component props in stable scope
      greeting() {
        alert(props.greeting);
      },
      onMount() {
        // do something on mount
        // the onMount function can return unmount action like useEffect
        return () => {
          // do something on unmount
        };
      },
      onUnmount() {
        // do something on unmount
      },
    };
  });

  return (
    <>
      <ul>
        {stable.numberList.map(x => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <NonCubeButton ref={stable.buttonRef} onClick={stable.increment} />
    </>
  );
});
```

In the example above, the component only re-renders when `numberList` changes, and `numberList` state changes when the `count` state changes. For further optimization, we can use `Recube`'s `part()` function.

```js
import { part } from 'recube/react';

const MemoizedComp = cube(props => {
  const stable = useStable(() => {});

  return (
    <>
      <ul>{part(() => stable.numberList.map(x => <li key={x}>{x}</li>))}</ul>
      <NonCubeButton ref={stable.buttonRef} onClick={stable.increment} />
    </>
  );
});
```

With this approach, the component will never re-render even if the `count` state changes because frequently changing scope is encapsulated by the `part` function. The `part(fn)` function will track changes within the `fn` function and trigger a re-render, without affecting the host component.
