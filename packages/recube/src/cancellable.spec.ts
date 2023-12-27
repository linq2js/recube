import { cancellable } from './cancellable';

describe('cancellable', () => {
  test('cancel if any', () => {
    const c1 = cancellable.new();
    const c2 = cancellable.new();
    const c3 = cancellable.any(c1, c2);
    expect(c3.cancelled()).toBeFalsy();
    c1.cancel('C');
    expect(c3.cancelled).toBeTruthy();
    expect(() => c3.throwIfCancelled()).toThrow('C');
  });
});
