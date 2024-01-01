import Link from 'next/link';
import { Counter } from '@/components/counter';
import { Log } from '@/components/log';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Log />
      <Counter />
      <Link href="/other">Other</Link>
      <Link href="/rsc">RSC</Link>
    </main>
  );
}
