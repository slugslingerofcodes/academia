import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function PlannerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={`${inter.variable} planner-theme min-h-screen`}>{children}</div>;
}
