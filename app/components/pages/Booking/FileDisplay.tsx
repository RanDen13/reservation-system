"use client";

import { Button } from "@/app/components/ui/button";
import { Download, FileText, Image as ImageIcon } from "lucide-react";

interface FileDisplayProps {
  fileName: string;
  fileData: Buffer;
  fileType: "PDF" | "DOCX" | "IMAGE";
}

const FileDisplay = ({ fileName, fileData, fileType }: FileDisplayProps) => {
  const handleDownload = () => {
    const blob = new Blob([new Uint8Array(fileData)], {
      type:
        fileType === "PDF"
          ? "application/pdf"
          : fileType === "DOCX"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "image/*",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getIcon = () => {
    if (fileType === "IMAGE") return <ImageIcon className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      <div className="text-sky-600">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        <p className="text-xs text-gray-500">{fileType}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleDownload}
        className="shrink-0"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default FileDisplay;
