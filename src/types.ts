export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  tshirt: string;
  area: string;
  village: string;
  role: 'super_admin' | 'member';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  friendsCount?: number;
  dob?: string; // Date of Birth (YYYY-MM-DD)
  fcmToken?: string; // Firebase Cloud Messaging Token
  createdAt: number;
}

export interface FriendRequest {
  id: string; 
  senderUid: string;
  senderName: string;
  receiverUid: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface PostItem {
  id: string;
  authorUid: string;
  authorName: string;
  authorVillage: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
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

export interface MemoryItem {
  id: string;
  uploader: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: number;
}

export interface BatchPrideItem {
  id: string;
  name: string;
  profession: string;
  organization: string;
  village: string;
  fullAddress: string;
  details: string;
  phone: string;
}

export interface TeacherItem {
  id: string;
  name: string;
  subject: string;
  designation: string;
  phone?: string;
}

export interface ChatMsg {
  id: string;
  sender: string;
  senderUid?: string;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  timestamp: number;
  time: string;
}

export interface ActiveCall {
  id: string;
  caller: string;
  status: 'ringing' | 'connected' | 'ended';
  timestamp: number;
}

export interface EventRegistration {
  id: string; 
  uid: string;
  name: string;
  phone: string;
  tshirt: string;
  guestCount: number;
  paymentStatus: 'unpaid' | 'paid';
  timestamp: number;
}
