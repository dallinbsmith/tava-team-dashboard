"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { LogIn, Users } from "lucide-react";

export default function LoginPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="animate-spin h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 mb-4">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Manager Dashboard
            </h1>
            <p className="text-gray-500 mt-2">Sign in to manage your team</p>
          </div>

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Auth0
          </Link>

          <p className="text-center text-sm text-gray-500 mt-6">
            Secure authentication powered by Auth0
          </p>
        </div>
      </div>
    </div>
  );
}
