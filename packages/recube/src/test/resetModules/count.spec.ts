describe('resetModules', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('increment #1', async () => {
    const { count, increment } = await import('./count');

    expect(count()).toBe(1);
    increment();
    increment();
    expect(count()).toBe(3);
  });

  test('increment #2', async () => {
    const { count, increment } = await import('./count');

    expect(count()).toBe(1);
    increment();
    increment();
    increment();
    expect(count()).toBe(4);
  });
});
