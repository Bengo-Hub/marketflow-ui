import type { InboxItem } from "@/lib/api/inbox";
import { canPublish, type MyAccess } from "@/lib/access/role-access";

/**
 * Whether to offer Hide/Unhide and Delete on an inbox item: a live Facebook Page or Instagram
 * comment (the API says so in can_moderate), for members, admins and the app reviewer. The API
 * checks both again.
 */
export function canModerate(item: InboxItem, access: MyAccess | null | undefined): boolean {
  if (item.kind !== "comment" || item.deleted_at || !item.can_moderate) return false;
  if (item.platform !== "facebook" && item.platform !== "instagram") return false;
  return canPublish(access);
}
