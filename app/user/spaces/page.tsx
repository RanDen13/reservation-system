import AdminSpaces from "@/app/components/pages/Spaces/Admin";
import { getAllEventSpaces } from "@/app/components/pages/Spaces/EventSpaceActions";
import StudentSpaces from "@/app/components/pages/Spaces/Student";
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

  const result = await getAllEventSpaces();
  if (!result.success) {
    return (
      <ErrorPopup message={result.message || "Failed to load event spaces."} />
    );
  }

  if (session.user.role === "admin") {
    return <AdminSpaces eventSpaces={result.data || []} />;
  } else if (session.user.role === "user") {
    return <StudentSpaces eventSpaces={result.data || []} />;
  }

  return <ErrorPopup message="Unauthorized access." />;
};

export default page;
