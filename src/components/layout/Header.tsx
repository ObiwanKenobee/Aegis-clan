import { Leaf } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="py-6 px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center gap-3">
        <Leaf className="h-8 w-8 text-primary" />
        <Link href="/">
          <h1 className="text-3xl font-headline font-bold text-primary">
            Covenant Keeper
          </h1>
        </Link>
      </div>
    </header>
  );
}
