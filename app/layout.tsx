import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { RegisterSW } from "@/components/shared/RegisterSW";
import ScrollToTop from "@/components/shared/ScrollToTop";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "TallerConecta · Tu cliente siempre sabe qué pasa con su carro",
    template: "%s · TallerConecta",
  },
  description:
    "Plataforma para talleres mecánicos: órdenes de servicio, presupuestos con autorización del cliente, evidencias fotográficas y portal de seguimiento. Menos llamadas, más aprobaciones, más confianza.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TallerConecta",
  },
};

export const viewport: Viewport = {
  themeColor: "#043699",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${inter.className} ${jakarta.className}`}>

      <body className={`${inter.className} page-fade-in`}>
        <RegisterSW />
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
