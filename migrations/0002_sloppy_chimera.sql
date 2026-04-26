ALTER TABLE `attendances` ADD `check_out` integer;--> statement-breakpoint
ALTER TABLE `attendances` ADD `check_out_location_id` integer REFERENCES locations(id);--> statement-breakpoint
ALTER TABLE `attendances` ADD `check_out_latitude` real;--> statement-breakpoint
ALTER TABLE `attendances` ADD `check_out_longitude` real;--> statement-breakpoint
ALTER TABLE `attendances` ADD `check_out_photo_url` text;--> statement-breakpoint
ALTER TABLE `attendances` ADD `working_hours` real;