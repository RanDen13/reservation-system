"use server";

import ActionResult from "@/app/components/ActionResult";
import { Amenity } from "@/generated/prisma/browser";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import { prettifyError } from "zod";
import {
  createEventSpaceSchema,
  EventSpaceData,
  updateEventSpaceSchema,
} from "./schema";

function isSuperAdmin(role?: string | null) {
  return role?.toUpperCase() === "SUPER_ADMIN";
}

export async function getAllEventSpaces(): Promise<
  ActionResult<EventSpaceData[]>
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    const spaces = await prisma.eventSpace.findMany({
      include: {
        amenities: true,
      },
    });

    return {
      success: true,
      data: spaces,
    };
  } catch (error) {
    console.error("Error fetching event spaces:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch event spaces.",
    };
  }
}

export async function getGlobalVenueBlocks(): Promise<ActionResult<any[]>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    const blocks = await prisma.venueBlock.findMany({
      where: {
        eventSpaceId: null,
      },
      select: {
        id: true,
        title: true,
        reason: true,
        startAt: true,
        endAt: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return {
      success: true,
      data: blocks,
    };
  } catch (error) {
    console.error("Error fetching university-wide blocks:", error);
    return {
      success: false,
      message:
        (error as Error).message || "Failed to fetch university-wide blocks.",
    };
  }
}

export async function getEventSpaceById(
  id: string,
): Promise<ActionResult<EventSpaceData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }
    const [space, globalBlocks] = await Promise.all([
      prisma.eventSpace.findUnique({
        where: { id },
        include: {
          amenities: true,
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
                  requestNumber: true,
                  title: true,
                  organization: true,
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
            select: {
              id: true,
              title: true,
              reason: true,
              startAt: true,
              endAt: true,
            },
            orderBy: {
              startAt: "asc",
            },
          },
        },
      }),
      prisma.venueBlock.findMany({
        where: {
          eventSpaceId: null,
        },
        select: {
          id: true,
          title: true,
          reason: true,
          startAt: true,
          endAt: true,
        },
        orderBy: {
          startAt: "asc",
        },
      }),
    ]);
    if (!space) {
      return {
        success: false,
        message: "Event space not found.",
      };
    }

    return {
      success: true,
      data: {
        ...space,
        sapfRequests: (space as any).sapfRequestVenues.map(
          (item: any) => item.request,
        ),
        globalBlocks,
      },
    };
  } catch (error) {
    console.error("Error fetching event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch event space.",
    };
  }
}

export async function getAllAmenities(): Promise<ActionResult<Amenity[]>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return {
        success: false,
        message: "Only super admins can update venues.",
      };
    }

    const amenities = await prisma.amenity.findMany({
      orderBy: { name: "asc" },
    });

    return {
      success: true,
      data: amenities,
    };
  } catch (error) {
    console.error("Error fetching amenities:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch amenities.",
    };
  }
}

export async function createEventSpace(
  data: FormData,
): Promise<ActionResult<EventSpaceData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return {
        success: false,
        message: "Only super admins can delete venues.",
      };
    }

    const validation = await createEventSpaceSchema.safeParseAsync(
      Object.fromEntries(data),
    );
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return {
        success: false,
        message: prettifyError(validation.error),
      };
    }
    const validatedData = validation.data;

    // Parse amenities from JSON string if present
    const amenitiesData = data.get("amenities");
    const amenities = amenitiesData
      ? JSON.parse(amenitiesData as string)
      : validatedData.amenities;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { amenities: _amenities, image, ...restData } = validatedData;

    const newSpace = await prisma.eventSpace.create({
      data: {
        id: uuid(),
        ...restData,
        image: image ? Buffer.from(await image) : undefined,
        amenities: amenities
          ? {
              connect: amenities.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        amenities: true,
      },
    });

    return {
      success: true,
      data: newSpace,
    };
  } catch (error) {
    console.error("Error creating event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to create event space.",
    };
  }
}

export async function updateEventSpace(
  data: FormData,
): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    const validatedData = await updateEventSpaceSchema.safeParseAsync(
      Object.fromEntries(data),
    );
    if (!validatedData.success) {
      console.error("Validation error:", validatedData.error);
      return {
        success: false,
        message: prettifyError(validatedData.error),
      };
    }

    const {
      id,
      amenities: validatedAmenities,
      ...updateData
    } = validatedData.data;

    // Parse amenities from JSON string if present
    const amenitiesData = data.get("amenities");
    const amenities = amenitiesData
      ? JSON.parse(amenitiesData as string)
      : validatedAmenities;

    // If amenities are provided, first disconnect all existing amenities, then connect new ones
    const amenitiesUpdate = amenities
      ? {
          set: [], // Disconnect all existing
          connect: amenities.map((amenityId: string) => ({ id: amenityId })),
        }
      : undefined;

    await prisma.eventSpace.update({
      where: { id },
      data: {
        ...updateData,
        ...(amenitiesUpdate && { amenities: amenitiesUpdate }),
      },
      include: {
        amenities: true,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update event space.",
    };
  }
}

export async function deleteEventSpace(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
      };
    }

    if (!id) {
      return {
        success: false,
        message: "Event space ID is required.",
      };
    }

    await prisma.eventSpace.delete({
      where: { id },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting event space:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to delete event space.",
    };
  }
}
