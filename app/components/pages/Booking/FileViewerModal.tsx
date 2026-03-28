"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Download, FileText, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";

interface FileViewerModalProps {
  fileData: Buffer;
  fileType: "PDF" | "DOCX" | "IMAGE";
  bookingId: string;
  onClose: () => void;
}

const FileViewerModal = ({
  fileData,
  fileType,
  bookingId,
  onClose,
}: FileViewerModalProps) => {
  const [fileUrl, setFileUrl] = useState<string>("");

  useEffect(() => {
    // Convert Buffer to Blob URL
    const byteArray = new Uint8Array(Object.values(fileData));
    const blob = new Blob([byteArray], {
      type:
        fileType === "PDF"
          ? "application/pdf"
          : fileType === "IMAGE"
            ? "image/jpeg"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    setFileUrl(url);

    // Cleanup
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [fileData, fileType]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    const extension =
      fileType === "PDF" ? ".pdf" : fileType === "DOCX" ? ".docx" : ".jpg";
    a.download = `booking-${bookingId}-requirements${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <ModalBase onClose={onClose}>
      <Card className="w-[90vw] max-w-7xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {fileType === "IMAGE" ? (
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-600" />
                )}
                Requirements Document
              </CardTitle>
              <CardDescription>
                {fileType === "PDF" ? "PDF Document" : "Image File"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {fileType === "PDF" ? (
            <iframe
              src={fileUrl}
              className="w-full h-[80vh]"
              title="PDF Viewer"
            />
          ) : fileType === "IMAGE" ? (
            <div className="w-full h-[80vh] flex items-center justify-center bg-gray-50 p-4 overflow-auto">
              <img
                src={fileUrl}
                alt="Requirements Document"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default FileViewerModal;
