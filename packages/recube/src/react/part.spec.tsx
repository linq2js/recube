import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { action } from '../action';
import { state } from '../state';
import { part } from './part';

describe('part', () => {
  test('part', () => {
    const rerender = jest.fn();
    const increment = action();
    const count = state(1).when(increment, x => x + 1);
    const App = () => {
      rerender();
      return (
        <h1 data-testid="value" onClick={() => increment()}>
          {part(count)}
        </h1>
      );
    };
    const { getByTestId } = render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    const element = getByTestId('value');
    expect(element.innerHTML).toBe('1');
    expect(rerender).toHaveBeenCalledTimes(2);

    act(() => {
      increment();
    });

    expect(element.innerHTML).toBe('2');
    expect(rerender).toHaveBeenCalledTimes(2);
  });
});
