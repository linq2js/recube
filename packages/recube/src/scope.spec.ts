import { delay } from './async';
import { scope } from './scope';

describe('scope', () => {
  test('using snapshot with async', async () => {
    const values = ['Ging', 'Gon'];
    const user = scope(() => ({ name: values.shift() }));
    const [, result] = user(async () => {
      const of = scope();
      const result: any[] = [];

      await delay(10);

      result.push(of(user)?.name);

      await delay(10);

      result.push(of(user)?.name);

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
});
