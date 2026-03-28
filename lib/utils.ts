import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// File validation utilities
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = {
  PDF: ["application/pdf"],
  DOCX: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  IMAGE: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
};

export type FileType = "PDF" | "DOCX" | "IMAGE";

export function validateFile(file: File): {
  valid: boolean;
  error?: string;
  fileType?: FileType;
} {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  let fileType: FileType | undefined;
  if (ALLOWED_FILE_TYPES.PDF.includes(file.type)) {
    fileType = "PDF";
  } else if (ALLOWED_FILE_TYPES.DOCX.includes(file.type)) {
    fileType = "DOCX";
  } else if (ALLOWED_FILE_TYPES.IMAGE.includes(file.type)) {
    fileType = "IMAGE";
  } else {
    return {
      valid: false,
      error:
        "Only PDF, DOCX, and image files (JPEG, PNG, GIF, WEBP) are allowed",
    };
  }

  return { valid: true, fileType };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}
