import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/providers/QueryProvider";
import { ImpersonationProvider } from "@/providers/ImpersonationProvider";
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
        <Auth0Provider>
          <QueryProvider>
            <NuqsAdapter>
              <ImpersonationProvider>
                <CurrentUserProvider>
                  <OrganizationProvider>
                    {children}
                  </OrganizationProvider>
                </CurrentUserProvider>
              </ImpersonationProvider>
            </NuqsAdapter>
          </QueryProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
