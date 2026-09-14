export interface UserModel {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  image?: string;
}
