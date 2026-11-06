export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage?: string;
  coverImage?: string;
  schoolName: string;
  batchYear: string; // '2014'
  dateOfBirth: string;
  gender: string;
  profession: string;
  currentLocation: string;
  permanentAddress?: string;
  whatsappNumber?: string;
  facebookUrl?: string;
  bio: string;
  profileCompleted: boolean;
  accountStatus: 'pending' | 'approved' | 'suspended';
  role: 'super_admin' | 'member';
  privacySettings: {
    showPhone: boolean;
    showDob: boolean;
    profileVisible: boolean;
    showProfession: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface PostItem {
  id: string;
  authorUid: string;
  authorName: string;
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
  sender: string;
  senderUid?: string;
  text?: string;
  timestamp: number;
  time: string;
}
