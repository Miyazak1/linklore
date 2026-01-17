-- ============================================
-- LinkLore 数据库初始化 DDL
-- 生成时间: 2025-01-21
-- 从 Prisma Schema 自动生成
-- ============================================

-- 注意：执行前请确保已创建数据库
-- CREATE DATABASE linklore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE linklore;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `invitedBy` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `emailVerificationToken` VARCHAR(191) NULL,
    `emailVerificationTokenExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_emailVerificationToken_key`(`emailVerificationToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Topic` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `subtitle` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'discussion',
    `authorId` VARCHAR(191) NOT NULL,
    `discipline` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `commentCount` INTEGER NOT NULL DEFAULT 0,

    INDEX `Topic_authorId_idx`(`authorId`),
    INDEX `Topic_createdAt_idx`(`createdAt`),
    INDEX `Topic_discipline_idx`(`discipline`),
    INDEX `Topic_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `checksum` VARCHAR(191) NULL,
    `extractedText` LONGBLOB NULL,
    `processingStatus` JSON NULL,
    `lastProcessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Document_topicId_idx`(`topicId`),
    INDEX `Document_parentId_idx`(`parentId`),
    INDEX `Document_authorId_idx`(`authorId`),
    INDEX `Document_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Summary` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `overview` VARCHAR(191) NOT NULL,
    `structure` JSON NOT NULL,
    `claims` JSON NOT NULL,
    `counterpoints` JSON NOT NULL,
    `keywords` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evaluation` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `discipline` VARCHAR(191) NOT NULL,
    `rubricVersion` VARCHAR(191) NOT NULL,
    `scores` JSON NOT NULL,
    `verdict` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserAiConfig` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `encApiKey` VARCHAR(191) NOT NULL,
    `apiEndpoint` VARCHAR(191) NULL,
    `persist` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserAiConfig_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemAiConfig` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `encApiKey` VARCHAR(191) NOT NULL,
    `apiEndpoint` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SystemAiConfig_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiUsageLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `promptTokens` INTEGER NOT NULL,
    `completionTokens` INTEGER NOT NULL,
    `costCents` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invitation` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `issuedBy` VARCHAR(191) NULL,
    `usedBy` VARCHAR(191) NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    UNIQUE INDEX `Invitation_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Book` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NULL,
    `coverUrl` VARCHAR(191) NULL,
    `overview` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `language` VARCHAR(191) NULL,
    `isbn` VARCHAR(191) NULL,
    `publisher` VARCHAR(191) NULL,
    `publishYear` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Book_category_idx`(`category`),
    INDEX `Book_language_idx`(`language`),
    INDEX `Book_publishYear_idx`(`publishYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookshelfItem` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookAsset` (
    `id` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Disagreement` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `ownerId` VARCHAR(191) NULL,
    `docIds` JSON NOT NULL,
    `doc1Id` VARCHAR(191) NULL,
    `doc2Id` VARCHAR(191) NULL,
    `claim1` VARCHAR(191) NULL,
    `claim2` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NULL,
    `confidence` DOUBLE NULL,
    `aiGenerated` BOOLEAN NOT NULL DEFAULT true,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `falsePositive` BOOLEAN NOT NULL DEFAULT false,
    `analysisHash` VARCHAR(191) NULL,
    `branchPath` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastValidatedAt` DATETIME(3) NULL,

    INDEX `Disagreement_topicId_idx`(`topicId`),
    INDEX `Disagreement_doc1Id_idx`(`doc1Id`),
    INDEX `Disagreement_doc2Id_idx`(`doc2Id`),
    INDEX `Disagreement_status_idx`(`status`),
    INDEX `Disagreement_lastValidatedAt_idx`(`lastValidatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsensusSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `snapshotAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `consensusData` JSON NOT NULL,
    `consensusScore` DOUBLE NULL,
    `divergenceScore` DOUBLE NULL,

    INDEX `ConsensusSnapshot_topicId_idx`(`topicId`),
    INDEX `ConsensusSnapshot_snapshotAt_idx`(`snapshotAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserConsensus` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `userId1` VARCHAR(191) NOT NULL,
    `userId2` VARCHAR(191) NOT NULL,
    `consensus` JSON NOT NULL,
    `disagreements` JSON NOT NULL,
    `consensusScore` DOUBLE NULL,
    `divergenceScore` DOUBLE NULL,
    `docIds` JSON NOT NULL,
    `discussionPaths` JSON NOT NULL,
    `lastAnalyzedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserConsensus_topicId_idx`(`topicId`),
    INDEX `UserConsensus_userId1_idx`(`userId1`),
    INDEX `UserConsensus_userId2_idx`(`userId2`),
    INDEX `UserConsensus_topicId_userId1_idx`(`topicId`, `userId1`),
    INDEX `UserConsensus_topicId_userId2_idx`(`topicId`, `userId2`),
    UNIQUE INDEX `UserConsensus_topicId_userId1_userId2_key`(`topicId`, `userId1`, `userId2`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TopicComment` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `depth` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `TopicComment_topicId_idx`(`topicId`),
    INDEX `TopicComment_parentId_idx`(`parentId`),
    INDEX `TopicComment_authorId_idx`(`authorId`),
    INDEX `TopicComment_createdAt_idx`(`createdAt`),
    INDEX `TopicComment_topicId_parentId_idx`(`topicId`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TopicParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TopicParticipant_topicId_idx`(`topicId`),
    INDEX `TopicParticipant_userId_idx`(`userId`),
    INDEX `TopicParticipant_topicId_userId_idx`(`topicId`, `userId`),
    UNIQUE INDEX `TopicParticipant_topicId_userId_key`(`topicId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BaikeQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `difficulty` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BaikeQuestion_date_key`(`date`),
    INDEX `BaikeQuestion_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BaikeGameRecord` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `date` VARCHAR(191) NOT NULL,
    `guessCount` INTEGER NOT NULL DEFAULT 0,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `guesses` JSON NOT NULL,
    `revealedChars` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BaikeGameRecord_questionId_idx`(`questionId`),
    INDEX `BaikeGameRecord_date_idx`(`date`),
    INDEX `BaikeGameRecord_userId_idx`(`userId`),
    UNIQUE INDEX `BaikeGameRecord_date_userId_key`(`date`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyIssue` (
    `id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `caseDescription` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `difficulty` INTEGER NULL,
    `category` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DailyIssue_date_key`(`date`),
    INDEX `DailyIssue_date_idx`(`date`),
    INDEX `DailyIssue_status_idx`(`status`),
    INDEX `DailyIssue_status_date_idx`(`status`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IssueNode` (
    `id` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `stage` INTEGER NOT NULL,
    `nodeKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `parentNodeKey` VARCHAR(191) NULL,
    `nextNodeKeys` JSON NOT NULL,
    `isRoot` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL,

    INDEX `IssueNode_issueId_idx`(`issueId`),
    INDEX `IssueNode_issueId_stage_idx`(`issueId`, `stage`),
    INDEX `IssueNode_issueId_nodeKey_idx`(`issueId`, `nodeKey`),
    UNIQUE INDEX `IssueNode_issueId_nodeKey_key`(`issueId`, `nodeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IssuePath` (
    `id` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `date` VARCHAR(191) NOT NULL,
    `path` JSON NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IssuePath_issueId_idx`(`issueId`),
    INDEX `IssuePath_userId_idx`(`userId`),
    INDEX `IssuePath_date_idx`(`date`),
    INDEX `IssuePath_issueId_date_idx`(`issueId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IssueResult` (
    `id` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `pathPattern` JSON NOT NULL,
    `resultTemplate` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `IssueResult_issueId_idx`(`issueId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IssueFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `pathId` VARCHAR(191) NULL,
    `helpful` BOOLEAN NULL,
    `confusingStage` INTEGER NULL,
    `isNeutral` BOOLEAN NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IssueFeedback_issueId_idx`(`issueId`),
    INDEX `IssueFeedback_userId_idx`(`userId`),
    INDEX `IssueFeedback_pathId_idx`(`pathId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IssueAnalytics` (
    `id` VARCHAR(191) NOT NULL,
    `issueId` VARCHAR(191) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `totalAttempts` INTEGER NOT NULL DEFAULT 0,
    `completionRate` DOUBLE NOT NULL DEFAULT 0,
    `pathDistribution` JSON NOT NULL,
    `averageTime` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IssueAnalytics_issueId_key`(`issueId`),
    INDEX `IssueAnalytics_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OAuthAccount` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `accessToken` VARCHAR(191) NULL,
    `refreshToken` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OAuthAccount_userId_idx`(`userId`),
    INDEX `OAuthAccount_provider_providerId_idx`(`provider`, `providerId`),
    UNIQUE INDEX `OAuthAccount_provider_providerId_key`(`provider`, `providerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GameInstance` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `coverUrl` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `modules` JSON NOT NULL,
    `questions` JSON NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `difficulty` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GameInstance_authorId_idx`(`authorId`),
    INDEX `GameInstance_status_idx`(`status`),
    INDEX `GameInstance_isPublic_idx`(`isPublic`),
    INDEX `GameInstance_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GamePlay` (
    `id` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `score` INTEGER NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `answers` JSON NOT NULL,
    `timeSpent` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GamePlay_gameId_idx`(`gameId`),
    INDEX `GamePlay_userId_idx`(`userId`),
    INDEX `GamePlay_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Topic` ADD CONSTRAINT `Topic_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Summary` ADD CONSTRAINT `Summary_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookshelfItem` ADD CONSTRAINT `BookshelfItem_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookAsset` ADD CONSTRAINT `BookAsset_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `Book`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsensusSnapshot` ADD CONSTRAINT `ConsensusSnapshot_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserConsensus` ADD CONSTRAINT `UserConsensus_userId1_fkey` FOREIGN KEY (`userId1`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserConsensus` ADD CONSTRAINT `UserConsensus_userId2_fkey` FOREIGN KEY (`userId2`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserConsensus` ADD CONSTRAINT `UserConsensus_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TopicComment` ADD CONSTRAINT `TopicComment_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TopicComment` ADD CONSTRAINT `TopicComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `TopicComment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TopicComment` ADD CONSTRAINT `TopicComment_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TopicParticipant` ADD CONSTRAINT `TopicParticipant_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `Topic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TopicParticipant` ADD CONSTRAINT `TopicParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BaikeGameRecord` ADD CONSTRAINT `BaikeGameRecord_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `BaikeQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueNode` ADD CONSTRAINT `IssueNode_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `DailyIssue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssuePath` ADD CONSTRAINT `IssuePath_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `DailyIssue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssuePath` ADD CONSTRAINT `IssuePath_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueResult` ADD CONSTRAINT `IssueResult_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `DailyIssue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueFeedback` ADD CONSTRAINT `IssueFeedback_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `DailyIssue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueFeedback` ADD CONSTRAINT `IssueFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueFeedback` ADD CONSTRAINT `IssueFeedback_pathId_fkey` FOREIGN KEY (`pathId`) REFERENCES `IssuePath`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IssueAnalytics` ADD CONSTRAINT `IssueAnalytics_issueId_fkey` FOREIGN KEY (`issueId`) REFERENCES `DailyIssue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OAuthAccount` ADD CONSTRAINT `OAuthAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GameInstance` ADD CONSTRAINT `GameInstance_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GamePlay` ADD CONSTRAINT `GamePlay_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `GameInstance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GamePlay` ADD CONSTRAINT `GamePlay_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
