import { action } from './action';
import { state } from './state';

describe('family', () => {
  test('#1', () => {
    const increment = action();
    const countFamily = state((_name: 'first' | 'second') => 1).when(
      increment,
      prev => prev + 1,
    );

    expect(countFamily('first')).toBe(1);
    increment();
    expect(countFamily('first')).toBe(2);
    expect(countFamily('second')).toBe(1);
    increment();
    expect(countFamily('first')).toBe(3);
    expect(countFamily('second')).toBe(2);
  });
});
