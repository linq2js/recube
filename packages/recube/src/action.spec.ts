import { action } from './action';
import { effect } from './effect';

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
