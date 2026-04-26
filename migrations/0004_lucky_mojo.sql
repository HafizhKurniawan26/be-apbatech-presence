ALTER TABLE `leave_requests` ADD `approved_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `approved_at` integer;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `total_days` integer;--> statement-breakpoint
CREATE INDEX `leave_requests_user_id_idx` ON `leave_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_status_idx` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE INDEX `leave_requests_date_range_idx` ON `leave_requests` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `attendances_user_id_idx` ON `attendances` (`user_id`);--> statement-breakpoint
CREATE INDEX `attendances_check_in_idx` ON `attendances` (`check_in`);--> statement-breakpoint
CREATE INDEX `attendances_status_idx` ON `attendances` (`status`);--> statement-breakpoint
CREATE INDEX `attendances_user_check_in_idx` ON `attendances` (`user_id`,`check_in`);--> statement-breakpoint
CREATE INDEX `fcm_user_id_idx` ON `fcm_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);