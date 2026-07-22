-- CreateTable
CREATE TABLE "CreatorCollection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'collection-json',
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionProduct" (
    "id" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "compareAtPrice" TEXT,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldLabel" TEXT NOT NULL,
    "offerJson" JSONB,
    "ctaLabel" TEXT,
    "detailJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "collectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCollection_slug_key" ON "CreatorCollection"("slug");

-- CreateIndex
CREATE INDEX "CreatorCollection_creatorId_idx" ON "CreatorCollection"("creatorId");

-- CreateIndex
CREATE INDEX "CollectionProduct_collectionId_idx" ON "CollectionProduct"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionProduct_kind_idx" ON "CollectionProduct"("kind");

-- CreateIndex
CREATE INDEX "CollectionProduct_sortOrder_idx" ON "CollectionProduct"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProduct_collectionId_productKey_key" ON "CollectionProduct"("collectionId", "productKey");

-- AddForeignKey
ALTER TABLE "CreatorCollection" ADD CONSTRAINT "CreatorCollection_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CreatorCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
