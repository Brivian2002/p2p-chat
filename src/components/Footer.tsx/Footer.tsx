import Link from 'next/link';
import { ArrowUpRight, Github, Heart, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';

const productLinks = [
  { href: '/', label: 'Tool' },
  { href: '/docs', label: 'Documentation' },
  { href: '/blog', label: 'Blog' },
];

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: '/about-me', label: 'Creator' },
  { href: '/contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-background/55">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
              <Logo size="sm" />
            </Link>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              A focused, browser-first way to move a project from your computer or z.ai session into a clean GitHub commit.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Stateless by design
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Product</p>
            <div className="mt-4 space-y-3">
              {productLinks.map((link) => <Link key={link.href} href={link.href} className="block text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>)}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Company</p>
            <div className="mt-4 space-y-3">
              {companyLinks.map((link) => <Link key={link.href} href={link.href} className="block text-sm text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>)}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stay close</p>
            <div className="mt-4 space-y-3">
              <a href="https://github.com/Brivian2002/DropToGit" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <Github className="h-4 w-4" />
                View on GitHub
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <Link href="/donate" className="block text-sm text-muted-foreground transition-colors hover:text-foreground">Support the project</Link>
              <div className="flex gap-4 pt-2">
                {legalLinks.map((link) => <Link key={link.href} href={link.href} className="text-xs text-muted-foreground transition-colors hover:text-foreground">{link.label}</Link>)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} DropToGit. Built by <Link href="/about-me" className="text-foreground transition-colors hover:text-primary">Bright Dumashie</Link>.</p>
          <p className="flex items-center gap-1.5">Made with <Heart className="h-3.5 w-3.5 text-primary" /> in Accra, Ghana</p>
        </div>
      </div>
    </footer>
  );
}
