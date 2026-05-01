import {
  Amenity,
  EventSpace,
  EventSpaceStatus,
} from "@/generated/prisma/browser";
import z from "zod";

export type EventSpaceData = EventSpace & {
  amenities?: Amenity[];
  sapfRequests?: any[];
  venueBlocks?: any[];
  globalBlocks?: any[];
};

export const IMAGE_SCHEMA = z
  .instanceof(File)
  .refine(
    (file) =>
      [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ].includes(file.type),
    { message: "Invalid image file type" }
  )
  .transform((file) => file.bytes());

export const createEventSpaceSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  location: z
    .string()
    .min(3, "Location must be at least 3 characters")
    .max(200, "Location must be less than 200 characters"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters"),
  status: z.enum(EventSpaceStatus).default(EventSpaceStatus.ACTIVE),
  amenities: z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.array(z.string()).optional())
    .optional(),
  pricePerHour: z.coerce.number().min(0, "Price must be non-negative"),
  image: IMAGE_SCHEMA.optional(),
});

export const updateEventSpaceSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  location: z
    .string()
    .min(3, "Location must be at least 3 characters")
    .max(200, "Location must be less than 200 characters")
    .optional(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  status: z.enum(EventSpaceStatus).optional(),
  amenities: z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.array(z.string()).optional())
    .optional(),
  pricePerHour: z.coerce
    .number()
    .min(0, "Price must be non-negative")
    .optional(),
  image: IMAGE_SCHEMA.optional(),
});
