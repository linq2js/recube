import { abortController } from './abortController';

describe('abortController', () => {
  test('abort if any', () => {
    const c1 = abortController.create();
    const c2 = abortController.create();
    const c3 = abortController.any(c1, c2);
    expect(c3.aborted).toBeFalsy();
    c1.abort('C');
    expect(c3.aborted).toBeTruthy();
    expect(() => c3.throwIfAborted()).toThrow('C');
  });
});
