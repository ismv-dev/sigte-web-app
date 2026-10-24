-- AlterTable: Agregar campos de control de acceso y bloqueo por intentos fallidos a User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- CreateTable: PasswordResetToken
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable: Agregar campos criptográficos y blind index a Vehicle
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "plateCipher" TEXT,
ADD COLUMN IF NOT EXISTS "plateIv" TEXT,
ADD COLUMN IF NOT EXISTS "plateTag" TEXT,
ADD COLUMN IF NOT EXISTS "plateBlindIndex" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_plateBlindIndex_key" ON "Vehicle"("plateBlindIndex");
CREATE INDEX IF NOT EXISTS "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");
CREATE INDEX IF NOT EXISTS "Vehicle_plateBlindIndex_idx" ON "Vehicle"("plateBlindIndex");

-- AlterTable: Agregar auditHash a AccessLog
ALTER TABLE "AccessLog" ADD COLUMN IF NOT EXISTS "auditHash" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccessLog_timestamp_idx" ON "AccessLog"("timestamp");
CREATE INDEX IF NOT EXISTS "AccessLog_vehicleId_idx" ON "AccessLog"("vehicleId");
CREATE INDEX IF NOT EXISTS "AccessLog_userId_idx" ON "AccessLog"("userId");

-- AlterTable: Agregar campos de resolución y auditoría a Infraction
ALTER TABLE "Infraction" ADD COLUMN IF NOT EXISTS "resolvedById" TEXT,
ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "resolution" TEXT,
ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT,
ADD COLUMN IF NOT EXISTS "auditHash" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Infraction_userId_idx" ON "Infraction"("userId");
CREATE INDEX IF NOT EXISTS "Infraction_vehicleId_idx" ON "Infraction"("vehicleId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Infraction_resolvedById_fkey'
  ) THEN
    ALTER TABLE "Infraction" ADD CONSTRAINT "Infraction_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: UsedNonce (Anti-Replay RT-01)
CREATE TABLE IF NOT EXISTS "UsedNonce" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT,
    "vehicleId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsedNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UsedNonce_jti_key" ON "UsedNonce"("jti");
CREATE INDEX IF NOT EXISTS "UsedNonce_expiresAt_idx" ON "UsedNonce"("expiresAt");
CREATE INDEX IF NOT EXISTS "UsedNonce_jti_idx" ON "UsedNonce"("jti");

-- CreateTable: SecurityAuditLog (Tamper-Proof Chaining RT-06)
CREATE TABLE IF NOT EXISTS "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "previousHash" TEXT NOT NULL,
    "currentHash" TEXT NOT NULL,
    "eventPayload" TEXT NOT NULL,
    "actorHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SecurityAuditLog_sequenceNumber_key" ON "SecurityAuditLog"("sequenceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "SecurityAuditLog_currentHash_key" ON "SecurityAuditLog"("currentHash");
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_timestamp_idx" ON "SecurityAuditLog"("timestamp");
CREATE INDEX IF NOT EXISTS "SecurityAuditLog_sequenceNumber_idx" ON "SecurityAuditLog"("sequenceNumber");

-- CreateTable: SecurityEvent (Detección de anomalías RQ-07)
CREATE TABLE IF NOT EXISTS "SecurityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ipAddress" TEXT,
    "actorHash" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SecurityEvent_timestamp_idx" ON "SecurityEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "SecurityEvent_type_idx" ON "SecurityEvent"("type");
CREATE INDEX IF NOT EXISTS "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateTable: PushToken
CREATE TABLE IF NOT EXISTS "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
