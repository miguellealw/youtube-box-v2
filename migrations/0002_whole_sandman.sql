CREATE TABLE "watchedVideo" (
	"userId" text NOT NULL,
	"videoId" text NOT NULL,
	"watchedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchedVideo_userId_videoId_pk" PRIMARY KEY("userId","videoId")
);
--> statement-breakpoint
ALTER TABLE "watchedVideo" ADD CONSTRAINT "watchedVideo_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;