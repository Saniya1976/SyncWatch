import { io } from '../../../client/node_modules/socket.io-client/build/esm/index.js';

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
  });
}

async function ensureServerRunning() {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`).catch(() => null);
    if (res && res.ok) return null;
  } catch {
    // not running
  }

  console.log('Starting in-process test server...');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const serverPath = path.resolve(process.cwd(), 'server/dist/index.js');
  const serverModule = await import(pathToFileURL(serverPath).href);

  for (let i = 0; i < 40; i++) {
    await wait(150);
    const check = await fetch(`${SERVER_URL}/api/health`).catch(() => null);
    if (check && check.ok) {
      console.log('✔ Test server started successfully.');
      return serverModule.httpServer;
    }
  }

  throw new Error('Timed out waiting for test server on http://localhost:5000');
}

async function runTests() {
  console.log('--- Starting YouTube Watch Party Integration Tests ---');
  const serverProcess = await ensureServerRunning();

  try {
    const hostSocket = createClient();
    let roomCode = '';
    let hostId = '';

    await new Promise((resolve, reject) => {
      hostSocket.on('connect', resolve);
      hostSocket.on('connect_error', reject);
    });
    console.log('✔ Host client connected via WebSocket');

    // 1. Create Room Test
    const createRes = await new Promise((resolve) => {
      hostSocket.emit('create_room', { displayName: 'Alice (Host)' }, resolve);
    });

    if (!createRes.success || !createRes.data) {
      throw new Error(`Failed to create room: ${createRes.error}`);
    }

    roomCode = createRes.data.roomCode;
    hostId = createRes.data.hostId;
    console.log(`✔ Room created successfully: [${roomCode}], Host Role: [${createRes.data.currentRole}]`);

    // 2. Participant Join Test
    const bobSocket = createClient();
    await new Promise((resolve) => bobSocket.on('connect', resolve));

    const hostJoinPromise = new Promise((resolve) => {
      hostSocket.on('user_joined', resolve);
    });

    const bobJoinRes = await new Promise((resolve) => {
      bobSocket.emit('join_room', { roomCode, displayName: 'Bob' }, resolve);
    });

    if (!bobJoinRes.success || !bobJoinRes.data) {
      throw new Error(`Failed Bob join: ${bobJoinRes.error}`);
    }

    const hostNotified = await hostJoinPromise;
    console.log(`✔ Bob joined room. Host received notification: [${hostNotified.participant.displayName}]`);
    console.log(`✔ Bob assigned default role: [${bobJoinRes.data.currentRole}]`);

    // 3. Unauthorized Play Test (Participant should fail)
    const bobErrorPromise = new Promise((resolve) => {
      bobSocket.once('operation_error', resolve);
    });

    bobSocket.emit('play', { roomCode, currentTime: 10 });
    const bobError = await bobErrorPromise;
    console.log(`✔ Backend permission check passed: Unauthorized play blocked for Bob: [${bobError.message}]`);

    // 4. Role Promotion Test (Host promotes Bob to MODERATOR)
    const rolePromise = new Promise((resolve) => {
      bobSocket.once('role_assigned', resolve);
    });

    const assignRes = await new Promise((resolve) => {
      hostSocket.emit('assign_role', { roomCode, targetParticipantId: bobSocket.id, newRole: 'MODERATOR' }, resolve);
    });

    if (!assignRes.success) {
      throw new Error(`Failed to assign role: ${assignRes.error}`);
    }

    const roleEvent = await rolePromise;
    console.log(`✔ Host promoted Bob to MODERATOR. Bob received event: [${roleEvent.role}]`);

    // 5. Authorized Play Test (Now Bob is MODERATOR, play should succeed)
    const syncPromise = new Promise((resolve) => {
      hostSocket.once('sync_state', resolve);
    });

    bobSocket.emit('play', { roomCode, currentTime: 25 });
    const syncState = await syncPromise;
    console.log(`✔ Bob as Moderator played video. Synchronized state broadcast: isPlaying=[${syncState.isPlaying}], currentTime=[${syncState.currentTime}]`);

    // 6. Action Request & Approval Test
    const charlieSocket = createClient();
    await new Promise((resolve) => charlieSocket.on('connect', resolve));
    await new Promise((resolve) => {
      charlieSocket.emit('join_room', { roomCode, displayName: 'Charlie' }, resolve);
    });
    console.log('✔ Charlie joined as Participant');

    const actionReqPromise = new Promise((resolve) => {
      hostSocket.once('action_requested', resolve);
    });

    // Charlie requests to seek to 120s
    await new Promise((resolve) => {
      charlieSocket.emit('request_action', {
        roomCode,
        actionType: 'SEEK',
        payload: { currentTime: 120 }
      }, resolve);
    });

    const reqReceived = await actionReqPromise;
    console.log(`✔ Host received Charlie's request: [${reqReceived.actionType}] for target [${reqReceived.payload.currentTime}s]`);

    // Host approves Charlie's request
    const resolvePromise = new Promise((resolve) => {
      charlieSocket.once('request_resolved', resolve);
    });
    const seekSyncPromise = new Promise((resolve) => {
      charlieSocket.once('sync_state', resolve);
    });

    hostSocket.emit('approve_request', { roomCode, requestId: reqReceived.id });
    const resolvedEvent = await resolvePromise;
    const seekState = await seekSyncPromise;

    console.log(`✔ Request approved: [${resolvedEvent.status}] by [${resolvedEvent.resolvedBy}]`);
    console.log(`✔ Synchronized playback executed after approval: currentTime=[${seekState.currentTime}s]`);

    // 7. Live Chat Communication Test
    const chatPromise = new Promise((resolve) => {
      hostSocket.once('new_chat', resolve);
    });
    bobSocket.emit('send_chat', { roomCode, text: 'Hey watch party, video synced perfectly!' });
    const chatMsg = await chatPromise;
    console.log(`✔ Chat message broadcast received: [${chatMsg.senderName}]: "${chatMsg.text}"`);

    // 8. Transfer Host Test (Host transfers ownership to Bob)
    const hostTransferPromise = new Promise((resolve) => {
      bobSocket.once('host_transferred', resolve);
    });
    const youAreHostPromise = new Promise((resolve) => {
      bobSocket.once('you_are_host', resolve);
    });

    const transferRes = await new Promise((resolve) => {
      hostSocket.emit('transfer_host', { roomCode, newHostParticipantId: bobSocket.id }, resolve);
    });

    if (!transferRes.success) {
      throw new Error(`Failed to transfer host: ${transferRes.error}`);
    }

    const transferredEvt = await hostTransferPromise;
    const youAreHostEvt = await youAreHostPromise;
    console.log(`✔ Host successfully transferred to: [${transferredEvt.newHostDisplayName}] (Bob)`);
    console.log(`✔ New Host received secure hostToken: [${Boolean(youAreHostEvt.hostToken)}]`);

    // 9. Pause Video Test (Bob is now Host)
    const pausePromise = new Promise((resolve) => {
      charlieSocket.once('sync_state', resolve);
    });
    bobSocket.emit('pause', { roomCode, currentTime: 60 });
    const pauseState = await pausePromise;
    if (pauseState.isPlaying !== false) {
      throw new Error('Expected playback to be paused');
    }
    console.log(`✔ Pause command executed: isPlaying=[${pauseState.isPlaying}], currentTime=[${pauseState.currentTime}s]`);

    // 10. Change Video Test
    const changeVideoPromise = new Promise((resolve) => {
      charlieSocket.once('sync_state', resolve);
    });
    const targetVideoUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
    bobSocket.emit('change_video', { roomCode, videoUrlOrId: targetVideoUrl });
    const changeState = await changeVideoPromise;
    if (changeState.videoId !== 'jNQXAC9IVRw') {
      throw new Error(`Expected videoId to be jNQXAC9IVRw, got ${changeState.videoId}`);
    }
    console.log(`✔ Video successfully changed by Host: videoId=[${changeState.videoId}]`);

    // 11. Request Rejection Test
    const charlieReqPromise = new Promise((resolve) => {
      bobSocket.once('action_requested', resolve);
    });
    await new Promise((resolve) => {
      charlieSocket.emit('request_action', {
        roomCode,
        actionType: 'CHANGE_VIDEO',
        payload: { videoUrlOrId: 'dQw4w9WgXcQ' }
      }, resolve);
    });
    const charlieReq = await charlieReqPromise;
    console.log(`✔ Charlie submitted CHANGE_VIDEO request: ID=[${charlieReq.id}]`);

    const rejectPromise = new Promise((resolve) => {
      charlieSocket.once('request_resolved', resolve);
    });
    bobSocket.emit('reject_request', { roomCode, requestId: charlieReq.id });
    const rejectEvt = await rejectPromise;
    if (rejectEvt.status !== 'REJECTED') {
      throw new Error(`Expected request status REJECTED, got ${rejectEvt.status}`);
    }
    console.log(`✔ Request successfully rejected by Host: status=[${rejectEvt.status}]`);

    // 12. Participant Removal (Kick) & Kicked Socket Cannot Chat/Act Test
    const kickPromise = new Promise((resolve) => {
      charlieSocket.once('participant_removed', resolve);
    });
    const userLeftPromise = new Promise((resolve) => {
      bobSocket.once('user_left', resolve);
    });

    const kickRes = await new Promise((resolve) => {
      bobSocket.emit('remove_participant', { roomCode, targetParticipantId: charlieSocket.id }, resolve);
    });
    if (!kickRes.success) {
      throw new Error(`Failed to remove participant: ${kickRes.error}`);
    }

    const kickedEvt = await kickPromise;
    const leftEvt = await userLeftPromise;
    console.log(`✔ Charlie kicked from room: reason=[${kickedEvt.reason}], broadcast to room: [${leftEvt.displayName}]`);

    // Verify kicked Charlie cannot send chat
    const charlieChatRes = await new Promise((resolve) => {
      charlieSocket.emit('send_chat', { roomCode, text: 'I am back!' }, resolve);
    });
    if (charlieChatRes.success) {
      throw new Error('Kicked user was able to send chat!');
    }
    console.log(`✔ Security check passed: Kicked user cannot send chat (rejected with error: [${charlieChatRes.error}])`);

    // 13. Late Joiner Playback Position Test (Calculates Elapsed Time)
    // Bob plays video at time: 100
    bobSocket.emit('play', { roomCode, currentTime: 100 });
    // Wait 1.5 seconds
    await wait(1500);

    const daveSocket = createClient();
    await new Promise((resolve) => daveSocket.on('connect', resolve));

    const daveJoinRes = await new Promise((resolve) => {
      daveSocket.emit('join_room', { roomCode, displayName: 'Dave (Late Joiner)' }, resolve);
    });

    if (!daveJoinRes.success || !daveJoinRes.data) {
      throw new Error(`Failed Dave join: ${daveJoinRes.error}`);
    }

    const davePlayback = daveJoinRes.data.playbackState;
    console.log(`✔ Dave (Late Joiner) joined active room. Initial isPlaying=[${davePlayback.isPlaying}], currentTime=[${davePlayback.currentTime}]`);
    if (!davePlayback.isPlaying) {
      throw new Error('Expected video to be playing for late joiner');
    }

    // Dave's local drift correction or server updatedAt time:
    const elapsedSinceUpdate = (Date.now() - davePlayback.updatedAt) / 1000;
    const effectiveTime = davePlayback.currentTime + elapsedSinceUpdate;
    console.log(`✔ Late joiner playback calculation: Base=${davePlayback.currentTime}s, Elapsed=${elapsedSinceUpdate.toFixed(2)}s, Effective=${effectiveTime.toFixed(2)}s`);
    if (effectiveTime < 101) {
      throw new Error(`Expected effective playback time >= 101s, got ${effectiveTime}`);
    }

    // Cleanup sockets
    hostSocket.disconnect();
    bobSocket.disconnect();
    charlieSocket.disconnect();
    daveSocket.disconnect();

    console.log('--- ALL 13 INTEGRATION TESTS PASSED PERFECTLY ---');
    process.exit(0);
  } finally {
    if (serverProcess) {
      if (typeof serverProcess.kill === 'function') serverProcess.kill();
      else if (typeof serverProcess.close === 'function') serverProcess.close();
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
