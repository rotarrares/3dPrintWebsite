-- AddColumn slug, metaTitle, metaDescription, metaKeywords to Product table
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaKeywords" TEXT;

-- Create unique index for slug
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- Create index for slug
CREATE INDEX "Product_slug_idx" ON "Product"("slug");
