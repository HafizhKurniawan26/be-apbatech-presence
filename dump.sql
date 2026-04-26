PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" VALUES(1,'0000_daffy_marvex.sql','2026-04-19 06:32:49');
INSERT INTO "d1_migrations" VALUES(2,'0001_nasty_wither.sql','2026-04-19 06:57:47');
INSERT INTO "d1_migrations" VALUES(3,'0002_sloppy_chimera.sql','2026-04-19 08:49:09');
INSERT INTO "d1_migrations" VALUES(4,'0003_wise_khan.sql','2026-04-23 05:36:27');
INSERT INTO "d1_migrations" VALUES(5,'0004_lucky_mojo.sql','2026-04-24 12:25:39');
INSERT INTO "d1_migrations" VALUES(6,'0005_exotic_cassandra_nova.sql','2026-04-25 04:22:05');
CREATE TABLE `fcm_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `leave_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attachment_url` text,
	`reason` text,
	`created_at` integer,
	`updated_at` integer, `approved_by` integer REFERENCES users(id), `approved_at` integer, `rejection_reason` text, `total_days` integer, `attachment_key` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "leave_requests" VALUES(2,9,'izin',1777334400,1777334400,'approved',NULL,'Acara Keluarga',1777044552,1777046482,3,1777046482,NULL,1,NULL);
INSERT INTO "leave_requests" VALUES(3,7,'izin',1777075200,1777161600,'pending',NULL,'Urusan mendadak',1777092324,1777092324,NULL,NULL,NULL,2,NULL);
INSERT INTO "leave_requests" VALUES(4,7,'izin',1777075200,1777161600,'pending',NULL,'Urusan mendadak',1777092361,1777092361,NULL,NULL,NULL,2,NULL);
INSERT INTO "leave_requests" VALUES(5,7,'izin',1777075200,1777161600,'pending',NULL,'Urusan mendadak',1777093381,1777093381,NULL,NULL,NULL,2,NULL);
INSERT INTO "leave_requests" VALUES(6,7,'izin',1777075200,1777161600,'pending',NULL,'Testing izin',1777093401,1777093401,NULL,NULL,NULL,2,NULL);
INSERT INTO "leave_requests" VALUES(7,7,'izin',1777075200,1777161600,'pending','https://pub-3a488dfb1e5148a691bf4fb13041bcaa.r2.dev/leaves/izin/2026/leave_izin_1777093570026_7_1777093570026_w2ikk5iv.jpg','Testing izin',1777093570,1777093570,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777093570026_7_1777093570026_w2ikk5iv.jpg');
INSERT INTO "leave_requests" VALUES(8,7,'izin',1777075200,1777161600,'pending','https://cdn.presensi-apbatech.my.id/leaves/izin/2026/leave_izin_1777096394766_7_1777096394766_p8dbrala.jpg','Testing izin',1777096395,1777096395,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777096394766_7_1777096394766_p8dbrala.jpg');
INSERT INTO "leave_requests" VALUES(9,7,'izin',1777075200,1777161600,'pending','https://cdn.presensi-apbatech.my.id/leaves/izin/2026/leave_izin_1777096661937_7_1777096661937_u9p9vea8.jpg','Testing izin',1777096662,1777096662,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777096661937_7_1777096661937_u9p9vea8.jpg');
INSERT INTO "leave_requests" VALUES(10,7,'izin',1777075200,1777161600,'pending','https://cdn.presensi-apbatech.my.id/leaves/izin/2026/leave_izin_1777098759205_7_1777098759205_iyqfnemv.jpg','Testing izin',1777098760,1777098760,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777098759205_7_1777098759205_iyqfnemv.jpg');
INSERT INTO "leave_requests" VALUES(11,7,'izin',1777075200,1777161600,'pending','https://https://pub-d2a5a64fb4084aa1936df8280ed0ee41.r2.dev/leaves/izin/2026/leave_izin_1777099134910_7_1777099134910_6gzd17u5.jpg','Testing izin',1777099138,1777099138,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777099134910_7_1777099134910_6gzd17u5.jpg');
INSERT INTO "leave_requests" VALUES(12,7,'izin',1777075200,1777161600,'pending','https://pub-d2a5a64fb4084aa1936df8280ed0ee41.r2.dev/leaves/izin/2026/leave_izin_1777099156795_7_1777099156796_8bi59asz.jpg','Testing izin',1777099161,1777099161,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777099156795_7_1777099156796_8bi59asz.jpg');
INSERT INTO "leave_requests" VALUES(13,7,'izin',1777075200,1777161600,'pending','https://pub-d2a5a64fb4084aa1936df8280ed0ee41.r2.dev/leaves/izin/2026/leave_izin_1777100635405_7_1777100635405_5ih6ek47.jpg','Testing izin',1777100636,1777100636,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777100635405_7_1777100635405_5ih6ek47.jpg');
INSERT INTO "leave_requests" VALUES(14,7,'izin',1777075200,1777161600,'pending','https://dev-cdn.presensi-apbatech.my.id/leaves/izin/2026/leave_izin_1777100699615_7_1777100699615_n8h2q4bf.jpg','Testing izin',1777100700,1777100700,NULL,NULL,NULL,2,'leaves/izin/2026/leave_izin_1777100699615_7_1777100699615_n8h2q4bf.jpg');
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`radius` integer DEFAULT 100 NOT NULL,
	`check_in_time` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
INSERT INTO "locations" VALUES(3,'Kantor Pusat',-6.2088,106.8456,100,'08:00',1776581920,1776581920);
INSERT INTO "locations" VALUES(4,'Cabang Selatan',-6.3012,106.8512,150,'08:30',1776581920,1776581920);
INSERT INTO "locations" VALUES(5,'Coworking Space',-6.2251,106.8122,200,'09:00',1776581920,1776581920);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'employee' NOT NULL,
	`created_at` integer,
	`updated_at` integer
, `nip` text NOT NULL);
INSERT INTO "users" VALUES(3,'System Administrator','admin@company.com','mN8vcqwZDtxP+Pl6id1jHWjGyOR6/qgz+266fkelbRTDyf46QpxdZz5CeQaKoa/N','admin',1776581920,1776581920,'ADMIN001');
INSERT INTO "users" VALUES(4,'Dewi Lestari','dewi.lestari@company.com','c7MWs4h5ha7+HvDOj4HkBrGfV1tMnxV+YCa28rrTRv8u5GI6jqBPpOlXysSQ2B79','employee',1776582106,1776584316,'EMP004');
INSERT INTO "users" VALUES(5,'TestAdmin','testadmin@company.com','R3R0v4VB+jkRkugza2FZWWx74LIydH5Uwb0/oVkGvMztsN7DwaIVyrj/v8QNkBL5','admin',1776583131,1776583131,'ADMIN002');
INSERT INTO "users" VALUES(6,'testing','testing@company.com','ikrg/vMW854dPQXX1pYmWQZHT+9b7YigGy/lHpnGLuWCPITg65NP7/JWHtfT01Yc','employee',1776911489,1776911489,'EMP003');
INSERT INTO "users" VALUES(7,'budi','budi@company.com','kHY0zwWI9PDauq8o6h6nBz3zfMeDN/ihyGn4zhpVRaTyJ8aORhK9P4FWdBSOgjKU','employee',1776915560,1776915560,'EMP002');
INSERT INTO "users" VALUES(8,'ahmad','ahmad@company.com','d1rLc0o4sL4nspppn7V+P63oeswKvTfAjjC9SZ7WN4Z4EbSKcbX4HyPnajoJz6dt','employee',1776924681,1776924681,'EMP006');
INSERT INTO "users" VALUES(9,'caca','caca@company.com','orsV9HcSkbnBBlUmFoYuRsKLhY4wNkoW69PFS0VwElQ3kpWAcqUwgf8x2H/Iindq','employee',1776925265,1776925265,'EMP009');
INSERT INTO "users" VALUES(10,'Galih','galih@company.com','A5oh04aAse2FlxK5gQPpNgSOyEW8MFEvUlltFVil0opSEx4ACS8MmkDU1TLF8DWW','employee',1777088038,1777088038,'EMP010');
CREATE TABLE IF NOT EXISTS "attendances" (
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
	`updated_at` integer, `photo_key` text, `check_out_photo_key` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`check_out_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "attendances" VALUES(1,4,3,1776585965,1776588935,3,-6.2085,106.8456,NULL,'late','gps',-6.2088,106.8456,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776585975/presensi/checkin/presensi/checkin/4_1776585959874_k8a9m9.png',0.83,1776585965,1776588935,NULL,NULL);
INSERT INTO "attendances" VALUES(2,6,3,1776911771,1776911981,3,-6.2088,106.8449,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776911993/presensi/checkout/presensi/checkout/6_1776911979161_n8vsge.jpg','late','gps',-6.2088,106.8449,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776911783/presensi/checkin/presensi/checkin/6_1776911769303_qzg86k.jpg',0.06,1776911771,1776911981,NULL,NULL);
INSERT INTO "attendances" VALUES(3,4,3,1776912997,1776913666,3,-6.2088,106.8449,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776913678/presensi/checkout/presensi/checkout/4_1776913664271_80ouup.jpg','late','gps',-6.2088,106.8449,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776913009/presensi/checkin/presensi/checkin/4_1776912995211_wcpg4n.jpg',0.19,1776912997,1776913666,NULL,NULL);
INSERT INTO "attendances" VALUES(4,7,3,1776922770,1776924402,3,NULL,NULL,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776924417/presensi/checkout/qr/7_1776924402926_check_out.jpg','late','qr_code',NULL,NULL,NULL,0.45,1776922770,1776924402,NULL,NULL);
INSERT INTO "attendances" VALUES(5,8,3,1776924932,1776925006,3,NULL,NULL,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776925020/presensi/checkout/qr/8_1776925006155_check_out.jpg','late','gps',-6.2088,106.8456,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776924944/presensi/checkin/presensi/checkin/8_1776924929982_5kwtca.jpg',0.02,1776924932,1776925006,NULL,NULL);
INSERT INTO "attendances" VALUES(6,9,3,1776925364,1776925460,3,-6.2088,106.8456,NULL,'late','qr_code',NULL,NULL,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1776925379/presensi/checkin/qr/9_1776925364676_check_in.jpg',0.03,1776925366,1776925460,NULL,NULL);
INSERT INTO "attendances" VALUES(7,9,3,1777046284,NULL,NULL,NULL,NULL,NULL,'late','gps',-6.2088,106.8456,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1777046297/presensi/checkin/presensi/checkin/9_1777046281005_ve64d.jpg',NULL,1777046284,1777046284,NULL,NULL);
INSERT INTO "attendances" VALUES(8,7,3,1777090937,1777091260,3,-6.2085,106.8456,'https://res.cloudinary.com/dkzvnusaw/image/upload/v1777091274/presensi/checkout/presensi/checkout/7_1777091258593_0hauw.jpg','late','gps',-6.2085,106.8456,'https://pub-3a488dfb1e5148a691bf4fb13041bcaa.r2.dev/presensi/checkin/checkin/7_1777090937823_v4rzl.jpg',0.09,1777090937,1777091260,'presensi/checkin/checkin/7_1777090937823_v4rzl.jpg',NULL);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('d1_migrations',6);
INSERT INTO "sqlite_sequence" VALUES('users',10);
INSERT INTO "sqlite_sequence" VALUES('locations',5);
INSERT INTO "sqlite_sequence" VALUES('attendances',8);
INSERT INTO "sqlite_sequence" VALUES('leave_requests',14);
CREATE UNIQUE INDEX `fcm_tokens_token_unique` ON `fcm_tokens` (`token`);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_nip_unique` ON `users` (`nip`);
CREATE INDEX `leave_requests_user_id_idx` ON `leave_requests` (`user_id`);
CREATE INDEX `leave_requests_status_idx` ON `leave_requests` (`status`);
CREATE INDEX `leave_requests_date_range_idx` ON `leave_requests` (`start_date`,`end_date`);
CREATE INDEX `attendances_user_id_idx` ON `attendances` (`user_id`);
CREATE INDEX `attendances_check_in_idx` ON `attendances` (`check_in`);
CREATE INDEX `attendances_status_idx` ON `attendances` (`status`);
CREATE INDEX `attendances_user_check_in_idx` ON `attendances` (`user_id`,`check_in`);
CREATE INDEX `fcm_user_id_idx` ON `fcm_tokens` (`user_id`);
CREATE INDEX `users_role_idx` ON `users` (`role`);