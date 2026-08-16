import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Linkedin, Github } from 'lucide-react';

export const metadata = { title: 'Contact' };

const contactMethods = [
  {
    icon: Mail,
    label: 'Email',
    value: 'brightsany3000@gmail.com',
    href: 'mailto:brightsany3000@gmail.com',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+233-535-3434-90',
    href: 'tel:+233535343490',
    color: 'text-sky-accent',
    bg: 'bg-sky-accent/10',
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'linkedin.com/in/brightdumashie',
    href: 'https://linkedin.com/in/brightdumashie',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Heading */}
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Get in Touch
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Have a question, suggestion, or just want to say hello? Reach out
          directly.
        </p>
      </section>

      {/* Contact Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {contactMethods.map((method) => {
          const Icon = method.icon;
          return (
            <Card key={method.label}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${method.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${method.color}`} />
                  </div>
                  <CardTitle className="text-base">{method.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <a
                  href={method.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm ${method.color} hover:underline break-all`}
                >
                  {method.value}
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* GitHub Issue Note */}
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Github className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          For bug reports or feature requests, please open an issue on the{' '}
          <a
            href="https://github.com/Brivian2002/DropToGit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            GitHub repository
          </a>
          .
        </p>
      </div>
    </div>
  );
}