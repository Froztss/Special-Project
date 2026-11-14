# Software Requirements Specification

**Web-Based Visual Schedule, Task Management and Communication System for Children with Developmental Delays**

Version 1.0 (Draft) · November 13, 2026 · Course: Modeling and Simulation (Final Project)

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for a web-based system that helps caregivers, Occupational Therapists (OTs) and SPED teachers manage the daily routines of children with developmental delays, and gives those children a simple, accessible interface to follow their routines and communicate using picture cards. It is the reference for design, implementation, testing and acceptance of the project.

### 1.2 Scope

The System is a responsive web application with two interfaces:

- **Caregiver/Staff interface:** manage child profiles, build visual schedules, manage tasks, and monitor basic progress.
- **Child interface:** a distraction-free view where the child sees the schedule, marks activities as done, and uses a picture-based communication board with text-to-speech.

The project is time-boxed to six days, so the scope favors a working, usable core over breadth. Section 3 lists what is explicitly excluded.

### 1.3 Definitions and Abbreviations

| Term | Meaning |
| --- | --- |
| Caregiver | Parent, guardian or other adult who looks after the child |
| OT | Occupational Therapist |
| SPED Teacher | Special education teacher |
| Staff | Collective term for Caregiver, OT and SPED Teacher accounts |
| Visual schedule | An ordered list of daily activities shown with icons/pictures |
| Picture card | A card with an image and a word/phrase that is spoken aloud when tapped |
| TTS | Text-to-speech |
| SRS | Software Requirements Specification |
| SUS | System Usability Scale |
| JWT | JSON Web Token |
| MVP | Minimum viable product |

| Requirement Number | Description |
| --- | --- |
| FR-AUTH-00 | Functional Requirements - Authentication |
| FR-CHILD-00 | Functional Requirements - Child Profile Management |
| FR-SCH-00 | Functional Requirements - Visual Schedule Creator |
| FR-TASK-00 | Functional Requirements - Task Management |
| FR-CHD-00 | Functional Requirements - Child Interface |
| FR-COMM-00 | Functional Requirements - Picture-Based Communication |
| FR-PROG-00 | Functional Requirements - Progress Tracking |
| FR-SET-00 | Functional Requirements - Settings and Accessibility |
| UC-00 | Functional Requirements - Use Cases |
| UI-00 | User Interface |
| NFR-USE-00 | Non-functional Requirements - Usability |
| NFR-SEC-00 | Non-functional Requirements - Security and Privacy |
| NFR-COMP-00 | Non-functional Requirements - Compatibility and Portability |
| NFR-ACC-00 | Non-functional Requirements - Accessibility |
| NFR-REL-00 | Non-functional Requirements - Reliability and Availability |
| NFR-MAIN-00 | Non-functional Requirements - Maintainability |
| NFR-DEP-00 | Non-functional Requirements - Deployment |
| NFR-PERF-00 | Non-functional Requirements - Performance |

### 1.4 References

- Course project brief: Web-Based Visual Schedule, Task Management and Communication System (Modeling and Simulation, Final Project).
- Team scope notes and preferred technology stack.
- IEEE Std 830 / ISO/IEC/IEEE 29148 (structure guidance for this SRS).
- WCAG 2.1 (accessibility guidance).

### 1.5 Document Overview

Section 2 describes the product in general. Section 3 sets scope limits. Section 4 lists functional requirements, Section 5 the use cases, Section 6 interfaces, Section 7 data, Section 8 non-functional requirements, Section 9 acceptance and usability testing, Section 10 the six-day plan, Section 11 risks, and Section 12 open items for team confirmation.

Requirement priority uses MoSCoW: **Must** (needed for the MVP), **Should** (include if time allows), **Could** (stretch goal).

## 2. Overall Description

### 2.1 Product Perspective

The System is a new, standalone web application. It has a browser-based frontend, a REST API backend and a relational database. It does not integrate with external systems; text-to-speech uses the browser's built-in speech synthesis. Staff members can access the system to monitor, manage, and oversee each child's progress. Meanwhile, children are provided with a child-friendly interface designed to encourage learning, support their development, and help them become more independent in completing their daily activities.

### 2.2 Product Functions (Summary)

- Register and log in as Staff.
- Create and manage child profiles.
- Build a daily visual schedule from a predefined activity library.
- Manage tasks and mark them complete.
- Supervised children interaction.
- Monitor the progress of the child's learning.
- Present a child-friendly view of today's schedule.
- Provide a picture-card communication board with text-to-speech.
- Show basic progress (completion counts and rates).
- Provide basic accessibility settings.

### 2.3 User Classes

| User | Description | Main needs | Technical skill |
| --- | --- | --- | --- |
| Caregiver | Parent or guardian of the child | Set up routines quickly, see what was completed | Low to moderate |
| OT | Occupational Therapist | Structure routines, track task completion over time | Moderate |
| SPED Teacher | Classroom/special education teacher | Same as OT, applied to school routines | Moderate |
| Child | Child with a developmental delay | See what comes next, tick tasks, communicate wants and feelings | Very low; may be non-verbal; limited reading |

All Staff roles have the same permissions in the MVP. The account records the role and shows it in the interface so it can later drive role-specific features.

### 2.4 Operating Environment

- Modern browsers: current Chrome, Edge, Firefox, and Safari.
- Devices: phone, tablet, and desktop (tablet is the expected device for the child view).
- Server: Node.js runtime with a MySQL database, running locally for the demo, with optional cloud deployment.

### 2.5 Design and Implementation Constraints

- Time: six days of development; features must be scoped accordingly.
- Preferred stack (subject to team confirmation): HTML + CSS + JavaScript (frontend); Node.js + Express (backend); MySQL (database); REST API.
- Web application only; no native mobile app.
- Predefined icons and picture cards (emoji or bundled icon set) are used initially, avoiding image upload and storage work.
- The child interface must run without advertisements, pop-ups or external distractions.
- Usability testing with real users is a required deliverable, so the system must be stable enough to be tested.

### 2.6 Assumptions and Dependencies

- The browser supports the Web Speech API (`speechSynthesis`) for TTS; if not, picture cards still display and a visible text label remains.
- Children use the Child view on a device already signed in by a Staff member (see FR-CHD-01).
- Team members can access test users (caregivers, OTs or teachers) for usability testing.
- Allows interaction between users and children.
- Sample data (three demo children) is acceptable for demonstration.
- Only the child's first name or nickname and age are collected; no sensitive medical records are stored.

## 3. Scope Limitations

The following are out of scope for this release:

- Native or installable mobile apps (a responsive web app only).
- Any AI diagnosis, assessment, or therapy recommendation.
- Real-time chat, video calls or push notifications.
- Advanced analytics, exportable reports or long-term trend modeling.
- Custom image upload and storage (predefined icons and cards only).
- Reward systems, gamification, and multi-child device kiosk management.
- Role-based permission differences between Caregiver, OT, and SPED Teacher.
- Multi-user sharing of one child profile between several staff accounts.
- Offline mode and multi-language support (English only in the MVP).
- Payment, billing, and administrator back-office tools.

## 4. Functional Requirements

### 4.1 Authentication and Account (AUTH)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AUTH-01 | The system shall allow a Staff member to register with name, email, password and role (Caregiver, OT or SPED Teacher). | Must |
| FR-AUTH-02 | The system shall validate registration input (valid email format, minimum password length of 8 characters, required fields) and reject duplicate emails. | Must |
| FR-AUTH-03 | The system shall store passwords only as salted hashes (e.g., bcrypt). | Must |
| FR-AUTH-04 | The system shall allow registered Staff to log in with email and password and receive a JWT. | Must |
| FR-AUTH-05 | The system shall protect all non-public API routes and pages so that only authenticated users can access them. | Must |
| FR-AUTH-06 | The system shall allow the user to log out, clearing the stored token. | Must |
| FR-AUTH-07 | The system shall handle an expired or invalid token by returning the user to the login page with a clear message. | Should |
| FR-AUTH-08 | The system shall offer a "Remember me" option on login. | Could |

### 4.2 Child Profile Management (CHILD)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CHILD-01 | The system shall allow Staff to create a child profile with name (or nickname), age, delay domain (e.g., speech, motor, cognitive, social, general) and optional notes. | Must |
| FR-CHILD-02 | The system shall allow Staff to view a list of their child profiles on the dashboard. | Must |
| FR-CHILD-03 | The system shall allow Staff to edit a child profile. | Must |
| FR-CHILD-04 | The system shall allow Staff to delete a child profile after confirmation; related schedules and tasks shall be deleted with it. | Must |
| FR-CHILD-05 | The system shall let a child profile use a predefined avatar (icon/emoji) instead of a photo. | Should |
| FR-CHILD-06 | The system shall restrict each Staff member to the child profiles they created (data isolation). | Must |

### 4.3 Visual Schedule Creator (SCH)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SCH-01 | The system shall provide a predefined activity library (e.g., wake up, brush teeth, wash hands, eat breakfast, get dressed, toilet, go to school, learning activity, play, bath, get ready for bed), each with an icon and category (hygiene, food, school, play, other). | Must |
| FR-SCH-02 | The system shall let Staff create a schedule for a selected child for a selected date by adding activities from the library. | Must |
| FR-SCH-03 | The system shall let Staff add activities by drag-and-drop and by an "Add" button, so the feature still works on touch devices. | Must |
| FR-SCH-04 | The system shall let Staff reorder activities within a schedule. | Must |
| FR-SCH-05 | The system shall let Staff set, per activity, an optional start time and a duration in minutes. | Must |
| FR-SCH-06 | The system shall let Staff remove an activity from a schedule. | Must |
| FR-SCH-07 | The system shall show activities color-coded by category. | Should |
| FR-SCH-08 | The system shall let Staff create a custom text activity (name plus a chosen icon from a predefined set). | Should |
| FR-SCH-09 | The system shall let Staff copy a schedule from another date (e.g., previous day) to a new date. | Should |
| FR-SCH-10 | The system shall provide a preview of the schedule as the child will see it. | Should |

### 4.4 Task Management (TASK)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-TASK-01 | The system shall treat each activity in a schedule as a task with a status of pending or done. | Must |
| FR-TASK-02 | The system shall let a task be marked as done from the Child view and from the Staff view. | Must |
| FR-TASK-03 | The system shall record the completion time of each completed task. | Must |
| FR-TASK-04 | The system shall let Staff undo a completion (set the task back to pending). | Should |
| FR-TASK-05 | The system shall show Staff the list of tasks for a child and date with their status. | Must |
| FR-TASK-06 | The system shall provide an optional visual countdown timer (color-coded circle or pie) for tasks with a duration, with a gentle visual cue near the end. | Could |
| FR-TASK-07 | The system shall provide an optional sound cue when a timer ends, which can be turned off. | Could |

### 4.5 Child Interface (CHD)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CHD-01 | The system shall let a signed-in Staff member open the Child view for a selected child; the child does not log in separately. | Must |
| FR-CHD-02 | The Child view shall show the current day's tasks in order, using large icons, short labels and high-contrast colors. | Must |
| FR-CHD-03 | The Child view shall highlight the current (next pending) task and show what comes next. | Must |
| FR-CHD-04 | The Child view shall let the child mark the current task as done with one large "Done" button. | Must |
| FR-CHD-05 | The Child view shall show a clear positive confirmation when a task is completed (e.g., a checkmark and simple animation). | Should |
| FR-CHD-06 | The Child view shall show a simple completion indicator (e.g., "4 of 6 done") and a friendly message when all tasks are finished. | Should |
| FR-CHD-07 | The Child view shall contain no ads, external links or pop-ups, and shall provide navigation only between the schedule and the communication board. | Must |
| FR-CHD-08 | Leaving the Child view shall require a deliberate Staff action (e.g., a small "Exit" control in a corner, optionally protected by a 4-digit PIN). | Should |

### 4.6 Picture-Based Communication Board (COMM)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-COMM-01 | The system shall provide a communication board of picture cards, each with an image/icon and a label. | Must |
| FR-COMM-02 | The system shall provide predefined cards grouped into categories, at minimum Food, Emotions, Activities and Needs (e.g., water, milk, rice, bread, happy, sad, tired, play, toilet, TV). | Must |
| FR-COMM-03 | When a card is tapped, the system shall speak its label aloud using text-to-speech. | Must |
| FR-COMM-04 | The system shall let the child build a short phrase in a sentence bar (e.g., "I want" + card) and speak the whole phrase with one button. | Should |
| FR-COMM-05 | The system shall let the child clear the sentence bar. | Should |
| FR-COMM-06 | The system shall let Staff add a card by entering a word to speak, choosing a category and choosing an icon from a predefined set. | Should |
| FR-COMM-07 | The system shall let Staff hide or delete cards they added. | Should |
| FR-COMM-08 | The system shall let Staff set the TTS voice speed. | Could |
| FR-COMM-09 | The system shall let Staff upload their own photo for a card. | Could (out of MVP scope) |

### 4.7 Progress Tracking (PROG)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-PROG-01 | The dashboard shall show, for each child, today's completed tasks versus total tasks and the completion percentage. | Must |
| FR-PROG-02 | The system shall show, for a selected child, daily completion for the last 7 days (e.g., a simple bar chart or table). | Must |
| FR-PROG-03 | The system shall show a list of recent task completions with date and time. | Should |
| FR-PROG-04 | The system shall show which tasks are most and least often completed over a selected period. | Could |

### 4.8 Settings and Accessibility (SET)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SET-01 | The system shall let Staff view and edit their own profile (name; the account email and role are read-only or editable per team decision). | Should |
| FR-SET-02 | The system shall let Staff choose font size (small, medium, large). | Should |
| FR-SET-03 | The system shall let Staff choose a normal or high-contrast color theme. | Should |
| FR-SET-04 | The system shall let Staff turn sounds (timer cues and TTS on schedule events) on or off. | Should |
| FR-SET-05 | Settings shall persist between sessions (browser storage or the database). | Should |

## 5. Use Cases

### 5.1 Use Case List

| ID | Use case | Actor |
| --- | --- | --- |
| UC-01 | Register an account | Staff |
| UC-02 | Log in / log out | Staff |
| UC-03 | Manage child profiles | Staff |
| UC-04 | Create a visual schedule | Staff |
| UC-05 | Review and edit tasks | Staff |
| UC-06 | Follow the schedule and complete a task | Child |
| UC-07 | Communicate using picture cards | Child |
| UC-08 | Manage communication cards | Staff |
| UC-09 | View progress | Staff |
| UC-10 | Adjust accessibility settings | Staff |

### 5.2 Selected Use Case Descriptions

**UC-02 Log in**

- Actor: Staff.
- Precondition: The user has a registered account.
- Main flow: (1) User opens the login page. (2) User enters email and password. (3) The system validates the credentials and issues a token. (4) The system opens the dashboard.
- Alternative flow: Invalid credentials → the system shows an error and stays on the login page.
- Postcondition: The user has an authenticated session.

**UC-04 Create a visual schedule**

- Actor: Staff.
- Precondition: Logged in; at least one child profile exists.
- Main flow: (1) Staff selects a child and a date. (2) The system shows the activity library and an empty or existing schedule. (3) Staff adds activities by drag-and-drop or the Add button. (4) Staff reorders activities and sets time and duration. (5) Staff saves; the system stores the schedule and its tasks.
- Alternative flow: A schedule already exists for that date → the system loads it for editing. Staff may copy from another date.
- Postcondition: The schedule is saved and available in the Child view.

**UC-06 Follow the schedule and complete a task**

- Actor: Child (with a Staff member having opened the Child view).
- Precondition: The Child view is open for a child with a schedule for today.
- Main flow: (1) System shows the current task with a large icon and label. (2) The child does the activity. (3) The child taps "Done". (4) The system records completion, shows positive feedback and moves to the next task.
- Alternative flow: No schedule for today → the system shows a friendly "No activities today" message.
- Postcondition: Task status and completion time are saved and visible in progress views.

**UC-07 Communicate using picture cards**

- Actor: Child.
- Precondition: Child view is open.
- Main flow: (1) The child opens the communication board. (2) The child taps a category. (3) The child taps a card. (4) The system speaks the label and adds it to the sentence bar. (5) The child taps the speaker button to say the whole phrase.
- Alternative flow: TTS unavailable → the system shows the text label on screen.
- Postcondition: None stored.

**UC-09 View progress**

- Actor: Staff.
- Main flow: (1) Staff opens the dashboard or Progress page. (2) Staff selects a child. (3) The system shows today's completion, the 7-day summary and recent completions.

## 6. External Interface Requirements

### 6.1 User Interface

- **UI-01:** Responsive, mobile-first layout that works on phone, tablet and desktop.
- **UI-02:** Interactive controls (buttons, cards) shall be at least 44 × 44 px; body text at least 16 px.
- **UI-03:** The Child view shall use large icons, minimal text, high contrast, and a single clear action per screen.
- **UI-04:** Staff pages shall provide navigation to Dashboard, Child Profiles, Schedules, Progress and Settings (hamburger menu on small screens).
- **UI-05:** Colors shall not be the only way to convey status; icons or text accompany them.
- **UI-06:** Error and success messages shall be short and in plain language.

### 6.2 Software and API Interface

The frontend communicates with the backend through a JSON REST API under `/api`. The endpoints below are the proposed set; final names may be adjusted by the team. All routes except register and login require a valid token.

| Area | Method and path | Purpose |
| --- | --- | --- |
| Auth | `POST /api/auth/register` | Create account |
| Auth | `POST /api/auth/login` | Log in, return JWT |
| Auth | `GET, PATCH /api/auth/me` | Read current user; update own name |
| Children | `GET /api/children` | List own children |
| Children | `POST /api/children` | Create child |
| Children | `GET, PUT, DELETE /api/children/:id` | Read, update, delete child |
| Activities | `GET /api/activities` | Predefined activity library |
| Schedules | `GET /api/schedules?childId=&date=` | Get schedule with its tasks |
| Schedules | `POST /api/schedules` | Create schedule |
| Schedules | `PUT, DELETE /api/schedules/:id` | Update, delete schedule |
| Tasks | `POST /api/tasks` | Add task to schedule |
| Tasks | `PUT, DELETE /api/tasks/:id` | Update (time, duration, order), remove task |
| Tasks | `PATCH /api/tasks/:id/complete` | Mark done (and undo) |
| Cards | `GET /api/cards?childId=` | Default and custom picture cards |
| Cards | `POST /api/cards` | Add custom card |
| Cards | `PATCH /api/cards/:id` | Hide or unhide own custom card |
| Cards | `DELETE /api/cards/:id` | Delete own custom card |
| Progress | `GET /api/progress/:childId?range=7d` | Completion summary |
| Settings | `GET, PUT /api/settings` | Read or update the authenticated user's settings |

The API shall use standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500) and return errors as `{ "error": "message" }`.

### 6.3 Hardware and Communication Interfaces

- No special hardware; a device with a browser, a screen and speakers.
- Communication over HTTP(S) between browser and server. HTTPS is required for any live deployment.

## 7. Data Requirements

### 7.1 Entities and Key Fields

| Table | Key fields |
| --- | --- |
| users | id, name, email (unique), password_hash, role (caregiver / ot / sped_teacher), created_at |
| children | id, user_id (owner), name, age, delay_domain, notes, avatar, created_at |
| activities | id, name, icon, category (predefined library) |
| schedules | id, child_id, schedule_date, created_at (unique per child and date) |
| tasks | id, schedule_id, activity_id (nullable), name, icon, start_time (nullable), duration_min (nullable), position, status (pending / done), completed_at (nullable) |
| picture_cards | id, child_id (null for default cards), category, label, icon, is_hidden (custom cards only, default false), created_at |
| settings | user_id, font_size, contrast, sound_on |

### 7.2 Relationships

- One user owns many children.
- One child has many schedules (one per date).
- One schedule has many tasks, ordered by position.
- Default picture cards are shared; custom cards belong to one child.
- Deleting a child cascades to its schedules, tasks and custom cards.

### 7.3 Data Rules

- Passwords are never stored or returned in plain text.
- Every query on children, schedules, tasks and cards is filtered by the authenticated user's ownership.
- Dates are stored in a consistent format (ISO 8601, `YYYY-MM-DD`), and times in `HH:MM`.
- The child's data is limited to what the features need (name or nickname, age, delay domain, notes). Staff are advised not to enter sensitive medical details in the notes field.

## 8. Non-Functional Requirements

### 8.1 Usability

- **NFR-USE-01:** A new Staff user shall be able to create a child profile and a one-day schedule within 10 minutes without training, assisted only by a short user guide.
- **NFR-USE-02:** A child shall be able to complete the "mark task done" action with no more than one tap on the main screen.
- **NFR-USE-03:** The average SUS score from usability testing shall be 68 or higher (target 80).

### 8.2 Accessibility

- **NFR-ACC-01:** Text and background contrast shall follow WCAG 2.1 AA (at least 4.5:1) for the default theme, and a high-contrast option shall be available.
- **NFR-ACC-02:** All interactive elements shall be reachable and operable by touch, mouse and keyboard, with visible focus.
- **NFR-ACC-03:** Images and icons shall have text alternatives or labels.

### 8.3 Performance

- **NFR-PERF-01:** Pages shall load within 3 seconds on a typical broadband or 4G connection for the demo dataset.
- **NFR-PERF-02:** API responses for normal operations shall return within 1 second under a load of up to 20 concurrent users.
- **NFR-PERF-03:** Marking a task as done shall be reflected on screen within 1 second.

### 8.4 Security and Privacy

- **NFR-SEC-01:** Passwords shall be hashed (bcrypt or equivalent); JWTs shall be signed with a secret kept in environment variables and shall expire (e.g., 8 hours).
- **NFR-SEC-02:** All database access shall use parameterized queries to prevent SQL injection.
- **NFR-SEC-03:** User input shall be validated on the server and escaped on display to prevent XSS.
- **NFR-SEC-04:** CORS shall allow only the configured frontend origin.
- **NFR-SEC-05:** Secrets and credentials shall live in `.env` files excluded from version control.
- **NFR-SEC-06:** A user shall not be able to read or change another user's data (verified by test).

### 8.5 Reliability and Availability

- **NFR-REL-01:** Data shall persist in the database across server restarts.
- **NFR-REL-02:** The system shall show friendly error messages instead of crashing when the API is unreachable.

### 8.6 Compatibility and Portability

- **NFR-COMP-01:** The system shall work on the latest two versions of Chrome, Edge, Firefox and Safari, and on screen widths from 360 px to desktop.

### 8.7 Maintainability

- **NFR-MAIN-01:** Code shall be written in TypeScript with a consistent folder structure separating frontend, backend, routes, models and database scripts.
- **NFR-MAIN-02:** The repository shall contain a README with setup steps, environment variable template and database schema script.
- **NFR-MAIN-03:** Work shall be committed to GitHub regularly, at least after each completed feature group.

### 8.8 Deployment

- **NFR-DEP-01:** The system shall run fully on a local machine (frontend, backend and database).
- **NFR-DEP-02:** The project shall include deployment configuration and a short deployment plan; live deployment is optional.

## 9. Acceptance Criteria and Verification

### 9.1 MVP Acceptance Criteria

The MVP is accepted when all of the following can be demonstrated on the local system:

1. A Staff user can register, log in and log out.
2. A Staff user can create, edit and delete a child profile and sees only their own children.
3. A Staff user can create a schedule for a date, add, reorder and remove activities, and save it.
4. The Child view shows today's tasks and lets the child mark them done; the status persists after reload.
5. The communication board speaks a card's word when tapped and can build a simple phrase.
6. The dashboard shows today's completion and a 7-day summary per child.
7. The system is usable on a phone-sized and a desktop-sized screen.

### 9.2 Verification Methods

| Method | Applies to |
| --- | --- |
| Manual test cases (per requirement group, with pass/fail record) | Functional requirements |
| API tests (e.g., Postman collection) | Authentication, CRUD, data isolation, status codes |
| Responsive checks in browser developer tools (phone, tablet, desktop) | UI and compatibility |
| Usability testing with real users (task-based test plus SUS questionnaire) | Usability requirements |

### 9.3 Suggested Usability Test Tasks

1. Register and log in.
2. Add a child profile.
3. Build a schedule with at least four activities.
4. Open the Child view and complete two tasks.
5. Use the communication board to say "I want water".
6. Find today's completion rate on the dashboard.

Record, per participant: task success, time taken, errors, and the SUS score.

## 10. Six-Day Delivery Plan

The table maps requirement priorities to a realistic schedule. The team should adjust it once members and tasks are assigned.

| Day | Focus | Output |
| --- | --- | --- |
| 1 | Project setup, database schema, authentication API and login/register pages | Working login; repository and README |
| 2 | Child profile CRUD (API and dashboard), activity library seed data | Working child management |
| 3 | Schedule creator and task API (drag-and-drop plus Add button) | Schedules can be created and saved |
| 4 | Child view with task completion; communication board with TTS | Child interface complete |
| 5 | Progress summaries, basic settings, responsive polish, bug fixes, API tests | Integrated, stable MVP |
| 6 | Usability testing, SUS results, documentation, demo preparation, final submission | Test report, user guide and final package |

The project brief lists the final submission as November 18 or 20 (confirm with the instructor). Should-have and Could-have items are dropped first if the schedule slips.

## 11. Risks and Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Six days is too short for all Should items | Incomplete features | Build Must items first; treat Should/Could as optional |
| Drag-and-drop is unreliable on touch screens | Schedule creation unusable on tablets | Keep the Add button as the primary path; use a proven library |
| TTS voices differ per browser/device | Inconsistent audio | Test on target browsers; always show the text label |
| Difficulty recruiting real test users | Missing required usability data | Start recruiting on Day 1; test with caregivers/teachers known to the team |
| Integration errors found late | Delays | Test each feature end to end as it is finished; commit often |
| Team unfamiliar with part of the stack | Slower progress | Keep the stack as chosen; assign tasks by strength; pair on shared issues |
| Data privacy concerns about children's information | Ethical and compliance issues | Collect minimal data; use first names or nicknames; get consent for testing |

## 12. Open Items for Team Confirmation

1. Technology stack: confirm React + TypeScript + Vite, Node.js + Express + TypeScript, MySQL.
2. Child access: confirm that the Child view opens from a signed-in Staff session (no child login), with an optional PIN to exit.
3. Roles: confirm that Caregiver, OT and SPED Teacher have identical permissions in the MVP.
4. Shared children: decide whether an OT or teacher needs access to a child created by a caregiver (excluded for now).
5. Schedule model: confirm one schedule per child per date, with copy-from-date, rather than a repeating weekly template.
6. Icons: choose the icon source (emoji or a licensed open icon set).
7. Language: confirm English only, or add Filipino labels and TTS if time allows.
8. Deployment: decide between a local demo only and optional live deployment.