

// src/db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

// Role enum
export const roleEnum = pgEnum("role_enum", ["admin", "employee"]);

//export const unitEnum = pgEnum("unit_enum", ["unit-1", "unit-2", "unit-3"]);

// Ticket status enum
// export const ticketStatusEnum = pgEnum("ticket_status_enum", [
//   "pending",
//   "in_progress",
//   "resolved",
//   "closed",
// ]);
export const ticketStatusEnum = pgEnum("ticket_status_enum", [
  "Open",
  "In Progress",
  "Pending",   // <-- ADD THIS
  "Resolved",
  "Closed"
]);



// Units table (3 units for hospital)
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  // For employees, which unit they belong to
  unitId: integer("unit_id").references(() => units.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tickets table

// export const tickets = pgTable("tickets", {
//   id: serial("id").primaryKey(),
//   title: varchar("title", { length: 255 }).notNull(),
//   description: text("description"),
//   category: varchar("category", { length: 100 }).notNull(),
//   priority: varchar("priority", { length: 50 }).notNull(),
//   status: ticketStatusEnum("status").notNull().default("pending"),

//   unitId: integer("unit_id").references(() => units.id).notNull(),
//   equipmentId: integer("equipment_id"),

//   createdById: integer("created_by_id")
//     .notNull()
//     .references(() => users.id),

//   assignedToId: integer("assigned_to_id").references(() => users.id),

//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// });
// export const tickets = pgTable("tickets", {
//   id: serial("id").primaryKey(),
//   title: varchar("title", { length: 255 }).notNull(),
//   description: text("description"),

//   category: varchar("category", { length: 100 }).notNull(),   // REQUIRED
//   priority: varchar("priority", { length: 50 }).notNull(),

//   status: ticketStatusEnum("status").notNull().default("pending"),

//   unitId: integer("unit_id").references(() => units.id).notNull(),
//   equipmentId: integer("equipment_id"),

//   createdById: integer("created_by_id")
//     .notNull()
//     .references(() => users.id),

//   assignedToId: integer("assigned_to_id").references(() => users.id),

//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow(),
// });
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),

  category: varchar("category", { length: 100 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),

  // NEW FIELDS FROM FRONTEND
  department: varchar("department", { length: 255 }).notNull(),
     // name from frontend

  floor: varchar("floor", { length: 10 }),
  room: varchar("room", { length: 20 }),
  bed: varchar("bed", { length: 20 }),
  status: ticketStatusEnum("status")
        .notNull()
        .default("Pending"),

  unitId: integer("unit_id").references(() => units.id).notNull(),
  equipmentId: integer("equipment_id"),
  assignedToName: varchar("assigned_to_name", { length: 255 }),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),


  assignedToId: integer("assigned_to_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
