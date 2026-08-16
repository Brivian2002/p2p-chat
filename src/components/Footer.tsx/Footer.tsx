import Link from 'next/link';
import { Github, Shield, Heart } from 'lucide-react';

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/about-me', label: 'Creator' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function Footer() {
  return (
    <footer className="border-t bg-background/80 backdrop-blur-lg mt-auto">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left: branding */}
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-1.5">
              <span className="font-bold text-foreground">
                <span className="text-foreground">Drop</span>
                <span className="text-primary">To</span>
                <span className="text-foreground">Git</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-xs">
              Push projects to GitHub without the terminal. Your token is never stored.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/Brivian2002/DropToGit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="DropToGit on GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                Secure & Stateless
              </span>
            </div>
          </div>

          {/* Center: links */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} DropToGit. Built by{' '}
            <Link href="/about-me" className="hover:text-foreground transition-colors">
              Bright Dumashie
            </Link>
            .
          </p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-primary" /> in Accra, Ghana
          </p>
        </div>
      </div>
    </footer>
  );
}