/*
  Warnings:

  - Added the required column `updatedAt` to the `AbsenceRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "UserPin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "pin" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPin_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftSwapRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "targetEmployeeId" TEXT NOT NULL,
    "requesterDate" TEXT NOT NULL,
    "targetDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterMessage" TEXT,
    "managerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftSwapRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShiftSwapRequest_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AbsenceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isHardBlock" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "managerNote" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbsenceRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AbsenceRequest" ("createdAt", "employeeId", "endDate", "id", "isHardBlock", "notes", "startDate", "type") SELECT "createdAt", "employeeId", "endDate", "id", "isHardBlock", "notes", "startDate", "type" FROM "AbsenceRequest";
DROP TABLE "AbsenceRequest";
ALTER TABLE "new_AbsenceRequest" RENAME TO "AbsenceRequest";
CREATE INDEX "AbsenceRequest_employeeId_idx" ON "AbsenceRequest"("employeeId");
CREATE INDEX "AbsenceRequest_status_idx" ON "AbsenceRequest"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserPin_employeeId_key" ON "UserPin"("employeeId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_requesterId_idx" ON "ShiftSwapRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_targetEmployeeId_idx" ON "ShiftSwapRequest"("targetEmployeeId");

-- CreateIndex
CREATE INDEX "ShiftSwapRequest_status_idx" ON "ShiftSwapRequest"("status");
