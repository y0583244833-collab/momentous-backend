-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "BoardInvitation" (
    "id" UUID NOT NULL,
    "boardId" UUID NOT NULL,
    "inviterId" UUID NOT NULL,
    "inviteeEmail" VARCHAR(254) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BoardInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardInvitation_inviteeEmail_status_idx" ON "BoardInvitation"("inviteeEmail", "status");

-- CreateIndex
CREATE INDEX "BoardInvitation_inviterId_idx" ON "BoardInvitation"("inviterId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardInvitation_boardId_inviteeEmail_key" ON "BoardInvitation"("boardId", "inviteeEmail");

-- AddForeignKey
ALTER TABLE "BoardInvitation" ADD CONSTRAINT "BoardInvitation_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardInvitation" ADD CONSTRAINT "BoardInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
