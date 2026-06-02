-- CreateTable
CREATE TABLE "rm_werkbon" (
    "id" TEXT NOT NULL,
    "database" "Database" NOT NULL,
    "bonnummer" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "omschrijving" TEXT,
    "status" TEXT NOT NULL,
    "meth_in_uitvoering" TEXT,
    "fase" TEXT,
    "klant" TEXT,
    "eigenaar" TEXT,
    "werk_code" TEXT,
    "is_gefactureerd" BOOLEAN NOT NULL DEFAULT false,
    "synct_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kosten_handm" DECIMAL(12,2),
    "indirect_handm" DECIMAL(12,2),
    "alg_kosten_handm" DECIMAL(12,2),
    "opbrengsten_handm" DECIMAL(12,2),
    "b_marge_handm" DECIMAL(12,2),
    "volledig_betaald" BOOLEAN,
    "notities" TEXT,

    CONSTRAINT "rm_werkbon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_werkbon_database_status_idx" ON "rm_werkbon"("database", "status");

-- CreateIndex
CREATE INDEX "rm_werkbon_database_datum_idx" ON "rm_werkbon"("database", "datum");

-- CreateIndex
CREATE INDEX "rm_werkbon_database_klant_idx" ON "rm_werkbon"("database", "klant");

-- CreateIndex
CREATE UNIQUE INDEX "rm_werkbon_database_bonnummer_key" ON "rm_werkbon"("database", "bonnummer");
