import { sql } from 'drizzle-orm';
import { datetime, int, json, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

export const adminUsers = mysqlTable('admin_users', {
	id: int('id').primaryKey().autoincrement(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

export const macroAreas = mysqlTable('macro_areas', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	slotDurationMinutes: int('slot_duration_minutes').notNull(),
	parallelSlots: int('parallel_slots').notNull().default(1),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

export const visitTypes = mysqlTable('visit_types', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	macroAreaId: int('macro_area_id').notNull(),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

export const bookings = mysqlTable('bookings', {
	id: int('id').primaryKey().autoincrement(),
	code: varchar('code', { length: 32 }).notNull().unique(),
	fiscalCode: varchar('fiscal_code', { length: 16 }).notNull(),
	firstName: varchar('first_name', { length: 128 }).notNull(),
	lastName: varchar('last_name', { length: 128 }).notNull(),
	age: int('age').notNull(),
	address: varchar('address', { length: 512 }).notNull(),
	phone: varchar('phone', { length: 64 }).notNull(),
	email: varchar('email', { length: 255 }),
	visitTypeId: int('visit_type_id').notNull(),
	slotStart: datetime('slot_start', { mode: 'date' }).notNull(),
	status: mysqlEnum('status', ['confirmed', 'cancelled']).notNull().default('confirmed'),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

export const reports = mysqlTable('reports', {
	id: int('id').primaryKey().autoincrement(),
	code: varchar('code', { length: 32 }).notNull().unique(),
	fiscalCode: varchar('fiscal_code', { length: 16 }).notNull(),
	firstName: varchar('first_name', { length: 128 }).notNull(),
	lastName: varchar('last_name', { length: 128 }).notNull(),
	visitTypeId: int('visit_type_id').notNull(),
	examDate: datetime('exam_date', { mode: 'date' }).notNull(),
	notes: text('notes'),
	status: mysqlEnum('status', ['pending', 'ready']).notNull().default('pending'),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

export const reportAttachments = mysqlTable('report_attachments', {
	id: int('id').primaryKey().autoincrement(),
	reportId: int('report_id').notNull(),
	originalName: varchar('original_name', { length: 512 }).notNull(),
	storedPath: varchar('stored_path', { length: 512 }).notNull(),
	mimeType: varchar('mime_type', { length: 128 }).notNull(),
	sizeBytes: int('size_bytes').notNull(),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

export const activityLogs = mysqlTable('activity_logs', {
	id: int('id').primaryKey().autoincrement(),
	adminUserId: int('admin_user_id'),
	action: varchar('action', { length: 128 }).notNull(),
	entityType: varchar('entity_type', { length: 64 }).notNull(),
	entityId: varchar('entity_id', { length: 64 }),
	details: json('details').$type<Record<string, unknown> | null>(),
	createdAt: datetime('created_at', { mode: 'date' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});
