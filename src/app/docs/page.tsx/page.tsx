import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Rocket,
  Key,
  Link2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Map,
} from 'lucide-react';

export const metadata = { title: 'Documentation' };

const roadmapItems = [
  'Project Analyzer — detect your framework, flag common configuration issues, and suggest best practices before you push.',
  'Smart Cleanup — automatically exclude node_modules, .env files, build artifacts, and other noise from your uploads.',
  'Secret Scanner — scan files for API keys, tokens, and credentials before they ever reach your repository.',
  '.gitignore-aware Filtering — respect existing .gitignore rules so unwanted files never get uploaded.',
  'Visual Folder Organizer — drag and rearrange files and folders before pushing to get the exact structure you want.',
  'File Preview — preview text files, images, and code directly in the browser before committing.',
  'Branch Management — create, switch between, and push to different branches right from the interface.',
  'AI Commit Messages — generate meaningful, conventional commit messages based on your file changes.',
  'GitHub to Vercel Deployment — one-click deploy your repository to Vercel after pushing.',
  'Paystack Donations — support the project with a quick and easy donation via Paystack.',
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Page Heading */}
      <section className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Documentation
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Everything you need to know about using DropToGit — from generating your first
          token to troubleshooting common issues.
        </p>
      </section>

      {/* 1. Getting Started */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            To use DropToGit, you need a{' '}
            <strong className="text-foreground">Personal Access Token (PAT)</strong> from GitHub.
            A PAT is a special type of authentication credential that acts like a password but is
            scoped to only the permissions you choose. Unlike your regular GitHub password, a PAT
            can be limited to specific repositories and specific actions, making it far more secure
            for tool-based access.
          </p>
          <p>
            DropToGit needs a PAT because it communicates directly with GitHub&rsquo;s Data API on your
            behalf. When you drag and drop your project files, DropToGit uses your token to
            authenticate with GitHub and create commits in your repository. Without this token,
            GitHub has no way to verify that you have permission to write to the target repository.
          </p>
          <p>
            Using a PAT is one of three common ways to authenticate with GitHub. The alternatives
            are SSH keys (which require generating a key pair and adding the public key to your
            GitHub account) and the GitHub CLI (which handles auth for you but requires a command-line
            setup). DropToGit uses a PAT because it works entirely in the browser — no SSH agent,
            no local Git installation, and no CLI configuration required. You paste the token once
            per session and everything else is handled automatically.
          </p>
          <p>
            Your token is <strong className="text-foreground">never stored</strong> on any server. It
            lives only in your browser&rsquo;s memory for the duration of the session and is sent
            directly to GitHub&rsquo;s API over an encrypted HTTPS connection. When you close the tab or
            refresh the page, the token is gone.
          </p>
        </CardContent>
      </Card>

      {/* 2. Creating a Fine-Grained PAT */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-accent/10">
              <Key className="h-4 w-4 text-sky-accent" />
            </div>
            <CardTitle className="text-lg">Creating a Fine-Grained PAT</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            GitHub offers two types of Personal Access Tokens: classic (legacy) tokens and
            fine-grained tokens. DropToGit works with fine-grained tokens because they provide
            better security through narrow, repository-level permissions. Follow these steps to
            create one:
          </p>
          <ol className="list-decimal list-inside space-y-3 pl-2">
            <li>
              <strong className="text-foreground">Open GitHub Settings</strong> — Log in to GitHub
              and click your profile picture in the top-right corner. Select{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Settings</span>{' '}
              from the dropdown menu.
            </li>
            <li>
              <strong className="text-foreground">Navigate to Developer Settings</strong> — In the
              left sidebar, scroll down and click on{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Developer settings
              </span>
              .
            </li>
            <li>
              <strong className="text-foreground">Go to Personal Access Tokens</strong> — In the
              left sidebar of the Developer settings page, click on{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Personal access tokens
              </span>
              , then select{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Fine-grained tokens
              </span>
              .
            </li>
            <li>
              <strong className="text-foreground">Generate a New Token</strong> — Click the{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Generate new token
              </span>{' '}
              button.
            </li>
            <li>
              <strong className="text-foreground">Set the Token Name</strong> — Give your token a
              descriptive name so you can identify it later, such as{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">DropToGit</span>.
              This name appears in your list of active tokens on GitHub.
            </li>
            <li>
              <strong className="text-foreground">Select Repository Access</strong> — Choose{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                All repositories
              </span>{' '}
              if you want to push to any repo on your account, or select{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Only select repositories
              </span>{' '}
              and pick specific repos for tighter security. If you only plan to use DropToGit with
              one or two projects, selecting specific repositories is the safer choice.
            </li>
            <li>
              <strong className="text-foreground">Configure Repository Permissions</strong> —
              Scroll down to the <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Repository permissions</span> section.
              Find <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Contents</span> and set it to{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Read and write</span>.
              This is the only permission DropToGit needs — it allows the app to read your
              repository&rsquo;s file tree and create new commits. No other permissions are required.
            </li>
            <li>
              <strong className="text-foreground">Set an Expiration</strong> — Choose an expiration
              date for your token. GitHub enforces a maximum of one year. For regular use, 30 or 90
              days is a good balance between convenience and security. You can always create a new
              token when this one expires.
            </li>
            <li>
              <strong className="text-foreground">Generate and Copy the Token</strong> — Click the
              green{' '}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                Generate token
              </span>{' '}
              button at the bottom of the page. GitHub will display your new token on the next
              screen. <strong className="text-foreground">Copy it immediately</strong> — this is the
              only time you will be able to see the full token. Once you leave or refresh the page,
              it will be hidden and cannot be recovered.
            </li>
          </ol>
          <p>
            Paste the copied token into DropToGit&rsquo;s token input field. Your repositories will
            load automatically and you are ready to start pushing files.
          </p>
        </CardContent>
      </Card>

      {/* 3. Connecting Your Repo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Connecting Your Repo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Once you have your PAT, connecting to a repository is straightforward. Paste your token
            into the input field on the DropToGit homepage. As soon as the token is accepted, DropToGit
            will call GitHub&rsquo;s API to fetch the list of repositories your token has access to. This
            happens automatically — no extra buttons to click.
          </p>
          <p>
            Your repositories will appear in a dropdown selector. Simply click the dropdown and choose
            the repository you want to push your files to. If the repo you need does not exist yet, click
            the{' '}
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">+</span> button next
            to the dropdown. You will be prompted to enter a name and optional description for the new
            repository. DropToGit will create it on your GitHub account and select it automatically.
          </p>
          <p>
            After selecting (or creating) a repository, you are ready to upload. Drag a folder or a
            .zip file onto the drop zone, review the file tree that appears, choose your push mode,
            and hit Push. DropToGit handles the rest — uploading each file to GitHub&rsquo;s API and
            creating a commit on the default branch.
          </p>
        </CardContent>
      </Card>

      {/* 4. Replace vs Smart Update */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-accent/10">
              <RefreshCw className="h-4 w-4 text-sky-accent" />
            </div>
            <CardTitle className="text-lg">Replace vs Smart Update</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            DropToGit offers two push modes, each suited to a different use case. Understanding the
            difference helps you choose the right one and avoid accidentally losing work.
          </p>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Replace Everything
              </h3>
              <p>
                This mode removes <strong className="text-foreground">all existing files</strong> in
                the repository and replaces them entirely with the files you are uploading. Everything
                is committed in a single, clean operation. Use this mode when you want a fresh slate —
                for example, when you are pushing a brand-new project or when you want to completely
                overwrite what is currently in the repo. Be cautious: any files that exist in the
                repository but are not included in your upload will be deleted.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Smart Update
              </h3>
              <p>
                This mode is more surgical. It compares the files you are uploading against what already
                exists in the repository and only performs actions on files that are{' '}
                <strong className="text-foreground">new or changed</strong>. Existing files that you
                are not uploading are left untouched. This is ideal when you are updating an existing
                project — adding a few new files, modifying some existing ones, and preserving
                everything else. No files are deleted unless you explicitly remove them from your upload.
              </p>
            </div>
          </div>
          <p>
            <strong className="text-foreground">When in doubt, use Smart Update.</strong> It is the
            safer option because it preserves your existing repository content. Only reach for Replace
            Everything when you are certain you want a clean reset.
          </p>
        </CardContent>
      </Card>

      {/* 5. Troubleshooting */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-lg">Troubleshooting</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-muted-foreground leading-relaxed">
          <p>
            Here are the most common errors you might encounter while using DropToGit and how to
            resolve them:
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                403 Forbidden
              </h3>
              <p>
                A 403 error means GitHub is rejecting the request because your token does not have
                the required permissions. This almost always means the fine-grained token&rsquo;s{' '}
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Contents</span>{' '}
                permission is not set to{' '}
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  Read and write
                </span>
                . Go back to GitHub Settings &rarr; Developer settings &rarr; Personal access tokens,
                edit your token, and make sure the Contents permission is correct. Also verify that
                the token has access to the repository you are trying to push to.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                404 Not Found
              </h3>
              <p>
                A 404 error typically means the repository does not exist or your token does not have
                access to it. Double-check the repository name — it is case-sensitive and must match
                exactly. If the repository is owned by an organization, ensure your token was granted
                access to that organization&rsquo;s repositories.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Rate Limit Exceeded
              </h3>
              <p>
                GitHub imposes rate limits on API requests to prevent abuse. If you are pushing a
                large number of files, you might hit this limit. The error message will tell you how
                long to wait before trying again. Generally, waiting a minute or two is sufficient for
                individual users. If you consistently hit rate limits, consider reducing the number of
                files in a single push.
              </p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                File Too Large
              </h3>
              <p>
                GitHub&rsquo;s API enforces strict file size limits. Individual files cannot exceed{' '}
                <strong className="text-foreground">50 MB</strong>, and the total size of all files
                in a single commit cannot exceed{' '}
                <strong className="text-foreground">200 MB</strong>. If you hit this error, check
                your upload for unexpectedly large files such as compiled binaries, video files, or
                database dumps. Consider using Git LFS for large files, or exclude them from your
                upload.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Security FAQ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Security FAQ</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Security is a core design principle of DropToGit. Here are answers to the most common
            security-related questions:
          </p>
          <div className="space-y-3">
            <div className="rounded-lg border p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Is my token ever stored anywhere?
              </h3>
              <p>
                No. Your Personal Access Token is held only in your browser&rsquo;s runtime memory for the
                duration of the session. It is never written to a database, never persisted to
                localStorage or sessionStorage, and never sent to any server other than GitHub&rsquo;s API.
                When you close the tab or navigate away, the token ceases to exist.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                How does the token reach GitHub?
              </h3>
              <p>
                All communication between your browser and GitHub uses{' '}
                <strong className="text-foreground">HTTPS</strong> (TLS encryption). Your token is
                included as a Bearer token in the Authorization header of each API request. This is
                the same mechanism that GitHub&rsquo;s own web interface uses. The token is encrypted in
                transit and cannot be intercepted by third parties.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Are my tokens or files ever logged?
              </h3>
              <p>
                No. DropToGit does not log tokens, file contents, or any sensitive data. There are no
                server-side logs, no analytics that capture request bodies, and no middleware that
                inspects your uploads. The application processes everything client-side and forwards
                only what is necessary to GitHub&rsquo;s API.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Is there a database?
              </h3>
              <p>
                No. DropToGit does not use any database — relational, document-based, or otherwise.
                There is no user data to store because there are no user accounts. The application is
                entirely stateless from a server perspective. Everything happens in your browser.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                What prevents path traversal attacks?
              </h3>
              <p>
                DropToGit validates all file paths before uploading. Any path that attempts to traverse
                outside the repository root (for example, using <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">../</span> sequences) is rejected. This prevents
                malicious files from being written to arbitrary locations on the target repository.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                Are there file size limits?
              </h3>
              <p>
                Yes. Individual files are limited to <strong className="text-foreground">50 MB</strong>,
                and the total upload size per push is capped at{' '}
                <strong className="text-foreground">200 MB</strong>. These limits are enforced
                client-side before any data is sent to GitHub, so you will be notified immediately if
                a file exceeds the threshold. These limits align with GitHub&rsquo;s own restrictions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Roadmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-accent/10">
              <Map className="h-4 w-4 text-sky-accent" />
            </div>
            <CardTitle className="text-lg">Roadmap</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            DropToGit is actively developed and new features are on the way. Here is what is planned:{' '}
          </p>
          <ul className="space-y-2.5">
            {roadmapItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-accent/10 text-[10px] font-bold text-sky-accent">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="pt-2">
            Have a feature idea?{' '}
            <a
              href="https://github.com/Brivian2002/DropToGit/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Open an issue on GitHub
            </a>{' '}
            and let us know.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}