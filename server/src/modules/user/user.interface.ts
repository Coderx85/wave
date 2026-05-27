import type { TUserId } from "@/types";

export interface IUser {
  id: TUserId;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
};

type userQueryOptions = | 
{
  queryByEmail: string;
} | {
  queryById: TUserId;
}

export interface IUserModule {
  createUser(email: string, name: string, password: string): Promise<IUser>;
 
  queryUser(query: userQueryOptions): Promise<IUser>;

  deleteUser(id: TUserId): Promise<void>;

  verifyUserEmail(email: IUser["email"]): Promise<IUser>;
  
  uploadProfilePicture(userId: TUserId, file: Buffer, filename: string): Promise<string>;
  
  updateUser(id: TUserId, updates: Partial<Omit<IUser, "id" | "createdAt" | "updatedAt">>): Promise<IUser>;
};

export interface IUserDBDTO extends IUser {
  image?: string | null;
  emailVerified: boolean;
};

export interface IUserStore {
  createUser(data: IUserDBDTO): Promise<IUserDBDTO>;  

  getUserByEmail(email: string): Promise<IUserDBDTO | null>;

  getUserById(id: TUserId): Promise<IUserDBDTO | null>;

  deleteUser(id: TUserId): Promise<void>;
  
  updateUser(data: IUserDBDTO): Promise<IUserDBDTO>;
}
