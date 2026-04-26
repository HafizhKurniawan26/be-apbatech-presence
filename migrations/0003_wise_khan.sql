PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`location_id` integer NOT NULL,
	`check_in` integer,
	`check_out` integer,
	`check_out_location_id` integer,
	`check_out_latitude` real,
	`check_out_longitude` real,
	`check_out_photo_url` text,
	`status` text NOT NULL,
	`method` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`photo_url` text,
	`working_hours` real,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`check_out_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_attendances`("id", "user_id", "location_id", "check_in", "check_out", "check_out_location_id", "check_out_latitude", "check_out_longitude", "check_out_photo_url", "status", "method", "latitude", "longitude", "photo_url", "working_hours", "created_at", "updated_at") SELECT "id", "user_id", "location_id", "check_in", "check_out", "check_out_location_id", "check_out_latitude", "check_out_longitude", "check_out_photo_url", "status", "method", "latitude", "longitude", "photo_url", "working_hours", "created_at", "updated_at" FROM `attendances`;--> statement-breakpoint
DROP TABLE `attendances`;--> statement-breakpoint
ALTER TABLE `__new_attendances` RENAME TO `attendances`;--> statement-breakpoint
PRAGMA foreign_keys=ON;