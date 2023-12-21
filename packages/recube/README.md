# Recube - State Management Library

---

## Introduction

Recube is a state management library designed for React applications. It offers a unique approach to managing application state, optimizing component rendering, and handling asynchronous operations. With its intuitive API and highly optimization, Recube simplifies state management while enhancing performance.

## Features

## Principles

- State Mutability: The state can only mutate itself by listening to dispatched actions.
- Action-Driven: Complex data fetching and processing are handled in actions, keeping the state management simple and predictable.
- Optimized Rendering: Cubes handle the rendering logic, ensuring high performance and optimized updates.

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
