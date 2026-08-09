CREATE TYPE "public"."contact_preference" AS ENUM('telefon_mesaj', 'sadece_mesaj');--> statement-breakpoint
CREATE TYPE "public"."listing_condition" AS ENUM('sifir', 'ikinci_el');--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_token_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "condition" "listing_condition" DEFAULT 'ikinci_el' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact_preference" "contact_preference" DEFAULT 'telefon_mesaj' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "video_path" text;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "listings_condition_idx" ON "listings" USING btree ("condition");--> statement-breakpoint
CREATE INDEX "listings_video_idx" ON "listings" USING btree ("video_url");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");