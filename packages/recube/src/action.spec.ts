import { canceler } from './canceler';
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

describe('canceler', () => {
  test('canceler with return value', async () => {
    const doSomething = action(async () => {
      const cc = canceler.current();
      await delay(10);
      cc?.throwIfCancelled();
      return 2;
    });
    const count = state(1).when(doSomething, (prev, result) => prev + result);

    expect(count()).toBe(1);
    const r1 = doSomething();
    await delay(20);
    await expect(r1).resolves.toBe(2);
    expect(count()).toBe(3);

    const cc = canceler();
    cc.wrap(doSomething);
    await delay(5);
    cc.cancel();
    // nothing change because action dispatching cancelled
    expect(count()).toBe(3);
  });
});
