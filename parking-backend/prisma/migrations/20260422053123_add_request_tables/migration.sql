-- DropIndex
DROP INDEX "transactions_area_id_idx";

-- DropIndex
DROP INDEX "transactions_tag_id_idx";

-- CreateTable
CREATE TABLE "entry_requests" (
    "id" SERIAL NOT NULL,
    "tag_id" TEXT NOT NULL,
    "area_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_requests" (
    "id" SERIAL NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entry_requests_area_id_idx" ON "entry_requests"("area_id");

-- CreateIndex
CREATE INDEX "transactions_area_id_status_idx" ON "transactions"("area_id", "status");

-- CreateIndex
CREATE INDEX "transactions_tag_id_status_idx" ON "transactions"("tag_id", "status");
