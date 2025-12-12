import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { AlertTriangle, HelpCircle } from "lucide-react";
import ModalBase from "./ModalBase";

const YesNoPopup = ({
  message,
  onYes,
  onNo,
  warning = false,
}: {
  message?: string;
  onYes?: () => void;
  onNo?: () => void;
  warning?: boolean;
}) => {
  return (
    <ModalBase>
      <Card className="max-w-md w-full shadow-2xl border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${
                warning
                  ? "bg-amber-50 border-amber-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              {warning ? (
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              ) : (
                <HelpCircle className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-700">
                Confirm action
              </p>
              <p className="text-sm text-gray-600 wrap-break-words max-w-xs">
                {message || "Are you sure?"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-stretch gap-2 w-full mt-2">
              <Button
                className="sm:flex-1 w-full bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                onClick={onYes}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1 w-full"
                onClick={onNo}
              >
                No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default YesNoPopup;
