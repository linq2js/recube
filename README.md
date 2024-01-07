<!-- vscode-markdown-toc -->

- [Recube](#recube)
  - [Introduction](#introduction)
  - [Installation](#installation)
  - [How `Recube` work?](#how-recube-work)
  - [Basic Usage](#basic-usage)
  - [Deriving states](#deriving-states)
  - [How does Recube optimize rendering for components?](#how-does-recube-optimize-rendering-for-components)
  - [Optimizing component props](#optimizing-component-props)
    - [Memoizing stuff inside component and local states](#memoizing-stuff-inside-component-and-local-states)
  - [Working with async data in Recube](#working-with-async-data-in-recube)
    - [Storing and mutating async data](#storing-and-mutating-async-data)
    - [Rendering async data](#rendering-async-data)
  - [state.set, the magic method](#stateset-the-magic-method)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
/vscode-markdown-toc-config -->

<!-- /vscode-markdown-toc -->

# Recube

`Recube` is a streamlined state management library for React applications. It focuses on simplifying state structuring and enhancing rendering optimization, making it an effective choice for developers building scalable and maintainable React projects.

---

## Introduction

Managing state in JavaScript applications can be challenging, especially when it comes to tracking state changes and updating related states accordingly. Recube offers an elegant solution to manage reactive state effortlessly and efficiently. At its core, Recube is built around two main concepts: state and action. The state serves as the application's data store, while actions function like app events. The state listens for action dispatches and updates its value in response to each specific action.

```jsx
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

```jsx
import { state, action } from 'recube';
import { cube } from 'recube/react';

// just 3 lines for Counter app, no Provider/Context/Hook needed
const increment = action();
const count = state(1).when(increment, x => x + 1);
const App = cube(() => <h1 onClick={increment}>Count: {count()}</h1>);
```

When working with other state management libraries, you often need to explicitly define how many states or stores a component must connect to. Recube simplifies connecting to the state as much as possible, helping to minimize code and improve rendering performance.

```jsx
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

## How `Recube` work?

`Recube` has three essentials: `state`, `action`, and `cube`. They operate as depicted in the diagram below.

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

- States listen action dispatching and mutate their values according to action results.
- States can be derived from others and re-compute when dependency states change.
- Cubes connects to states and update when the values of those states change.

## Basic Usage

Let's use `recube` in a real world scenario. We're going to build a todo list app, where you can add and remove items in a todo list. We'll start by modeling the state. We're going to need a state that holds a list of todos first, which we can represent with an Array:

```jsx
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

```jsx
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

```jsx
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

```jsx
const MemoizedComp = memo(props => {
  return <button onClick={props.onClick}>Click me</button>;
});
```

This way has the drawback that we need to memoize all callbacks passed to the MemoizedComp. If we neglect to memoize a callback somewhere, the process of memoization becomes ineffective.

```jsx
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

```jsx
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

```jsx
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

```jsx
import { propsChangeOptimization } from 'recube/react';

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  propsChangeOptimization(false);
}
```

### Memoizing stuff inside component and local states

`Recube` does rendering optimizing for externally passed props. However, to optimize data changes within the component, we still need to use `useCallback`, `useRef`, `useState`, `useEffect`, and `useMemo` for handling them.

```jsx
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

```jsx
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

```jsx
import { useStable } from 'recube/react';
import { createRef } from 'react';

// we can share this logic for many components
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

```jsx
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

If you want to create stable callbacks that have accesses to the unstable values, you can use this overload of `useStable`

```jsx
const MyComponent = props => {
  const hookResult = useSomething();
  // useStable retrieves callback map and return new stable callback map with same shape
  const { handleClick, getHookResult } = useStable({
    handleClick() {
      alert(`${hookResult} - ${props.value}`);
    },
    // if you pass unstable values to useStable, it will create stable getters for those values
    getHookResult: hookResult,
  });

  console.log(typeof getHookResult); // function
};
```

You can use the callback map and init function together to create stable callbacks that needs to access unstable values.

```js
const MyComponent = props => {
  const hookResult = useSomething();
  // useStable will pass stable callbacks to init function as first parameter
  const {} = useStable({ getHookResult: hookResult }, ({ getHookResult }) => {
    const stableVar = [];

    return {
      handleClick() {
        alert(getHookResult());
      },
    };
  });
};
```

> Remember that useStable can be used anywhere, even outside the cube component.

## Working with async data in Recube

### Storing and mutating async data

Recube `state` itself does not distinguish between sync or async data; it can store anything. The difference arises when using and modifying async data. Let's explore the example below.

```jsx
// assume removeTodo action retrieves todo object as payload
const removeTodo = action();
// assume replaceAllTodos action retrieves todo object as payload
const replaceAllTodos = action();
// the todos state stores the todo list that is fetched from network
const todos = state(() =>
  fetch('https://jsonplaceholder.typicode.com/todos').then(res => res.json()),
)
  .when(
    removeTodo,
    // this reducer returns new promise object
    async (prev, todo) => {
      // what we should do here, the prev is promise object
      // we should await until prev promise fulfilled
      const todos = await prev;
      return todos.filter(x => x !== todo);
    },
  )
  .when(replaceAllTodos, (prev, newTodos) => {
    // the prev might be todo list or promise of todo list
    // we dont need to wait until prev is fulfilled, just return new todo list immediately
    return newTodos;
  });
```

We can rewrite the above example and use the `alter` function for a more concise code.

```jsx
import { alter } from 'recube';

const removeTodo = action();
const replaceAllTodos = action();
const todos = state(() =>
  fetch('https://jsonplaceholder.typicode.com/todos').then(res => res.json()),
)
  .when(
    removeTodo,
    // alter retrieves a mutation like immer's produce function
    // we dont need to return new state value and wait for prev state value fulfilled
    alter((todos, todo) => {
      const index = todos.findIndex(x => x.id === todo.id);
      if (index !== -1) todos.splice(index, 1);
    }),
  )
  // no need to use alter here
  .when(replaceAllTodos, (_, newTodos) => newTodos);
```

The differences when using the alter function are:

- If the previous state value is a promise object, the `alter` function will wait until the promise object is fulfilled before calling the mutation. The pseudo code below describes how it works

  ```jsx
  const alter = mutation => {
    return prev => {
      if (isPromiseLike(prev)) {
        return prev.then(mutation);
      }

      return mutation(prev);
    };
  };
  ```

- There is no need to return the next state value inside the mutation. Use the previous state value as a mutable object.
- If the previous state value is promise object and it is fulfilled, the `alter` function will immediately call the mutation without creating a new promise object.

### Rendering async data

Recube is highly compatible with Suspense and ErrorBoundary. We can use wait function to render a async state value.
First characteristic of the wait() function: retrieving state and returning the state value. if the promise object is not fulfilled, it will be thrown up to the Suspense element for handling. If it is rejected, the error object will be thrown up to the ErrorBoundary for handling.

```jsx
import { state, wait } from 'recube';
import { cube } from 'recube/react';

const todos = state(() =>
  fetch('https://jsonplaceholder.typicode.com/todos').then(res => res.json()),
);

// TodoList cube contains straightforward logic, no loading/error checking logic needed
const TodoList = cube(() => {
  return (
    <ul>
      {wait(todos).map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
});

const App = () => {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <TodoList />
      </Suspense>
    </ErrorBoundary>
  );
};
```

The `wait()` function can retrieve multiple states at once and wait until all those state values has been fulfilled

```jsx
import { wait } from 'recube';

const [value1, value2, value3] = wait([state1, state2, state3]);
console.log(value1, value2, value3);

// or

const result = wait({ state1, state2, state3 });
console.log(result.state1, result.state2, result.state3);
```

If you are fan of recoil / react-query, `Recube` also provides the `loadable` function. The `loadable` function retrieves one or multiple states and returns one or multiple Loadable objects accordingly. The Loadable object has following properies: data, loading, error

```jsx
import { loadable } from 'recube';

const TodoList = cube(() => {
  const { data, loading, error } = loadable(todos);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Something went wrong</div>;

  return (
    <ul>
      {data.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
});
```

The loadable function can also work with any promise object

```jsx
import { loadable } from 'recube';

// loadable function can work everywhere, no matter cube or normal component
const NormalComponent = () => {
  const [result, setResult] = useState();
  const loadSomething = () => {
    setResult(fetch('api/get/something').then(res => res.json()));
  };

  const { data, loading, error } = loadable(result);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Something went wrong</div>;

  return <div>{data}</div>;
};
```

## state.set, the magic method

`Recube` operates similarly to Redux, where any `state` changes by `action` dispatching. However, sometimes we want to swiftly change the state value directly without dispatching any `action`. `Recube` allows you to do this using state.set.

```jsx
// if the state has no action listening, its value can be changed by calling set method
const count1 = state(1);
count1.set(1); // OK
// using reducer
count1.set(prev => prev + 1); // OK

const increment = action();
const count2 = state(2).when(increment, prev => prev + 1);
count2.set(3); // ❌ ERROR: The state value can be changed by dispatching action only
```
