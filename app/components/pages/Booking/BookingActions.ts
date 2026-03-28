"use server";

import ActionResult from "@/app/components/ActionResult";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { base64ToBuffer } from "@/lib/utils";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import { prettifyError } from "zod";
import {
  BookingData,
  createBookingSchema,
  updateBookingStatusSchema,
} from "./schema";

export async function createBooking(
  data: FormData,
): Promise<ActionResult<BookingData>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized access. Please log in.",
      };
    }

    const validation = await createBookingSchema.safeParseAsync(
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

    // Check if event space exists and is available
    const eventSpace = await prisma.eventSpace.findUnique({
      where: { id: validatedData.eventSpaceId },
    });

    if (!eventSpace) {
      return {
        success: false,
        message: "Event space not found.",
      };
    }

    if (eventSpace.status !== "ACTIVE") {
      return {
        success: false,
        message: `This space is currently ${eventSpace.status.toLowerCase()} and cannot be booked.`,
      };
    }

    // Check if attendees exceed capacity
    if (validatedData.attendees > eventSpace.capacity) {
      return {
        success: false,
        message: `Attendees (${validatedData.attendees}) exceed space capacity (${eventSpace.capacity}).`,
      };
    }

    // Check for conflicting bookings on the same date/time
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        eventSpaceId: validatedData.eventSpaceId,
        date: new Date(validatedData.date),
        status: {
          in: ["PENDING", "APPROVED"],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: validatedData.startTime } },
              { endTime: { gt: validatedData.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validatedData.endTime } },
              { endTime: { gte: validatedData.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: validatedData.startTime } },
              { endTime: { lte: validatedData.endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return {
        success: false,
        message: "This time slot is already booked or pending approval.",
      };
    }

    // Calculate total price based on hours
    const [startHour] = validatedData.startTime.split(":").map(Number);
    const [endHour] = validatedData.endTime.split(":").map(Number);
    const hours = endHour - startHour;

    if (hours <= 0) {
      return {
        success: false,
        message: "End time must be after start time.",
      };
    }

    const totalPrice = hours * eventSpace.pricePerHour;

    // Prepare booking data
    const bookingData: any = {
      id: uuid(),
      userId: session.user.id,
      eventSpaceId: validatedData.eventSpaceId,
      date: new Date(validatedData.date),
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      attendees: validatedData.attendees,
      purpose: validatedData.purpose,
      totalPrice,
      status: "PENDING",
    };

    // Add file data if provided
    if (validatedData.requirementsFile && validatedData.requirementsFileType) {
      bookingData.requirementsData = base64ToBuffer(
        validatedData.requirementsFile,
      );
      bookingData.requirementsDataType = validatedData.requirementsFileType;
    }

    const newBooking = await prisma.booking.create({
      data: bookingData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        eventSpace: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            pricePerHour: true,
          },
        },
      },
    });

    return {
      success: true,
      data: newBooking,
      message:
        "Booking request submitted successfully. Awaiting admin approval.",
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to create booking.",
    };
  }
}

export async function getUserBookings(): Promise<ActionResult<BookingData[]>> {
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

    const bookings = await prisma.booking.findMany({
      where: { userId: session.user.id },
      include: {
        eventSpace: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            pricePerHour: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: bookings,
    };
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch bookings.",
    };
  }
}

export async function getAllBookings(): Promise<ActionResult<BookingData[]>> {
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

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Admin access required.",
      };
    }

    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        eventSpace: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            pricePerHour: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: bookings,
    };
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to fetch bookings.",
    };
  }
}

export async function updateBookingStatus(
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

    // Check if user is admin
    if (session.user.role !== "admin") {
      return {
        success: false,
        message: "Admin access required.",
      };
    }

    const validation = await updateBookingStatusSchema.safeParseAsync(
      Object.fromEntries(data),
    );
    if (!validation.success) {
      console.error("Validation error:", validation.error);
      return {
        success: false,
        message: prettifyError(validation.error),
      };
    }

    const { id, status, rejectionReason } = validation.data;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return {
        success: false,
        message: "Booking not found.",
      };
    }

    await prisma.booking.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
      },
    });

    return {
      success: true,
      message: `Booking ${status.toLowerCase()} successfully.`,
    };
  } catch (error) {
    console.error("Error updating booking status:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to update booking status.",
    };
  }
}

export async function cancelBooking(id: string): Promise<ActionResult<void>> {
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

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return {
        success: false,
        message: "Booking not found.",
      };
    }

    // Only the booking owner can cancel
    if (booking.userId !== session.user.id) {
      return {
        success: false,
        message: "You can only cancel your own bookings.",
      };
    }

    // Only pending bookings can be cancelled
    if (booking.status !== "PENDING") {
      return {
        success: false,
        message: `Cannot cancel ${booking.status.toLowerCase()} bookings.`,
      };
    }

    await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return {
      success: true,
      message: "Booking cancelled successfully.",
    };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      message: (error as Error).message || "Failed to cancel booking.",
    };
  }
}
