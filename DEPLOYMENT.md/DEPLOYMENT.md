# DropToGit deployment handoff

DropToGit is a Next.js application with a stateless browser-first GitHub workflow. The repository includes `vercel.json` with Next.js framework detection and clean URLs enabled.

## Local verification

Use the existing Bun lockfile when installing dependencies:

```bash
bun install
bun run lint
bunx tsc --noEmit
bun run build
```

The project has been validated locally with ESLint, strict TypeScript checking, and a successful production build. The public routes currently include `/`, `/about`, `/about-me`, `/blog`, `/contact`, `/docs`, `/donate`, `/privacy`, and `/terms`.

## Push to GitHub

From the project root, initialize or connect the repository, review the changes, and push the main branch:

```bash
git add .
git commit -m "Rework DropToGit product experience"
git branch -M main
git remote add origin https://github.com/<your-account>/<your-repository>.git
git push -u origin main
```

If a remote already exists, skip the `git remote add origin` command and push normally.

## Deploy on Vercel

In Vercel, choose **Add New Project**, import the GitHub repository, and allow Vercel to detect the Next.js framework. Keep the default build settings; the repository’s `package.json` and `vercel.json` are already configured for the application.

The main GitHub upload flow does not require a server-side GitHub token. Users enter a fine-grained Personal Access Token into the browser for a single session. If the optional Blogger integration is used, add `BLOGGER_API_KEY` and `BLOGGER_BLOG_ID` as Vercel environment variables. The optional z.ai source can use `ZAI_API_BASE` when a non-default API base is required.

After the first deployment, verify the homepage, `/docs`, `/blog`, and `/api/zai/fetch` routes. Add the Vercel production URL to any social metadata or creator links if the canonical domain changes from `droptogit.vercel.app`.

## Security notes

Do not commit `.env` files or user GitHub tokens. The application is designed to keep the GitHub token in browser memory and send it directly to the GitHub API through the application workflow. Use the smallest fine-grained repository permission set possible, with repository Contents set to read and write.
