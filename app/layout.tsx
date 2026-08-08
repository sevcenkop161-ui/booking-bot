import type { Metadata } from "next";
import { Inter, Cormorant } from "next/font/google";
import "./globals.css";

// Same font pairing as the Ink Studio project, for a consistent look
// across both portfolio pieces.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Booking Bot Admin",
  description: "Admin dashboard for the Booking Bot Telegram booking system.",
};

// Sets data-theme from localStorage before paint, so switching themes
// doesn't flash the wrong one on the next page load. Runs before
// hydration; kept tiny and dependency-free on purpose.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
      // The theme-init script (below) sets this before React hydrates,
      // based on localStorage — server-rendered HTML can never know
      // that value in advance, so a mismatch here is expected, not a bug.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
