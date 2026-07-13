CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`title` text,
	`overview` text,
	`air_date` text,
	`runtime_min` integer,
	`still_ref` text,
	`episode_type` text,
	`external_ratings` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_item_s_e_uq` ON `episodes` (`item_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE INDEX `episodes_air_date_idx` ON `episodes` (`air_date`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`tagline` text,
	`overview` text,
	`poster_ref` text,
	`backdrop_ref` text,
	`logo_ref` text,
	`release_status` text,
	`first_air_date` text,
	`last_air_date` text,
	`origin_country` text,
	`original_language` text,
	`episode_run_times` text,
	`networks` text,
	`genres` text,
	`tags` text,
	`content_ratings` text,
	`tmdb_id` integer,
	`tvmaze_id` integer,
	`imdb_id` text,
	`tvdb_id` integer,
	`watch_providers` text,
	`external_ratings` text,
	`last_refreshed_at` text,
	`added_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_tmdb_id_unique` ON `items` (`tmdb_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_tvmaze_id_unique` ON `items` (`tvmaze_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_imdb_id_unique` ON `items` (`imdb_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_tvdb_id_unique` ON `items` (`tvdb_id`);--> statement-breakpoint
CREATE INDEX `items_media_type_idx` ON `items` (`media_type`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`target_type` text NOT NULL,
	`target_id` integer NOT NULL,
	`value` integer NOT NULL,
	`rated_at` text NOT NULL,
	PRIMARY KEY(`target_type`, `target_id`),
	CONSTRAINT "ratings_value_range" CHECK("ratings"."value" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE `refresh_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer,
	`ran_at` text NOT NULL,
	`ok` integer NOT NULL,
	`new_episode_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `refresh_log_item_idx` ON `refresh_log` (`item_id`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`number` integer NOT NULL,
	`name` text,
	`overview` text,
	`poster_ref` text,
	`air_date` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_item_number_uq` ON `seasons` (`item_id`,`number`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tracking` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`push_muted` integer DEFAULT false NOT NULL,
	`note` text,
	`status_changed_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`watched_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `watches_episode_idx` ON `watches` (`episode_id`);--> statement-breakpoint
CREATE INDEX `watches_item_idx` ON `watches` (`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `watches_dedupe_uq` ON `watches` (`episode_id`,`watched_at`);