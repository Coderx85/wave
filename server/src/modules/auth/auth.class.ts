import type { TSessionId, TTokenId, TUserId } from "@/types";
import { ID } from "./utils/ID";
import type { IAuthModule, Session, SignInDTO, SignUpDTO, User, UserDTO } from "./auth.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import type { IUserRepository } from "./domain/interfaces/user-repository.interface";
import { SignUpUseCase } from "./use-cases/sign-up.use-case";
import { SignInUseCase } from "./use-cases/sign-in.use-case";
import type { IPasswordHasher } from "./use-cases/sign-up.use-case";
import type { IPasswordVerifier, ISessionFactory } from "./use-cases/sign-in.use-case";

/**
 * Auth Module
 * 
 * Orchestrates the authentication use cases and session management.
 * This is the application's auth orchestrator that coordinates between
 * HTTP controllers, use cases, and repositories.
 */
export class AuthModule implements IAuthModule {
  private sessions: Map<TTokenId, Session> = new Map();
  private signUpUseCase: SignUpUseCase;
  private signInUseCase: SignInUseCase;

  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher,
    private passwordVerifier: IPasswordVerifier,
    private sessionFactory: ISessionFactory
  ) {
    this.signUpUseCase = new SignUpUseCase(userRepository, passwordHasher);
    this.signInUseCase = new SignInUseCase(userRepository, passwordVerifier, sessionFactory);
  }

  /**
   * Sign up a new user
   */
  async signUp(signUpDTO: SignUpDTO): Promise<void> {
    return tryCatch({
      ctx: async () => {
        const result = await this.signUpUseCase.execute(signUpDTO);
        if (!result.success) {
          throw new Error(result.error);
        }
      },
      errorMessage: "FAILED_TO_SIGN_UP",
    });
  }

  /**
   * Sign in and create a session
   */
  async signIn(signInDTO: SignInDTO): Promise<{ token: string }> {
    return tryCatch({
      ctx: async () => {
        const result = await this.signInUseCase.execute(signInDTO);
        if (!result.success) {
          throw new Error(result.error);
        }
        
        if (!result.sessionToken) {
          throw new Error("Failed to create session token");
        }

        return { token: result.sessionToken };
      },
      errorMessage: "FAILED_TO_SIGN_IN",
    });
  }

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
        const userEntity = await this.userRepository.findById(userId);
        if (!userEntity) {
          return null;
        }

        return {
          id: userEntity.id,
          email: userEntity.email.value,
          name: userEntity.name,
          image: null,
          createdAt: userEntity.createdAt,
          updatedAt: userEntity.updatedAt,
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