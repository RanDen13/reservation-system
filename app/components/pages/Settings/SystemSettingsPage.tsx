"use client";

import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useState } from "react";
import { updateSystemSettings } from "./SystemSettingsActions";

type SystemSettingsData = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName: string;
};

export default function SystemSettingsPage({
  initialSettings,
}: {
  initialSettings: SystemSettingsData;
}) {
  const popup = usePopup();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    const result = await updateSystemSettings(formData);
    setSaving(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    popup.showSuccess(result.message || "Settings updated.");
  };

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">
          Manage SMTP settings used for magic code emails.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>Defaults to Google SMTP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>SMTP Host</Label>
                <Input
                  name="smtpHost"
                  defaultValue={initialSettings.smtpHost}
                />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input
                  name="smtpPort"
                  type="number"
                  min={1}
                  max={65535}
                  defaultValue={initialSettings.smtpPort}
                />
              </div>
              <div>
                <Label>SMTP User</Label>
                <Input
                  name="smtpUser"
                  defaultValue={initialSettings.smtpUser}
                />
              </div>
              <div>
                <Label>SMTP Password</Label>
                <Input
                  name="smtpPass"
                  type="password"
                  defaultValue={initialSettings.smtpPass}
                />
              </div>
              <div>
                <Label>Sender Email</Label>
                <Input
                  name="senderEmail"
                  type="email"
                  defaultValue={initialSettings.senderEmail}
                />
              </div>
              <div>
                <Label>Sender Name</Label>
                <Input
                  name="senderName"
                  defaultValue={initialSettings.senderName}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
