import UsersPage from "@/app/components/pages/Users";
import { getAllUsers } from "@/app/components/pages/Users/UsersAction";
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

  if (session.user.role !== "admin") {
    return <ErrorPopup message="Unauthorized access." />;
  }

  const result = await getAllUsers();
  if (!result.success) {
    return <ErrorPopup message={result.message || "Failed to fetch users."} />;
  }

  return <UsersPage users={result.data || []} />;
};

export default page;
