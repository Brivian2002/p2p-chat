import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, Linkedin, Globe } from 'lucide-react';

export const metadata = { title: 'About the Creator' };

export default function AboutMePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Header with avatar */}
      <section className="space-y-5">
        <div className="flex items-center gap-5">
          {/* Placeholder avatar circle with initials */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
            BD
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Bright Dumashie
            </h1>
            <p className="text-muted-foreground text-sm">
              AI Data Reviewer &middot; LLM Evaluator &middot; Web Developer
            </p>
            <p className="text-muted-foreground text-sm">Accra, Ghana</p>
          </div>
        </div>

        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Bright is an AI Data Reviewer and Multilingual Annotation Specialist with 4+ years
            of experience supporting AI and data operations — annotation, rubric-based evaluation,
            and quality control across text, audio, and video modalities, including LLM output
            evaluation. He&rsquo;s a certified micro1 Data Labeler and also builds web tools,
            including{' '}
            <a
              href="/"
              className="text-primary hover:underline font-medium"
            >
              DropToGit
            </a>{' '}
            and{' '}
            <a
              href="https://speedtestplus.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              speedtestplus.vercel.app
            </a>
            .
          </p>
          <p>
            When he&rsquo;s not reviewing training data or building developer tools, Bright is
            exploring ways to make technology more accessible — especially for people who
            shouldn&rsquo;t have to fight a terminal to get their code online.
          </p>
        </div>
      </section>

      {/* Roles / Badges */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Specializations</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">AI Data Review</Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">LLM Evaluation</Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">Multilingual Annotation</Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">Web Development</Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">Quality Control</Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1">micro1 Certified</Badge>
        </div>
      </section>

      {/* Contact & Social */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contact &amp; Social</h2>
        <Card>
          <CardContent className="pt-5 divide-y divide-border">
            <a
              href="mailto:brightsany3000@gmail.com"
              className="flex items-center gap-3 py-3 first:pt-0 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  brightsany3000@gmail.com
                </p>
              </div>
            </a>

            <a
              href="tel:+233535343490"
              className="flex items-center gap-3 py-3 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-accent/10">
                <Phone className="h-4 w-4 text-sky-accent" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Phone</p>
                <p className="text-xs text-muted-foreground group-hover:text-sky-accent transition-colors">
                  +233-535-3434-90
                </p>
              </div>
            </a>

            <a
              href="https://linkedin.com/in/brightdumashie"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-3 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Linkedin className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">LinkedIn</p>
                <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  linkedin.com/in/brightdumashie
                </p>
              </div>
            </a>

            <a
              href="https://speedtestplus.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 py-3 last:pb-0 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-accent/10">
                <Globe className="h-4 w-4 text-sky-accent" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Another Project</p>
                <p className="text-xs text-muted-foreground group-hover:text-sky-accent transition-colors">
                  speedtestplus.vercel.app
                </p>
              </div>
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
