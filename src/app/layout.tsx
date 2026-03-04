import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Evolution Sandbox",
  description: "Turn-based ecological simulation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
