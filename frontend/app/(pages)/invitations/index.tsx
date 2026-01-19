"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";
import {
  validateInvitation,
  acceptInvitation,
  ValidateInvitationResponse,
} from "@/lib/api";
import {
  Mail,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  LogIn,
  ArrowRight,
} from "lucide-react";

type InviteStep = "loading" | "invalid" | "valid" | "authenticated" | "completing" | "success";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user: auth0User, isLoading: authLoading } = useUser();

  const [step, setStep] = useState<InviteStep>("loading");
  const [invitation, setInvitation] = useState<ValidateInvitationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Validate the invitation token
  useEffect(() => {
    async function validate() {
      try {
        const inv = await validateInvitation(token);
        setInvitation(inv);

        if (!inv.valid) {
          setStep("invalid");
          if (inv.status === "accepted") {
            setError("This invitation has already been used.");
          } else if (inv.status === "expired") {
            setError("This invitation has expired.");
          } else if (inv.status === "revoked") {
            setError("This invitation has been revoked.");
          }
        } else {
          setStep("valid");
        }
      } catch {
        setStep("invalid");
        setError("This invitation link is invalid or has expired.");
      }
    }

    if (token) {
      validate();
    }
  }, [token]);

  // Check if user is authenticated and handle the flow
  useEffect(() => {
    if (authLoading) return;

    if (auth0User && step === "valid") {
      // User is authenticated and invitation is valid
      // Check if email matches
      if (auth0User.email === invitation?.email) {
        setStep("authenticated");
        // Pre-fill name if available from Auth0
        if (auth0User.name) {
          const nameParts = auth0User.name.split(" ");
          if (nameParts.length >= 2) {
            setFirstName(nameParts[0]);
            setLastName(nameParts.slice(1).join(" "));
          } else {
            setFirstName(auth0User.name);
          }
        }
      } else {
        setStep("invalid");
        setError(
          `This invitation was sent to ${invitation?.email}. Please sign in with that email address.`
        );
      }
    }
  }, [auth0User, authLoading, step, invitation]);

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth0User?.sub) return;

    setStep("completing");
    setError(null);

    try {
      await acceptInvitation(token, {
        auth0_id: auth0User.sub,
        first_name: firstName,
        last_name: lastName,
      });
      setStep("success");
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to accept invitation");
      setStep("authenticated");
    }
  };

  const getRoleIcon = (role: string) => {
    return role === "admin" ? (
      <Shield className="w-5 h-5" />
    ) : (
      <Users className="w-5 h-5" />
    );
  };

  const getRoleColor = (role: string) => {
    return role === "admin"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : "bg-blue-100 text-blue-700 border-blue-200";
  };

  // Loading state
  if (step === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="animate-spin h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Invalid invitation
  if (step === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid invitation - user needs to sign up/sign in
  if (step === "valid" && !auth0User) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">You're Invited!</h1>
              <p className="text-gray-600 mt-2">
                You've been invited to join the Manager Dashboard
              </p>
            </div>

            <div className="bg-gray-50 p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{invitation?.email}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border ${getRoleColor(
                      invitation?.role || ""
                    )}`}
                  >
                    {getRoleIcon(invitation?.role || "")}
                    {invitation?.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>
                  Expires{" "}
                  {invitation?.expires_at
                    ? new Date(invitation.expires_at).toLocaleDateString()
                    : "soon"}
                </span>
              </div>
            </div>

            <Link
              href={`/api/auth/login?returnTo=/invite/${token}`}
              className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Sign up with Auth0
            </Link>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account?{" "}
              <Link
                href={`/api/auth/login?returnTo=/invite/${token}`}
                className="text-primary-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User authenticated - complete profile
  if (step === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Almost There!</h1>
              <p className="text-gray-600 mt-2">
                Complete your profile to accept the invitation
              </p>
            </div>

            <div className="bg-gray-50 p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{invitation?.email}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border ${getRoleColor(
                      invitation?.role || ""
                    )}`}
                  >
                    {getRoleIcon(invitation?.role || "")}
                    {invitation?.role}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-4 mb-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAcceptInvitation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your last name"
                  required
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 transition-colors"
              >
                Accept Invitation
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Completing
  if (step === "completing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-xl p-8 text-center">
            <div className="animate-spin h-12 w-12 border-b-2 border-primary-600 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900">Setting up your account...</h1>
            <p className="text-gray-600 mt-2">Please wait while we complete your registration.</p>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. Redirecting to dashboard...
            </p>
            <div className="animate-pulse flex justify-center">
              <div className="h-1 w-24 bg-primary-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
