export interface PrivacySettings {
  showPhone: boolean;
  showDob: boolean;
  profileVisible: boolean;
  showProfession: boolean;
}

export interface UserProfile {
  uid: string;
  // Legacy fields used by the current app
  name?: string;
  phone?: string;
  tshirt?: string;
  area?: string;
  village?: string;
  status?: 'pending' | 'approved' | 'suspended';
  // Extended profile fields
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  coverImage?: string;
  schoolName?: string;
  batchYear?: string;
  dateOfBirth?: string;
  gender?: string;
  profession?: string;
  currentLocation?: string;
  permanentAddress?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  bio?: string;
  profileCompleted?: boolean;
  accountStatus?: 'pending' | 'approved' | 'suspended';
  role: 'super_admin' | 'member';
  privacySettings?: PrivacySettings;
  createdAt: number;
  updatedAt?: number;
}

export interface PostItem {
  id: string;
  authorUid: string;
  authorName: string;
  authorImage?: string;
  authorVillage: string;
  content: string;
  mediaUrl?: string;
  likes: string[];
  commentsCount: number;
  timestamp: number;
  dateStr: string;
}

export interface PostComment {
  id: string;
  authorName: string;
  authorUid: string;
  text: string;
  timestamp: number;
}

export interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  imageUrl?: string;
  type?: 'text' | 'image' | 'system';
}
