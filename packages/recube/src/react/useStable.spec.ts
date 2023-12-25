import { renderHook } from '@testing-library/react';
import { useStable } from './useStable';

describe('useStable', () => {
  test('useStable(init)', () => {
    const mount = jest.fn();
    const unmount = jest.fn();
    const {
      result,
      rerender,
      unmount: unmountHook,
    } = renderHook(() => useStable(() => ({ mount, unmount, count: 1 })));
    const r1 = result.current;
    rerender();
    const r2 = result.current;
    unmountHook();

    expect(r1.count).toBe(1);
    expect(r1).toBe(r2);
    expect(mount).toHaveBeenCalled();
    expect(unmount).toHaveBeenCalled();
  });

  test('useStable(callbacks)', () => {
    const mount = jest.fn();
    const unmount = jest.fn();
    const doSomething = jest.fn();
    const {
      result,
      rerender,
      unmount: unmountHook,
    } = renderHook(() => useStable({ doSomething, mount, unmount }));
    const r1 = result.current.doSomething;
    rerender();
    const r2 = result.current.doSomething;
    r1();
    unmountHook();
    expect(r1).toBe(r2);
    expect(r1).not.toBe(doSomething);
    expect(doSomething).toHaveBeenCalled();
    expect(mount).toHaveBeenCalled();
    expect(unmount).toHaveBeenCalled();
  });

  test('useStable(callbacks, init)', () => {
    const mount = jest.fn();
    const unmount = jest.fn();
    const other = jest.fn();
    const values = [1, 2];
    const {
      result,
      rerender,
      unmount: unmountHook,
    } = renderHook(() => {
      const count = values.shift() ?? 0;
      return useStable(
        { getCount: () => count, other },
        ({ getCount, ...rest }) => ({
          ...rest,
          unmount,
          mount,
          getDoubledCount: () => getCount() * 2,
        }),
      );
    });
    const r1 = result.current;
    const v1 = r1.getDoubledCount();
    rerender();
    const r2 = result.current;
    const v2 = r2.getDoubledCount();
    unmountHook();
    expect(r1.other).not.toBeUndefined();
    expect(r1).toBe(r2);
    expect(v1).toBe(2);
    expect(v2).toBe(4);
    expect(mount).toHaveBeenCalled();
    expect(unmount).toHaveBeenCalled();
  });
});
