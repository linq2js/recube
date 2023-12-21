import { emitter } from './emitter';
import { NOOP } from './utils';

describe('AbortController', () => {
  test('same listener', () => {
    const count = 20000;
    const s1 = performance.now();
    const ac = new AbortController();
    for (let i = 0; i < count; i++) {
      ac.signal.addEventListener('abort', NOOP);
    }
    ac.abort();
    const r1 = performance.now() - s1;

    const s2 = performance.now();
    const ee = emitter();
    for (let i = 0; i < count; i++) {
      ee.on(NOOP);
    }
    ee.emit();
    const r2 = performance.now() - s2;

    console.log('same listener', { abortController: r1, emitter: r2 });
  });

  test('different listener', () => {
    const count = 1000;
    const s1 = performance.now();
    const ac = new AbortController();
    for (let i = 0; i < count; i++) {
      ac.signal.addEventListener('abort', () => i);
    }
    ac.abort();
    const r1 = performance.now() - s1;

    const s2 = performance.now();
    const ee = emitter();
    for (let i = 0; i < count; i++) {
      ee.on(() => i);
    }
    ee.emit();
    const r2 = performance.now() - s2;

    console.log('different listener', { abortController: r1, emitter: r2 });
  });
});
