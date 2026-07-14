CREATE TABLE `tracking_new` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`manual_list` text,
	`push_muted` integer DEFAULT false NOT NULL,
	`note` text,
	`list_changed_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `tracking_new` (`item_id`, `manual_list`, `push_muted`, `note`, `list_changed_at`)
SELECT `item_id`,
       CASE `status` WHEN 'plan_to_watch' THEN 'watch_later'
                     WHEN 'dropped' THEN 'stopped'
                     ELSE NULL END,
       `push_muted`, `note`, `status_changed_at`
FROM `tracking`;
--> statement-breakpoint
DROP TABLE `tracking`;
--> statement-breakpoint
ALTER TABLE `tracking_new` RENAME TO `tracking`;
