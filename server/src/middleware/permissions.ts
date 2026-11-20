import { Role } from '../types/index.js';

/**
 * Validates if the given role is authorized to control playback (play, pause, seek, change video).
 * Strictly HOST and MODERATOR.
 */
export function canControlPlayback(role: Role): boolean {
  return role === 'HOST' || role === 'MODERATOR';
}

/**
 * Validates if the given role is authorized to assign or demote roles.
 * Only the room HOST can assign roles.
 */
export function canAssignRoles(role: Role): boolean {
  return role === 'HOST';
}

/**
 * Validates if actor has permission to remove target participant.
 * - HOST can remove MODERATOR or PARTICIPANT (cannot remove self).
 * - MODERATOR cannot remove HOST or other MODERATORS.
 */
export function canRemoveParticipant(
  actorRole: Role,
  targetRole: Role,
  isSelf: boolean
): boolean {
  if (isSelf) return false; // Leaving room is handled via leave_room, not remove_participant
  if (actorRole === 'HOST') return true;
  if (actorRole === 'MODERATOR') {
    return targetRole === 'PARTICIPANT';
  }
  return false;
}

/**
 * Validates if actor can approve or reject action requests.
 * Only HOST and MODERATOR can resolve requests.
 */
export function canResolveRequests(role: Role): boolean {
  return role === 'HOST' || role === 'MODERATOR';
}

/**
 * Validates if actor can submit an action request.
 * Any participant in the room can submit a request.
 */
export function canRequestAction(role: Role): boolean {
  return role === 'PARTICIPANT' || role === 'MODERATOR';
}

