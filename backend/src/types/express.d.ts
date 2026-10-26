import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; deactivatedAt: Date | null };
      sessionId?: string;
    }
  }
}

export {};
