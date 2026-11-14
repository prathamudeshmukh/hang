ALTER TABLE `items` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `collections` DROP COLUMN `tint`;--> statement-breakpoint
ALTER TABLE `collections` DROP COLUMN `cover_item_id`;