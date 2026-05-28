import type { TTokenId, TUserId } from "@/types";
import type { IUserStore } from "../user";
import { UserRepository } from "@/modules/user/repository";
import type { IAuthModule, Session, SignInDTO, SignUpDTO, User, UserDTO } from "./auth.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";

/**
 * Auth Module
 * 
 * Orchestrates the authentication use cases and session management.
 * This is the application's auth orchestrator that coordinates between
 * HTTP controllers, use cases, and repositories.
 */
export class AuthModule implements IAuthModule {
  private sessions: Map<TTokenId, Session> = new Map();
  private userRepository: IUserStore = UserRepository;

  /**
   * Get session by token
   */
  async getSessionByToken(token: TTokenId): Promise<Session | null> {
    return tryCatch({
      ctx: async () => {
        return this.sessions.get(token) ?? null;
      },
      errorMessage: "FAILED_TO_GET_SESSION_BY_TOKEN",
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: TUserId): Promise<User | null> {
    return tryCatch({
      ctx: async () => {
        const userEntity = await this.userRepository.getUserById(userId);
        if (!userEntity) {
          return null;
        }

        return {
          id: userEntity.id,
          email: userEntity.email,
          name: userEntity.name,
          image: null,
          createdAt: userEntity.createdAt,
          updatedAt: userEntity.updatedAt ?? userEntity.createdAt,
          emailVerified: userEntity.emailVerified,
        };
      },
      errorMessage: "FAILED_TO_GET_USER_BY_ID",
    });
  }

  /**
   * Internal: Store session (called by session factory)
   * This is used internally by the SessionFactory implementation
   */
  storeSession(session: Session): void {
    this.sessions.set(session.token, session);
  }
}