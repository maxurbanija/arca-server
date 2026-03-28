-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "docType" INTEGER NOT NULL,
    "docNumber" TEXT NOT NULL,
    "ivaCondition" INTEGER NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "cbteTipo" INTEGER NOT NULL,
    "puntoVenta" INTEGER NOT NULL,
    "cbteNro" INTEGER NOT NULL,
    "cbteDesde" INTEGER NOT NULL,
    "cbteHasta" INTEGER NOT NULL,
    "cbteFch" TEXT NOT NULL,
    "concepto" INTEGER NOT NULL DEFAULT 2,
    "docTipo" INTEGER NOT NULL,
    "docNro" TEXT NOT NULL,
    "impTotal" DECIMAL(15,2) NOT NULL,
    "impTotConc" DECIMAL(15,2) NOT NULL,
    "impNeto" DECIMAL(15,2) NOT NULL,
    "impOpEx" DECIMAL(15,2) NOT NULL,
    "impIVA" DECIMAL(15,2) NOT NULL,
    "impTrib" DECIMAL(15,2) NOT NULL,
    "cae" TEXT,
    "caeFchVto" TEXT,
    "resultado" TEXT,
    "monId" TEXT NOT NULL DEFAULT 'PES',
    "monCotiz" DECIMAL(15,6) NOT NULL DEFAULT 1,
    "fchServDesde" TEXT,
    "fchServHasta" TEXT,
    "fchVtoPago" TEXT,
    "clientId" INTEGER,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "ivaId" INTEGER NOT NULL,
    "ivaRate" DECIMAL(5,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "ivaAmount" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_docNumber_idx" ON "Client"("docNumber");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Invoice_cbteFch_idx" ON "Invoice"("cbteFch");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_cbteTipo_puntoVenta_cbteNro_key" ON "Invoice"("cbteTipo", "puntoVenta", "cbteNro");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
