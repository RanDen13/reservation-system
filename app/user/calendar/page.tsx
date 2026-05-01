import VenueCalendarView from "@/app/components/pages/Calendar/VenueCalendarView";
import { getVenueCalendarData } from "@/lib/venue-calendar-data";

const page = async () => {
  const { venues, globalBlocks } = await getVenueCalendarData();

  return (
    <div className="p-4 lg:p-8">
      <VenueCalendarView
        venues={venues}
        globalBlocks={globalBlocks}
        title="Venue Calendar"
        description="Read-only availability while keeping your dashboard navigation available."
      />
    </div>
  );
};

export default page;
