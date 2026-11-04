DROP INDEX "rental_requests_dedupe";--> statement-breakpoint
ALTER TABLE "rental_requests" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_requests" ALTER COLUMN "end_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_requests" ALTER COLUMN "total_price" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rental_requests" ALTER COLUMN "total_price" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rental_requests_dedupe" ON "rental_requests" USING btree ("listing_id","renter_id",coalesce("start_date", '0001-01-01'::date),coalesce("end_date", '0001-01-01'::date)) WHERE status = 'beklemede';