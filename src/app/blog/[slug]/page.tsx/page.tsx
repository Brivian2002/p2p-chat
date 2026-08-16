import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Calendar, ImageIcon, ExternalLink,
  LayoutGrid, Newspaper, Cpu, Wrench, Lightbulb, BookOpen, Globe, Rocket, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchBlogPost, formatDate, getCategoryByKey, type BlogCategory } from '@/lib/blogger';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, Newspaper, Cpu, Wrench, Lightbulb, BookOpen, Globe, Rocket, Sparkles,
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) return { title: 'Post Not Found' };
  return {
    title: post.title,
    description: post.content.replace(/<[^>]*>/g, '').slice(0, 160),
    openGraph: post.featuredImage
      ? { images: [{ url: post.featuredImage }] }
      : undefined,
  };
}

export const revalidate = 300;

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);

  if (!post) notFound();

  const cat = getCategoryByKey(post.category);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      <article className="space-y-5">
        {/* Featured image */}
        {post.featuredImage ? (
          <div className="rounded-xl overflow-hidden border">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full max-h-[400px] object-cover"
            />
          </div>
        ) : (
          <div className="rounded-xl border bg-muted/40 h-48 flex items-center justify-center text-muted-foreground/30">
            <ImageIcon className="h-14 w-14" />
          </div>
        )}

        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {(() => {
                const Icon = ICON_MAP[cat.icon] || Newspaper;
                return <Icon className="mr-1.5 h-3 w-3" />;
              })()}
              {cat.label}
            </Badge>
            {post.labels &&
              post.labels.length > 0 &&
              post.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-[11px] font-normal">
                  #{label}
                </Badge>
              ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.published)}
            </span>
            {post.author?.displayName && (
              <span>by {post.author.displayName}</span>
            )}
          </div>
        </header>

        {/* Body */}
        <div
          className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:font-mono prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
            prose-img:rounded-lg prose-img:my-4
            prose-li:text-muted-foreground
            prose-strong:text-foreground
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Footer */}
        <Card className="bg-muted/30">
          <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to all posts
            </Link>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on Blogger
            </a>
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
