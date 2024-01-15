import { emitter } from './emitter';
import { NOOP } from './utils';

describe('emitter', () => {
  test('adding new item while looping through map items', () => {
    const newItem = jest.fn();
    const map = new Map<any, VoidFunction>();
    let added = false;
    map.set({}, NOOP);
    map.forEach(item => {
      if (!added) {
        added = true;
        map.set({}, newItem);
      }
      item();
    });
    expect(newItem).toHaveBeenCalled();
  });

  test('new listener should not be emitted while emitter is emitting', () => {
    const newListener = jest.fn();
    const e = emitter();

    e.on(() => {
      e.on(newListener);
    });

    e.emit();
    expect(newListener).not.toHaveBeenCalled();

    e.emit();
    expect(newListener).toHaveBeenCalled();
  });
});
