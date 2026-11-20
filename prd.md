# MASTER PROJECT PROMPT — YOUTUBE WATCH PARTY

You are acting as a senior full-stack engineer, software architect, and implementation partner. I need you to build a complete, polished, working **YouTube Watch Party application** as part of a Software Developer interview assignment for Web3Task.

Your responsibility is to help me build a reliable, deployable application within **3 days**. Prioritize the actual assignment requirements, clean architecture, correct real-time behavior, backend security, and a polished user experience.

Do not overengineer the project. Do not introduce unnecessary technologies or features. Build the required functionality properly before considering optional enhancements.

---

# 1. PROJECT OVERVIEW

Build a web application where multiple users can join a shared room and watch a YouTube video together in real time.

All participants in a room should see synchronized playback.

For example:

- A Host creates a watch party.
- The Host shares a room link or code.
- Other users join using that link or code.
- Everyone sees the same YouTube video.
- When the Host plays, pauses, seeks, or changes the video, the other participants' players synchronize.
- Participants cannot independently control playback.
- A Host can assign Moderator permissions.
- Moderators can also control playback.
- Participants can request permission to perform an action.
- The Host or Moderator can approve or reject those requests.

The backend must enforce permissions. Hiding buttons in the frontend is NOT sufficient.

The server must be the source of truth for room state and playback commands.

# 2. TECHNOLOGY STACK

Use the following stack unless there is a strong technical reason not to.

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Socket.IO Client
- YouTube IFrame Player API

### Backend
- Node.js
- Express.js
- TypeScript
- Socket.IO

### Storage
For the initial version, use in-memory Maps to store active rooms, participants, room state, and pending requests.

Do not introduce MongoDB or PostgreSQL unless the required functionality genuinely needs persistence.

### Deployment
Deploy the complete application as one service on Render.

The Express server should serve the production-built React frontend and handle Socket.IO connections through the same HTTP server.

This avoids unnecessary CORS and deployment complexity.

# 3. CORE FUNCTIONAL REQUIREMENTS

## A. Landing Page

Create a modern landing page with:

- Application name and logo/wordmark.
- A short description of the watch-party experience.
- Create Room button.
- Join Room section.
- Input for room code.
- Join button.
- A clean, responsive layout.

When a user creates a room:
1. Generate a unique, random room code.
2. Create a room on the backend.
3. Automatically assign the creator the HOST role.
4. Generate a shareable room URL.
5. Redirect the creator to the watch room.

When a user joins:
1. Validate the room code on the server.
2. Reject invalid or nonexistent rooms.
3. Register the participant.
4. Assign the PARTICIPANT role by default.
5. Send the current room state to the newly joined user.
6. Broadcast the participant's arrival to the room.

## B. Room Interface

The watch room should contain:

- YouTube video player.
- Room code.
- Copy invitation link button.
- Participant list.
- Role badges.
- Playback controls depending on user permissions.
- Current video information.
- Connection status.
- A simple, clear interface for requesting actions.

The layout should work on desktop and mobile.

## C. YouTube Integration

Use the official YouTube IFrame Player API.

Users should be able to provide a YouTube video URL.

Support common URL formats:

- `youtube.com/watch?v=VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`

Extract and validate the video ID before loading it.

Do not accept arbitrary iframe URLs.

The player should support:

- Loading a video.
- Playing.
- Pausing.
- Seeking.
- Changing the video.

Do not attempt to download, proxy, or re-host YouTube videos.

## D. Real-Time Synchronization

This is the most important part of the assignment.

Use Socket.IO to synchronize playback across all connected users in a room.

Implement synchronization for:

1. Play.
2. Pause.
3. Seek.
4. Change video.
5. Initial room state when a participant joins.

The expected flow:

1. Host performs an action.
2. Frontend sends an event to the backend.
3. Backend identifies the participant and their role.
4. Backend validates whether the action is allowed.
5. Backend updates the authoritative room state.
6. Backend broadcasts the updated state to all participants in that room.
7. Each client applies the received state to its YouTube player.

Do not allow clients to broadcast arbitrary playback state directly to other clients.

### Playback State

Maintain a room state similar to:

- `videoId`
- `isPlaying`
- `currentTime`
- `updatedAt`

Use `updatedAt` to estimate the correct playback position for users who join while a video is already playing.

Example:

If the Host's last synchronized playback position was 30 seconds and the video has been playing for another 5 seconds, a newly joined participant should start around 35 seconds.

Account for network delay where practical.

Avoid unnecessary synchronization loops:
- A user action should send a command to the server.
- A server-originated update should update the local player.
- Applying a server update must not trigger another user command.

Add basic drift correction if practical, so participants do not remain significantly out of sync.

## E. Roles and Permissions

Implement exactly these roles:

### HOST
- Automatically assigned to the room creator.
- Can play and pause.
- Can seek.
- Can change the video.
- Can assign or remove Moderator permissions.
- Can remove participants.
- Can approve or reject participant requests.

### MODERATOR
- Assigned by the Host.
- Can play and pause.
- Can seek.
- Can change the video.
- Can approve or reject participant requests.
- Cannot remove the Host or take ownership of the room.

### PARTICIPANT
- Default role for anyone joining a room.
- Can watch synchronized playback.
- Cannot directly play, pause, seek, or change the video.
- Can request permission to perform playback actions.

### VIEWER
Treat Viewer as an optional alias or read-only participant mode only if it can be implemented without complicating the required role system.

Do not let optional roles delay the core implementation.

## F. Backend Permission Validation

Every protected event must be validated on the backend.

Create reusable permission-checking functions.

Example:

`canControlPlayback(role)`

This should return true only for HOST and MODERATOR.

The backend must reject unauthorized attempts to:

- Play.
- Pause.
- Seek.
- Change video.
- Assign roles.
- Remove participants.

Never trust a role value sent by the client.

The server must retrieve the participant's actual role from the room's stored participant data.

Send a clear error response when a user attempts an unauthorized action.

## G. Participant Requests and Approval

This is a mandatory feature.

Participants should not be able to directly control playback, but they must be able to request an action.

For example:
- A participant requests to pause.
- A participant requests to seek to 60 seconds.
- A participant requests to change the video.

The request flow:

1. Participant submits an action request.
2. Backend validates that the participant is actually a member of the room.
3. Backend stores the pending request.
4. Host and Moderators receive the request.
5. Host or Moderator approves or rejects it.
6. If approved, the backend validates the moderator's permissions and executes the requested action.
7. The updated state is broadcast to all participants.
8. The requester receives the result.

Important:
- The requested action must NOT execute before approval.
- Requests should have unique IDs.
- Prevent users from approving their own requests.
- Remove or mark requests as resolved after approval/rejection.
- Handle stale requests safely.

Build a simple approval panel for Host and Moderators.

## H. Participant Management

The Host should be able to:

- View all participants.
- See their current roles.
- Promote a Participant to Moderator.
- Demote a Moderator to Participant.
- Remove a participant from the room.

When a participant is removed:
- Remove them from the room on the backend.
- Disconnect them from that room's Socket.IO channel.
- Notify the remaining participants.
- Prevent the removed user from continuing to send room actions.

Do not allow a Moderator to remove the Host or change the Host's role.

# 4. SOCKET.IO EVENT DESIGN

Use clear, consistent event names.

Suggested client-to-server events:

- `create_room`
- `join_room`
- `leave_room`
- `play`
- `pause`
- `seek`
- `change_video`
- `assign_role`
- `remove_participant`
- `request_action`
- `approve_request`
- `reject_request`

Suggested server-to-client events:

- `room_created`
- `room_joined`
- `sync_state`
- `user_joined`
- `user_left`
- `role_assigned`
- `participant_removed`
- `action_requested`
- `request_resolved`
- `operation_error`

Use Socket.IO acknowledgements for operations that need confirmation.

All events must have properly typed payloads.

Validate event payloads on the server. Do not trust arbitrary client input.

# 5. BACKEND ARCHITECTURE

Use a clean, modular structure.

Suggested architecture:

```text
server/src/
├── classes/
│   ├── Room.ts
│   ├── RoomManager.ts
│   └── Participant.ts
├── handlers/
│   └── MessageHandler.ts
├── middleware/
│   └── permissions.ts
├── services/
│   ├── RoomService.ts
│   └── PlaybackService.ts
├── types/
│   └── index.ts
├── socket.ts
└── index.ts
```

### Responsibilities

**Room.ts**
- Store room ID/code.
- Store Host ID.
- Store participants.
- Store authoritative playback state.
- Store pending action requests.

**Participant.ts**
- Store participant ID.
- Store display name.
- Store role.
- Store connection status.

**RoomManager.ts**
- Create rooms.
- Find rooms.
- Join participants.
- Remove participants.
- Delete empty rooms if appropriate.

**MessageHandler.ts**
- Register and process Socket.IO events.
- Route events to appropriate services.
- Handle acknowledgements and errors.

**permissions.ts**
- Centralize permission checks.
- Validate roles.
- Prevent unauthorized operations.

**PlaybackService.ts**
- Process playback commands.
- Update authoritative room state.
- Broadcast synchronized state.

Keep business logic out of the React components and avoid putting all backend logic in one giant socket file.

Use TypeScript interfaces/types for rooms, participants, playback state, requests, and event payloads.

# 6. FRONTEND ARCHITECTURE

Suggested structure:

```text
client/src/
├── components/
│   ├── VideoPlayer.tsx
│   ├── ParticipantList.tsx
│   ├── RoomControls.tsx
│   ├── ApprovalPanel.tsx
│   ├── RoleBadge.tsx
│   └── RequestActionModal.tsx
├── hooks/
│   └── useSocket.ts
├── pages/
│   ├── Home.tsx
│   └── WatchRoom.tsx
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

Create reusable components.

Keep Socket.IO connection handling in a reusable hook or service rather than creating multiple socket connections unnecessarily.

The frontend should reflect role permissions:
- HOST sees all controls and management actions.
- MODERATOR sees playback controls and request approvals.
- PARTICIPANT sees the synchronized player and request buttons.

However, remember that frontend restrictions are only for user experience. Backend validation is the actual security layer.

# 7. UI/UX EXPECTATIONS

The application should look like a polished modern SaaS product.

Visual direction:
- Dark, elegant interface.
- Clean typography.
- Subtle gradients.
- Rounded cards.
- Good spacing.
- Clear buttons and icons.
- Minimal but meaningful animations.
- Responsive desktop and mobile layouts.

Suggested design:
- Dark navy/charcoal background.
- One restrained accent color.
- Large central video player.
- Participants in a side panel on desktop.
- Collapsible participant/approval panels on mobile.
- Clear Host, Moderator and Participant badges.
- Visible connection status.

Do not make the UI unnecessarily flashy.

Prioritize usability and clarity over decorative animations.

Include:
- Loading states.
- Empty states.
- Error messages.
- Toast notifications.
- Disabled button states.
- Confirmation before removing a participant.
- Copy invite link feedback.
- A clear room-not-found page.

# 8. WHAT NOT TO BUILD

We have only 3 days.

Do NOT spend time building features that are not necessary for the assignment.

Avoid these unless all mandatory requirements are already working:

- Full user authentication system.
- Google OAuth.
- Subscription/payment system.
- Database persistence.
- Redis.
- Multiple microservices.
- Complex chat system.
- Video hosting.
- Video downloading.
- Recommendation engine.
- AI features.
- Host transfer.
- Advanced analytics.
- Complex admin dashboards.
- Kubernetes or Docker infrastructure.
- Unnecessary design systems or libraries.

Use a simple display name when creating or joining a room.

Use in-memory room storage for the initial version and clearly document that rooms disappear when the server restarts.

Do not claim horizontal scalability or multi-instance support unless actually implemented.

# 9. ERROR HANDLING AND EDGE CASES

Handle at least these scenarios:

- Invalid room code.
- Room does not exist.
- Duplicate or missing participant name.
- User disconnects unexpectedly.
- User reconnects.
- Host disconnects.
- Participant tries an unauthorized action.
- Participant is removed.
- Invalid YouTube URL.
- Invalid video ID.
- Participant joins while a video is playing.
- Participant joins while a video is paused.
- Multiple users submit requests.
- A request is approved after the requester has left.
- A Moderator attempts a Host-only operation.
- A user attempts to access a room without joining it.

Do not crash the server when an event has invalid data.

Use clear error responses and handle socket disconnects properly.

# 10. TESTING CHECKLIST

Before considering the application complete, test it using at least three separate browser sessions or incognito windows.

### Room tests
- Host creates a room.
- Participant joins using the room code.
- Participant joins using the shareable link.
- Invalid room code is rejected.
- Participant list updates correctly.

### Playback tests
- Host plays the video.
- All participants see playback start.
- Host pauses.
- All participants pause.
- Host seeks.
- All participants synchronize.
- Host changes the video.
- All participants load the new video.
- A new participant joins during playback and receives the correct state.

### Permissions tests
- Participant cannot directly play.
- Participant cannot directly pause.
- Participant cannot directly seek.
- Participant cannot change the video.
- Host can assign Moderator.
- Moderator can control playback.
- Moderator cannot perform Host-only actions.

### Request tests
- Participant submits a request.
- Host receives it.
- Host approves it.
- The action executes only after approval.
- Host rejects a request.
- Rejected action does not execute.

### Participant management tests
- Host removes a participant.
- Removed participant is disconnected.
- Removed participant cannot perform further actions.
- Remaining participants see the updated participant list.

# 11. DEPLOYMENT

Deploy on Render.

Recommended setup:
- One Node.js web service.
- Build the React frontend.
- Serve the generated frontend files from Express.
- Run Socket.IO on the same HTTP server.
- Use the environment-provided PORT.
- Configure production URLs and origins correctly.
- Do not hardcode localhost URLs in production.

Provide:
- Working public deployment URL.
- Working room creation and joining.
- Working real-time synchronization.
- README with setup and deployment instructions.

If using Render's free tier, document any sleep or cold-start limitations honestly.

# 12. README REQUIREMENTS

Create a professional README containing:

1. Project title and description.
2. Features.
3. Technology stack.
4. Architecture overview.
5. Role and permission explanation.
6. Real-time synchronization flow.
7. Participant request/approval flow.
8. Local installation instructions.
9. Environment variables.
10. Development commands.
11. Production build instructions.
12. Deployment URL.
13. Known limitations.

Add a simple architecture diagram using Mermaid if useful.

Explain that the current version uses in-memory storage and a single server instance.

# 13. THREE-DAY IMPLEMENTATION PRIORITY

Follow this order.

## DAY 1 — FOUNDATION
- Inspect the existing repository before changing anything.
- Set up the React and Express applications.
- Configure TypeScript and Socket.IO.
- Implement room creation and joining.
- Implement Room, Participant and RoomManager classes.
- Implement role assignment and backend permission validation.
- Verify two browser sessions can join the same room.

## DAY 2 — CORE FUNCTIONALITY
- Integrate YouTube IFrame Player API.
- Implement play/pause synchronization.
- Implement seek synchronization.
- Implement video switching.
- Implement initial state synchronization for late joiners.
- Implement Moderator assignment.
- Implement participant removal.
- Implement participant action requests and Host/Moderator approval.

## DAY 3 — FINISH AND DEPLOY
- Complete the UI.
- Handle errors and disconnections.
- Test with at least three browser sessions.
- Fix synchronization and permission bugs.
- Deploy the complete application.
- Write README.
- Verify the public deployment from a fresh browser session.

If time becomes limited, prioritize working real-time playback, backend authorization, room creation/joining, and the request/approval system over optional visual enhancements.

# 14. HOW YOU SHOULD WORK AS MY CODING AGENT

Follow these instructions throughout development:

1. First inspect the existing repository, files, package manager, and installed dependencies.
2. Do not overwrite or delete existing code without understanding it.
3. Give me a brief implementation plan before making major structural changes.
4. Build the application in small, testable stages.
5. After each stage, explain which files were created or modified.
6. Run the relevant TypeScript checks and builds.
7. Fix errors instead of leaving broken code for later.
8. Do not use placeholder buttons or fake functionality.
9. Do not claim a feature is complete unless it actually works.
10. Do not install unnecessary dependencies.
11. Keep the code readable and explainable because I will need to walk an interviewer through it.
12. Do not create an overly complicated architecture just to make the project appear advanced.
13. If a requirement is ambiguous, make the simplest sensible implementation and explain the assumption.
14. Keep me informed about progress and remaining tasks.
15. If a feature is not required and would consume significant time, explain why it should be postponed.

## IMPORTANT FINAL EXPECTATION

I do not want just a UI prototype.

I want a genuinely functional, publicly deployed YouTube Watch Party application that satisfies the assignment requirements.

The most important things are:

- Multiple users can join the same room.
- YouTube playback synchronizes correctly.
- Host and Moderator permissions work.
- Participants cannot bypass permissions through direct socket events.
- Participants can request actions.
- Host or Moderator approval is required before those actions execute.
- Participants can be removed.
- The application works after deployment.

Start by inspecting my existing repository and reporting:

1. What is already present.
2. What is missing.
3. Whether the existing code should be reused or refactored.
4. The exact first implementation steps.

Then proceed with development stage by stage. Do not stop after giving me a plan—help implement the complete project.




## 2. Implemented Architecture & Files
Backend (server/)
Participant.ts: Encapsulates user identity, connection state, and roles (HOST, MODERATOR, PARTICIPANT).
Room.ts: Stores authoritative playback state (videoId, isPlaying, currentTime, updatedAt), participants, and the pending action-requests queue. Includes automatic drift/elapsed time calculation.
RoomManager.ts: Manages in-memory rooms, unique 6-character room codes (e.g. RRMMWZ), and socket-to-room mappings.
permissions.ts: Pure server-side permission validation functions (canControlPlayback, canAssignRoles, canRemoveParticipant, canResolveRequests).
PlaybackService.ts: Validates and executes authoritative play, pause, seek, and change_video commands.
RoomService.ts: Handles role promotion/demotion, participant removal, and the request/approval lifecycle (including preventing users from approving their own requests).
MessageHandler.ts: Maps all Socket.IO client-to-server and server-to-client events with proper error responses and acknowledgements.
youtube.ts: Validates and extracts 11-character YouTube video IDs from URLs (watch?v=..., youtu.be/..., embed/..., shorts/...).
index.ts: Express server, /api/health, /api/rooms/:roomCode verification, and static frontend fallback.
Frontend (client/)
Home.tsx: Landing page with "Create Room" and "Join Room" flows.
WatchRoom.tsx: Synchronized room page with live connection badge, room code sharing, and real-time toast feedback.
VideoPlayer.tsx: YouTube IFrame Player API integration with loop prevention, drift correction (within 1.5s), and non-controller interaction barriers.
RoomControls.tsx: Playback controls for Host/Mods (play, pause, seek, load video) or request button for viewers.
ApprovalPanel.tsx: Real-time approval queue for Host and Moderators.
RequestActionModal.tsx: Modal for participants to request play, pause, timestamp seeking, or video switching.
ParticipantList.tsx: Displays participants with role badges, 1-click room code/invite link copy, and Host management (promote/demote/remove with confirmation).
3. Verification & Test Results
Production Builds:
Client built successfully with Vite in 5.08s (client/dist).
Server TypeScript compiled successfully with 0 errors (server/dist).
Automated End-to-End Test (integration.test.mjs):
text
# ✔ Host client connected via WebSocket
# ✔ Backend permission check passed: Unauthorized play blocked for Bob: [Unauthorized: Only Host and Moderators can start playback.]
# ✔ Host promoted Bob to MODERATOR. Bob received event: [MODERATOR]
# ✔ Bob as Moderator played video. Synchronized state broadcast: isPlaying=[true], currentTime=[25]
# ✔ Charlie joined as Participant
# ✔ Host received Charlie's request: [SEEK] for target [120s]
# ✔ Request approved: [APPROVED] by [Alice (Host)]
# ✔ Synchronized playback executed after approval: currentTime=[120s]
--- ALL INTEGRATION TESTS PASSED PERFECTLY ---
Git Initialization:
Local Git repository initialized on branch main.
Initial commit created (86d7247) covering all source files and README.md.



### 1. Where WebSockets Are Applied

We use **Socket.IO over WebSockets** for real-time bidirectional communication.

#### A. Backend
1. **Server Initialization** — [server/src/socket.ts](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\server\src\socket.ts):
   - Mounts the Socket.IO WebSocket server directly onto the Node HTTP server.
   - Configures connection timeouts, CORS, and heartbeat pings (`pingInterval: 10000`).
2. **Event Router & Broadcaster** — [server/src/handlers/MessageHandler.ts](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\server\src\handlers\MessageHandler.ts):
   - **Incoming Client Events**: `create_room`, `join_room`, `leave_room`, `play`, `pause`, `seek`, `change_video`, `assign_role`, `remove_participant`, `request_action`, `approve_request`, `reject_request`.
   - **Room Channels**: Uses `socket.join("room:" + roomCode)` so events only reach users in that specific watch party.
   - **Outgoing Broadcasts**: Emits `sync_state`, `user_joined`, `user_left`, `role_assigned`, `action_requested`, `request_resolved`, and `operation_error`.
3. **HTTP Server Entry** — [server/src/index.ts](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\server\src\index.ts):
   - Combines Express REST endpoints, static React frontend hosting, and WebSocket connections on the **same port** (`5000`).

#### B. Frontend
1. **Singleton Socket Client** — [client/src/services/socket.ts](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\client\src\services\socket.ts):
   - Manages one shared WebSocket connection to prevent duplicate connections.
2. **Room Orchestration** — [client/src/pages/WatchRoom.tsx](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\client\src\pages\WatchRoom.tsx):
   - Connects to the room channel and listens for incoming WebSocket events (`sync_state`, `user_joined`, `user_left`, etc.).
   - Dispatches user actions (play, pause, seek, promote, approve) back through the socket.
3. **Synchronized Player** — [client/src/components/VideoPlayer.tsx](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\client\src\components\VideoPlayer.tsx):
   - Receives authoritative `sync_state` over WebSockets, calculates drift, and synchronizes the YouTube IFrame player.

---

### 2. How to See If It's Working

#### Method 1: The Automated Integration Test (Quickest — takes 2 seconds)
An end-to-end WebSocket test script is included in [server/src/tests/integration.test.mjs](file:///\\wsl.localhost\Ubuntu-22.04\home\sassysanya\web3task_assignment\server\src\tests\integration.test.mjs). It opens 3 concurrent WebSocket clients (`Alice`, `Bob`, `Charlie`), creates a room, tests role permissions, tests video playback sync, and tests the request/approval flow.

Run this command in your terminal:
```bash
npm test
```
**Output you will see:**
```text
✔ Host client connected via WebSocket
✔ Room created successfully: [RRMMWZ], Host Role: [HOST]
✔ Bob joined room. Host received notification: [Bob]
✔ Bob assigned default role: [PARTICIPANT]
✔ Backend permission check passed: Unauthorized play blocked for Bob
✔ Host promoted Bob to MODERATOR
✔ Bob as Moderator played video. Synchronized state broadcast: isPlaying=[true]
✔ Charlie joined as Participant
✔ Host received Charlie's request: [SEEK] for target [120s]
✔ Request approved: [APPROVED] by [Alice (Host)]
✔ Synchronized playback executed after approval: currentTime=[120s]
--- ALL INTEGRATION TESTS PASSED PERFECTLY ---
```

---

#### Method 2: Visual Browser Test (2 Windows Side-by-Side)

1. **Start the development server**:
   ```bash
   npm run dev
   ```
2. **Open Window 1**:
   - Go to `http://localhost:5173`.
   - Type your name (e.g. `Alice`) and click **Create Room**.
   - You will see the watch room with a room code badge (e.g. `ABC123`) and a green `Connected` indicator in the header.
3. **Open Window 2 (Incognito / Second Window)**:
   - Go to `http://localhost:5173`.
   - Enter the room code and join as `Bob`.
4. **Observe Real-Time WebSockets in Action**:
   - **Instant Presence**: Window 1 immediately shows `Bob` appearing in the participant list without page reload.
   - **Synchronized Playback**: When Alice clicks **Play**, Bob's player starts playing at the exact same second.
   - **Permission Guard**: Bob has no play/pause buttons (prevented on backend).
   - **Request System**: Bob clicks **"Request Playback Action"** -> Alice immediately sees a yellow pending request banner with **Approve** and **Reject** buttons.
   - **Instant Execution**: Alice clicks **Approve** -> The requested action executes simultaneously in both windows.

---

#### Method 3: Browser DevTools (Inspect the Actual Frames)

1. Open your browser DevTools (<kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd>).
2. Go to the **Network** tab.
3. Click the **WS** (WebSockets) filter at the top.
4. Refresh or open the room page.
5. Click on the connection row: `socket.io/?EIO=4&transport=websocket...`.
6. Select the **Messages** (or **Frames**) sub-tab.
7. You will see real-time WebSocket frames streaming back and forth:
   - `42["play",{"roomCode":"ABC123","currentTime":15}]`
   - `42["sync_state",{"videoId":"dQw4w9WgXcQ","isPlaying":true,"currentTime":15}]`