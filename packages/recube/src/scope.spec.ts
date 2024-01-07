import { delay } from './async';
import { scope } from './scope';

describe('scope', () => {
  test('using snapshot with async', async () => {
    const values = ['Ging', 'Gon'];
    const user = scope(() => ({ name: values.shift() }));
    const [, result] = user(async () => {
      const snapshot = scope();
      const result: any[] = [];

      await delay(10);

      result.push(snapshot(user)?.name);

      await delay(10);

      result.push(snapshot(user)?.name);

      return result;
    });
    await expect(result).resolves.toEqual(['Ging', 'Ging']);
  });

  test('nested scope', () => {
    const values = ['Ging', 'Gon'];
    const user = scope(() => ({ name: values.shift() }));
    const data: any[] = [];
    user(() => {
      data.push(user()?.name);

      user(() => {
        data.push(user()?.name);
      });

      data.push(user()?.name);
    });

    expect(data).toEqual(['Ging', 'Gon', 'Ging']);
  });

  test('snapshot should be equal to other if they have same scope stack', () => {
    const s1 = scope();
    const s2 = scope();

    expect(s1).toBe(s2);
  });

  test('should not overwrite promise methods if it has same snapshot', () => {
    const p = Promise.resolve(1);
    const s1 = scope(p).then;
    const s2 = scope(p).then;

    expect(s1).toBe(s2);
  });
});
