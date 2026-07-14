CREATE TYPE "public"."document_preview_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_status" "document_preview_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "preview_failure_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "file_objects_preview_entity_uidx" ON "file_objects" USING btree ("entity_id") WHERE "file_objects"."role" = 'preview';