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
    default: "DropToGit — Drag & Drop Projects to GitHub",
    template: "%s — DropToGit",
  },
  description:
    "Upload projects directly to GitHub without the terminal. Drag, drop, push. Simple, fast, secure.",
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
  creators: [{ name: "Bright Dumashie", url: "https://droptogit.vercel.app/about-me" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "DropToGit — Drag & Drop Projects to GitHub",
    description:
      "Upload projects directly to GitHub without the terminal. Drag, drop, push.",
    type: "website",
    siteName: "DropToGit",
  },
  twitter: {
    card: "summary_large_image",
    title: "DropToGit",
    description:
      "Upload projects directly to GitHub without the terminal. Drag, drop, push.",
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
