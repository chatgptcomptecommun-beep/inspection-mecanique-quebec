CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"inspection_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"logo_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"inspection_id" uuid NOT NULL,
	"item_id" text,
	"blob_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"inspection_id" uuid NOT NULL,
	"section_id" text NOT NULL,
	"item_id" text NOT NULL,
	"state" text NOT NULL,
	"measurement" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"report_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"inspection_date" timestamp with time zone NOT NULL,
	"client_id" uuid,
	"vehicle_id" uuid,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mechanic_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mechanic_profiles_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"inspection_id" uuid NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"client_id" uuid,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"plate" text NOT NULL,
	"province" text DEFAULT 'Québec' NOT NULL,
	"vin" text NOT NULL,
	"mileage" integer NOT NULL,
	"vehicle_type" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_owner_idx" ON "audit_events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "clients_owner_idx" ON "clients" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("last_name","first_name");--> statement-breakpoint
CREATE INDEX "companies_owner_idx" ON "companies" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "photos_owner_inspection_idx" ON "inspection_photos" USING btree ("owner_id","inspection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "results_inspection_item_uq" ON "inspection_results" USING btree ("inspection_id","item_id");--> statement-breakpoint
CREATE INDEX "results_owner_idx" ON "inspection_results" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspections_owner_report_uq" ON "inspections" USING btree ("owner_id","report_number");--> statement-breakpoint
CREATE INDEX "inspections_owner_date_idx" ON "inspections" USING btree ("owner_id","inspection_date");--> statement-breakpoint
CREATE INDEX "recommendations_owner_idx" ON "recommendations" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_owner_vin_uq" ON "vehicles" USING btree ("owner_id","vin");--> statement-breakpoint
CREATE INDEX "vehicles_owner_plate_idx" ON "vehicles" USING btree ("owner_id","plate");