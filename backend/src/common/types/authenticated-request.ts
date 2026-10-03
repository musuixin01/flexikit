import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: number;
  username: string;
  sessionId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface OptionalUserRequest extends Request {
  user?: AuthenticatedUser;
}
