"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import AvatarUpload from "./AvatarUpload";

interface EmployeeHeaderProps {
  employee: {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    role: string;
    title: string;
  };
  canEdit: boolean;
  onEditClick?: () => void;
}

export default function EmployeeHeader({ employee, canEdit, onEditClick }: EmployeeHeaderProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(employee.avatar_url);

  const handleAvatarUpload = async (imageDataUrl: string) => {
    const response = await fetch(`/api/users/${employee.id}/avatar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
      throw new Error("Failed to upload avatar");
    }

    const updatedUser = await response.json();
    setAvatarUrl(updatedUser.avatar_url);
    router.refresh();
  };

  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-12">
      <div className="flex items-center gap-6">
        <AvatarUpload
          currentAvatarUrl={avatarUrl}
          userName={`${employee.first_name} ${employee.last_name}`}
          onUpload={handleAvatarUpload}
          canEdit={canEdit}
          />
        <div>
          <h1 className="text-3xl font-bold text-white">
            {employee.first_name} {employee.last_name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-3 py-1 text-sm font-medium bg-white/20 text-white">
              {employee.title || employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
            </span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={onEditClick}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </button>
              <span className="text-white/50 text-sm">
                or click avatar to change photo
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
