import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
export const mechanicProfiles = pgTable("mechanic_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    logoKey: text("logo_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("companies_owner_idx").on(t.ownerId)],
);
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("clients_owner_idx").on(t.ownerId),
    index("clients_name_idx").on(t.lastName, t.firstName),
  ],
);
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    plate: text("plate").notNull(),
    province: text("province").notNull().default("Québec"),
    vin: text("vin").notNull(),
    mileage: integer("mileage").notNull(),
    vehicleType: text("vehicle_type").notNull(),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("vehicles_owner_vin_uq").on(t.ownerId, t.vin),
    index("vehicles_owner_plate_idx").on(t.ownerId, t.plate),
  ],
);
export const inspections = pgTable(
  "inspections",
  {
    id: uuid("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    reportNumber: text("report_number").notNull(),
    status: text("status").notNull().default("draft"),
    inspectionDate: timestamp("inspection_date", {
      withTimezone: true,
    }).notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("inspections_owner_report_uq").on(t.ownerId, t.reportNumber),
    index("inspections_owner_date_idx").on(t.ownerId, t.inspectionDate),
  ],
);
export const inspectionResults = pgTable(
  "inspection_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    sectionId: text("section_id").notNull(),
    itemId: text("item_id").notNull(),
    state: text("state").notNull(),
    measurement: text("measurement"),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("results_inspection_item_uq").on(t.inspectionId, t.itemId),
    index("results_owner_idx").on(t.ownerId),
  ],
);
export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    priority: text("priority").notNull().default("normal"),
    completed: boolean("completed").notNull().default(false),
  },
  (t) => [index("recommendations_owner_idx").on(t.ownerId)],
);
export const inspectionPhotos = pgTable(
  "inspection_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => inspections.id, { onDelete: "cascade" }),
    itemId: text("item_id"),
    blobKey: text("blob_key").notNull(),
    mimeType: text("mime_type").notNull(),
    caption: text("caption"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("photos_owner_inspection_idx").on(t.ownerId, t.inspectionId)],
);
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    inspectionId: uuid("inspection_id").references(() => inspections.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("audit_owner_idx").on(t.ownerId)],
);
