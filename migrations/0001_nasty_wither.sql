ALTER TABLE `users` ADD `nip` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_nip_unique` ON `users` (`nip`);