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

export async function getEventSpaceById(
  id: string
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
    const space = await prisma.eventSpace.findUnique({
      where: { id },
      include: {
        amenities: true,
      },
    });
    if (!space) {
      return {
        success: false,
        message: "Event space not found.",
      };
    }

    return {
      success: true,
      data: space,
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
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access.",
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
  data: FormData
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

    const validation = await createEventSpaceSchema.safeParseAsync(
      Object.fromEntries(data)
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

    const newSpace = await prisma.eventSpace.create({
      data: {
        id: uuid(),
        ...validatedData,
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
  data: FormData
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
      Object.fromEntries(data)
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
  id: string
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
