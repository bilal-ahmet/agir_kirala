import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "AĞIRKİRALA — Ağır Vasıta & İş Makinesi Kiralama",
    template: "%s | AĞIRKİRALA",
  },
  description:
    "Ekskavatör, vinç, forklift, kamyon ve daha fazlası. Operatörlü veya operatörsüz, binlerce iş makinesi ve ağır vasıta ilanı tek platformda. Kirala veya kiraya ver.",
  keywords: [
    "iş makinesi kiralama",
    "ağır vasıta kiralama",
    "ekskavatör kiralama",
    "vinç kiralama",
    "forklift kiralama",
    "kamyon kiralama",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-base text-fg">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
