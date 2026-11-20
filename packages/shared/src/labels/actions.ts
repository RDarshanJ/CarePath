/**
 * Action label table (CD-428, `component-research/08-actions.md` section 8.9). A label names the
 * act and, where the screen has more than one object, the object. Paired buttons use contrasting
 * verbs. Functions take the object so the label and its accessible name stay in step.
 *
 * Screens adopt these as their slice is rebuilt; the lint-style test below keeps the generic
 * words out of this table and gives slices the list to check `Button` children against.
 */
export const actionLabels = {
  // Patient: visits
  cancelVisitOpen: "Cancel visit",
  cancelVisitConfirm: "Cancel this visit",
  cancelVisitKeep: "Keep this visit",
  rescheduleVisit: "Reschedule visit",
  bookVisit: "Book this visit",
  loadTimesAgain: "Load times again",
  // Patient: Today and session
  addCheckIn: "Add your check-in",
  startSession: "Start today's session",
  resumeSession: "Resume session",
  continueSession: "Continue session",
  notNowBackToToday: "Not now, back to Today",
  // Patient: messages and plan
  retrySendingMessage: "Retry sending message",
  markPlanChangeRead: "Mark as read",
  sendDetailsToClinic: "Send my details to the clinic",
  // Clinician and admin
  backToDraft: "Back to the draft",
  keepTaskOpen: "Keep task open",
  resolveTaskWithNote: "Resolve task with note",
  dismissTaskWithNote: "Dismiss task with note",
  closeWithoutAssigning: "Close without assigning",
  assignTherapistOpen: "Assign therapist",
  markCheckInReviewed: "Mark check-in reviewed",
  unassignTask: "Unassign task",
  editCarePlan: "Edit care plan",
  createCarePlan: "Create care plan",
  continueDraft: "Continue draft",
  removeExercise: "Remove exercise",
  removeGoal: "Remove goal",
  saveDraftAgain: "Save draft again",
  viewIntakeAnswers: "View intake answers",
  // AI review and notes (not built yet)
  approveDraft: "Approve draft",
  approveDraftWithEdits: "Approve draft with edits",
  rejectDraft: "Reject draft",
  draftProgressReview: "Draft progress review",
  makeNewDraft: "Make a new draft",
  signNote: "Sign note",
  amendNote: "Amend note",
  saveAmendment: "Save amendment",
  signAmendment: "Sign amendment",
  markNoteEnteredInError: "Mark as entered in error",
} as const;

/** Object-bearing labels. */
export const actionLabelFor = {
  continueTo: (nextStepTitle: string) => `Continue to ${nextStepTitle.toLowerCase()}`,
  assignTherapistConfirm: (therapistName: string) => `Assign ${therapistName}`,
  addExercise: (exerciseName: string) => `Add ${exerciseName}`,
  viewVersion: (n: number) => `View version ${n}`,
  retryLoading: (noun: string) => `Retry loading ${noun}`,
  showMore: (things: string) => `Show more ${things}`,
  publishVersion: (n: number) => `Publish version ${n}`,
  editStatement: (n: number) => `Edit statement ${n}`,
  closePanel: (panelTitle: string) => `Close ${panelTitle}`,
  dismissNotification: (title: string) => `Dismiss notification: ${title}`,
  openEvidence: (n: number, source: string) => `Open evidence ${n}: ${source}`,
} as const;

/** Labels that must not stand alone on a button (CD-428), outside a reviewed allow-list. */
export const GENERIC_ACTION_LABELS = [
  "Submit",
  "OK",
  "Confirm",
  "Yes",
  "Cancel",
  "Continue",
  "Got it",
  "Try again",
] as const;
