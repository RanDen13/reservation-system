import AdminSpaces from "@/app/components/pages/Spaces/Admin";
import { getAllEventSpaces } from "@/app/components/pages/Spaces/EventSpaceActions";
import OfficerSpaces from "@/app/components/pages/Spaces/Officer";
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

  const role = session.user.role?.toUpperCase();

  if (role === "SUPER_ADMIN") {
    return <AdminSpaces eventSpaces={result.data || []} />;
  } else if (["OFFICER", "APPROVER", "ADMIN"].includes(role || "")) {
    return <OfficerSpaces eventSpaces={result.data || []} />;
  }

  return <ErrorPopup message="Unauthorized access." />;
};

export default page;
