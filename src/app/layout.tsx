import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AfterMath — Xem trước hậu quả tài chính trước khi ký",
  description:
    "AfterMath mô phỏng những hậu quả tài chính ẩn của các quyết định vay lớn trước khi bạn cam kết.",
  openGraph: {
    title: "AfterMath — Tiền kiểm cho quyết định tài chính lớn",
    description:
      "Xem trước hậu quả tài chính trước khi ký với mô phỏng tiền kiểm minh bạch.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
