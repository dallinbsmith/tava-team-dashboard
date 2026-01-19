import type { Metadata } from "next";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/providers/QueryProvider";
import { CurrentUserProvider } from "@/providers/CurrentUserProvider";
import { OrganizationProvider } from "@/providers/OrganizationProvider";
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
        <UserProvider>
          <QueryProvider>
            <NuqsAdapter>
              <CurrentUserProvider>
                <OrganizationProvider>
                  {children}
                </OrganizationProvider>
              </CurrentUserProvider>
            </NuqsAdapter>
          </QueryProvider>
        </UserProvider>
      </body>
    </html>
  );
}
