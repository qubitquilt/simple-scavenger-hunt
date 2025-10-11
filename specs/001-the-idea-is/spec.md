# Feature Specification: Scavenger Hunt App

**Feature Branch**: `001-the-idea-is`  
**Created**: 2025-10-10  
**Status**: Finalized  
**Input**: User description: "The idea is that users will scan a QR code to launch the app. The app will start with basic instructions, and a “start” button. When the user presses the start button, the user is taken to a page to enter their First and Last name to register. This should persist with the user and recognize their progress. From there, the user will be displayed a list of scavenger hunt challenges with a progress bar. When a user taps on a challenge, it will bring up the details of the challenge.

For each challenge, there will be either a text based answer, a multiple choice answer, or an image upload answer. The text based answers should use AI to analyze the answer to determine if it’s correct. For image based answers, potentially use Gemini image processing to analyze image.

Once a user has completed all of the challenges, the user is displayed with a “congratulations” screen with instructions to claim their prize. Confetti and whatnot. 

The scanenger hunt is on October 14, 2025.

Data should be persistant in a database.

An admin interface is needed to view progress and winners, metrics, stats, logs, etc.

Admin interface will support creating questions.

Questions should load in randomized order on first load, and persist in that order after registration

AI analysis of text questions will determine if the answer is close

Admin interface can determine how close an AI answer can be: sliding scale of 0-10

Admin interface can create new scavenger hunts

A scavenger hunt consists of event details (title, description, etc.) and questions (text, multiple choice, image) and answers.

Admin interface allows an admin to fully manage scavenger hunt events, all questions and answers

Admin interface shows results of users engaged with completion amounts"

## User Scenarios & Testing

### User Story 1 - Participant Launches App and Registers (Priority: P1)

A participant scans a QR code to access the app, views initial instructions, presses the start button, enters their first and last name for registration, and has their progress persisted for future sessions.

**Why this priority**: This is the entry point for all user engagement, ensuring participants can begin the experience smoothly and their data is retained, which is essential for the core value of a persistent scavenger hunt.

**Independent Test**: The registration flow can be tested by simulating a QR scan, completing name entry, and verifying that progress is saved and retrievable in a subsequent session, delivering the foundational user onboarding value.

**Acceptance Scenarios**:

1. **Given** the app is launched via QR code scan, **When** the initial screen loads, **Then** basic instructions and a start button are displayed.
2. **Given** the start button is pressed, **When** the user enters first and last name, **Then** registration completes, and the user is redirected to the challenges list with progress initialized.
3. **Given** the user returns to the app later, **When** they access via QR or direct entry, **Then** their name and progress are recognized and restored.

---

### User Story 2 - Participant Views and Completes Challenges (Priority: P1)

After registration, the participant sees a list of challenges in randomized order (persisted after first load), with a progress bar, taps a challenge to view details, and submits answers via text, multiple choice, or image upload, with AI analysis for text and image types determining correctness based on closeness. For text answers, users can retry unlimited times until the AI rates similarity to the expected answer at or above a threshold (e.g., 8/10), focusing on engagement; incorrect submissions show "wrong" feedback and keep the challenge incomplete.

**Why this priority**: This delivers the primary interactive value of the scavenger hunt, enabling engagement with content and tracking completion, which is central to the event's purpose.

**Independent Test**: The challenge flow can be tested by loading the list, selecting and submitting various challenge types, verifying AI-based validation with retry logic for text, and updating progress, providing a complete engagement loop.

**Acceptance Scenarios**:

1. **Given** the user is registered, **When** the challenges screen loads, **Then** questions appear in randomized order with a progress bar showing completion status.
2. **Given** a challenge is tapped, **When** the user submits a text answer, **Then** AI analyzes it against the expected answer using a 0-10 closeness scale; if below threshold, show "wrong" and allow retry until >= threshold (e.g., 8/10) for marking correct.
3. **Given** a challenge is tapped, **When** the user selects multiple choice or uploads an image, **Then** the submission is validated, and progress updates accordingly.
4. **Given** all challenges are completed, **When** the final submission is made, **Then** a congratulations screen appears with prize claim instructions and celebratory effects like confetti.

---

### User Story 3 - Admin Creates and Manages Scavenger Hunt Events (Priority: P2)

An admin accesses the interface to create a new scavenger hunt event with details like title and description (set for October 14, 2025), adds questions of various types with answers and closeness scales for text, and manages existing events, questions, and answers.

**Why this priority**: Enables content creation and maintenance, supporting the event's setup and ongoing administration, which is crucial for operations but secondary to user experience.

**Independent Test**: The admin creation flow can be tested by building a full event with questions, saving it, and verifying it loads for users, ensuring administrative control over content.

**Acceptance Scenarios**:

1. **Given** admin is logged in, **When** creating a new event, **Then** fields for title, description, and date (default October 14, 2025) are available, and questions can be added.
2. **Given** adding a text question, **When** setting answer and closeness scale (0-10), **Then** the scale determines AI tolerance for user submissions.
3. **Given** an event exists, **When** editing questions or answers, **Then** changes are saved and reflected in user views without disrupting ongoing progress.

---

### User Story 4 - Admin Views User Progress and Analytics (Priority: P2)

The admin views participant progress, identifies winners (completed hunts), monitors metrics like engagement and completion rates, reviews stats, logs, and overall results.

**Why this priority**: Provides insights for event management and evaluation, helping measure success and support participants, important for post-event analysis.

**Independent Test**: Analytics can be tested by simulating user completions, then querying admin views for progress, winners, and metrics, verifying data accuracy.

**Acceptance Scenarios**:

1. **Given** users have submitted progress, **When** admin views dashboard, **Then** lists of participants, completion statuses, and winners are displayed.
2. **Given** event data exists, **When** viewing metrics, **Then** stats on engagement, completion amounts, and logs are shown.
3. **Given** a user completes the hunt, **When** admin checks results, **Then** the user is marked as a winner with details.

---

### Edge Cases

- What happens when a user attempts to submit an invalid image (e.g., wrong format or size)? The system should provide clear error messages and allow retry.
- How does the system handle partial progress if a user abandons mid-hunt? Progress should persist, and the user resumes from the last point upon return.
- What if multiple users have the same name? The system should use a unique identifier to distinguish progress.
- For AI analysis of text answers, users can retry unlimited times until the AI rates similarity >= threshold (e.g., 8/10); focus on engagement with "wrong" feedback for incorrect attempts, keeping the challenge incomplete until correct.

## Requirements

### Functional Requirements

- **FR-001**: System MUST launch the app via QR code scan, displaying initial instructions and a start button.
- **FR-002**: System MUST require users to enter first and last name for registration upon starting, persisting user identity and progress across sessions in a database.
- **FR-003**: System MUST display a list of challenges with a progress bar after registration, loading questions in randomized order on first view and persisting that order.
- **FR-004**: System MUST support challenge types: text-based (AI-analyzed for closeness to correct answer), multiple choice (exact match), and image upload (AI-analyzed for correctness).
- **FR-005**: System MUST show challenge details upon tap, accept submissions, validate via AI where applicable (text closeness on 0-10 scale set by admin, with unlimited retries until >= threshold e.g. 8/10), and update progress.
- **FR-006**: System MUST display a congratulations screen with prize claim instructions and visual effects (e.g., confetti) upon completing all challenges.
- **FR-007**: System MUST store all data persistently in a database, including user progress, events, questions, and answers.
- **FR-008**: Admin interface MUST allow creation of scavenger hunt events with details (title, description, date: October 14, 2025) and questions (types, answers, text closeness scale 0-10).
- **FR-009**: Admin interface MUST enable full management of events, questions, and answers, including edits and deletions.
- **FR-010**: Admin interface MUST display user progress, winners (completed users), metrics, stats, logs, and engagement results (e.g., completion amounts).
- **FR-011**: System MUST handle prize claiming via on-screen instructions for users to contact organizers (no automation, aligns with in-person at event).
- **FR-012**: Admin access MUST require authentication with a single admin role providing full access for MVP.

### Key Entities

- **User**: Represents a participant, key attributes: firstName, lastName, uniqueIdentifier, progress (completion status per question), eventAssociation.
- **ScavengerHuntEvent**: Represents an event instance, key attributes: title, description, date (e.g., October 14, 2025), questions list; relationships: contains Questions, associated with Users' progress.
- **Question**: Represents a challenge, key attributes: type (text, multipleChoice, image), content, correctAnswer, closenessScale (for text, 0-10); relationships: belongs to ScavengerHuntEvent, has user submissions via Progress.
- **Answer**: Represents a correct response, key attributes: value (text/image options), type-specific details; relationships: tied to Question.
- **Progress**: Tracks user advancement, key attributes: userId, questionId, submission (text/choice/image), isCorrect (AI-determined), timestamp; relationships: links User to Question.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% of users complete registration in under 1 minute from app launch.
- **SC-002**: Users can submit and receive validation for 90% of challenges on first attempt, with AI closeness ensuring fair assessment.
- **SC-003**: Admins can create and configure a full scavenger hunt event (including 10 questions) in under 5 minutes.
- **SC-004**: System handles 1000 concurrent users without loss of progress data or delays in submission validation.
- **SC-005**: 80% of participants reach the congratulations screen, measured by completion rates in admin analytics.

## Assumptions

- The app is accessible via web or mobile browser post-QR scan, with standard error handling for network issues.
- User persistence relies on name-based unique identifier; no email or additional verification unless clarified.
- Data retention is indefinite for event records, with standard privacy compliance assumed.
- AI analysis for images uses predefined criteria for correctness, pending clarification on specifics.
- Admin interface assumes basic login authentication; no multi-role complexity unless specified.
