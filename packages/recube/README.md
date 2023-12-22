# Recube - State Management Library

---

## Introduction

Recube is a state management library designed for React applications. It offers a unique approach to managing application state, optimizing component rendering, and handling asynchronous operations. With its intuitive API and highly optimization, Recube simplifies state management while enhancing performance.

## Features

## Core Concepts

- State: The `State` listens to the `Action`'s dispatching and changes its own value
- Cube: The `Cube` renders connected state values and reactive when connected states have any change.
- Action: The `Action` can be dispatched anywhere including: UI components, other actions, normal code block

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

### Cubes

## Installation

```bash
npm install recube

# or

yarn add recube
```

## Basic Usages

## Advanced Usages

## API References

## Contributing

We welcome contributions to `Recube`! If you're interested in contributing, please read our contributing guidelines.

## License

Recube is MIT licensed.
