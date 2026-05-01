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
          <CardDescription>
            Defaults to Google SMTP. Sender details control the From line.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground md:col-span-2">
                SMTP User/Password authenticate with your mail provider. Sender
                Email/Name show to recipients in the From field.
              </div>
              <div>
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  name="smtpHost"
                  placeholder="smtp.gmail.com"
                  defaultValue={initialSettings.smtpHost}
                />
              </div>
              <div>
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  name="smtpPort"
                  type="number"
                  min={1}
                  max={65535}
                  defaultValue={initialSettings.smtpPort}
                />
              </div>
              <div>
                <Label htmlFor="smtpUser">SMTP User (full email)</Label>
                <Input
                  id="smtpUser"
                  name="smtpUser"
                  placeholder="name@lcu.edu.ph"
                  autoComplete="username"
                  defaultValue={initialSettings.smtpUser}
                />
                <p className="text-xs text-muted-foreground">
                  The login account for SMTP authentication.
                </p>
              </div>
              <div>
                <Label htmlFor="smtpPass">SMTP Password (app password)</Label>
                <Input
                  id="smtpPass"
                  name="smtpPass"
                  type="password"
                  autoComplete="current-password"
                  defaultValue={initialSettings.smtpPass}
                />
              </div>
              <div>
                <Label htmlFor="senderEmail">Sender Email (From address)</Label>
                <Input
                  id="senderEmail"
                  name="senderEmail"
                  type="email"
                  placeholder="name@lcu.edu.ph"
                  autoComplete="email"
                  defaultValue={initialSettings.senderEmail}
                />
                <p className="text-xs text-muted-foreground">
                  The From address shown to recipients. Often the same as SMTP
                  user.
                </p>
              </div>
              <div>
                <Label htmlFor="senderName">Sender Name (From name)</Label>
                <Input
                  id="senderName"
                  name="senderName"
                  placeholder="LCUP Venue Reservation"
                  autoComplete="name"
                  defaultValue={initialSettings.senderName}
                />
                <p className="text-xs text-muted-foreground">
                  Display name shown to recipients.
                </p>
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
