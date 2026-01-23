"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "./QueryProvider";
import { ImpersonationProvider } from "./ImpersonationProvider";
import { CurrentUserProvider } from "./CurrentUserProvider";
import { OrganizationProvider } from "./OrganizationProvider";
import { ToastProvider } from "@/components";

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <Auth0Provider>
      <QueryProvider>
        <NuqsAdapter>
          <ImpersonationProvider>
            <CurrentUserProvider>
              <OrganizationProvider>
                <ToastProvider>{children}</ToastProvider>
              </OrganizationProvider>
            </CurrentUserProvider>
          </ImpersonationProvider>
        </NuqsAdapter>
      </QueryProvider>
    </Auth0Provider>
  );
};
