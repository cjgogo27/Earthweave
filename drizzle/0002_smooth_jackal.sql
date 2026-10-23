CREATE TABLE `browser_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `browser_sessions_user` ON `browser_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `browser_sessions_expiry` ON `browser_sessions` (`expires_at`);