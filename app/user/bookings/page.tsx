import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import AdminBooking from "@/app/components/pages/Booking/Admin";
import StudentBooking from "@/app/components/pages/Booking/Student";
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
    return <AdminBooking />;
  } else if (session.user.role === "user") {
    return <StudentBooking />;
  }

  return <ErrorPopup message="Unauthorized access." />;
};

export default page;
