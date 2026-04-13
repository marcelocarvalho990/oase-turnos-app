-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "workPercentage" INTEGER NOT NULL,
    "team" TEXT NOT NULL DEFAULT '2.OG',
    "role" TEXT NOT NULL,
    "canCoverOtherTeams" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShiftType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime1" TEXT NOT NULL,
    "endTime1" TEXT NOT NULL,
    "startTime2" TEXT,
    "endTime2" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "borderColor" TEXT NOT NULL,
    "isAbsence" BOOLEAN NOT NULL DEFAULT false,
    "isWorkTime" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "eligibleRoles" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "team" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assignment_shiftCode_fkey" FOREIGN KEY ("shiftCode") REFERENCES "ShiftType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AbsenceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isHardBlock" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbsenceRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "prefType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ShiftPreference_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoverageRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "team" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "dayType" TEXT NOT NULL,
    "minStaff" INTEGER NOT NULL,
    "idealStaff" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "SolverLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "objectiveValue" REAL,
    "violations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Employee_team_idx" ON "Employee"("team");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftType_code_key" ON "ShiftType"("code");

-- CreateIndex
CREATE INDEX "ShiftType_isAbsence_idx" ON "ShiftType"("isAbsence");

-- CreateIndex
CREATE INDEX "Schedule_year_month_idx" ON "Schedule"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_year_month_team_key" ON "Schedule"("year", "month", "team");

-- CreateIndex
CREATE INDEX "Assignment_scheduleId_idx" ON "Assignment"("scheduleId");

-- CreateIndex
CREATE INDEX "Assignment_employeeId_idx" ON "Assignment"("employeeId");

-- CreateIndex
CREATE INDEX "Assignment_date_idx" ON "Assignment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_scheduleId_employeeId_date_key" ON "Assignment"("scheduleId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "AbsenceRequest_employeeId_idx" ON "AbsenceRequest"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverageRule_team_shiftCode_dayType_key" ON "CoverageRule"("team", "shiftCode", "dayType");
