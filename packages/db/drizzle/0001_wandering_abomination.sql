CREATE TYPE "public"."project_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."project_step_status" AS ENUM('pending', 'active', 'completed');--> statement-breakpoint
CREATE TABLE "project_documents" (
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documents_pk" PRIMARY KEY("project_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "project_related_entities" (
	"project_id" uuid NOT NULL,
	"related_entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_related_entities_pk" PRIMARY KEY("project_id","related_entity_id"),
	CONSTRAINT "project_related_entities_not_self_check" CHECK ("project_related_entities"."project_id" <> "project_related_entities"."related_entity_id")
);
--> statement-breakpoint
CREATE TABLE "project_step_documents" (
	"step_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_step_documents_pk" PRIMARY KEY("step_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "project_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_step_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "project_step_status" DEFAULT 'pending' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_steps_project_parent_position_uidx" UNIQUE NULLS NOT DISTINCT("project_id","parent_step_id","position"),
	CONSTRAINT "project_steps_position_check" CHECK ("project_steps"."position" >= 0),
	CONSTRAINT "project_steps_not_own_parent_check" CHECK ("project_steps"."parent_step_id" is null or "project_steps"."parent_step_id" <> "project_steps"."id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"outcome" text NOT NULL,
	"why_it_matters" text,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"cover_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_entity_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("entity_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_document_id_entities_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_related_entities" ADD CONSTRAINT "project_related_entities_project_id_projects_entity_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("entity_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_related_entities" ADD CONSTRAINT "project_related_entities_related_entity_id_entities_id_fk" FOREIGN KEY ("related_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_step_documents" ADD CONSTRAINT "project_step_documents_step_id_project_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."project_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_step_documents" ADD CONSTRAINT "project_step_documents_document_id_entities_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_steps" ADD CONSTRAINT "project_steps_project_id_projects_entity_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("entity_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_steps" ADD CONSTRAINT "project_steps_parent_step_id_project_steps_id_fk" FOREIGN KEY ("parent_step_id") REFERENCES "public"."project_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_documents_document_id_idx" ON "project_documents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "project_related_entities_related_id_idx" ON "project_related_entities" USING btree ("related_entity_id");--> statement-breakpoint
CREATE INDEX "project_step_documents_document_id_idx" ON "project_step_documents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "project_steps_project_status_idx" ON "project_steps" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_steps_parent_id_idx" ON "project_steps" USING btree ("parent_step_id");--> statement-breakpoint
CREATE INDEX "project_steps_due_date_idx" ON "project_steps" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");