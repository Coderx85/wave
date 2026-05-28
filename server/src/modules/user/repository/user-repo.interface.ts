import type { TUserId } from "@/types";
import type { IUser } from "../service/user-service.interface";

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
