'use client';

import { action, state } from 'recube';
import { cube } from 'recube/react';

const increment = action();
const count = state(1).when(increment, prev => prev + 1);

export const Counter = cube(() => {
  return (
    <>
      <h1>{count()}</h1>
      <button onClick={() => increment()}>Increment</button>
    </>
  );
});
