ALTER TABLE `items` ADD `added_via` text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
UPDATE `items` SET `added_via` = 'import:zip'
  WHERE `id` IN (SELECT DISTINCT `item_id` FROM `watches` WHERE `source` = 'import:zip');
--> statement-breakpoint
UPDATE `items` SET `added_via` = 'import:tvtime'
  WHERE `id` IN (SELECT DISTINCT `item_id` FROM `watches` WHERE `source` = 'import:tvtime');
