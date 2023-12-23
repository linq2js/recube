import { renderHook, act } from '@testing-library/react';
import { equal } from '@wry/equality';
import { state } from '../state';
import { action } from '../action';
import { useComputed } from './useComputed';

describe('useComputed', () => {
  test('without equalFn', () => {
    const changeProfile = action();
    const profile = state({ name: 'Ging' }).when(changeProfile, () => ({
      name: 'Ging',
    }));
    const rerender = jest.fn();

    const { result } = renderHook(() => {
      rerender();
      return useComputed(() => profile());
    });

    expect(result.current).toEqual({ name: 'Ging' });
    expect(rerender).toHaveBeenCalledTimes(1);

    act(changeProfile);

    expect(result.current).toEqual({ name: 'Ging' });
    expect(rerender).toHaveBeenCalledTimes(2);
  });

  test('with equalFn', () => {
    const changeProfile = action();
    const profile = state({ name: 'Ging' }).when(changeProfile, () => ({
      name: 'Ging',
    }));
    const rerender = jest.fn();

    const { result } = renderHook(() => {
      rerender();
      return useComputed(() => profile(), equal);
    });

    expect(result.current).toEqual({ name: 'Ging' });
    expect(rerender).toHaveBeenCalledTimes(1);

    act(changeProfile);

    expect(result.current).toEqual({ name: 'Ging' });
    expect(rerender).toHaveBeenCalledTimes(1);
  });
});
