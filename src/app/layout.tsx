import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../styles.css";
import { THEME_INIT_SCRIPT } from "@/components/planner/theme-toggle";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academia — Tasks, Timetable & Holidays",
  description:
    "Track tasks and projects, generate work timetables over any period, manage your weekly class schedule with 10-minute reminders, mark holidays, and build an editable resume.",
  applicationName: "Academia",
  // makes iOS launch the home-screen icon fullscreen, without Safari's chrome
  appleWebApp: {
    capable: true,
    title: "Academia",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next emits only the standard `mobile-web-app-capable`; iOS before 16.4
    // relies on this Apple-prefixed one to launch without Safari's chrome
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1015" },
  ],
  // let the page paint under the notch / dynamic island; safe-area insets in
  // styles.css keep content clear of it
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* applies the saved theme before first paint, avoiding a flash of the
            wrong palette on load */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
