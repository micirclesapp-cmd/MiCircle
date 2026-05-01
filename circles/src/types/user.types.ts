export interface User {
  uid: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  joinYear: number;
  createdAt: number;
  subscription?: 'free' | 'plus';
  upiId?: string;
}

// NOTE: phoneNumber must NEVER be in this interface or any Firestore document
