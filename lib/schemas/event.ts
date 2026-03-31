import { z } from "zod";

export const eventCategorySchema = z.enum([
  "CONFERENCE",
  "PROMO",
  "INTERNAL",
  "OTHER",
]);

export const eventStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const assetSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
});

const dateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime());

export const eventBaseSchema = z.object({
  title: z.string().min(1).optional(),
  category: eventCategorySchema.optional(),
  status: eventStatusSchema.optional(),
  startDateTime: dateTimeSchema.optional(),
  endDateTime: dateTimeSchema.optional(),
  timezone: z.string().min(1).optional(),
  locationName: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  descriptionShort: z.string().min(1).optional(),
  descriptionLong: z.string().min(1).optional(),
  audience: z.string().min(1).optional(),
  priceAmount: z.number().nonnegative().optional(),
  priceCurrency: z.string().min(1).optional(),
  isFree: z.boolean().optional(),
  registrationUrl: z.string().url().optional(),
  organizerName: z.string().min(1).optional(),
  organizerEmail: z.string().email().optional(),
  tags: z.array(z.string().min(1)).optional(),
  assets: z.array(assetSchema).optional(),
  translations: z.record(z.unknown()).optional(),
});

export const eventDraftSchema = eventBaseSchema.partial();
export const eventCreateSchema = eventBaseSchema.partial();
export const eventUpdateSchema = eventBaseSchema.partial();
