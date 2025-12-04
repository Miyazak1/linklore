-- AlterTable: Add parentId and processing fields to Document
ALTER TABLE "Document" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Document" ADD COLUMN "processingStatus" JSONB;
ALTER TABLE "Document" ADD COLUMN "lastProcessedAt" TIMESTAMP(3);

-- AddForeignKey: Document parent relationship
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_fkey" 
  FOREIGN KEY ("parentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddIndex: Document parentId
CREATE INDEX "Document_parentId_idx" ON "Document"("parentId");

-- AddConstraint: Prevent self-reference (cannot reply to itself)
ALTER TABLE "Document" ADD CONSTRAINT "Document_parentId_check" 
  CHECK ("parentId" IS NULL OR "parentId" != "id");

-- AlterTable: Extend Disagreement model
ALTER TABLE "Disagreement" ADD COLUMN "description" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "docIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Disagreement" ADD COLUMN "doc1Id" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "doc2Id" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "claim1" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "claim2" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "severity" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "Disagreement" ADD COLUMN "aiGenerated" BOOLEAN DEFAULT true;
ALTER TABLE "Disagreement" ADD COLUMN "verified" BOOLEAN DEFAULT false;
ALTER TABLE "Disagreement" ADD COLUMN "falsePositive" BOOLEAN DEFAULT false;
ALTER TABLE "Disagreement" ADD COLUMN "analysisHash" TEXT;
ALTER TABLE "Disagreement" ADD COLUMN "branchPath" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Disagreement" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Disagreement" ADD COLUMN "lastValidatedAt" TIMESTAMP(3);

-- AddIndex: Disagreement indexes
CREATE INDEX "Disagreement_doc1Id_idx" ON "Disagreement"("doc1Id");
CREATE INDEX "Disagreement_doc2Id_idx" ON "Disagreement"("doc2Id");
CREATE INDEX "Disagreement_status_idx" ON "Disagreement"("status");
CREATE INDEX "Disagreement_lastValidatedAt_idx" ON "Disagreement"("lastValidatedAt");

-- CreateTable: ConsensusSnapshot
CREATE TABLE "ConsensusSnapshot" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consensusData" JSONB NOT NULL,
    "consensusScore" DOUBLE PRECISION,
    "divergenceScore" DOUBLE PRECISION,

    CONSTRAINT "ConsensusSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddIndex: ConsensusSnapshot indexes
CREATE INDEX "ConsensusSnapshot_topicId_idx" ON "ConsensusSnapshot"("topicId");
CREATE INDEX "ConsensusSnapshot_snapshotAt_idx" ON "ConsensusSnapshot"("snapshotAt");

-- AddForeignKey: ConsensusSnapshot topic relationship
ALTER TABLE "ConsensusSnapshot" ADD CONSTRAINT "ConsensusSnapshot_topicId_fkey" 
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;








