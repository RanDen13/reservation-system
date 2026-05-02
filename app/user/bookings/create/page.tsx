import SapfBookingForm from "@/app/components/pages/SAPF/SapfBookingForm";
import {
  getApproverOptions,
  getSapfRequestById,
} from "@/app/components/pages/SAPF/SapfActions";
import { getAllEventSpaces } from "@/app/components/pages/Spaces/EventSpaceActions";
import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async ({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string; requestId?: string }>;
}) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role?.toUpperCase() !== "OFFICER") {
    return <ErrorPopup message="Only officers can create bookings." />;
  }

  const { venueId, requestId } = await searchParams;
  const [venuesResult, approversResult, requestResult] = await Promise.all([
    getAllEventSpaces(),
    getApproverOptions(),
    requestId ? getSapfRequestById(requestId) : Promise.resolve(null),
  ]);

  if (!venuesResult.success) {
    return (
      <ErrorPopup message={venuesResult.message || "Failed to load venues."} />
    );
  }

  if (!approversResult.success) {
    return (
      <ErrorPopup
        message={approversResult.message || "Failed to load approvers."}
      />
    );
  }

  if (requestResult && !requestResult.success) {
    return (
      <ErrorPopup
        message={requestResult.message || "Failed to load request."}
      />
    );
  }

  const request = requestResult?.data?.request;
  if (request && !["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status)) {
    return <ErrorPopup message="This request can no longer be edited." />;
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Booking</h1>
        <p className="mt-2 text-muted-foreground">
          Select venues and complete the SAPF reservation request.
        </p>
      </div>
      {request && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-900 dark:text-orange-100">
          Editing returned request #{request.requestNumber}. Update the details
          and resubmit to continue the approval flow.
        </div>
      )}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
        Pending conflicts will warn you but still allow submission. Approved
        reservations and venue blocks cannot be submitted over.
      </div>
      <SapfBookingForm
        venues={venuesResult.data || []}
        approvers={approversResult.data || {}}
        initialRequest={request}
        preselectedVenueIds={venueId ? [venueId] : []}
      />
    </div>
  );
};

export default page;
