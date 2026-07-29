import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { I18nProvider } from "@/lib/i18n/provider";
import { isLocale } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "@/lib/i18n/types";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: {
    default: "VLESS Manager",
    template: "%s · VLESS Manager",
  },
  description:
    "Панель для установки VLESS Reality на ваш VPS: SSH-setup, QR-код и готовая ссылка для клиента. Опциональный RU Relay.",
  applicationName: "VLESS Manager",
  keywords: [
    "VLESS",
    "Reality",
    "Xray",
    "VPN",
    "VPS",
    "self-hosted",
    "RU Relay",
  ],
  openGraph: {
    title: "VLESS Manager",
    description:
      "One-click VLESS Reality on your own VPS — SSH install, QR, optional RU relay.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const initialLocale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale} className="dark">
      <body
        className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
