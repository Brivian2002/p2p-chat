// ─── Blog Categories ────────────────────────────────────────────────
//
// Blogger labels map to categories.
// When composing a post in Blogger, add labels (which act as hashtags).
// Examples:  News, Tech, HowTo, DidYouKnow, Tutorials, OpenSource, DevOps, Updates
//

export interface BlogCategory {
  key: string;
  label: string;
  hashtag: string;          // The label/tag to match in Blogger
  icon: string;             // Lucide icon name
  description: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { key: 'all',         label: 'All Posts',    hashtag: '',           icon: 'LayoutGrid',     description: 'Everything from the DropToGit blog' },
  { key: 'news',        label: 'News',         hashtag: 'News',      icon: 'Newspaper',      description: 'Announcements and breaking updates' },
  { key: 'tech',        label: 'Tech',         hashtag: 'Tech',      icon: 'Cpu',            description: 'Technology deep-dives and analysis' },
  { key: 'howto',       label: 'How To',       hashtag: 'HowTo',     icon: 'Wrench',         description: 'Step-by-step guides and tutorials' },
  { key: 'didyouknow',  label: 'Did You Know?', hashtag: 'DidYouKnow', icon: 'Lightbulb',      description: 'Interesting facts and tips' },
  { key: 'tutorials',   label: 'Tutorials',    hashtag: 'Tutorials',  icon: 'BookOpen',       description: 'In-depth walkthroughs' },
  { key: 'opensource',  label: 'Open Source',  hashtag: 'OpenSource', icon: 'Globe',          description: 'Open source projects and contributions' },
  { key: 'devops',      label: 'DevOps',       hashtag: 'DevOps',    icon: 'Rocket',         description: 'Deployment, CI/CD, and infrastructure' },
  { key: 'updates',     label: 'Updates',      hashtag: 'Updates',   icon: 'Sparkles',       description: 'Product updates and changelogs' },
];

/**
 * Given a post's labels array, return the first matching category key.
 * Falls back to 'news' if nothing matches.
 */
export function categorizePost(labels?: string[]): string {
  if (!labels || labels.length === 0) return 'news';
  const normalized = labels.map(l => l.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const cat of BLOG_CATEGORIES) {
    if (cat.key === 'all') continue;
    if (normalized.includes(cat.hashtag.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      return cat.key;
    }
  }
  return 'news';
}

/**
 * Get a BlogCategory object by key.
 */
export function getCategoryByKey(key: string): BlogCategory {
  return BLOG_CATEGORIES.find(c => c.key === key) || BLOG_CATEGORIES[1]; // fallback to News
}

// ─── Blogger Types ───────────────────────────────────────────────────

export interface BloggerPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: string;
  updated: string;
  url: string;
  author: {
    displayName: string;
    url?: string;
    image?: { url: string };
  };
  labels?: string[];
  replies?: { totalItems: string };
  /** Extracted from content — first `<img>` src */
  featuredImage?: string;
  /** Category key computed from labels */
  category: string;
}

export interface BloggerListResponse {
  items: BloggerPost[];
  nextPageToken?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function extractSlug(url: string): string {
  const match = url.match(/\/([\w-]+)(?:\.html)?$/);
  return match ? match[1] : '';
}

/**
 * Extract the first `<img src="...">` from HTML content.
 * Returns undefined if no image found.
 */
export function extractFeaturedImage(content: string): string | undefined {
  // Try to match <img> tags, handling both src="..." and src='...'
  const match = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (match?.[1]) {
    // Blogger sometimes serves resized images via s1600, s320 etc.
    // Normalize to a larger size for featured display
    let url = match[1];
    url = url.replace(/\/s[0-9]+(-[a-z])?\//i, '/s1600/');
    return url;
  }
  return undefined;
}

// ─── API Functions ───────────────────────────────────────────────────

/**
 * Fetch blog posts from Blogger API.
 * If BLOGGER_API_KEY or BLOGGER_BLOG_ID are not set, returns empty array.
 */
export async function fetchBlogPosts(
  maxResults = 50,
  pageToken?: string,
): Promise<{ posts: BloggerPost[]; nextPageToken?: string }> {
  const apiKey = process.env.BLOGGER_API_KEY;
  const blogId = process.env.BLOGGER_BLOG_ID;

  if (!apiKey || !blogId) {
    return { posts: [] };
  }

  const params = new URLSearchParams({
    key: apiKey,
    maxResults: String(maxResults),
    fields: 'items(id,title,content,published,updated,url,author,labels,replies/totalItems),nextPageToken',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?${params}`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) return { posts: [] };

  const data: BloggerListResponse = await res.json();

  const posts: BloggerPost[] = (data.items || []).map((item) => ({
    ...item,
    slug: extractSlug(item.url),
    featuredImage: extractFeaturedImage(item.content),
    category: categorizePost(item.labels),
  }));

  return { posts, nextPageToken: data.nextPageToken };
}

/**
 * Fetch a single blog post by slug (for SEO direct links).
 * Falls back to full-list scan since Blogger API doesn't support slug lookup.
 */
export async function fetchBlogPost(slug: string): Promise<BloggerPost | null> {
  const apiKey = process.env.BLOGGER_API_KEY;
  const blogId = process.env.BLOGGER_BLOG_ID;

  if (!apiKey || !blogId) return null;

  const res = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=500&fields=items(id,title,content,published,updated,url,author,labels,replies/totalItems)`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) return null;

  const data: BloggerListResponse = await res.json();
  const post = (data.items || []).find((item) => extractSlug(item.url) === slug);

  return post
    ? { ...post, slug, featuredImage: extractFeaturedImage(post.content), category: categorizePost(post.labels) }
    : null;
}

/**
 * Fetch a single blog post by Blogger post ID (for the sidebar reader API).
 */
export async function fetchBlogPostById(postId: string): Promise<BloggerPost | null> {
  const apiKey = process.env.BLOGGER_API_KEY;
  const blogId = process.env.BLOGGER_BLOG_ID;

  if (!apiKey || !blogId) return null;

  const params = new URLSearchParams({
    key: apiKey,
    fields: 'id,title,content,published,updated,url,author,labels,replies/totalItems',
  });

  const res = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${postId}?${params}`,
    { next: { revalidate: 60 } },
  );

  if (!res.ok) return null;

  const item = await res.json();
  return {
    ...item,
    slug: extractSlug(item.url),
    featuredImage: extractFeaturedImage(item.content),
    category: categorizePost(item.labels),
  };
}

export function getPostExcerpt(content: string, maxLength = 200): string {
  const text = stripHtml(content);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
