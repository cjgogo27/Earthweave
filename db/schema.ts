import { integer, real, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
export const browserSessions = sqliteTable("browser_sessions", {
  tokenHash: text("token_hash").primaryKey(), userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(), expiresAt: integer("expires_at").notNull(),
}, (table) => [uniqueIndex("browser_sessions_user").on(table.userId),index("browser_sessions_expiry").on(table.expiresAt)]);
export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(), description: text("description").notNull(),
  lat: real("lat").notNull(), lng: real("lng").notNull(),
  kind: text("kind").notNull(), device: text("device").notNull(), license: text("license").notNull(),
  author: text("author").notNull(), authorId: text("author_id").notNull(), createdAt: text("created_at").notNull(),
  width: integer("width"), height: integer("height"),
  objectKey: text("object_key").notNull(), mimeType: text("mime_type").notNull(), sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(), status: text("status").notNull().default("published"),
  sourceUrl: text("source_url"),
  sourceAttribution: text("source_attribution"),
}, (table) => [index("scenes_status_created").on(table.status,table.createdAt),index("scenes_author_created").on(table.authorId,table.createdAt),index("scenes_hash_author").on(table.sha256,table.authorId)]);
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(), sceneId: text("scene_id").notNull(),
  reporterId: text("reporter_id").notNull(), reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(), status: text("status").notNull().default("pending"),
}, (table) => [uniqueIndex("reports_scene_reporter").on(table.sceneId,table.reporterId)]);
