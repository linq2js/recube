import { action } from './action';
import { delay, waitAll, waitAny, waitNone } from './async';
import { state, mutate } from './state';

export const checkTypes = {
  action: {
    narrowType: [
      () => {
        const doSomething = action(() => {
          return 1;
        });
        if (!doSomething.all.length) {
          doSomething.result()?.toPrecision();
        }
      },
    ],
  },
  state: {
    mutate: [
      () => {
        const addTodo = action(async (title: string) => {
          await delay(2000);

          return {
            id: `server-${Math.random()}`,
            title,
            completed: false,
          };
        });

        type Todo = {
          id: number | string;
          title: string;
          completed: boolean;
        };

        const todosState = state(
          () =>
            fetch('https://jsonplaceholder.typicode.com/todos').then(res =>
              res.json(),
            ) as Promise<Todo[]>,
        ).when(
          addTodo,
          mutate((draft, todo) => {
            draft.push(todo);
          }),
        );

        return { todosState };
      },
    ],
    action: [
      () => {
        const count = state(0);
        const { increment, decrement } = count.action({
          increment(prev) {
            return prev + 1;
          },
          decrement(prev, by: number) {
            return prev + by;
          },
        });
        console.log(increment, decrement);
      },
    ],
  },
  waitAll: [
    () => {
      const state1 = state(1);
      const state2 = state(async () => 2);

      const [s1, s2] = waitAll([state1, state2] as const);

      return s1 * s2;
    },
    () => {
      const state1 = state(1);
      const state2 = state(async () => 2);

      const values = waitAll({ state1, state2 });

      return values.state1 * values.state2;
    },
  ],
  waitAny: [
    () => {
      const state1 = state(1);
      const state2 = state(async () => 2);

      const [s1, s2] = waitAny([state1, state2] as const);

      return (s1 ?? 0) * (s2 ?? 0);
    },
    () => {
      const state1 = state(1);
      const state2 = state(async () => 2);

      const values = waitAny({ state1, state2 });

      return (values.state1 ?? 0) * (values.state2 ?? 0);
    },
  ],
  waitNone: [
    () => {
      const state1 = state(1);
      const state2 = state(async () => 2);

      const [s1, s2] = waitNone([state1, state2] as const);

      if (!s1.loading) {
        return s1.data ?? 0 * 2;
      }

      return (s1.data ?? 0) * (s2.data ?? 0);
    },
    () => {
      const state1 = state(1);
      const state2 = state(async () => 2);

      const values = waitNone({ state1, state2 });

      return (values.state1.data ?? 0) * (values.state2.data ?? 0);
    },
  ],
};
