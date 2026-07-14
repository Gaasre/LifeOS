CREATE TYPE "public"."financial_decision_status" AS ENUM('considering', 'decided', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."financial_goal_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."money_account_type" AS ENUM('bank', 'savings', 'cash', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."money_direction" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."money_document_role" AS ENUM('source', 'receipt', 'statement', 'related');--> statement-breakpoint
CREATE TYPE "public"."money_frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."money_recurring_group" AS ENUM('income', 'essential', 'subscription', 'savings');--> statement-breakpoint
CREATE TABLE "financial_decision_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"title" text NOT NULL,
	"monthly_impact_minor" integer DEFAULT 0 NOT NULL,
	"upfront_cost_minor" integer DEFAULT 0 NOT NULL,
	"annual_impact_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"selected" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_decision_options_upfront_cost_check" CHECK ("financial_decision_options"."upfront_cost_minor" >= 0),
	CONSTRAINT "financial_decision_options_position_check" CHECK ("financial_decision_options"."position" >= 0),
	CONSTRAINT "financial_decision_options_currency_check" CHECK ("financial_decision_options"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "financial_decisions" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"description" text,
	"status" "financial_decision_status" DEFAULT 'considering' NOT NULL,
	"related_project_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"target_amount_minor" integer NOT NULL,
	"current_amount_minor" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"target_date" date,
	"recurring_contribution_minor" integer DEFAULT 0 NOT NULL,
	"related_account_id" uuid,
	"related_project_id" uuid,
	"exclude_from_safe_to_spend" boolean DEFAULT false NOT NULL,
	"status" "financial_goal_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_goals_target_amount_check" CHECK ("financial_goals"."target_amount_minor" > 0),
	CONSTRAINT "financial_goals_current_amount_check" CHECK ("financial_goals"."current_amount_minor" >= 0),
	CONSTRAINT "financial_goals_contribution_check" CHECK ("financial_goals"."recurring_contribution_minor" >= 0),
	CONSTRAINT "financial_goals_currency_check" CHECK ("financial_goals"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "money_accounts" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"type" "money_account_type" NOT NULL,
	"institution" text,
	"balance_minor" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"include_in_available_balance" boolean DEFAULT true NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_accounts_currency_check" CHECK ("money_accounts"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "money_documents" (
	"money_entity_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"role" "money_document_role" DEFAULT 'related' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_documents_pk" PRIMARY KEY("money_entity_id","document_id","role"),
	CONSTRAINT "money_documents_not_self_check" CHECK ("money_documents"."money_entity_id" <> "money_documents"."document_id")
);
--> statement-breakpoint
CREATE TABLE "money_entries" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"direction" "money_direction" NOT NULL,
	"occurred_at" date NOT NULL,
	"account_id" uuid NOT NULL,
	"recurring_item_id" uuid,
	"category" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_entries_amount_check" CHECK ("money_entries"."amount_minor" > 0),
	CONSTRAINT "money_entries_currency_check" CHECK ("money_entries"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "money_related_entities" (
	"money_entity_id" uuid NOT NULL,
	"related_entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_related_entities_pk" PRIMARY KEY("money_entity_id","related_entity_id"),
	CONSTRAINT "money_related_entities_not_self_check" CHECK ("money_related_entities"."money_entity_id" <> "money_related_entities"."related_entity_id")
);
--> statement-breakpoint
CREATE TABLE "money_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"safety_buffer_minor" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "money_settings_currency_check" CHECK ("money_settings"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "money_settings_safety_buffer_check" CHECK ("money_settings"."safety_buffer_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recurring_money_items" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"direction" "money_direction" NOT NULL,
	"group" "money_recurring_group" NOT NULL,
	"frequency" "money_frequency" NOT NULL,
	"next_occurrence" date NOT NULL,
	"start_date" date,
	"end_date" date,
	"account_id" uuid,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_variable" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_money_items_amount_check" CHECK ("recurring_money_items"."amount_minor" > 0),
	CONSTRAINT "recurring_money_items_currency_check" CHECK ("recurring_money_items"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "recurring_money_items_date_range_check" CHECK ("recurring_money_items"."start_date" is null or "recurring_money_items"."end_date" is null or "recurring_money_items"."end_date" >= "recurring_money_items"."start_date"),
	CONSTRAINT "recurring_money_items_group_direction_check" CHECK (("recurring_money_items"."group" = 'income' and "recurring_money_items"."direction" = 'income') or ("recurring_money_items"."group" <> 'income' and "recurring_money_items"."direction" = 'expense'))
);
--> statement-breakpoint
ALTER TABLE "financial_decision_options" ADD CONSTRAINT "financial_decision_options_decision_id_financial_decisions_entity_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."financial_decisions"("entity_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_decisions" ADD CONSTRAINT "financial_decisions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_decisions" ADD CONSTRAINT "financial_decisions_related_project_id_entities_id_fk" FOREIGN KEY ("related_project_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_related_account_id_money_accounts_entity_id_fk" FOREIGN KEY ("related_account_id") REFERENCES "public"."money_accounts"("entity_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_related_project_id_entities_id_fk" FOREIGN KEY ("related_project_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_accounts" ADD CONSTRAINT "money_accounts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_documents" ADD CONSTRAINT "money_documents_money_entity_id_entities_id_fk" FOREIGN KEY ("money_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_documents" ADD CONSTRAINT "money_documents_document_id_entities_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_entries" ADD CONSTRAINT "money_entries_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_entries" ADD CONSTRAINT "money_entries_account_id_money_accounts_entity_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("entity_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_entries" ADD CONSTRAINT "money_entries_recurring_item_id_recurring_money_items_entity_id_fk" FOREIGN KEY ("recurring_item_id") REFERENCES "public"."recurring_money_items"("entity_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_related_entities" ADD CONSTRAINT "money_related_entities_money_entity_id_entities_id_fk" FOREIGN KEY ("money_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_related_entities" ADD CONSTRAINT "money_related_entities_related_entity_id_entities_id_fk" FOREIGN KEY ("related_entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_settings" ADD CONSTRAINT "money_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_money_items" ADD CONSTRAINT "recurring_money_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_money_items" ADD CONSTRAINT "recurring_money_items_account_id_money_accounts_entity_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("entity_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_decision_options_decision_idx" ON "financial_decision_options" USING btree ("decision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_decision_options_selected_uidx" ON "financial_decision_options" USING btree ("decision_id") WHERE "financial_decision_options"."selected" = true;--> statement-breakpoint
CREATE INDEX "financial_decisions_status_idx" ON "financial_decisions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_goals_status_idx" ON "financial_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_goals_account_idx" ON "financial_goals" USING btree ("related_account_id");--> statement-breakpoint
CREATE INDEX "money_accounts_type_archived_idx" ON "money_accounts" USING btree ("type","archived");--> statement-breakpoint
CREATE INDEX "money_accounts_currency_idx" ON "money_accounts" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "money_documents_document_id_idx" ON "money_documents" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "money_entries_account_date_idx" ON "money_entries" USING btree ("account_id","occurred_at");--> statement-breakpoint
CREATE INDEX "money_entries_occurred_at_idx" ON "money_entries" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "money_entries_recurring_item_idx" ON "money_entries" USING btree ("recurring_item_id");--> statement-breakpoint
CREATE INDEX "money_related_entities_related_id_idx" ON "money_related_entities" USING btree ("related_entity_id");--> statement-breakpoint
CREATE INDEX "recurring_money_items_active_next_idx" ON "recurring_money_items" USING btree ("is_active","next_occurrence");--> statement-breakpoint
CREATE INDEX "recurring_money_items_account_idx" ON "recurring_money_items" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "recurring_money_items_group_idx" ON "recurring_money_items" USING btree ("group");