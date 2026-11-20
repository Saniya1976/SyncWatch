import { Role, ParticipantSummary } from '../types/index.js';

export class Participant {
  public readonly id: string;
  public displayName: string;
  public role: Role;
  public readonly joinedAt: number;
  public isOnline: boolean;

  constructor(id: string, displayName: string, role: Role = 'PARTICIPANT') {
    this.id = id;
    this.displayName = displayName.trim();
    this.role = role;
    this.joinedAt = Date.now();
    this.isOnline = true;
  }

  public setRole(newRole: Role): void {
    this.role = newRole;
  }

  public setOnline(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  public toSummary(): ParticipantSummary {
    return {
      id: this.id,
      displayName: this.displayName,
      role: this.role,
      joinedAt: this.joinedAt,
      isOnline: this.isOnline,
    };
  }
}

