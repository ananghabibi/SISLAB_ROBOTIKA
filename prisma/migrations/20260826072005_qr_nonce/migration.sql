-- CreateTable
CREATE TABLE "qr_nonces" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nonce" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "qr_nonces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qr_nonces_createdAt_idx" ON "qr_nonces"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "qr_nonces_nonce_userId_key" ON "qr_nonces"("nonce", "userId");
