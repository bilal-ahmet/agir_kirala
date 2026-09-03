/**
 * API gövde şemaları — core şemalarının HTTP'ye özgü uzantıları.
 * Kuralların kendisi src/lib/core/schemas.ts içinde tek kaynakta durur.
 */

import { z } from "zod";
import { loginSchema, registerObjectSchema, requireCompanyName } from "../core/schemas";

/** Mobil giriş: cihaz adı "cihazlarım" ekranında gösterilir. */
const deviceName = z.string().trim().max(120).optional();

export const loginBodySchema = loginSchema.extend({ deviceName });
export const registerBodySchema = registerObjectSchema
  .extend({ deviceName })
  .refine(requireCompanyName.check, requireCompanyName.options);

export {
  changePasswordSchema,
  createListingSchema,
  createRentalRequestSchema,
  createReviewSchema,
  forgotSchema,
  listingStatusSchema,
  profileSchema,
  registerMediaSchema,
  sendMessageSchema,
  startConversationSchema,
  toggleFavoriteSchema,
  updateListingSchema,
  updateRequestStatusSchema,
  uploadTicketSchema,
} from "../core/schemas";

export const listingStatusBodySchema = z.object({
  status: z.enum(["aktif", "pasif", "taslak"]),
});

export const requestStatusBodySchema = z.object({
  status: z.enum(["onaylandi", "reddedildi", "iptal"]),
});
