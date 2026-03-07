import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Casadenza Distributor Portal",
  description: "Distributor self-serve portal (PWA) for Casadenza",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
