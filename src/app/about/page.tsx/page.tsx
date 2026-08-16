import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound, GitBranch, Upload, Shield, Lock, UserX, ArrowRight } from 'lucide-react';

export const metadata = { title: 'About' };

const steps = [
  {
    icon: KeyRound,
    title: 'Enter your GitHub token',
    description:
      'Paste your GitHub Personal Access Token. It stays in your browser session and goes straight to GitHub — never to our servers.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: GitBranch,
    title: 'Select or create a repo',
    description:
      'Pick from your existing repositories or create a new one on the fly. Your repos are fetched directly from the GitHub API.',
    color: 'text-sky-accent',
    bg: 'bg-sky-accent/10',
  },
  {
    icon: Upload,
    title: 'Drop your files and push',
    description:
      'Drag in a .zip file or folder, review the file tree, pick a push mode, and hit Push. That\'s it.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

const trustPoints = [
  {
    icon: Lock,
    title: 'Token is never stored',
    description:
      'Your Personal Access Token is sent directly to GitHub over HTTPS for that session only. It\'s never logged, stored, or seen by anyone but you and GitHub.',
  },
  {
    icon: Shield,
    title: 'Open source',
    description:
      'The entire codebase is publicly available for audit. You can verify exactly what happens with your data — no hidden backends or secret data pipelines.',
  },
  {
    icon: UserX,
    title: 'No accounts needed',
    description:
      'DropToGit doesn\'t create user accounts, track sessions, or store personal information. You don\'t need to sign up for anything.',
  },
  {
    icon: ArrowRight,
    title: 'Direct to GitHub API',
    description:
      'Every file you push goes straight from your browser to GitHub\'s own Data API. No middleman, no proxy, no intermediary storage.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          About{' '}
          <span className="text-primary">DropToGit</span>
        </h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Pushing a project to GitHub usually means installing Git, learning commands, and managing
            credentials in a terminal.{' '}
            <strong className="text-foreground">DropToGit skips all of that</strong> — drag your
            project folder in, and it&rsquo;s pushed straight to your repository using GitHub&rsquo;s
            own Data API. No terminal. No Git installation. No stored tokens.
          </p>
          <p>
            Your Personal Access Token is sent directly to GitHub over HTTPS for that session only
            — it&rsquo;s never logged, stored, or seen by anyone but you and GitHub.
          </p>
          <p>
            DropToGit was built for developers, students, and anyone who wants a faster, simpler way
            to ship code to GitHub — especially useful for quick projects, prototypes, and
            non-technical collaborators who find the command line intimidating.
          </p>
          <p>
            Built and maintained independently by{' '}
            <Link
              href="/about-me"
              className="text-primary hover:underline font-medium"
            >
              Bright Dumashie
            </Link>
            .
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">How It Works</h2>
        <p className="text-muted-foreground leading-relaxed">
          Three simple steps — that&rsquo;s all it takes to push your project to GitHub.
        </p>
        <div className="grid gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Badge
                        variant="secondary"
                        className="h-5 w-5 p-0 items-center justify-center rounded-full text-[10px] font-bold"
                      >
                        {i + 1}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-12">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Why Trust DropToGit? */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">
          Why Trust{' '}
          <span className="text-primary">DropToGit</span>?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {trustPoints.map((point, i) => {
            const Icon = point.icon;
            return (
              <Card key={i} className="overflow-hidden">
                <CardContent className="pt-5 space-y-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">{point.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {point.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
