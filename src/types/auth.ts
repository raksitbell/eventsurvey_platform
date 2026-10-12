import type { User } from "./user";

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNSUPPORTED_ROLE"
  | "FORBIDDEN"
  | "INVALID_TARGET";

export interface AuthSession {
  user: User;
  impersonatedUser: User | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
