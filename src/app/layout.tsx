import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfterMath — See the financial aftermath before you sign",
  description:
    "AfterMath simulates the hidden financial consequences of major loan decisions before you commit. Powered by Alibaba Cloud. A synthetic hackathon scenario tool for financial pre-mortem analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
