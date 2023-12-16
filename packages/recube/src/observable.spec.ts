import { action } from './action';
import { recent, once } from './observable';
import { state } from './state';

describe('observable', () => {
  test('recent', () => {
    const increment = action();
    // dispatch action before state created
    increment();
    const count = state(1).when(increment.with(recent), prev => prev + 1);
    expect(count()).toBe(2);
  });

  test('recent and once', () => {
    const increment = action();
    // dispatch action before state created
    increment();
    const count = state(1).when(increment.with(recent, once), prev => prev + 1);
    increment();
    increment();
    increment();
    expect(count()).toBe(2);
  });

  test('once', () => {
    const increment = action();
    // dispatch action before state created
    increment();
    const count = state(1).when(increment.with(once), prev => prev + 1);
    increment();
    increment();
    increment();
    expect(count()).toBe(1);
  });
});
