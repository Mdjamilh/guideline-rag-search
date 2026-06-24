CREATE TABLE "chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"heading" text NOT NULL,
	"anchor" text NOT NULL,
	"ordinal" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768),
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"year" integer NOT NULL,
	"topic" text NOT NULL,
	"url" text NOT NULL,
	"body" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_slug_documents_slug_fk" FOREIGN KEY ("slug") REFERENCES "public"."documents"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_slug_idx" ON "chunks" USING btree ("slug","ordinal");--> statement-breakpoint
CREATE INDEX "chunks_search_idx" ON "chunks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);