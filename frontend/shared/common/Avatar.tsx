"use client";

import { useState, memo } from "react";
import Image from "next/image";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  s3AvatarUrl?: string | null;
  auth0AvatarUrl?: string | null;
  jiraAvatarUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<
  AvatarSize,
  { container: string; text: string; pixels: number }
> = {
  xs: { container: "w-6 h-6", text: "text-xs", pixels: 24 },
  sm: { container: "w-8 h-8", text: "text-xs", pixels: 32 },
  md: { container: "w-10 h-10", text: "text-sm", pixels: 40 },
  lg: { container: "w-14 h-14", text: "text-lg", pixels: 56 },
  xl: { container: "w-24 h-24", text: "text-3xl", pixels: 96 },
};

const Avatar = memo(function Avatar({
  s3AvatarUrl,
  auth0AvatarUrl,
  jiraAvatarUrl,
  firstName,
  lastName,
  size = "md",
  className = "",
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [currentSource, setCurrentSource] = useState<
    "s3" | "auth0" | "jira" | "initials"
  >(
    s3AvatarUrl
      ? "s3"
      : auth0AvatarUrl
        ? "auth0"
        : jiraAvatarUrl
          ? "jira"
          : "initials",
  );

  const { container, text, pixels } = sizeClasses[size];
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const handleImageError = () => {
    if (currentSource === "s3" && auth0AvatarUrl) {
      setCurrentSource("auth0");
      setImageError(false);
    } else if (
      (currentSource === "s3" || currentSource === "auth0") &&
      jiraAvatarUrl
    ) {
      setCurrentSource("jira");
      setImageError(false);
    } else {
      setCurrentSource("initials");
      setImageError(true);
    }
  };

  const getImageUrl = () => {
    if (currentSource === "s3" && s3AvatarUrl) return s3AvatarUrl;
    if (currentSource === "auth0" && auth0AvatarUrl) return auth0AvatarUrl;
    if (currentSource === "jira" && jiraAvatarUrl) return jiraAvatarUrl;
    return null;
  };

  const imageUrl = getImageUrl();

  if (imageError || !imageUrl) {
    return (
      <div
        className={`${container} flex-shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ${className}`}
      >
        <span className={`${text} font-bold text-white`}>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`${container} flex-shrink-0 rounded-full relative overflow-hidden ${className}`}
    >
      <Image
        src={imageUrl}
        alt={`${firstName} ${lastName}`}
        width={pixels}
        height={pixels}
        className="object-cover w-full h-full rounded-full"
        onError={handleImageError}
      />
    </div>
  );
});

export default Avatar;
