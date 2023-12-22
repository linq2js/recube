import { action } from './action';
import { alter, withResult } from './alter';
import { state } from './state';

describe('alter', () => {
  test('alter prop (sync)', () => {
    const changeName = action<string>();
    const deepNestedProps = state({
      l1: { l2: { l3: { name: 'ging' } } },
    }).when(
      changeName,
      alter('l1', alter('l2', alter('l3', alter('name', withResult)))),
    );

    expect(deepNestedProps()).toEqual({
      l1: { l2: { l3: { name: 'ging' } } },
    });

    changeName('new name');
    expect(deepNestedProps()).toEqual({
      l1: { l2: { l3: { name: 'new name' } } },
    });
  });

  test('alter prop (async)', async () => {
    const changeName = action<string>();
    const deepNestedProps = state(async () => ({
      l1: { l2: { l3: { name: 'ging' } } },
    })).when(
      changeName,
      alter('l1', alter('l2', alter('l3', alter('name', withResult)))),
    );

    await expect(deepNestedProps()).resolves.toEqual({
      l1: { l2: { l3: { name: 'ging' } } },
    });

    changeName('new name');
    await expect(deepNestedProps()).resolves.toEqual({
      l1: { l2: { l3: { name: 'new name' } } },
    });
  });

  test('alter obj (sync)', () => {
    const changeName = action<string>();
    const deepNestedProps = state({
      l1: { l2: { l3: { name: 'ging' } } },
    }).when(
      changeName,
      alter(
        'l1',
        alter(
          'l2',
          alter(
            'l3',
            alter((prev, result) => {
              prev.name = result;
            }),
          ),
        ),
      ),
    );

    expect(deepNestedProps()).toEqual({
      l1: { l2: { l3: { name: 'ging' } } },
    });

    changeName('new name');
    expect(deepNestedProps()).toEqual({
      l1: { l2: { l3: { name: 'new name' } } },
    });
  });

  test('alter obj (async)', async () => {
    const changeName = action<string>();
    const deepNestedProps = state(async () => ({
      l1: { l2: { l3: { name: 'ging' } } },
    })).when(
      changeName,
      alter(
        'l1',
        alter(
          'l2',
          alter(
            'l3',
            alter((prev, result) => {
              prev.name = result;
            }),
          ),
        ),
      ),
    );

    await expect(deepNestedProps()).resolves.toEqual({
      l1: { l2: { l3: { name: 'ging' } } },
    });

    changeName('new name');
    await expect(deepNestedProps()).resolves.toEqual({
      l1: { l2: { l3: { name: 'new name' } } },
    });
  });
});
