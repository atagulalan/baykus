CREATE TABLE `profile_media` (
	`kind` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`data` blob NOT NULL,
	`updated_at` text NOT NULL
);
