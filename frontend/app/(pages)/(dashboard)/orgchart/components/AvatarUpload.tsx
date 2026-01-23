"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2, Check } from "lucide-react";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  userName: string;
  onUpload: (imageDataUrl: string) => Promise<void>;
  canEdit: boolean;
}

export default function AvatarUpload({
  currentAvatarUrl,
  userName,
  onUpload,
  canEdit,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setSuccess(false);

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(dataUrl);

        // Upload the image
        setIsUploading(true);
        try {
          await onUpload(dataUrl);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch {
          setError("Failed to upload image. Please try again.");
          setPreviewUrl(null);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (!canEdit) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [canEdit, handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleClick = () => {
    if (canEdit && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="relative group">
      <div
        className={`relative w-24 h-24 rounded-full overflow-hidden border-4 shadow-lg transition-all duration-200 ${
          isDragging
            ? "border-primary-400 scale-105"
            : canEdit
              ? "border-white hover:border-primary-200 cursor-pointer"
              : "border-white"
        } ${isUploading ? "opacity-75" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {displayUrl ? (
          <img src={displayUrl} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary-400 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {canEdit && !isUploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {success && !isUploading && (
          <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center animate-pulse">
            <Check className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={!canEdit || isUploading}
      />

      {canEdit && !isUploading && (
        <button
          type="button"
          onClick={handleClick}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Upload image"
        >
          <Upload className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {error && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs whitespace-nowrap flex items-center gap-1">
          <span>{error}</span>
          <button onClick={clearPreview} className="ml-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {isDragging && canEdit && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary-400 animate-pulse" />
        </div>
      )}
    </div>
  );
}
