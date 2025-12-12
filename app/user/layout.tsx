import Sidebar from "@/app/components/Dashboard/Sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = session.user.role as "admin" | "user";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        userRole={userRole}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default layout;
