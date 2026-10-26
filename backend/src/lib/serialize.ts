import type { MeetingRef, UserRef } from '@mom/shared';
import type { Request } from 'express';
import { unauthenticated } from './errors';

export function userRef(u: { id: string; name: string; deactivatedAt: Date | null }): UserRef {
  return { id: u.id, name: u.name, active: u.deactivatedAt === null };
}

export function meetingRef(m: {
  id: string;
  description: string;
  meetingDate: string;
}): MeetingRef {
  return { id: m.id, description: m.description, meetingDate: m.meetingDate };
}

/** The signed-in user; only call behind requireAuth. */
export function currentUser(req: Request) {
  if (!req.user) throw unauthenticated();
  return req.user;
}
