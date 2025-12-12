import AdminDashboard from "@/app/components/pages/Dashboard/Admin";
import StudentDashboard from "@/app/components/pages/Dashboard/Student";
import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "admin") {
    return <AdminDashboard />;
  } else if (session.user.role === "user") {
    return <StudentDashboard />;
  }

  return <ErrorPopup message="Unauthorized access." />;
};

export default page;
