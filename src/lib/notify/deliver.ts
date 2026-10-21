import "server-only";

import { sendNotificationEmails } from "./email";
import { sendNotifications } from "./fcm";
import type { Notification } from "./types";

/**
 * Bir mutasyonun bildirimlerini tüm kanallara gönderir: push (mobil) ve
 * e-posta (web). Kanallar birbirini beklemez; her biri kendi hatasını yutar.
 */
export async function deliverNotifications(notifications: Notification[]): Promise<void> {
  if (!notifications.length) return;
  await Promise.all([sendNotifications(notifications), sendNotificationEmails(notifications)]);
}
