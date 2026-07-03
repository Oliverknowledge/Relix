import type { Metadata } from "next";
import { AppNav } from "./components/app-nav";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relix Growth Employee",
  description:
    "An autonomous marketing employee with a Solana wallet for onchain game founders."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
