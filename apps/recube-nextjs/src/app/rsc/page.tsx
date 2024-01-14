import { asyncCount, doSomething } from '@/states/asyncCount';

export default async function RSC() {
  return (
    <>
      <form action={doSomething}>
        <h1>{await asyncCount()}</h1>
        <button type="submit">Click me</button>
      </form>
    </>
  );
}
