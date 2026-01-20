import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import "./globals.css";

// Primary font - Manrope Light 300
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manager Dashboard",
  description: "Employee management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased font-light">
        <Auth0Provider>{children}</Auth0Provider>
      </body>
    </html>
  );
}
