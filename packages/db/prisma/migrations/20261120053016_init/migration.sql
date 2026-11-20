-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('patient', 'physical_therapist', 'care_coordinator', 'clinic_admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'revoked');

-- CreateEnum
CREATE TYPE "AdministrativeGender" AS ENUM ('female', 'male', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('intake_incomplete', 'awaiting_assignment', 'active', 'inactive', 'discharged');

-- CreateEnum
CREATE TYPE "CareTeamStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CareTeamMemberRole" AS ENUM ('primary_therapist', 'therapist', 'care_coordinator');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('treatment_and_data_use', 'ai_assisted_features', 'motion_tracking');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('active', 'inactive', 'rejected', 'entered_in_error');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('in_progress', 'submitted', 'reviewed');

-- CreateEnum
CREATE TYPE "ConditionCategory" AS ENUM ('problem_list_item', 'encounter_diagnosis', 'health_concern');

-- CreateEnum
CREATE TYPE "ConditionClinicalStatus" AS ENUM ('active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved');

-- CreateEnum
CREATE TYPE "ConditionVerificationStatus" AS ENUM ('unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted', 'entered_in_error');

-- CreateEnum
CREATE TYPE "GoalLifecycleStatus" AS ENUM ('proposed', 'planned', 'accepted', 'active', 'on_hold', 'completed', 'cancelled', 'entered_in_error', 'rejected');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('draft', 'active', 'on_hold', 'revoked', 'completed', 'entered_in_error');

-- CreateEnum
CREATE TYPE "ExerciseSessionStatus" AS ENUM ('in_progress', 'paused', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "SessionActivityStatus" AS ENUM ('pending', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "CheckInDifficulty" AS ENUM ('easier', 'as_expected', 'harder');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('final', 'amended', 'corrected', 'cancelled', 'entered_in_error');

-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('survey', 'activity', 'exam', 'vital_signs');

-- CreateEnum
CREATE TYPE "ObservationPerformerType" AS ENUM ('patient', 'practitioner');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('open', 'booked', 'blocked');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('initial_evaluation', 'follow_up', 'video_follow_up');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('requested', 'booked', 'checked_in', 'in_progress', 'completed', 'cancelled_by_patient', 'cancelled_by_clinic', 'no_show');

-- CreateEnum
CREATE TYPE "EncounterClass" AS ENUM ('AMB', 'VR');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('in_progress', 'finished', 'entered_in_error');

-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('progress_note', 'initial_evaluation');

-- CreateEnum
CREATE TYPE "ClinicalNoteStatus" AS ENUM ('draft', 'signed', 'entered_in_error');

-- CreateEnum
CREATE TYPE "NoteVersionSource" AS ENUM ('clinician', 'ai_draft');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('appointment_reminder', 'appointment_changed', 'message_received', 'care_plan_published', 'review_task_assigned', 'ai_draft_ready');

-- CreateEnum
CREATE TYPE "ReviewTaskStatus" AS ENUM ('open', 'in_review', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "AIGenerationKind" AS ENUM ('progress_summary', 'note_draft', 'navigation_answer');

-- CreateEnum
CREATE TYPE "AIGenerationStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "AIReviewDecision" AS ENUM ('approved', 'approved_with_edits', 'rejected');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('user', 'system', 'ai');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('C', 'R', 'U', 'D', 'E');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('success', 'minor_failure', 'serious_failure', 'major_failure');

-- CreateEnum
CREATE TYPE "PurposeOfUse" AS ENUM ('treatment', 'operations', 'patient_access', 'admin', 'export');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'dead');

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "permissions" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "userAgent" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "mrn" TEXT NOT NULL,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "gender" "AdministrativeGender" NOT NULL DEFAULT 'unknown',
    "email" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "status" "PatientStatus" NOT NULL DEFAULT 'intake_incomplete',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practitioner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "staffId" TEXT NOT NULL,
    "npi" TEXT,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "credentials" TEXT,
    "bio" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Practitioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTeam" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CareTeamStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTeamMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "careTeamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "CareTeamMemberRole" NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CareTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'active',
    "policyVersion" TEXT NOT NULL,
    "policyUri" TEXT NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "capturedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAssessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'in_progress',
    "currentStep" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "reasonForCare" TEXT,
    "bodyArea" TEXT,
    "painScore" INTEGER,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMPTZ(3),
    "reviewedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "codeSystem" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "category" "ConditionCategory" NOT NULL DEFAULT 'problem_list_item',
    "clinicalStatus" "ConditionClinicalStatus" DEFAULT 'active',
    "verificationStatus" "ConditionVerificationStatus" NOT NULL DEFAULT 'confirmed',
    "bodySite" TEXT,
    "onsetDate" DATE,
    "abatementDate" DATE,
    "recordedByPractitionerId" UUID,
    "note" TEXT,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "carePlanId" UUID,
    "addressesConditionId" UUID,
    "description" TEXT NOT NULL,
    "lifecycleStatus" "GoalLifecycleStatus" NOT NULL DEFAULT 'proposed',
    "achievementStatus" TEXT,
    "measureSystem" TEXT,
    "measureCode" TEXT,
    "targetValue" DECIMAL(10,2),
    "targetUnit" TEXT,
    "startDate" DATE,
    "dueDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyArea" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "mediaPath" TEXT,
    "defaultSets" INTEGER,
    "defaultReps" INTEGER,
    "defaultHoldSeconds" INTEGER,
    "defaultDurationSeconds" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'draft',
    "currentVersionId" UUID,
    "draftContent" JSONB,
    "draftUpdatedAt" TIMESTAMPTZ(3),
    "createdByPractitionerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "carePlanId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "changeNoteForPatient" TEXT,
    "publishedByPractitionerId" UUID NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "carePlanVersionId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "holdSeconds" INTEGER,
    "durationSeconds" INTEGER,
    "restSeconds" INTEGER NOT NULL DEFAULT 30,
    "daysOfWeek" INTEGER[],
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "instructions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "carePlanVersionId" UUID NOT NULL,
    "status" "ExerciseSessionStatus" NOT NULL DEFAULT 'in_progress',
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionActivity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "status" "SessionActivityStatus" NOT NULL DEFAULT 'pending',
    "completedSets" INTEGER,
    "completedReps" INTEGER,
    "durationSeconds" INTEGER,
    "discomfortReported" BOOLEAN NOT NULL DEFAULT false,
    "discomfortLevel" INTEGER,
    "discomfortNote" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientCheckIn" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "sessionId" UUID,
    "painScore" INTEGER NOT NULL,
    "difficulty" "CheckInDifficulty",
    "notes" TEXT,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedByUserId" UUID,

    CONSTRAINT "PatientCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "checkInId" UUID,
    "sessionId" UUID,
    "status" "ObservationStatus" NOT NULL DEFAULT 'final',
    "category" "ObservationCategory" NOT NULL,
    "codeSystem" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "valueQuantity" DECIMAL(10,2),
    "valueUnit" TEXT,
    "valueString" TEXT,
    "dataAbsentReason" TEXT,
    "performerType" "ObservationPerformerType" NOT NULL,
    "performerPractitionerId" UUID,
    "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'open',
    "appointmentTypes" "AppointmentType"[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "slotId" UUID,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'booked',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "bookedTimezone" TEXT NOT NULL,
    "reason" TEXT,
    "bookedByUserId" UUID,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "cancelledByUserId" UUID,
    "rescheduledFromId" UUID,
    "reminderSentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "practitionerId" UUID NOT NULL,
    "appointmentId" UUID,
    "class" "EncounterClass" NOT NULL,
    "typeCode" TEXT NOT NULL,
    "typeDisplay" TEXT NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "transcript" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "encounterId" UUID,
    "authorPractitionerId" UUID NOT NULL,
    "noteType" "ClinicalNoteType" NOT NULL DEFAULT 'progress_note',
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'draft',
    "currentVersionId" UUID,
    "signedAt" TIMESTAMPTZ(3),
    "signedByPractitionerId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNoteVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "noteId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "subjective" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "source" "NoteVersionSource" NOT NULL DEFAULT 'clinician',
    "aiGenerationId" UUID,
    "isAmendment" BOOLEAN NOT NULL DEFAULT false,
    "amendmentReason" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastReadAt" TIMESTAMPTZ(3),
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'queued',
    "failureReason" TEXT,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkPath" TEXT,
    "sourceType" TEXT,
    "sourceId" UUID,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "params" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL,
    "status" "ReviewTaskStatus" NOT NULL DEFAULT 'open',
    "assignedPractitionerId" UUID,
    "dueAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedByUserId" UUID,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGeneration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "kind" "AIGenerationKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerLabel" TEXT NOT NULL,
    "model" TEXT,
    "promptKey" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "AIGenerationStatus" NOT NULL DEFAULT 'pending',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costMicroUsd" INTEGER,
    "latencyMs" INTEGER,
    "unsupportedStatementCount" INTEGER,
    "requestedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "decision" "AIReviewDecision" NOT NULL,
    "editedOutput" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "actorUserId" UUID,
    "actorRole" "RoleKey",
    "actorType" "AuditActorType" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "eventName" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "patientId" UUID,
    "purposeOfUse" "PurposeOfUse",
    "requestId" TEXT,
    "sourceIpHash" TEXT,
    "detailCode" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID,
    "queue" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusTransition" (
    "tableName" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,

    CONSTRAINT "StatusTransition_pkey" PRIMARY KEY ("tableName","column","fromStatus","toStatus")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_roleId_idx" ON "OrganizationMembership"("organizationId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_organizationId_familyName_givenName_idx" ON "Patient"("organizationId", "familyName", "givenName");

-- CreateIndex
CREATE INDEX "Patient_organizationId_status_idx" ON "Patient"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Patient_organizationId_lastActivityAt_idx" ON "Patient"("organizationId", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_id_organizationId_key" ON "Patient"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_organizationId_mrn_key" ON "Patient"("organizationId", "mrn");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_organizationId_key" ON "Patient"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_userId_key" ON "Practitioner"("userId");

-- CreateIndex
CREATE INDEX "Practitioner_organizationId_familyName_givenName_idx" ON "Practitioner"("organizationId", "familyName", "givenName");

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_id_organizationId_key" ON "Practitioner"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_organizationId_staffId_key" ON "Practitioner"("organizationId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_userId_organizationId_key" ON "Practitioner"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CareTeam_id_organizationId_key" ON "CareTeam"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CareTeam_patientId_organizationId_key" ON "CareTeam"("patientId", "organizationId");

-- CreateIndex
CREATE INDEX "CareTeamMember_organizationId_userId_idx" ON "CareTeamMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "CareTeamMember_careTeamId_idx" ON "CareTeamMember"("careTeamId");

-- CreateIndex
CREATE INDEX "Consent_organizationId_patientId_type_idx" ON "Consent"("organizationId", "patientId", "type");

-- CreateIndex
CREATE INDEX "IntakeAssessment_organizationId_status_idx" ON "IntakeAssessment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "IntakeAssessment_patientId_idx" ON "IntakeAssessment"("patientId");

-- CreateIndex
CREATE INDEX "Condition_organizationId_patientId_idx" ON "Condition"("organizationId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_id_organizationId_key" ON "Condition"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Goal_organizationId_patientId_idx" ON "Goal"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "Goal_carePlanId_idx" ON "Goal"("carePlanId");

-- CreateIndex
CREATE INDEX "Exercise_organizationId_bodyArea_idx" ON "Exercise"("organizationId", "bodyArea");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_id_organizationId_key" ON "Exercise"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_organizationId_slug_key" ON "Exercise"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "CarePlan_organizationId_patientId_idx" ON "CarePlan"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "CarePlan_organizationId_status_idx" ON "CarePlan"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlan_id_organizationId_key" ON "CarePlan"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlan_currentVersionId_id_key" ON "CarePlan"("currentVersionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanVersion_id_organizationId_key" ON "CarePlanVersion"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanVersion_id_carePlanId_key" ON "CarePlanVersion"("id", "carePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanVersion_carePlanId_versionNumber_key" ON "CarePlanVersion"("carePlanId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseAssignment_id_organizationId_key" ON "ExerciseAssignment"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseAssignment_carePlanVersionId_position_key" ON "ExerciseAssignment"("carePlanVersionId", "position");

-- CreateIndex
CREATE INDEX "ExerciseSession_organizationId_patientId_startedAt_idx" ON "ExerciseSession"("organizationId", "patientId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSession_id_organizationId_key" ON "ExerciseSession"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionActivity_sessionId_assignmentId_key" ON "SessionActivity"("sessionId", "assignmentId");

-- CreateIndex
CREATE INDEX "PatientCheckIn_organizationId_patientId_submittedAt_idx" ON "PatientCheckIn"("organizationId", "patientId", "submittedAt");

-- CreateIndex
CREATE INDEX "PatientCheckIn_organizationId_reviewedAt_idx" ON "PatientCheckIn"("organizationId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientCheckIn_id_organizationId_key" ON "PatientCheckIn"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Observation_organizationId_patientId_code_effectiveAt_idx" ON "Observation"("organizationId", "patientId", "code", "effectiveAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_organizationId_practitionerId_startsAt_idx" ON "AvailabilitySlot"("organizationId", "practitionerId", "startsAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_organizationId_status_startsAt_idx" ON "AvailabilitySlot"("organizationId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_id_organizationId_key" ON "AvailabilitySlot"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_practitionerId_startsAt_idx" ON "Appointment"("organizationId", "practitionerId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_patientId_startsAt_idx" ON "Appointment"("organizationId", "patientId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_status_startsAt_idx" ON "Appointment"("organizationId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_organizationId_key" ON "Appointment"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_rescheduledFromId_organizationId_key" ON "Appointment"("rescheduledFromId", "organizationId");

-- CreateIndex
CREATE INDEX "Encounter_organizationId_patientId_startedAt_idx" ON "Encounter"("organizationId", "patientId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_id_organizationId_key" ON "Encounter"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentId_organizationId_key" ON "Encounter"("appointmentId", "organizationId");

-- CreateIndex
CREATE INDEX "ClinicalNote_organizationId_patientId_createdAt_idx" ON "ClinicalNote"("organizationId", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalNote_organizationId_authorPractitionerId_status_idx" ON "ClinicalNote"("organizationId", "authorPractitionerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_id_organizationId_key" ON "ClinicalNote"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_currentVersionId_id_key" ON "ClinicalNote"("currentVersionId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNoteVersion_id_noteId_key" ON "ClinicalNoteVersion"("id", "noteId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNoteVersion_noteId_versionNumber_key" ON "ClinicalNoteVersion"("noteId", "versionNumber");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_patientId_lastMessageAt_idx" ON "Conversation"("organizationId", "patientId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_id_organizationId_key" ON "Conversation"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_organizationId_userId_idx" ON "ConversationParticipant"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_readAt_idx" ON "Notification"("organizationId", "userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRule_id_organizationId_key" ON "ReviewRule"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRule_organizationId_key_key" ON "ReviewRule"("organizationId", "key");

-- CreateIndex
CREATE INDEX "ReviewTask_organizationId_status_priority_idx" ON "ReviewTask"("organizationId", "status", "priority");

-- CreateIndex
CREATE INDEX "ReviewTask_organizationId_patientId_idx" ON "ReviewTask"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "AIGeneration_organizationId_patientId_createdAt_idx" ON "AIGeneration"("organizationId", "patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIGeneration_id_organizationId_key" ON "AIGeneration"("id", "organizationId");

-- CreateIndex
CREATE INDEX "AIReview_generationId_createdAt_idx" ON "AIReview"("generationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_occurredAt_idx" ON "AuditEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_eventName_occurredAt_idx" ON "AuditEvent"("organizationId", "eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE INDEX "Job_queue_status_runAt_idx" ON "Job"("queue", "status", "runAt");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practitioner" ADD CONSTRAINT "Practitioner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practitioner" ADD CONSTRAINT "Practitioner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practitioner" ADD CONSTRAINT "Practitioner_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeam" ADD CONSTRAINT "CareTeam_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeam" ADD CONSTRAINT "CareTeam_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamMember" ADD CONSTRAINT "CareTeamMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamMember" ADD CONSTRAINT "CareTeamMember_careTeamId_organizationId_fkey" FOREIGN KEY ("careTeamId", "organizationId") REFERENCES "CareTeam"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTeamMember" ADD CONSTRAINT "CareTeamMember_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_capturedByUserId_organizationId_fkey" FOREIGN KEY ("capturedByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAssessment" ADD CONSTRAINT "IntakeAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAssessment" ADD CONSTRAINT "IntakeAssessment_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_encounterId_organizationId_fkey" FOREIGN KEY ("encounterId", "organizationId") REFERENCES "Encounter"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_recordedByPractitionerId_organizationId_fkey" FOREIGN KEY ("recordedByPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_carePlanId_organizationId_fkey" FOREIGN KEY ("carePlanId", "organizationId") REFERENCES "CarePlan"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_addressesConditionId_organizationId_fkey" FOREIGN KEY ("addressesConditionId", "organizationId") REFERENCES "Condition"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_createdByPractitionerId_organizationId_fkey" FOREIGN KEY ("createdByPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_currentVersionId_id_fkey" FOREIGN KEY ("currentVersionId", "id") REFERENCES "CarePlanVersion"("id", "carePlanId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanVersion" ADD CONSTRAINT "CarePlanVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanVersion" ADD CONSTRAINT "CarePlanVersion_carePlanId_organizationId_fkey" FOREIGN KEY ("carePlanId", "organizationId") REFERENCES "CarePlan"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanVersion" ADD CONSTRAINT "CarePlanVersion_publishedByPractitionerId_organizationId_fkey" FOREIGN KEY ("publishedByPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_carePlanVersionId_organizationId_fkey" FOREIGN KEY ("carePlanVersionId", "organizationId") REFERENCES "CarePlanVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAssignment" ADD CONSTRAINT "ExerciseAssignment_exerciseId_organizationId_fkey" FOREIGN KEY ("exerciseId", "organizationId") REFERENCES "Exercise"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSession" ADD CONSTRAINT "ExerciseSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSession" ADD CONSTRAINT "ExerciseSession_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseSession" ADD CONSTRAINT "ExerciseSession_carePlanVersionId_organizationId_fkey" FOREIGN KEY ("carePlanVersionId", "organizationId") REFERENCES "CarePlanVersion"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionActivity" ADD CONSTRAINT "SessionActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionActivity" ADD CONSTRAINT "SessionActivity_sessionId_organizationId_fkey" FOREIGN KEY ("sessionId", "organizationId") REFERENCES "ExerciseSession"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionActivity" ADD CONSTRAINT "SessionActivity_assignmentId_organizationId_fkey" FOREIGN KEY ("assignmentId", "organizationId") REFERENCES "ExerciseAssignment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCheckIn" ADD CONSTRAINT "PatientCheckIn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCheckIn" ADD CONSTRAINT "PatientCheckIn_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCheckIn" ADD CONSTRAINT "PatientCheckIn_sessionId_organizationId_fkey" FOREIGN KEY ("sessionId", "organizationId") REFERENCES "ExerciseSession"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientCheckIn" ADD CONSTRAINT "PatientCheckIn_reviewedByUserId_organizationId_fkey" FOREIGN KEY ("reviewedByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_encounterId_organizationId_fkey" FOREIGN KEY ("encounterId", "organizationId") REFERENCES "Encounter"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_checkInId_organizationId_fkey" FOREIGN KEY ("checkInId", "organizationId") REFERENCES "PatientCheckIn"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_sessionId_organizationId_fkey" FOREIGN KEY ("sessionId", "organizationId") REFERENCES "ExerciseSession"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_performerPractitionerId_organizationId_fkey" FOREIGN KEY ("performerPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_practitionerId_organizationId_fkey" FOREIGN KEY ("practitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practitionerId_organizationId_fkey" FOREIGN KEY ("practitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_organizationId_fkey" FOREIGN KEY ("slotId", "organizationId") REFERENCES "AvailabilitySlot"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bookedByUserId_organizationId_fkey" FOREIGN KEY ("bookedByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_cancelledByUserId_organizationId_fkey" FOREIGN KEY ("cancelledByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_rescheduledFromId_organizationId_fkey" FOREIGN KEY ("rescheduledFromId", "organizationId") REFERENCES "Appointment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_practitionerId_organizationId_fkey" FOREIGN KEY ("practitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_organizationId_fkey" FOREIGN KEY ("appointmentId", "organizationId") REFERENCES "Appointment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_encounterId_organizationId_fkey" FOREIGN KEY ("encounterId", "organizationId") REFERENCES "Encounter"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorPractitionerId_organizationId_fkey" FOREIGN KEY ("authorPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_signedByPractitionerId_organizationId_fkey" FOREIGN KEY ("signedByPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_currentVersionId_id_fkey" FOREIGN KEY ("currentVersionId", "id") REFERENCES "ClinicalNoteVersion"("id", "noteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteVersion" ADD CONSTRAINT "ClinicalNoteVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteVersion" ADD CONSTRAINT "ClinicalNoteVersion_noteId_organizationId_fkey" FOREIGN KEY ("noteId", "organizationId") REFERENCES "ClinicalNote"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteVersion" ADD CONSTRAINT "ClinicalNoteVersion_aiGenerationId_organizationId_fkey" FOREIGN KEY ("aiGenerationId", "organizationId") REFERENCES "AIGeneration"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteVersion" ADD CONSTRAINT "ClinicalNoteVersion_createdByUserId_organizationId_fkey" FOREIGN KEY ("createdByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_organizationId_fkey" FOREIGN KEY ("conversationId", "organizationId") REFERENCES "Conversation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_organizationId_fkey" FOREIGN KEY ("conversationId", "organizationId") REFERENCES "Conversation"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_senderUserId_fkey" FOREIGN KEY ("conversationId", "senderUserId") REFERENCES "ConversationParticipant"("conversationId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRule" ADD CONSTRAINT "ReviewRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_ruleId_organizationId_fkey" FOREIGN KEY ("ruleId", "organizationId") REFERENCES "ReviewRule"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_assignedPractitionerId_organizationId_fkey" FOREIGN KEY ("assignedPractitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTask" ADD CONSTRAINT "ReviewTask_resolvedByUserId_organizationId_fkey" FOREIGN KEY ("resolvedByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_requestedByUserId_organizationId_fkey" FOREIGN KEY ("requestedByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReview" ADD CONSTRAINT "AIReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReview" ADD CONSTRAINT "AIReview_generationId_organizationId_fkey" FOREIGN KEY ("generationId", "organizationId") REFERENCES "AIGeneration"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIReview" ADD CONSTRAINT "AIReview_reviewerUserId_organizationId_fkey" FOREIGN KEY ("reviewerUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
