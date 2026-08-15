'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Menu, X, ChevronDown,
  LayoutGrid, Newspaper, Cpu, Wrench, Lightbulb, BookOpen, Globe, Rocket, Sparkles,
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
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string; icon: LucideIcon }[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, Newspaper, Cpu, Wrench, Lightbulb, BookOpen, Globe, Rocket, Sparkles,
};

const navLinks: NavLink[] = [
  { href: '/', label: 'Tool' },
  { href: '/docs', label: 'Docs' },
  {
    label: 'Blog',
    href: '/blog',
    children: BLOG_CATEGORIES.filter((c) => c.key !== 'all').map((c) => ({
      href: `/blog?cat=${c.key}`,
      label: c.label,
      icon: ICON_MAP[c.icon] || Newspaper,
    })),
  },
  { href: '/about', label: 'About' },
  { href: '/donate', label: 'Donate' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="shrink-0">
          <Logo size="sm" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) =>
            link.children ? (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-muted/60 inline-flex items-center gap-1',
                      isActive(link.href)
                        ? 'text-primary font-medium bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {link.label}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-52">
                  <DropdownMenuLabel>Categories</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/blog">All Posts</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {link.children.map((child) => (
                    <DropdownMenuItem key={child.href} asChild>
                      <Link href={child.href} className="flex items-center gap-2">
                        <child.icon className="h-3.5 w-3.5" />
                        <span>{child.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-muted/60',
                  isActive(link.href)
                    ? 'text-primary font-medium bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            )
          )}
          <div className="ml-2 border-l pl-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-lg">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-1">
            {navLinks.map((link) =>
              link.children ? (
                <div key={link.label} className="flex flex-col">
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'px-3 py-2.5 text-sm rounded-md transition-colors',
                      isActive(link.href)
                        ? 'text-primary font-medium bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    {link.label}
                  </Link>
                  <div className="ml-4 pl-3 border-l border-border/50 flex flex-col gap-0.5">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60 transition-colors flex items-center gap-2"
                      >
                        <child.icon className="h-3.5 w-3.5" />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-3 py-2.5 text-sm rounded-md transition-colors',
                    isActive(link.href)
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
