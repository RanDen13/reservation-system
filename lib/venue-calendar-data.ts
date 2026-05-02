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
        sapfRequestVenues: {
          where: {
            request: {
              status: {
                in: [
                  "SUBMITTED",
                  "IN_REVIEW",
                  "RETURNED_FOR_REVISION",
                  "APPROVED",
                ] as any,
              },
            },
          },
          include: {
            request: {
              select: {
                id: true,
                startAt: true,
                endAt: true,
                status: true,
              },
            },
          },
          orderBy: {
            request: {
              startAt: "asc",
            },
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

  return {
    venues: venues.map((venue: any) => ({
      ...venue,
      sapfRequests: venue.sapfRequestVenues.map((item: any) => item.request),
    })),
    globalBlocks,
  };
}
