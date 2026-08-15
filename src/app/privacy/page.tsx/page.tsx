import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, KeyRound, BarChart3, Cookie, Server, Mail, Calendar } from 'lucide-react';

export const metadata = { title: 'Privacy Policy' };

const sections = [
  {
    icon: Shield,
    title: 'No User Accounts',
    content:
      'DropToGit does not create user accounts and does not require registration.',
  },
  {
    icon: KeyRound,
    title: 'GitHub Personal Access Tokens',
    content:
      'Your token is used only for the duration of your session to authenticate with GitHub\'s API. It is transmitted directly over HTTPS and is never stored on our servers, logged, or retained after your session ends.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    content:
      'We use privacy-respecting analytics to understand traffic patterns. No personal data is sold or shared with third parties for advertising purposes beyond what\'s needed to serve ads via Google AdSense on our blog and docs pages.',
  },
  {
    icon: Cookie,
    title: 'Cookies',
    content: null, // handled specially
    list: ['Session cookies', 'Analytics cookies', 'AdSense cookies'],
  },
  {
    icon: Server,
    title: 'Third-Party Services',
    content:
      'This site is hosted on Vercel, uses the GitHub API, and for blog content, the Blogger API. Ads are served via Google AdSense.',
  },
  {
    icon: Mail,
    title: 'Contact',
    content: (
      <a
        href="mailto:brightsany3000@gmail.com"
        className="text-primary hover:underline"
      >
        brightsany3000@gmail.com
      </a>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Privacy{' '}
          <span className="text-primary">Policy</span>
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Your privacy matters. Here is a clear summary of how DropToGit handles your data.
        </p>
      </section>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {section.list ? (
                  <ul className="pl-12 space-y-1.5">
                    {section.list.map((item, j) => (
                      <li
                        key={j}
                        className="text-sm text-muted-foreground leading-relaxed before:content-['•'] before:mr-2 before:text-primary"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed pl-12">
                    {section.content}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <p>Last updated: July 2025</p>
      </div>
    </div>
  );
}
