import type { Metadata } from "next";
import { AppProviders } from "@/providers/AppProviders";
import { manrope } from "@/lib/fonts";
import "@/shared/globals.css";

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
