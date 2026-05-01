import { getSystemSettings } from "@/app/components/pages/Settings/SystemSettingsActions";
import SystemSettingsPage from "@/app/components/pages/Settings/SystemSettingsPage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role?.toUpperCase() !== "SUPER_ADMIN") {
    redirect("/user/dashboard");
  }

  const result = await getSystemSettings();
  if (!result.success || !result.data) {
    redirect("/user/dashboard");
  }

  return <SystemSettingsPage initialSettings={result.data} />;
}
