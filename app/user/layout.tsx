import Sidebar from "@/app/components/Dashboard/Sidebar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DeactivatedNotice from "./DeactivatedNotice";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { banned: true },
  });

  if (account?.banned) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DeactivatedNotice />
      </div>
    );
  }

  const userRole = session.user.role?.toUpperCase() as
    | "OFFICER"
    | "APPROVER"
    | "ADMIN"
    | "SUPER_ADMIN";

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
