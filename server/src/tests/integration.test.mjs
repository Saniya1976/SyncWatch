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

async function runTests() {
  console.log('--- Starting YouTube Watch Party Integration Tests ---');

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
  const charlieReqRes = await new Promise((resolve) => {
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

  // Cleanup
  hostSocket.disconnect();
  bobSocket.disconnect();
  charlieSocket.disconnect();

  console.log('--- ALL INTEGRATION TESTS PASSED PERFECTLY ---');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
