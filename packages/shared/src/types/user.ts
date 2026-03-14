export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: string;
}
