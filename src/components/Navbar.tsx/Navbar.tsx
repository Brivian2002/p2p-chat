'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Menu,
  X,
  ChevronDown,
  LayoutGrid,
  Newspaper,
  Cpu,
  Wrench,
  Lightbulb,
  BookOpen,
  Globe,
  Rocket,
  Sparkles,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BLOG_CATEGORIES } from '@/lib/blogger';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string; icon: LucideIcon }[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  Newspaper,
  Cpu,
  Wrench,
  Lightbulb,
  BookOpen,
  Globe,
  Rocket,
  Sparkles,
};

const navLinks: NavLink[] = [
  { href: '/', label: 'Tool' },
  { href: '/docs', label: 'Docs' },
  {
    href: '/blog',
    label: 'Blog',
    children: BLOG_CATEGORIES.filter((category) => category.key !== 'all').map((category) => ({
      href: `/blog?cat=${category.key}`,
      label: category.label,
      icon: ICON_MAP[category.icon] || Newspaper,
    })),
  },
  { href: '/about', label: 'About' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/78 backdrop-blur-xl">
      <nav className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <Link href="/" className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring" onClick={closeMobile}>
          <Logo size="sm" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) =>
            link.children ? (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring',
                      isActive(link.href) ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label="Open blog categories"
                  >
                    {link.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-60 rounded-xl p-2">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">Explore writing</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/blog" className="font-medium">All posts</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {link.children.map((child) => {
                    const Icon = child.icon;
                    return (
                      <DropdownMenuItem key={child.href} asChild className="rounded-lg">
                        <Link href={child.href} className="flex items-center gap-2.5">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <span>{child.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring',
                  isActive(link.href) ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ),
          )}
          <Link href="/donate" className="ml-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
            Support
          </Link>
          <div className="ml-2 border-l border-border/80 pl-3">
            <ThemeToggle />
          </div>
          <Button asChild size="sm" className="ml-2 rounded-lg px-4 shadow-sm shadow-primary/20">
            <Link href="/">
              Open tool
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label} className="rounded-xl bg-muted/35 p-1">
                  <Link href={link.href} onClick={closeMobile} className={cn('block rounded-lg px-3 py-2.5 text-sm font-medium', isActive(link.href) ? 'text-primary' : 'text-foreground')}>
                    {link.label}
                  </Link>
                  <div className="grid grid-cols-2 gap-1 border-t border-border/60 px-1 pt-1">
                    {link.children.map((child) => {
                      const Icon = child.icon;
                      return (
                        <Link key={child.href} href={child.href} onClick={closeMobile} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Link key={link.href} href={link.href} onClick={closeMobile} className={cn('rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted', isActive(link.href) ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  {link.label}
                </Link>
              ),
            )}
            <Link href="/donate" onClick={closeMobile} className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Support the project</Link>
            <Button asChild className="mt-2 h-11 rounded-lg">
              <Link href="/" onClick={closeMobile}>Open the tool <ArrowUpRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
