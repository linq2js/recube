import { ChangeEvent, Suspense, useState } from 'react';
import { action, cancellable, state, wait } from 'recube';
import { cube } from 'recube/react';

export type Todo = {
  id: number;
  title: string;
};

const load = action<number>();
const todoState = state(undefined)
  // handle load action
  .when(load, async (_, result) => {
    const url = `https://jsonplaceholder.typicode.com/todos/${result}?_delay=3000`;
    const signal = cancellable()?.signal();
    // pass signal of current canceler
    return fetch(url, { signal }).then(res => res.json() as Promise<Todo>);
  });

const TodoForm = () => {
  const [value, setValue] = useState('');
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.currentTarget.value;
    setValue(nextValue);
    const id = parseInt(nextValue, 10);
    if (!isNaN(id)) {
      load(id);
    }
  };
  return (
    <input value={value} onChange={handleChange} placeholder="Enter todo id" />
  );
};

const TodoInfo = cube(() => {
  const todo = wait(todoState);
  return <pre>{JSON.stringify(todo, null, 2)}</pre>;
});

const CancellablePage = () => (
  <div className="container-box">
    <main>
      <h1>Cancellable</h1>
      <blockquote>
        Open console to see cancelled requests. Each request has a delay of
        3000ms
      </blockquote>
      <TodoForm />
      <Suspense fallback={<div>Loading...</div>}>
        <TodoInfo />
      </Suspense>
    </main>
  </div>
);

export default CancellablePage;
