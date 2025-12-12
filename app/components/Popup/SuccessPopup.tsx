"use client";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import ModalBase from "./ModalBase";

type SuccessScreenProps = {
  message?: string;
  onClose?: () => void;
  redirectTo?: string;
};

const SuccessPopup = ({
  message = "Success",
  onClose,
  redirectTo,
}: SuccessScreenProps) => {
  return (
    <ModalBase>
      <Card className="max-w-md w-full shadow-2xl border-2 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                Success
              </p>
              {message && (
                <p className="text-sm text-gray-700 wrap-break-words max-w-xs">
                  {message}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
              {redirectTo ? (
                <Link href={redirectTo} className="w-full">
                  <Button
                    className="w-full bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default SuccessPopup;
