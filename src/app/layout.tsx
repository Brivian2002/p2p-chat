import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/droptogit/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DropToGit — Drop your project. Push to GitHub. Done.",
  description:
    "A fast, secure drag-and-drop tool to push projects directly to GitHub. No terminal, no Git commands. Replace everything or smart-update only what changed.",
  keywords: [
    "DropToGit",
    "GitHub",
    "upload to GitHub",
    "drag and drop git",
    "push to GitHub",
    "developer tool",
  ],
  authors: [{ name: "DropToGit" }],
  applicationName: "DropToGit",
  icons: {
    icon: [{ url: "/droptogit-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/droptogit-icon.svg"],
    apple: [{ url: "/droptogit-icon.svg" }],
  },
  openGraph: {
    title: "DropToGit — Drop your project. Push to GitHub. Done.",
    description:
      "Drag-and-drop tool to push projects directly to GitHub. No terminal, no Git commands.",
    siteName: "DropToGit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DropToGit",
    description:
      "Drag-and-drop tool to push projects directly to GitHub. No terminal, no Git commands.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#161b1d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
