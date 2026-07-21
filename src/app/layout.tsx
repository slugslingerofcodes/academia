import type { Metadata } from "next";
import { Anton, JetBrains_Mono, Noto_Sans_JP } from "next/font/google";
import "../styles.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const notoJp = Noto_Sans_JP({
  variable: "--font-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "MANIAC▲ — Digital Works Studio",
  description:
    "MANIAC is a night-mode digital studio crafting realtime graphics, sound machines and playable worlds. 夜のデジタル制作所。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${jetbrains.variable} ${notoJp.variable} h-full antialiased`}
    >
      <body className="min-h-full" data-custom-cursor="true">
        {children}
      </body>
    </html>
  );
}
