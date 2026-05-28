import type { TSessionId, TTokenId, TUserId } from "@/types";

export interface IAuthModule {
  getSessionByToken(token: TTokenId): Promise<Session | null>;
  getUserById(userId: TUserId): Promise<User | null>;
};

export interface Session {
  id: TSessionId;
  createdAt: Date;
  updatedAt: Date;
  userId: TUserId;
  expiresAt: Date;
  token: TTokenId;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export interface UserDTO {
  id: TUserId;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  image?: string | null;
  name: string;
};

export interface User extends UserDTO {
  emailVerified: boolean;
};

export interface SignUpDTO {
  email: string;
  password: string;
  name: string;
};

export interface SignInDTO {
  email: string;
  password: string;
};
