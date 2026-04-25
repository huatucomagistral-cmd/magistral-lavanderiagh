import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { LicenseGuard } from "@/components/LicenseGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Magistral - Lavanderías",
  description: "Plataforma Premium para la Gestión de Lavanderías",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Magistral",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      // "dark" class is added here to enforce our premium dark mode
      className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <LicenseGuard>
            {children}
          </LicenseGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
