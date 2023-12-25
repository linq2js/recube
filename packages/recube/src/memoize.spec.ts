import { equal } from './utils';
import { memoize } from './memoize';

describe('memoize', () => {
  test('size = 1', () => {
    const called = jest.fn();
    const memoized = memoize(
      (input: number) => {
        called();
        return input;
      },
      { size: 1 },
    );

    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(called).toHaveBeenCalledTimes(4);
  });
  test('size = *', () => {
    const called = jest.fn();
    const memoized = memoize((input: number) => {
      called();
      return input;
    });

    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(called).toHaveBeenCalledTimes(2);
  });

  test('wipe results', () => {
    const called = jest.fn();
    const memoized = memoize((input: number) => {
      called();
      return input;
    });

    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(called).toHaveBeenCalledTimes(2);
    memoized.wipe();
    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(memoized(1)).toBe(1);
    expect(memoized(1)).toBe(1);
    expect(memoized(2)).toBe(2);
    expect(memoized(2)).toBe(2);
    expect(called).toHaveBeenCalledTimes(4);
  });

  test('default equal', () => {
    const called = jest.fn();
    const memoized = memoize((input: { name: string }) => {
      called();
      return input;
    });

    const r1 = memoized({ name: 'Ging' });
    const r2 = memoized({ name: 'Ging' });
    expect(r1).not.toBe(r2);
    expect(called).toHaveBeenCalledTimes(2);
  });

  test('custom equal', () => {
    const called = jest.fn();
    const memoized = memoize(
      (input: { name: string }) => {
        called();
        return input;
      },
      { equal },
    );

    const r1 = memoized({ name: 'Ging' });
    const r2 = memoized({ name: 'Ging' });
    expect(r1).toBe(r2);
    expect(called).toHaveBeenCalledTimes(1);
  });
});
