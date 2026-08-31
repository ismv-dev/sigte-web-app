-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STAFF', 'STUDENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userType" "UserType",
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "rut" TEXT,
ADD COLUMN     "academicDepartment" TEXT,
ADD COLUMN     "career" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_rut_key" ON "User"("rut");
