ALTER TABLE "offer_letters" ADD COLUMN "letterType" varchar(64) DEFAULT 'offer' NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_letters" ADD COLUMN "completionDate" varchar(128);--> statement-breakpoint
ALTER TABLE "offer_letters" ADD COLUMN "employmentType" varchar(128) DEFAULT 'Internship';--> statement-breakpoint
ALTER TABLE "offer_letters" ADD COLUMN "letterDate" varchar(128);--> statement-breakpoint
ALTER TABLE "offer_letters" ADD COLUMN "department" varchar(128);--> statement-breakpoint
ALTER TABLE "offer_letters" ADD COLUMN "lastWorkingDate" varchar(128);--> statement-breakpoint
ALTER TABLE "offer_letters" ADD COLUMN "relievingDate" varchar(128);--> statement-breakpoint
ALTER TABLE "offer_letters" ALTER COLUMN "joiningDate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_letters" ALTER COLUMN "duration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offer_letters" ALTER COLUMN "workingHours" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "offer_letters_letter_type_idx" ON "offer_letters" USING btree ("letterType");