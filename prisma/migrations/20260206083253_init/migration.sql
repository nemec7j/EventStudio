-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDateTime" DATETIME,
    "endDateTime" DATETIME,
    "timezone" TEXT,
    "locationName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "descriptionShort" TEXT,
    "descriptionLong" TEXT,
    "audience" TEXT,
    "priceAmount" REAL,
    "priceCurrency" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "registrationUrl" TEXT,
    "organizerName" TEXT,
    "organizerEmail" TEXT,
    "tags" JSONB,
    "assets" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "originalFileUrl" TEXT NOT NULL,
    "detectedPlaceholders" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneratedMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "outputFileUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedMaterial_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedMaterial_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GeneratedMaterial_eventId_idx" ON "GeneratedMaterial"("eventId");

-- CreateIndex
CREATE INDEX "GeneratedMaterial_templateId_idx" ON "GeneratedMaterial"("templateId");
