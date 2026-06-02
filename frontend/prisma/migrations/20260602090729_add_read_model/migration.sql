-- CreateTable
CREATE TABLE "rm_project_summary" (
    "id" TEXT NOT NULL,
    "database" "Database" NOT NULL,
    "project_nr" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "klant" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIEF',
    "aanneemsom" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gefactureerd" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "onbetaald" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "kosten_materiaal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "kosten_arbeid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "kosten_overig" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "uren_totaal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "synct_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rm_project_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_journaal" (
    "id" TEXT NOT NULL,
    "database" "Database" NOT NULL,
    "project_nr" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "rubriek_code" TEXT NOT NULL,
    "rubriek_omschr" TEXT NOT NULL,
    "type_rubriek" TEXT NOT NULL,
    "debet_credit" TEXT NOT NULL,
    "bedrag" DECIMAL(15,2) NOT NULL,
    "omschrijving" TEXT,

    CONSTRAINT "rm_journaal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_uren" (
    "id" TEXT NOT NULL,
    "database" "Database" NOT NULL,
    "project_nr" TEXT NOT NULL,
    "medewerker" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "aantal" DECIMAL(10,2) NOT NULL,
    "omschrijving" TEXT,

    CONSTRAINT "rm_uren_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_sync_meta" (
    "id" TEXT NOT NULL,
    "database" "Database" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gesynct_op" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duur_ms" INTEGER,
    "projecten_count" INTEGER,
    "fout" TEXT,

    CONSTRAINT "rm_sync_meta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rm_project_summary_database_idx" ON "rm_project_summary"("database");

-- CreateIndex
CREATE UNIQUE INDEX "rm_project_summary_database_project_nr_key" ON "rm_project_summary"("database", "project_nr");

-- CreateIndex
CREATE INDEX "rm_journaal_database_project_nr_idx" ON "rm_journaal"("database", "project_nr");

-- CreateIndex
CREATE INDEX "rm_uren_database_project_nr_idx" ON "rm_uren"("database", "project_nr");

-- CreateIndex
CREATE UNIQUE INDEX "rm_sync_meta_database_key" ON "rm_sync_meta"("database");
