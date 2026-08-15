import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DropToGit — Ship projects to GitHub without the terminal",
    template: "%s — DropToGit",
  },
  description:
    "Move a local folder or z.ai project into a clean GitHub commit from the browser. No CLI, no local setup, no credential storage.",
  keywords: [
    "GitHub",
    "Git",
    "upload",
    "drag and drop",
    "deploy",
    "developer tool",
    "DropToGit",
  ],
  authors: [{ name: "Bright Dumashie" }],
  creator: "Bright Dumashie",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "DropToGit — Ship projects to GitHub without the terminal",
    description:
      "Move a local folder or z.ai project into a clean GitHub commit from the browser.",
    type: "website",
    siteName: "DropToGit",
  },
  twitter: {
    card: "summary_large_image",
    title: "DropToGit",
    description:
      "Browser-first project delivery for GitHub.",
  },
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
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
