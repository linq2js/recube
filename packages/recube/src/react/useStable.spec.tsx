import { render, renderHook } from '@testing-library/react';
import { useStable } from './useStable';

describe('useStable', () => {
  test('useStable(init)', () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();
    const { result, rerender, unmount } = renderHook(() =>
      useStable(() => ({ onMount, onUnmount, count: 1 })),
    );
    const r1 = result.current;
    rerender();
    const r2 = result.current;
    unmount();

    expect(r1.count).toBe(1);
    expect(r1).toBe(r2);
    expect(onMount).toHaveBeenCalled();
    expect(onUnmount).toHaveBeenCalled();
  });

  test('useStable(callbacks)', () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();
    const doSomething = jest.fn();
    const {
      result,
      rerender,
      unmount: unmountHook,
    } = renderHook(() => useStable({ doSomething, onMount, onUnmount }));
    const r1 = result.current.doSomething;
    rerender();
    const r2 = result.current.doSomething;
    r1();
    unmountHook();
    expect(r1).toBe(r2);
    expect(r1).not.toBe(doSomething);
    expect(doSomething).toHaveBeenCalled();
    expect(onMount).toHaveBeenCalled();
    expect(onUnmount).toHaveBeenCalled();
  });

  test('useStable(callbacks, init)', () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();
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
          onUnmount,
          onMount,
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
    expect(onMount).toHaveBeenCalled();
    expect(onUnmount).toHaveBeenCalled();
  });

  test('onRender', () => {
    const log = jest.fn();
    const Comp = (props: any) => {
      useStable({ props }, ({ props: getProps }) => {
        return {
          onRender() {
            log(getProps());
          },
        };
      });

      return null;
    };

    const { rerender } = render(<Comp name="c1" />);
    rerender(<Comp name="c2" />);
    rerender(<Comp name="c3" />);
    expect(log.mock.calls).toEqual([
      [{ name: 'c1' }],
      [{ name: 'c2' }],
      [{ name: 'c3' }],
    ]);
  });
});
