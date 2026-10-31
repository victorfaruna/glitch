import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi-source",
  weight: "300 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glitch — A fresh pair of eyes for your app",
  description:
    "An AI browser testing workspace built for Gemma. Explore a scripted checkout demo, inspect reproducible findings, and replay every action.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${satoshi.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
