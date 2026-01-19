import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  images: {
    remotePatterns: [
      // S3 bucket for uploaded avatars
      {
        protocol: "https",
        hostname: "tava-team-calendar.s3.us-east-2.amazonaws.com",
      },
      // Auth0 profile pictures
      {
        protocol: "https",
        hostname: "*.auth0.com",
      },
      {
        protocol: "https",
        hostname: "s.gravatar.com",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
      },
      // Google profile pictures (for Google OAuth via Auth0)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // GitHub profile pictures (for GitHub OAuth via Auth0)
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // Jira avatars
      {
        protocol: "https",
        hostname: "*.atlassian.com",
      },
      {
        protocol: "https",
        hostname: "*.atl-paas.net",
      },
      // Local development
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Proxy /uploads/* requests to the backend server
        source: "/uploads/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
