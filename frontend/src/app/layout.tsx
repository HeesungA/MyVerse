import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyVerse — 크리에이터 수익화 플랫폼",
  description: "팔로워를 매출로 전환하는 크리에이터 올인원 SaaS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
