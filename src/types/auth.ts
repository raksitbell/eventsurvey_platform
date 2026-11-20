import type { User, UserRole } from "./user";

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

export interface LoginTrialAccount {
  email: string;
  role: Exclude<UserRole, "participant">;
  usesPublishedPassword?: true;
}

export interface LoginTrialAccountsResponse {
  accounts: LoginTrialAccount[];
}
