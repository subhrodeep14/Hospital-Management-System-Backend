ALTER TABLE "tickets" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'Pending'::text;--> statement-breakpoint
DROP TYPE "public"."ticket_status_enum";--> statement-breakpoint
CREATE TYPE "public"."ticket_status_enum" AS ENUM('Open', 'In Progress', 'Pending', 'Resolved', 'Closed');--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'Pending'::"public"."ticket_status_enum";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DATA TYPE "public"."ticket_status_enum" USING "status"::"public"."ticket_status_enum";