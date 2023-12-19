import { action } from './action';
import { recent, once, any } from './listenable';
import { state } from './state';

describe('listenable', () => {
  test('recent only', () => {
    const increment = action();
    // dispatch action before state created
    increment();
    const count = state(1).when(increment.pipe(recent), prev => prev + 1);
    expect(count()).toBe(2);
  });

  test('recent and once', () => {
    const increment = action();
    // dispatch action before state created
    increment();
    const count = state(1).when(increment.pipe(once, recent), prev => prev + 1);
    increment();
    increment();
    increment();
    expect(count()).toBe(2);
  });

  test('once', () => {
    const increment = action();
    // dispatch action before state created
    increment();
    const count = state(1).when(increment.pipe(once), prev => prev + 1);
    increment();
    increment();
    increment();
    expect(count()).toBe(1);
  });

  test('any', () => {
    const doSomething1 = action();
    const doSomething2 = action();
    const count = state(1).when(
      any(doSomething1, doSomething2),
      prev => prev + 1,
    );

    expect(count()).toBe(1);
    doSomething1();
    expect(count()).toBe(2);
    doSomething2();
    expect(count()).toBe(3);
  });
});
