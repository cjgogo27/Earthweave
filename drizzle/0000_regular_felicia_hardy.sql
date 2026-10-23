CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_scene_reporter` ON `reports` (`scene_id`,`reporter_id`);--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`kind` text NOT NULL,
	`device` text NOT NULL,
	`license` text NOT NULL,
	`author` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` text NOT NULL,
	`width` integer,
	`height` integer,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scenes_status_created` ON `scenes` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `scenes_author_created` ON `scenes` (`author_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `scenes_hash_author` ON `scenes` (`sha256`,`author_id`);