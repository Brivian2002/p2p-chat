import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, UserCheck, Ban, Unplug, Gift, Mail, Calendar } from 'lucide-react';

export const metadata = { title: 'Terms of Service' };

const terms = [
  {
    icon: AlertTriangle,
    title: 'Use at Your Own Risk',
    content:
      'DropToGit is provided \"as is\" with no warranty. We are not liable for data loss, repository damage, or unintended overwrites. Always back up important repositories before using any push tool.',
  },
  {
    icon: UserCheck,
    title: 'Your Responsibility',
    content:
      'You are responsible for the scope and permissions of any GitHub Personal Access Token you use. Ensure your token has only the permissions you intend, and revoke it if compromised.',
  },
  {
    icon: Ban,
    title: 'Acceptable Use',
    content:
      'Do not use DropToGit for unlawful purposes, to distribute malicious code, or to violate GitHub\'s Terms of Service. We reserve the right to refuse service.',
  },
  {
    icon: Unplug,
    title: 'No Guarantee of Availability',
    content:
      'The service may be modified, interrupted, or discontinued at any time without prior notice. We strive for uptime but make no guarantees.',
  },
  {
    icon: Gift,
    title: 'Donations',
    content:
      'Donations are voluntary and do not entitle the donor to any feature, priority support, or service guarantee.',
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Terms of{' '}
          <span className="text-primary">Service</span>
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          By using DropToGit, you agree to the following:
        </p>
      </section>

      {/* Terms */}
      <div className="space-y-4">
        {terms.map((term, i) => {
          const Icon = term.icon;
          return (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {i + 1}.
                    </span>
                    <CardTitle className="text-base">{term.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed pl-12">
                  {term.content}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Mail className="h-5 w-5 text-sky-accent" />
          <h2 className="text-lg font-semibold">Contact</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Questions about these terms? Reach out at{' '}
          <a
            href="mailto:brightsany3000@gmail.com"
            className="text-primary hover:underline"
          >
            brightsany3000@gmail.com
          </a>
        </p>
      </section>

      {/* Last updated */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <p>Last updated: July 2025</p>
      </div>
    </div>
  );
}
