'use client';

import { action, state } from 'recube';
import { cube, useRerender } from 'recube/react';

// create an simple action with no body and retrieves no parameter
const increment = action();
type Mode = 'count' | 'doubledCount';
// create an action has payload
const changeMode = action<Mode>();

// create state with default value is 0
const count = state(0)
  // when increment action dispatched, we do increment `count` value by passing state reducer
  .when(increment, prev => prev + 1);
// create derived state
const doubledCount = state(() => count() * 2);
// indicate what we want to show
const mode = state<Mode>('count')
  // no reducer needed, with this overload, the state will use action payload/result as next value
  .when(changeMode);

// wrap render function with cube(), `cube` does all state bindings automatically, no hooks needed
const CounterValue = cube(() => {
  // a state is function, invoke the function to retrieve current state value
  // unlikely other state management libs, recube does not use hook, it reduces code complexity too much
  // you dont need to bind 3 states like other state management libs, ex:
  // const modeValue = useAtom(mode)
  // const countValue = useAtom(count)
  // const doubledCountValue = useAtom(doubledCount)
  // const finalValue = modeValue === 'count' ? countValue : doubledCountValue
  // with recube, you can use conditional binding with ease
  const value = mode() === 'count' ? count() : doubledCount();
  return <h1>{value}</h1>;
});

const CounterActions = cube(() => {
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
    </>
  );
});

export const Counter = () => {
  const rerender = useRerender();

  return (
    <>
      <button onClick={rerender}>Rerender</button>
      <CounterValue />
      <CounterActions />
    </>
  );
};
