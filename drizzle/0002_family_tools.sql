CREATE TABLE `bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`frequency` text NOT NULL,
	`next_due` text NOT NULL,
	`category_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `debts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`balance_cents` integer NOT NULL,
	`annual_rate_bp` integer NOT NULL,
	`min_payment_cents` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `goal_entries_goal` ON `goal_entries` (`goal_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`target_cents` integer NOT NULL,
	`target_date` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `bucket` text;--> statement-breakpoint
UPDATE `categories` SET `bucket` = 'need' WHERE `type` = 'expense' AND `workspace_id` IN (SELECT `id` FROM `workspaces` WHERE `kind` = 'family') AND `name` IN ('Vivienda', 'Supermercado', 'Transporte', 'Servicios', 'Salud', 'Educación');--> statement-breakpoint
UPDATE `categories` SET `bucket` = 'want' WHERE `type` = 'expense' AND `workspace_id` IN (SELECT `id` FROM `workspaces` WHERE `kind` = 'family') AND `name` IN ('Restaurantes', 'Entretenimiento', 'Ropa', 'Suscripciones', 'Otros');--> statement-breakpoint
UPDATE `categories` SET `bucket` = 'save' WHERE `type` = 'expense' AND `workspace_id` IN (SELECT `id` FROM `workspaces` WHERE `kind` = 'family') AND `name` IN ('Ahorro e inversión');--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`workspace_id`, `name`, `type`, `bucket`) SELECT `id`, 'Pago de deudas', 'expense', 'save' FROM `workspaces` WHERE `kind` = 'family';
