# Recube - State Management Library

---

## Introduction

Recube is a state management library designed for React applications. It offers a unique approach to managing application state, optimizing component rendering, and handling asynchronous operations. With its intuitive API and highly optimization, Recube simplifies state management while enhancing performance.

## Key Concepts

### State

The state in Recube is the central place for storing data and simple fetching logic. It is designed to be self-contained and can only be mutated in response to an action.

### Action

Action is where complex data fetching and processing occurs. Actions in Recube are dispatched to interact with the state and trigger state changes.

### Cube

A cube is a core concept in Recube, similar to a component. It encapsulates state, action, and rendering logic, offering optimized rendering.

## Principles

- State Mutability: The state can only mutate itself by listening to dispatched actions.
- Action-Driven: Complex data fetching and processing are handled in actions, keeping the state management simple and predictable.
- Optimized Rendering: Cubes handle the rendering logic, ensuring high performance and optimized updates.

## Features

- Optimized Component Rendering: Recube is designed to minimize unnecessary renders, ensuring your React components are highly performant.
- No Provider Required: Recube simplifies setup by eliminating the need for a Provider wrapper.
- Async State and Action Handling: Easily manage asynchronous operations in both state and actions.
- Middleware Support: Extend and control action dispatching with custom middleware, allowing for more flexible and powerful state management.

## Installation

```bash
npm install recube

# or

yarn add recube
```

## Basic Usage

Here's a quick example to get you started with Recube:

### Counter App

```tsx
import { action, state, cube } from 'recube';

// define an action
const increment = action();
// define a state
const count = state(0)
  // handle `increment` action dispatching and mutate a `count` state
  .when(increment, prev => prev + 1);
const App = cube(() => {
  // no hook or state biding needed
  return <h1 onClick={() => increment()}>{count()}</h1>;
});
```

## Advanced Concepts

Middleware Usage: Learn how to extend Recube with custom middleware.
Asynchronous Operations: Detailed guide on handling async actions and state.

## Contributing

We welcome contributions to Recube! If you're interested in contributing, please read our contributing guidelines.

## License

Recube is MIT licensed.
