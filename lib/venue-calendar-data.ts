import { prisma } from "@/lib/prisma";

export async function getVenueCalendarData() {
  const [venues, globalBlocks] = await Promise.all([
    prisma.eventSpace.findMany({
      where: {
        status: {
          in: ["ACTIVE", "UNDER_MAINTENANCE"] as any,
        },
      },
      include: {
        sapfRequests: {
          where: {
            status: {
              in: [
                "SUBMITTED",
                "IN_REVIEW",
                "RETURNED_FOR_REVISION",
                "APPROVED",
              ] as any,
            },
          },
          orderBy: {
            startAt: "asc",
          },
        },
        venueBlocks: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.venueBlock.findMany({
      where: {
        eventSpaceId: null,
      },
      orderBy: {
        startAt: "asc",
      },
    }),
  ]);

  return { venues, globalBlocks };
}
