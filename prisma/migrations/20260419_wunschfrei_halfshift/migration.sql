CREATE TABLE "WunschfreiRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "managerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WunschfreiRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WunschfreiRequest_employeeId_date_key" ON "WunschfreiRequest"("employeeId", "date");
CREATE INDEX "WunschfreiRequest_employeeId_idx" ON "WunschfreiRequest"("employeeId");
CREATE INDEX "WunschfreiRequest_status_idx" ON "WunschfreiRequest"("status");
CREATE INDEX "WunschfreiRequest_year_month_idx" ON "WunschfreiRequest"("year", "month");
ALTER TABLE "Assignment" ADD COLUMN "halfOf" TEXT NOT NULL DEFAULT 'FULL';
