import { eq, and } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { NotificationPreferencesTable } from "@/modules/database/schema";
import type { INotificationPreference, INotificationPreferenceRepository, NotificationEventType } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

export class NotificationPreferenceRepository extends CompositeRepository implements INotificationPreferenceRepository {
  constructor(opts?: StoreOpts) { super(opts); }

  async findByUserId(userId: string): Promise<INotificationPreference[]> {
    return this.pg.run(async () => {
      const rows = await this.pg.client
        .select()
        .from(NotificationPreferencesTable)
        .where(eq(NotificationPreferencesTable.userId, userId));
      return rows.map((row) => ({
        userId: row.userId,
        eventType: row.eventType as NotificationEventType,
        enabled: row.enabled,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }, "FAILED_TO_FIND_PREFERENCES");
  }

  async upsert(userId: string, eventType: NotificationEventType, enabled: boolean): Promise<INotificationPreference> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .insert(NotificationPreferencesTable)
        .values({ userId, eventType, enabled })
        .onConflictDoUpdate({
          target: [NotificationPreferencesTable.userId, NotificationPreferencesTable.eventType],
          set: { enabled, updatedAt: new Date() },
        })
        .returning();
      if (!row) throw new Error("Failed to upsert notification preference");
      return {
        userId: row.userId,
        eventType: row.eventType as NotificationEventType,
        enabled: row.enabled,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }, "FAILED_TO_UPSERT_PREFERENCE");
  }

  async isEventEnabled(userId: string, eventType: NotificationEventType): Promise<boolean> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .select()
        .from(NotificationPreferencesTable)
        .where(
          and(
            eq(NotificationPreferencesTable.userId, userId),
            eq(NotificationPreferencesTable.eventType, eventType),
          )
        )
        .limit(1);
      return row ? row.enabled : true;
    }, "FAILED_TO_CHECK_PREFERENCE");
  }
}
