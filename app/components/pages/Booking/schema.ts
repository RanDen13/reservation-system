import { Booking } from "@/generated/prisma/browser";
import { z } from "zod";

export const createBookingSchema = z.object({
  eventSpaceId: z.string().min(1, "Event space is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  attendees: z.coerce.number().min(1, "At least 1 attendee is required"),
  purpose: z.string().min(5, "Purpose must be at least 5 characters").max(500),
  requirementsFile: z.string().optional(), // Base64 encoded file
  requirementsFileType: z.enum(["PDF", "DOCX", "IMAGE"]).optional(),
});

export const updateBookingStatusSchema = z.object({
  id: z.string().min(1, "Booking ID is required"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"]),
  rejectionReason: z.string().optional(),
});

export type BookingData = Booking & {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  eventSpace?: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    pricePerHour: number;
  };
};

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;
