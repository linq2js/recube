import { lazyValue } from './lazyValue';

describe('lazyValue', () => {
  test('dependencies', () => {
    const log = jest.fn();
    const aPossibles = [1, 2];
    const bPossibles = [4, 5];
    const lazyA = lazyValue(() => aPossibles.shift() ?? 0);
    const lazyB = lazyValue(() => bPossibles.shift() ?? 0);
    const lazySum = lazyValue(() => {
      log();
      return lazyA.get() + lazyB.get();
    });

    expect(lazySum.get()).toBe(5);
    expect(lazySum.get()).toBe(5);
    expect(log).toHaveBeenCalledTimes(1);

    lazyA.reset();
    expect(lazySum.get()).toBe(6);
    expect(lazySum.get()).toBe(6);
    expect(log).toHaveBeenCalledTimes(2);

    lazyB.reset();
    expect(lazySum.get()).toBe(7);
    expect(lazySum.get()).toBe(7);
    expect(log).toHaveBeenCalledTimes(3);
  });
});
