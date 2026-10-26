import { z } from 'zod';
import { requiredText } from './common';

const email = z
  .string({ message: 'Required' })
  .trim()
  .toLowerCase()
  .max(254, { message: 'Must be at most 254 characters' })
  .email({ message: 'Enter a valid email address' });

export const RegisterRequest = z.strictObject({
  name: requiredText(100),
  email,
  password: z
    .string({ message: 'Required' })
    .min(10, { message: 'Use at least 10 characters' })
    .max(200, { message: 'Must be at most 200 characters' }),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.strictObject({
  email,
  password: z.string({ message: 'Required' }).min(1, { message: 'Required' }).max(200),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export interface UserResponse {
  id: string;
  name: string;
  email: string;
}
