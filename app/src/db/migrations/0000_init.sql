CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`tint` text,
	`cover_item_id` text,
	`created_at` text NOT NULL,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `item_content` (
	`item_id` text PRIMARY KEY NOT NULL,
	`html` text,
	`text` text,
	`word_count` integer,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text,
	`source_url` text NOT NULL,
	`shared_title` text,
	`canonical_url` text,
	`kind` text,
	`adapter` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`extract_error` text,
	`title` text,
	`raw_title` text,
	`summary` text,
	`tags` text,
	`site_name` text,
	`author` text,
	`published_at` text,
	`duration_s` integer,
	`reading_min` integer,
	`thumb_path` text,
	`thumb_w` integer,
	`thumb_h` integer,
	`palette` text,
	`post` text,
	`embed` text,
	`ai_collection_id` text,
	`ai_confidence` real,
	`read_at` text,
	`progress` real,
	`last_opened_at` text,
	`rediscovered_on` text,
	`created_at` text NOT NULL,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `items_collection_created` ON `items` (`collection_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `items_created` ON `items` (`created_at`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`op` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outbox_row` ON `outbox` (`table_name`,`row_id`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`table_name` text PRIMARY KEY NOT NULL,
	`cursor_updated_at` text NOT NULL,
	`cursor_id` text NOT NULL
);
