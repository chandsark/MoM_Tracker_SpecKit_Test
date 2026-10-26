import type { LoginRequest, RegisterRequest, UserResponse } from '@mom/shared';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { prisma } from '../db';
import { AppError } from '../lib/errors';

// Compared against when the email is unknown, so both failure paths take similar time.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', config.BCRYPT_COST);

function toResponse(user: { id: string; name: string; email: string }): UserResponse {
  return { id: user.id, name: user.name, email: user.email };
}

export async function register(input: RegisterRequest): Promise<UserResponse> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_COST);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });
  return toResponse(user);
}

export async function login(input: LoginRequest): Promise<UserResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || user.deactivatedAt !== null) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  return toResponse(user);
}
