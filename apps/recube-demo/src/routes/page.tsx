import { Helmet } from '@modern-js/runtime/head';
import './index.css';
import {
  action,
  state,
  delay,
  mutate,
  cube,
  waitAll,
  useStable,
  waitNone,
} from 'recube';
import { FormEvent, Suspense, useRef } from 'react';

const uniqueId = () => Math.random().toString(36).split('.')[1];

const addTodo = action(
  async ({ clientId, title }: { clientId: string; title: string }) => {
    await delay(2000);

    return {
      clientId,
      id: `server-${uniqueId()}`,
      title,
      completed: false,
    };
  },
);

const toggleTodo = action<string>();

type Todo = {
  id: any;
  title: string;
  completed: boolean;
};

const fetchTodos = () =>
  fetch('https://jsonplaceholder.typicode.com/todos')
    .then(res => res.json())
    .then(res => {
      return (res as Todo[]).slice(0, 10);
    });

const todoListState = state(fetchTodos)
  .when(
    addTodo.loading,
    mutate((draft, { clientId, title }) => {
      draft.unshift({
        id: `client-${clientId}`,
        title,
        completed: false,
      });
    }),
  )
  .when(
    addTodo,
    mutate((draft, todo) => {
      const clientId = `client-${todo.clientId}`;
      const optimisticTodo = draft.find(x => x.id === clientId);
      if (!optimisticTodo) {
        draft.unshift(todo);
      } else {
        Object.assign(optimisticTodo, todo);
      }
    }),
  )
  .when(
    toggleTodo,
    mutate((draft, id) => {
      const todo = draft.find(x => x.id === id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    }),
  );

const TodoItem = cube((props: { todo: Todo }) => {
  return (
    <div
      style={{ opacity: props.todo.completed ? 0.5 : 1 }}
      onClick={() => toggleTodo(props.todo.id)}
    >
      <strong>{props.todo.id}:</strong> {props.todo.title}
    </div>
  );
});

const TodoList = cube(() => {
  const todos = waitAll(todoListState);

  return (
    <>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </>
  );
});

const TodoForm = cube(() => {
  const inputRef = useRef<HTMLInputElement>(null);
  const cb = useStable({
    handleSubmit(e: FormEvent) {
      e.preventDefault();
      if (!inputRef.current) {
        return;
      }

      addTodo({ title: inputRef.current.value, clientId: uniqueId() });
      inputRef.current.value = '';
    },
  });
  const { loading } = waitNone(addTodo.result);

  return (
    <form onSubmit={cb.handleSubmit}>
      <input ref={inputRef} type="text" disabled={loading} />
      {loading && <div>Adding...</div>}
    </form>
  );
});

const Index = () => (
  <div className="container-box">
    <Helmet>
      <link
        rel="icon"
        type="image/x-icon"
        href="https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/favicon.ico"
      />
    </Helmet>
    <main>
      <div>
        <Suspense fallback={<div>Loading...</div>}>
          <TodoForm />
          <TodoList />
        </Suspense>
      </div>
    </main>
  </div>
);

export default Index;
