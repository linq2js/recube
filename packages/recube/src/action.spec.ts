import { abortController } from './abortController';
import { action } from './action';
import { delay } from './async';
import { effect } from './effect';
import { state } from './state';

describe('access action result', () => {
  test('sync', () => {
    const increment = action<number>();
    const log = jest.fn();

    effect(() => {
      const result = increment.result();
      log(result);
    });

    increment(1);
    increment(2);

    expect(log.mock.calls).toEqual([[undefined], [1], [2]]);
  });
});

describe('wrapper', () => {
  test('skip odd dispatching', () => {
    const log = jest.fn();
    const doSomething = action<void>(log).use(() => {
      //
    });
    doSomething();
    doSomething();
    expect(log).toHaveBeenCalledTimes(0);
  });
});

describe('cancellable', () => {
  test('cancellable with return value', async () => {
    const doSomething = action(async () => {
      const ac = abortController.current;
      await delay(10);
      ac?.throwIfAborted();
      return 2;
    });
    const count = state(1).when(doSomething, (prev, result) => prev + result);

    expect(count()).toBe(1);
    const r1 = doSomething();
    await delay(20);
    await expect(r1).resolves.toBe(2);
    expect(count()).toBe(3);

    const ac = abortController.create();
    ac.apply(doSomething);
    await delay(5);
    ac.abort();
    // nothing change because action dispatching cancelled
    expect(count()).toBe(3);
  });
});
