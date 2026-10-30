"use client";

import { ImagePlus, Trash2, UserRound } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { ProfilePhoto } from "@/data/resume";
import { buttonClass } from "@/components/ui/styles";
import { savePhoto } from "@/lib/photo-store";
import { createId } from "@/lib/resumes";

const OUTPUT_SIZE = 400;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/**
 * Center-crops and downsizes an image entirely in the browser and stores it in
 * IndexedDB, returning the metadata kept with the resume. If IndexedDB is
 * unavailable the image is kept inline instead. Nothing is uploaded.
 */
async function storeImage(file: File): Promise<ProfilePhoto> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const size = Math.min(side, OUTPUT_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("Could not encode image");
    const photo: ProfilePhoto = {
      id: createId(),
      mimeType: "image/jpeg",
      width: size,
      height: size,
      byteSize: blob.size,
      updatedAt: Date.now(),
    };
    try {
      await savePhoto(photo.id, blob);
    } catch {
      photo.inlineData = canvas.toDataURL("image/jpeg", 0.85);
    }
    return photo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type PhotoFieldProps = {
  /** Displayable URL of the current photo, or "". */
  value: string;
  hasPhoto: boolean;
  onChange: (photo: ProfilePhoto | undefined) => void;
};

export function PhotoField({ value, hasPhoto, onChange }: PhotoFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That image is larger than 15 MB. Please choose a smaller one.");
      return;
    }
    setBusy(true);
    try {
      onChange(await storeImage(file));
    } catch {
      setError("This image couldn't be read. Try a JPG or PNG file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel ring-1 ring-line">
          {value ? (
            <img src={value} alt="Your profile photo" className="size-full object-cover" />
          ) : (
            <UserRound aria-hidden="true" className="size-5 text-muted" />
          )}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onFile(event.target.files?.[0])}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          className={buttonClass("secondary", "sm", "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent")}
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          {busy ? "Processing…" : hasPhoto ? "Replace photo" : "Upload photo"}
        </label>
        {hasPhoto ? (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Remove photo"
            className={buttonClass("ghost", "sm", "w-10 px-0 text-[#b42318] hover:bg-[#fef3f2]")}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <p className="min-w-0 truncate text-[0.875rem] text-muted">Optional, stays in this browser</p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}
