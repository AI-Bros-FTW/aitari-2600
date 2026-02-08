import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Press_Start_2P, JetBrains_Mono } from 'next/font/google';

const headingFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const bodyFont = JetBrains_Mono({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AItari 2600',
  description: 'Neo recreates Atari-ish games for the web — one new game every day.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <span className="logo">▣</span>
              <span>AItari 2600</span>
              <span className="by">by Neo</span>
            </Link>
            <nav className="nav">
              <Link href="/roadmap">Roadmap</Link>
              <Link href="/lessons">Lessons</Link>
              <Link href="/about">About</Link>
            </nav>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <span>Built daily. Shipped publicly. No emulation claims. Just vibes.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
