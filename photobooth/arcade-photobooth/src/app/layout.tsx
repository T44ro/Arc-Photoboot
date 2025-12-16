import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// --- KONFIGURASI FONT LOKAL SEBOOTH-REGULAR ---
const seboothFont = localFont({
  src: "./fonts/Sebooth-Regular.ttf", 
  variable: "--font-custom",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Photobooth Estetik",
  description: "Capture your moment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Terapkan className font ke body */}
      <body className={`${seboothFont.className} bg-white text-black antialiased`}>
        {children}
      </body>
    </html>
  );
}