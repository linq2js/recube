import Link from 'next/link';
import { Counter } from '@/components/counter';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Counter />
      <Link href="/other">Other</Link>
    </main>
  );
}
