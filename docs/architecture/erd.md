# CarePath entity relationship diagram

Generated from `packages/db/prisma/schema.prisma` (Prisma 7.10.1) on 2026-11-19 and checked by hand. Synthetic data only; not for clinical use.

Read with `docs/architecture/domain-model.md`, which explains organization boundaries, status transitions and the constraints that live in raw SQL. Diagrams list key columns only (PK, FK, unique, status); `schema.prisma` is the full definition.

Conventions in every diagram:

- Every table except `User`, `Role` and `StatusTransition` has `organizationId` (nullable only on `AuditEvent` and `Job`). The many edges to `Organization` are drawn only in the first diagram.
- Edge labels show the relation field and its foreign-key columns. A label such as `patient (patientId, organizationId)` is a composite key into `Patient(id, organizationId)`, which is what makes a cross-organization reference impossible.
- Edges to `OrganizationMembership` use `(userId, organizationId)`: the acting user must belong to the same organization.
- Cardinality is read from the schema: `o|` means at most one child per parent (a unique key on the foreign-key columns).

## Overview

All 37 tables and their foreign keys, without columns.

```mermaid
erDiagram
  Organization ||--o{ OrganizationMembership : "organization"
  User ||--o{ OrganizationMembership : "user"
  Role ||--o{ OrganizationMembership : "role"
  OrganizationMembership ||--o{ AuthSession : "membership"
  User |o--o| Patient : "user"
  OrganizationMembership |o--o| Patient : "membership"
  User |o--o| Practitioner : "user"
  OrganizationMembership |o--o| Practitioner : "membership"
  Patient ||--o| CareTeam : "patient"
  CareTeam ||--o{ CareTeamMember : "careTeam"
  OrganizationMembership ||--o{ CareTeamMember : "membership"
  Patient ||--o{ Consent : "patient"
  OrganizationMembership |o--o{ Consent : "capturedBy"
  Patient ||--o{ IntakeAssessment : "patient"
  Patient ||--o{ Condition : "patient"
  Encounter |o--o{ Condition : "encounter"
  Practitioner |o--o{ Condition : "recordedBy"
  Patient ||--o{ Goal : "patient"
  CarePlan |o--o{ Goal : "carePlan"
  Condition |o--o{ Goal : "addresses"
  Patient ||--o{ CarePlan : "patient"
  Practitioner ||--o{ CarePlan : "createdBy"
  CarePlanVersion |o--o| CarePlan : "currentVersion"
  CarePlan ||--o{ CarePlanVersion : "carePlan"
  Practitioner ||--o{ CarePlanVersion : "publishedBy"
  CarePlanVersion ||--o{ ExerciseAssignment : "carePlanVersion"
  Exercise ||--o{ ExerciseAssignment : "exercise"
  Patient ||--o{ ExerciseSession : "patient"
  CarePlanVersion ||--o{ ExerciseSession : "carePlanVersion"
  ExerciseSession ||--o{ SessionActivity : "session"
  ExerciseAssignment ||--o{ SessionActivity : "assignment"
  Patient ||--o{ PatientCheckIn : "patient"
  ExerciseSession |o--o{ PatientCheckIn : "session"
  OrganizationMembership |o--o{ PatientCheckIn : "reviewedBy"
  Patient ||--o{ Observation : "patient"
  Encounter |o--o{ Observation : "encounter"
  PatientCheckIn |o--o{ Observation : "checkIn"
  ExerciseSession |o--o{ Observation : "session"
  Practitioner |o--o{ Observation : "performer"
  Practitioner ||--o{ AvailabilitySlot : "practitioner"
  Patient ||--o{ Appointment : "patient"
  Practitioner ||--o{ Appointment : "practitioner"
  AvailabilitySlot |o--o{ Appointment : "slot"
  OrganizationMembership |o--o{ Appointment : "bookedBy"
  OrganizationMembership |o--o{ Appointment : "cancelledBy"
  Appointment |o--o| Appointment : "rescheduledFrom"
  Patient ||--o{ Encounter : "patient"
  Practitioner ||--o{ Encounter : "practitioner"
  Appointment |o--o| Encounter : "appointment"
  Patient ||--o{ ClinicalNote : "patient"
  Encounter |o--o{ ClinicalNote : "encounter"
  Practitioner ||--o{ ClinicalNote : "author"
  Practitioner |o--o{ ClinicalNote : "signedBy"
  ClinicalNoteVersion |o--o| ClinicalNote : "currentVersion"
  ClinicalNote ||--o{ ClinicalNoteVersion : "note"
  AIGeneration |o--o{ ClinicalNoteVersion : "aiGeneration"
  OrganizationMembership ||--o{ ClinicalNoteVersion : "createdBy"
  Patient ||--o{ Conversation : "patient"
  Conversation ||--o{ ConversationParticipant : "conversation"
  OrganizationMembership ||--o{ ConversationParticipant : "membership"
  Conversation ||--o{ Message : "conversation"
  ConversationParticipant ||--o{ Message : "sender"
  OrganizationMembership ||--o{ Notification : "recipient"
  Patient ||--o{ ReviewTask : "patient"
  ReviewRule ||--o{ ReviewTask : "rule"
  Practitioner |o--o{ ReviewTask : "assignedTo"
  OrganizationMembership |o--o{ ReviewTask : "resolvedBy"
  Patient ||--o{ AIGeneration : "patient"
  OrganizationMembership ||--o{ AIGeneration : "requestedBy"
  AIGeneration ||--o{ AIReview : "generation"
  OrganizationMembership ||--o{ AIReview : "reviewer"
  User |o--o{ AuditEvent : "actor"
  Patient |o--o{ AuditEvent : "patient"
  StatusTransition {
    String tableName PK
  }
```

## Identity and tenancy

```mermaid
erDiagram
  Organization {
    String id PK
  }
  User {
    String id PK
    UserStatus status
  }
  Role {
    String id PK
  }
  OrganizationMembership {
    String id PK
    String organizationId FK
    String userId FK
    String roleId FK
    MembershipStatus status
  }
  AuthSession {
    String id PK
    String organizationId FK
    String userId FK
  }
  Patient {
    String id PK
    String organizationId FK
    String userId FK,UK
    PatientStatus status
  }
  Practitioner {
    String id PK
    String organizationId FK
    String userId FK,UK
  }
  CareTeam {
    String id PK
    String organizationId FK
    String patientId FK
    CareTeamStatus status
  }
  CareTeamMember {
    String id PK
    String organizationId FK
    String careTeamId FK
    String userId FK
  }
  Organization ||--o{ OrganizationMembership : "organization (organizationId)"
  User ||--o{ OrganizationMembership : "user (userId)"
  Role ||--o{ OrganizationMembership : "role (roleId)"
  OrganizationMembership ||--o{ AuthSession : "membership (userId, organizationId)"
  Organization ||--o{ Patient : "organization (organizationId)"
  User |o--o| Patient : "user (userId)"
  OrganizationMembership |o--o| Patient : "membership (userId, organizationId)"
  Organization ||--o{ Practitioner : "organization (organizationId)"
  User |o--o| Practitioner : "user (userId)"
  OrganizationMembership |o--o| Practitioner : "membership (userId, organizationId)"
  Patient ||--o| CareTeam : "patient (patientId, organizationId)"
  CareTeam ||--o{ CareTeamMember : "careTeam (careTeamId, organizationId)"
  OrganizationMembership ||--o{ CareTeamMember : "membership (userId, organizationId)"
```

## Intake, consent, conditions and goals

```mermaid
erDiagram
  Patient {
    String id PK
    String organizationId FK
    String userId FK,UK
    PatientStatus status
  }
  Practitioner {
    String id PK
    String organizationId FK
    String userId FK,UK
  }
  Consent {
    String id PK
    String organizationId FK
    String patientId FK
    ConsentStatus status
    String capturedByUserId FK
  }
  IntakeAssessment {
    String id PK
    String organizationId FK
    String patientId FK
    IntakeStatus status
  }
  Condition {
    String id PK
    String organizationId FK
    String patientId FK
    String encounterId FK
    String recordedByPractitionerId FK
  }
  Goal {
    String id PK
    String organizationId FK
    String patientId FK
    String carePlanId FK
    String addressesConditionId FK
    GoalLifecycleStatus lifecycleStatus
  }
  CarePlan {
    String id PK,FK
    String organizationId FK
    String patientId FK
    CarePlanStatus status
    String currentVersionId FK
    String createdByPractitionerId FK
  }
  Encounter {
    String id PK
    String organizationId FK
    String patientId FK
    String practitionerId FK
    String appointmentId FK
    EncounterStatus status
  }
  Patient ||--o{ Consent : "patient (patientId, organizationId)"
  Patient ||--o{ IntakeAssessment : "patient (patientId, organizationId)"
  Patient ||--o{ Condition : "patient (patientId, organizationId)"
  Encounter |o--o{ Condition : "encounter (encounterId, organizationId)"
  Practitioner |o--o{ Condition : "recordedBy (recordedByPractitionerId, organizationId)"
  Patient ||--o{ Goal : "patient (patientId, organizationId)"
  CarePlan |o--o{ Goal : "carePlan (carePlanId, organizationId)"
  Condition |o--o{ Goal : "addresses (addressesConditionId, organizationId)"
  Patient ||--o{ CarePlan : "patient (patientId, organizationId)"
  Practitioner ||--o{ CarePlan : "createdBy (createdByPractitionerId, organizationId)"
  Patient ||--o{ Encounter : "patient (patientId, organizationId)"
  Practitioner ||--o{ Encounter : "practitioner (practitionerId, organizationId)"
```

## Care plans and exercise sessions

```mermaid
erDiagram
  Patient {
    String id PK
    String organizationId FK
    String userId FK,UK
    PatientStatus status
  }
  Practitioner {
    String id PK
    String organizationId FK
    String userId FK,UK
  }
  Exercise {
    String id PK
    String organizationId FK
  }
  CarePlan {
    String id PK,FK
    String organizationId FK
    String patientId FK
    CarePlanStatus status
    String currentVersionId FK
    String createdByPractitionerId FK
  }
  CarePlanVersion {
    String id PK
    String organizationId FK
    String carePlanId FK
    String publishedByPractitionerId FK
  }
  ExerciseAssignment {
    String id PK
    String organizationId FK
    String carePlanVersionId FK
    String exerciseId FK
  }
  ExerciseSession {
    String id PK
    String organizationId FK
    String patientId FK
    String carePlanVersionId FK
    ExerciseSessionStatus status
  }
  SessionActivity {
    String id PK
    String organizationId FK
    String sessionId FK
    String assignmentId FK
    SessionActivityStatus status
  }
  PatientCheckIn {
    String id PK
    String organizationId FK
    String patientId FK
    String sessionId FK
    String reviewedByUserId FK
  }
  Observation {
    String id PK
    String organizationId FK
    String patientId FK
    String encounterId FK
    String checkInId FK
    String sessionId FK
    ObservationStatus status
    String performerPractitionerId FK
  }
  Patient ||--o{ CarePlan : "patient (patientId, organizationId)"
  Practitioner ||--o{ CarePlan : "createdBy (createdByPractitionerId, organizationId)"
  CarePlanVersion |o--o| CarePlan : "currentVersion (currentVersionId, id)"
  CarePlan ||--o{ CarePlanVersion : "carePlan (carePlanId, organizationId)"
  Practitioner ||--o{ CarePlanVersion : "publishedBy (publishedByPractitionerId, organizationId)"
  CarePlanVersion ||--o{ ExerciseAssignment : "carePlanVersion (carePlanVersionId, organizationId)"
  Exercise ||--o{ ExerciseAssignment : "exercise (exerciseId, organizationId)"
  Patient ||--o{ ExerciseSession : "patient (patientId, organizationId)"
  CarePlanVersion ||--o{ ExerciseSession : "carePlanVersion (carePlanVersionId, organizationId)"
  ExerciseSession ||--o{ SessionActivity : "session (sessionId, organizationId)"
  ExerciseAssignment ||--o{ SessionActivity : "assignment (assignmentId, organizationId)"
  Patient ||--o{ PatientCheckIn : "patient (patientId, organizationId)"
  ExerciseSession |o--o{ PatientCheckIn : "session (sessionId, organizationId)"
  Patient ||--o{ Observation : "patient (patientId, organizationId)"
  PatientCheckIn |o--o{ Observation : "checkIn (checkInId, organizationId)"
  ExerciseSession |o--o{ Observation : "session (sessionId, organizationId)"
  Practitioner |o--o{ Observation : "performer (performerPractitionerId, organizationId)"
```

## Scheduling, encounters and notes

```mermaid
erDiagram
  Patient {
    String id PK
    String organizationId FK
    String userId FK,UK
    PatientStatus status
  }
  Practitioner {
    String id PK
    String organizationId FK
    String userId FK,UK
  }
  AvailabilitySlot {
    String id PK
    String organizationId FK
    String practitionerId FK
    SlotStatus status
  }
  Appointment {
    String id PK
    String organizationId FK
    String patientId FK
    String practitionerId FK
    String slotId FK
    AppointmentStatus status
    String bookedByUserId FK
    String cancelledByUserId FK
    String rescheduledFromId FK
  }
  Encounter {
    String id PK
    String organizationId FK
    String patientId FK
    String practitionerId FK
    String appointmentId FK
    EncounterStatus status
  }
  ClinicalNote {
    String id PK,FK
    String organizationId FK
    String patientId FK
    String encounterId FK
    String authorPractitionerId FK
    ClinicalNoteStatus status
    String currentVersionId FK
    String signedByPractitionerId FK
  }
  ClinicalNoteVersion {
    String id PK
    String organizationId FK
    String noteId FK
    String aiGenerationId FK
    String createdByUserId FK
  }
  AIGeneration {
    String id PK
    String organizationId FK
    String patientId FK
    AIGenerationStatus status
    String requestedByUserId FK
  }
  OrganizationMembership {
    String id PK
    String organizationId FK
    String userId FK
    String roleId FK
    MembershipStatus status
  }
  OrganizationMembership |o--o| Patient : "membership (userId, organizationId)"
  OrganizationMembership |o--o| Practitioner : "membership (userId, organizationId)"
  Practitioner ||--o{ AvailabilitySlot : "practitioner (practitionerId, organizationId)"
  Patient ||--o{ Appointment : "patient (patientId, organizationId)"
  Practitioner ||--o{ Appointment : "practitioner (practitionerId, organizationId)"
  AvailabilitySlot |o--o{ Appointment : "slot (slotId, organizationId)"
  OrganizationMembership |o--o{ Appointment : "bookedBy (bookedByUserId, organizationId)"
  OrganizationMembership |o--o{ Appointment : "cancelledBy (cancelledByUserId, organizationId)"
  Appointment |o--o| Appointment : "rescheduledFrom (rescheduledFromId, organizationId)"
  Patient ||--o{ Encounter : "patient (patientId, organizationId)"
  Practitioner ||--o{ Encounter : "practitioner (practitionerId, organizationId)"
  Appointment |o--o| Encounter : "appointment (appointmentId, organizationId)"
  Patient ||--o{ ClinicalNote : "patient (patientId, organizationId)"
  Encounter |o--o{ ClinicalNote : "encounter (encounterId, organizationId)"
  Practitioner ||--o{ ClinicalNote : "author (authorPractitionerId, organizationId)"
  Practitioner |o--o{ ClinicalNote : "signedBy (signedByPractitionerId, organizationId)"
  ClinicalNoteVersion |o--o| ClinicalNote : "currentVersion (currentVersionId, id)"
  ClinicalNote ||--o{ ClinicalNoteVersion : "note (noteId, organizationId)"
  AIGeneration |o--o{ ClinicalNoteVersion : "aiGeneration (aiGenerationId, organizationId)"
  OrganizationMembership ||--o{ ClinicalNoteVersion : "createdBy (createdByUserId, organizationId)"
  Patient ||--o{ AIGeneration : "patient (patientId, organizationId)"
  OrganizationMembership ||--o{ AIGeneration : "requestedBy (requestedByUserId, organizationId)"
```

## Messaging, review queue, AI and platform

```mermaid
erDiagram
  Patient {
    String id PK
    String organizationId FK
    String userId FK,UK
    PatientStatus status
  }
  Practitioner {
    String id PK
    String organizationId FK
    String userId FK,UK
  }
  OrganizationMembership {
    String id PK
    String organizationId FK
    String userId FK
    String roleId FK
    MembershipStatus status
  }
  Conversation {
    String id PK
    String organizationId FK
    String patientId FK
  }
  ConversationParticipant {
    String id PK
    String organizationId FK
    String conversationId FK
    String userId FK
  }
  Message {
    String id PK
    String organizationId FK
    String conversationId FK
    String senderUserId FK
    MessageStatus status
  }
  Notification {
    String id PK
    String organizationId FK
    String userId FK
  }
  ReviewRule {
    String id PK
    String organizationId FK
  }
  ReviewTask {
    String id PK
    String organizationId FK
    String patientId FK
    String ruleId FK
    ReviewTaskStatus status
    String assignedPractitionerId FK
    String resolvedByUserId FK
  }
  AIGeneration {
    String id PK
    String organizationId FK
    String patientId FK
    AIGenerationStatus status
    String requestedByUserId FK
  }
  AIReview {
    String id PK
    String organizationId FK
    String generationId FK
    String reviewerUserId FK
  }
  AuditEvent {
    String id PK
    String organizationId FK
    String actorUserId FK
    String patientId FK
  }
  Job {
    String id PK
    String organizationId FK
    JobStatus status
  }
  User {
    String id PK
    UserStatus status
  }
  StatusTransition {
  }
  User |o--o| Patient : "user (userId)"
  OrganizationMembership |o--o| Patient : "membership (userId, organizationId)"
  User |o--o| Practitioner : "user (userId)"
  OrganizationMembership |o--o| Practitioner : "membership (userId, organizationId)"
  User ||--o{ OrganizationMembership : "user (userId)"
  Patient ||--o{ Conversation : "patient (patientId, organizationId)"
  Conversation ||--o{ ConversationParticipant : "conversation (conversationId, organizationId)"
  OrganizationMembership ||--o{ ConversationParticipant : "membership (userId, organizationId)"
  Conversation ||--o{ Message : "conversation (conversationId, organizationId)"
  ConversationParticipant ||--o{ Message : "sender (conversationId, senderUserId)"
  OrganizationMembership ||--o{ Notification : "recipient (userId, organizationId)"
  Patient ||--o{ ReviewTask : "patient (patientId, organizationId)"
  ReviewRule ||--o{ ReviewTask : "rule (ruleId, organizationId)"
  Practitioner |o--o{ ReviewTask : "assignedTo (assignedPractitionerId, organizationId)"
  OrganizationMembership |o--o{ ReviewTask : "resolvedBy (resolvedByUserId, organizationId)"
  Patient ||--o{ AIGeneration : "patient (patientId, organizationId)"
  OrganizationMembership ||--o{ AIGeneration : "requestedBy (requestedByUserId, organizationId)"
  AIGeneration ||--o{ AIReview : "generation (generationId, organizationId)"
  OrganizationMembership ||--o{ AIReview : "reviewer (reviewerUserId, organizationId)"
  User |o--o{ AuditEvent : "actor (actorUserId)"
  Patient |o--o{ AuditEvent : "patient (patientId, organizationId)"
```
