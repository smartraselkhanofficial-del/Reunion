```tsx
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User 
} from "firebase/auth";

// ফায়ারবেস কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyBuY0Ns2bX1RlSK8673LnSQWnNpMcEJhRw",
  authDomain: "reunion-2027-4cedf.firebaseapp.com",
  projectId: "reunion-2027-4cedf",
  storageBucket: "reunion-2027-4cedf.firebasestorage.app",
  messagingSenderId: "221061203254",
  appId: "1:221061203254:web:834a0b5f60ced9429adf97"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// ইন্টারফেস
interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  tshirt: string;
  area: string;
  village: string;
  role: 'super_admin' | 'member';
  createdAt: number;
}

interface PostItem {
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

interface PostComment {
  id: string;
  authorName: string;
  authorUid: string;
  text: string;
  timestamp: number;
}

interface MemoryItem {
  id: string;
  uploader: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: number;
}

interface BatchPrideItem {
  id: string;
  name: string;
  profession: string;
  organization: string;
  village: string;
  fullAddress: string;
  details: string;
  phone: string;
}

interface TeacherItem {
  id: string;
  name: string;
  subject: string;
  designation: string;
  phone?: string;
}

interface ChatMsg {
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

interface ActiveCall {
  id: string;
  caller: string;
  status: 'ringing' | 'connected' | 'ended';
  timestamp: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'pride' | 'directory' | 'chat' | 'school'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // অথেনটিকেশন ও প্রোফাইল
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authVillage, setAuthVillage] = useState('');
  const [authArea, setAuthArea] = useState('');
  const [authTshirt, setAuthTshirt] = useState('L');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // সোশ্যাল টাইমলাইন পোস্ট স্টেটস
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostFile, setNewPostFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const postFileInputRef = useRef<HTMLInputElement>(null);

  // অন্যান্য ডেটাবেস স্টেটস
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [prideList, setPrideList] = useState<BatchPrideItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);

  // সেটিংস
  const [announcement, setAnnouncement] = useState('পবিত্র ঈদুল আজহা ২০২৭ উপলক্ষে সান্দিকোনা স্কুল এন্ড কলেজের এসএসসি ২০১৪ ব্যাচের পুনর্মিলনী অনুষ্ঠিত হবে।');
  const [schoolHistory, setSchoolHistory] = useState('ঐতিহ্যবাহী সান্দিকোনা স্কুল এন্ড কলেজ নেত্রকোনা জেলার কেন্দুয়া উপজেলার একটি স্বনামধন্য বিদ্যাপীঠ।');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://github.com');
  const [headerBgUrl, setHeaderBgUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // ঘড়ি ও কাউন্টার
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // নোটিফিকেশন
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);
  const isInitialMembers = useRef(false);
  const isInitialMessages = useRef(false);
  const isInitialAdminNotifs = useRef(false);

  // কলিং
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const [currentCallSession, setCurrentCallSession] = useState<ActiveCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const callTimerRef = useRef<any>(null);
  const ringtoneOscRef = useRef<any>(null);

  // অ্যাডমিন
  const [showAdmin, setShowAdmin] = useState(false);
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const [newHistoryInput, setNewHistoryInput] = useState('');
  const [newApkUrlInput, setNewApkUrlInput] = useState('');
  const [adminBroadcastTitle, setAdminBroadcastTitle] = useState('');
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // মেমোরি আপলোড
  const [showMemoryUploadModal, setShowMemoryUploadModal] = useState(false);
  const [memCaption, setMemCaption] = useState('');
  const [selectedMemFile, setSelectedMemFile] = useState<File | null>(null);
  const [memUploadProgress, setMemUploadProgress] = useState<string | null>(null);

  // গৌরব ও শিক্ষক মডাল
  const [showAddPrideModal, setShowAddPrideModal] = useState(false);
  const [prideName, setPrideName] = useState('');
  const [prideProfession, setPrideProfession] = useState('');
  const [prideOrg, setPrideOrg] = useState('');
  const [prideVillage, setPrideVillage] = useState('');
  const [prideFullAddress, setPrideFullAddress] = useState('');
  const [prideDetails, setPrideDetails] = useState('');
  const [pridePhone, setPridePhone] = useState('');

  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [teachName, setTeachName] = useState('');
  const [teachSubject, setTeachSubject] = useState('');
  const [teachDesig, setTeachDesig] = useState('');
  const [teachPhone, setTeachPhone] = useState('');

  // চ্যাট
  const [msgInput, setMsgInput] = useState('');
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const [chatUploadProgress, setChatUploadProgress] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/GPwXRoWdZ748lL5182iBCj?s=cl&p=a&mlu=4&ilr=4&iam=2";
  const MESSENGER_GROUP_URL = "https://m.me/j/EHb16biwgroNmlDh/?send_source=gc%3Acopy_invite_link_t";

  // ========================================================
  // ১. ফ্রি ইমেজ অপ্টিমাইজার (Canvas Compression)
  // ========================================================
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 900;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.65));
        };
      };
    });
  };

  // ========================================================
  // ২. Firebase Auth লিসেনার
  // ========================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          }
        } catch (e) {
          console.error("Profile load error:", e);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);
  const phoneToEmail = (rawPhone: string) => {
    const clean = rawPhone.replace(/[^\d]/g, '');
    return clean + '@sandikona2014.org';
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    const clean = authPhone.replace(/[^\d]/g, '');
    if (clean.length < 11) {
      setAuthError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      setAuthSubmitting(false);
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      setAuthSubmitting(false);
      return;
    }

    try {
      const email = phoneToEmail(clean);
      const userCredential = await createUserWithEmailAndPassword(auth, email, authPassword);
      const user = userCredential.user;
      const isSuperAdmin = clean.includes('01705374798') || clean.includes('1705374798');

      const newProfile: UserProfile = {
        uid: user.uid,
        name: authName.trim(),
        phone: clean,
        tshirt: authTshirt,
        area: authArea.trim() || 'কেন্দুয়া',
        village: authVillage.trim() || 'সান্দিকোনা',
        role: isSuperAdmin ? 'super_admin' : 'member',
        createdAt: Date.now()
      };

      await setDoc(doc(db, "users", user.uid), newProfile);
      setUserProfile(newProfile);
      setShowAuthModal(false);
      setAuthPhone('');
      setAuthPassword('');
      setAuthName('');
      triggerNativeNotification("স্বাগতম!", "অভিনন্দন, আপনার অ্যাকাউন্ট তৈরি হয়েছে!");   
      } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('এই মোবাইল নম্বর দিয়ে ইতোমধ্যে অ্যাকাউন্ট তৈরি করা আছে। দয়া করে লগইন করুন।');
      } else {
        setAuthError(err.message || 'অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে।');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    const clean = authPhone.replace(/[^\d]/g, '');
    if (clean.length < 11) {
      setAuthError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
      setAuthSubmitting(false);
      return;
    }

    try {
      const email = phoneToEmail(clean);
      const userCredential = await signInWithEmailAndPassword(auth, email, authPassword);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
      setShowAuthModal(false);
      setAuthPhone('');
      setAuthPassword('');
    } catch (err) {
      setAuthError('ভুল মোবাইল নম্বর বা পাসওয়ার্ড।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("আপনি কি লগআউট করতে চান?")) {
      await signOut(auth);
      setShowAdmin(false);
    }
  };

  // ========================================================
  // ৩. নোটিফিকেশন ইঞ্জিন
  // ========================================================
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swCode = `
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('activate', e => e.waitUntil(clients.claim()));
        self.addEventListener('notificationclick', e => {
          e.notification.close();
          e.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
          }));
        });
      `;
      const blob = new Blob([swCode], { type: 'application/javascript' });
      navigator.serviceWorker.register(URL.createObjectURL(blob))
        .then(reg => { swReg.current = reg; })
        .catch(() => {});
    }

    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestAllAppPermissions = async () => {
    if ("Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        if (perm === 'granted') {
          triggerNativeNotification("পুনর্মিলনী ২০২৭", "সব নোটিফিকেশন এখন আপনার মোবাইলের নোটিফিকেশন বারে পৌঁছাবে।");
        }
      } catch (e) {}
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      } catch (e) {}
    }
  };

  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  const triggerNativeNotification = (title: string, body: string, icon = '🔔') => {
    playChimeSound();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    if (swReg.current && notifPermission === 'granted') {
      swReg.current.showNotification(title, {
        body,
        icon: '/header-bg.jpg',
        badge: '/header-bg.jpg',
        vibrate: [200, 100, 200],
        tag: 'reunion-2027-notification'
      } as any);
    } else if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch (e) {}
    }

    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 6000);
  };

  // ========================================================
  // ৪. অডিও কলিং ইঞ্জিন
  // ========================================================
  const startRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ringtoneOscRef.current = { ctx, osc };
    } catch (e) {}
  };

  const stopRingtone = () => {
    if (ringtoneOscRef.current) {
      try {
        ringtoneOscRef.current.osc.stop();
        ringtoneOscRef.current.ctx.close();
      } catch (e) {}
      ringtoneOscRef.current = null;
    }
  };

  useEffect(() => {
    const unsubCalls = onSnapshot(collection(db, "active_calls"), (snap) => {
      snap.docChanges().forEach((change) => {
        const callData = { id: change.doc.id, ...change.doc.data() } as ActiveCall;
        const myName = userProfile?.name || 'সহপাঠী';

        if (change.type === "added" && callData.status === "ringing" && callData.caller !== myName) {
          setIncomingCall(callData);
          startRingtone();
          triggerNativeNotification("📞 ইনকামিং অডিও কল", `${callData.caller} আপনাকে কল দিচ্ছেন...`);
        }

        if (change.type === "modified" || change.type === "removed") {
          if (callData.status === "ended") {
            stopRingtone();
            setIncomingCall(null);
            setCurrentCallSession(null);
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setCallDuration(0);
          }
        }
      });
    });

    return () => unsubCalls();
  }, [userProfile]);

  const initiateCallToAll = async () => {
    if (!currentUser || !userProfile) {
      alert('কল করার জন্য প্রথমে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const callRef = await addDoc(collection(db, "active_calls"), {
        caller: userProfile.name,
        status: 'ringing',
        timestamp: Date.now()
      });

      setCurrentCallSession({
        id: callRef.id,
        caller: userProfile.name,
        status: 'ringing',
        timestamp: Date.now()
      });
      setCallDuration(0);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } catch (e) {
      alert('কল করতে মাইক্রোফোন পারমিশন এলাও করুন।');
    }
  };

  const acceptIncomingCall = async () => {
    stopRingtone();
    if (!incomingCall) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await setDoc(doc(db, "active_calls", incomingCall.id), { status: 'connected' }, { merge: true });
      setCurrentCallSession(incomingCall);
      setIncomingCall(null);
      setCallDuration(0);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
    } catch (e) {
      alert('মাইক্রোফোন পারমিশন দিন।');
    }
  };

  const rejectOrEndCall = async () => {
    stopRingtone();
    if (incomingCall) {
      await setDoc(doc(db, "active_calls", incomingCall.id), { status: 'ended' }, { merge: true });
      setIncomingCall(null);
    }
    if (currentCallSession) {
      await setDoc(doc(db, "active_calls", currentCallSession.id), { status: 'ended' }, { merge: true });
      setCurrentCallSession(null);
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ========================================================
  // ৫. লাইভ ঘড়ি ও ব্যাচ টাইম কাউন্টার
  // ========================================================
  useEffect(() => {
    const sscDate = new Date('2014-05-17T00:00:00');
    const update = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateStr(now.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

      let years = now.getFullYear() - sscDate.getFullYear();
      let months = now.getMonth() - sscDate.getMonth();
      let days = now.getDate() - sscDate.getDate();
      let hours = now.getHours() - sscDate.getHours();
      let minutes = now.getMinutes() - sscDate.getMinutes();
      let seconds = now.getSeconds() - sscDate.getSeconds();

      if (seconds < 0) { seconds += 60; minutes--; }
      if (minutes < 0) { minutes += 60; hours--; }
      if (hours < 0) { hours += 24; days--; }
      if (days < 0) {
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      if (months < 0) { months += 12; years--; }

      setBatchTimeElapsed({ years, months, days, hours, minutes, seconds });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (memories.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % memories.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [memories.length]);

  // ========================================================
  // ৬. ফায়ারবেস ডেটা লিসেনার ও সোশ্যাল পোস্ট সিঙ্ক
  // ========================================================
  useEffect(() => {
    // মেম্বার প্রোফাইল
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
      setIsLoading(false);

      if (isInitialMembers.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const m = c.doc.data() as UserProfile;
            triggerNativeNotification("🎉 নতুন সহপাঠী যুক্ত হয়েছেন!", `${m.name} (${m.village || m.area}) পুনর্মিলনীতে যোগ দিয়েছেন।`, "🎓");
          }
        });
      } else {
        isInitialMembers.current = true;
      }
    }, () => setIsLoading(false));

    // সোশ্যাল টাইমলাইন পোস্ট সিঙ্ক
    const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const list: PostItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(list);
    });

    // মেমোরিজ
    const qMemories = query(collection(db, "memories"), orderBy("timestamp", "desc"));
    const unsubMemories = onSnapshot(qMemories, (snap) => {
      const list: MemoryItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MemoryItem));
      setMemories(list);
    });

    // ব্যাচের গৌরব
    const unsubPride = onSnapshot(collection(db, "batch_pride"), (snap) => {
      const list: BatchPrideItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as BatchPrideItem));
      setPrideList(list);
    });

    // শিক্ষক তালিকা
    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      const list: TeacherItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as TeacherItem));
      setTeachers(list);
    });

    // চ্যাট মেসেজ
    const qMessages = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubChat = onSnapshot(qMessages, (snap) => {
      const msgs: ChatMsg[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as ChatMsg));
      setChatMessages(msgs);

      if (isInitialMessages.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const m = c.doc.data() as ChatMsg;
            if (m.senderUid !== currentUser?.uid) {
              triggerNativeNotification(`💬 ${m.sender}`, m.text || "📷 মিডিয়া পাঠিয়েছেন", "💬");
            }
          }
        });
      } else {
        isInitialMessages.current = true;
      }
    });

    // অ্যাডমিন নোটিশ ব্রডকাস্ট
    const qAdminNotifs = query(collection(db, "admin_broadcasts"), orderBy("timestamp", "asc"));
    const unsubAdminBroadcast = onSnapshot(qAdminNotifs, (snap) => {
      if (isInitialAdminNotifs.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const d = c.doc.data();
            triggerNativeNotification(d.title || "📢 অ্যাডমিন বার্তা", d.body || "", "📢");
          }
        });
      } else {
        isInitialAdminNotifs.current = true;
      }
    });

    const unsubSettings = onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.announcement) setAnnouncement(data.announcement);
        if (data?.schoolHistory) setSchoolHistory(data.schoolHistory);
        if (data?.apkUrl) setApkDownloadUrl(data.apkUrl);
        if (data?.headerBg) setHeaderBgUrl(data.headerBg);
      }
    });

    const unsubTyping = onSnapshot(doc(db, "settings", "typing"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.user && data.user !== userProfile?.name && Date.now() - data.time < 3500) {
          setTypingUser(data.user);
        } else {
          setTypingUser(null);
        }
      }
    });

    return () => {
      unsubUsers();
      unsubPosts();
      unsubMemories();
      unsubPride();
      unsubTeachers();
      unsubChat();
      unsubAdminBroadcast();
      unsubSettings();
      unsubTyping();
    };
  }, [currentUser, userProfile]);

  // নির্বাচিত পোস্টের কমেন্ট লিসেনার
  useEffect(() => {
    if (!activeCommentsPostId) {
      setCommentsList([]);
      return;
    }

    const qComments = query(
      collection(db, "posts", activeCommentsPostId, "comments"),
      orderBy("timestamp", "asc")
    );

    const unsubComments = onSnapshot(qComments, (snap) => {
      const list: PostComment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostComment));
      setCommentsList(list);
    });

    return () => unsubComments();
  }, [activeCommentsPostId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // ========================================================
  // ৭. সোশ্যাল পোস্ট তৈরি, লাইক ও কমেন্ট ইঞ্জিন
  // ========================================================
  // নতুন পোস্ট পাবলিশ
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      alert('পোস্ট করার জন্য প্রথমে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }
    if (!newPostText.trim() && !newPostFile) return;

    setIsPosting(true);
    try {
      let finalMediaUrl = '';
      if (newPostFile) {
        finalMediaUrl = await compressImage(newPostFile);
      }

      await addDoc(collection(db, "posts"), {
        authorUid: currentUser.uid,
        authorName: userProfile.name,
        authorVillage: userProfile.village || userProfile.area,
        content: newPostText.trim(),
        mediaUrl: finalMediaUrl || null,
        likes: [],
        commentsCount: 0,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      setNewPostText('');
      setNewPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = '';
      alert('আপনার পোস্টটি টাইমলাইনে সফলভাবে প্রকাশিত হয়েছে!');
    } catch (err) {
      alert('পোস্ট প্রকাশ করতে সমস্যা হয়েছে।');
    } finally {
      setIsPosting(false);
    }
  };

  // লাইক বা আনলাইক টগল
  const handleToggleLike = async (post: PostItem) => {
    if (!currentUser) {
      alert('লাইক দিতে প্রথমে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }

    const currentLikes = post.likes || [];
    const isLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = isLiked 
      ? currentLikes.filter(uid => uid !== currentUser.uid)
      : [...currentLikes, currentUser.uid];

    try {
      await setDoc(doc(db, "posts", post.id), { likes: updatedLikes }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  // কমেন্ট জমা দেওয়া
  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      alert('মন্তব্য করতে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }
    if (!commentInput.trim()) return;

    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        authorName: userProfile.name,
        authorUid: currentUser.uid,
        text: commentInput.trim(),
        timestamp: Date.now()
      });

      const targetPost = posts.find(p => p.id === postId);
      if (targetPost) {
        await setDoc(doc(db, "posts", postId), { commentsCount: (targetPost.commentsCount || 0) + 1 }, { merge: true });
      }

      setCommentInput('');
    } catch (e) {
      alert('মন্তব্য পোস্ট করা যায়নি।');
    }
  };

  // পোস্ট ডিলিট
  const handleDeletePost = async (postId: string, authorUid: string) => {
    if (!currentUser) return;
    const isAuthorized = currentUser.uid === authorUid || userProfile?.role === 'super_admin';
    if (!isAuthorized) {
      alert('শুধুমাত্র পোস্টদাতা বা অ্যাডমিন এই পোস্ট ডিলিট করতে পারবেন।');
      return;
    }

    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই পোস্টটি টাইমলাইন থেকে মুছে ফেলতে চান?")) return;

    try {
      await deleteDoc(doc(db, "posts", postId));
      alert('পোস্টটি মুছে ফেলা হয়েছে।');
    } catch (err) {
      alert('ডিলিট করা যায়নি।');
    }
  };

  // স্মৃতি আপলোড
  const handleUploadMemoryFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      alert('স্মৃতি আপলোড করার জন্য প্রথমে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }
    if (!selectedMemFile) return;

    setMemUploadProgress('ছবি অপ্টিমাইজ করা হচ্ছে...');
    try {
      const finalMediaUrl = await compressImage(selectedMemFile);
      await addDoc(collection(db, "memories"), {
        uploader: userProfile.name,
        uploaderUid: currentUser.uid,
        caption: memCaption.trim() || 'স্কুল জীবনের স্মৃতি',
        mediaUrl: finalMediaUrl,
        mediaType: 'image',
        timestamp: Date.now()
      });

      setMemUploadProgress(null);
      setShowMemoryUploadModal(false);
      setSelectedMemFile(null);
      setMemCaption('');
      alert('স্মৃতি সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      alert('আপলোড ত্রুটি হয়েছে।');
      setMemUploadProgress(null);
    }
  };

  // চ্যাটে ছবি পাঠানো
  const handleSendChatFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      alert('মেসেজ পাঠাতে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }
    if (!msgInput.trim() && !selectedChatFile) return;

    if (selectedChatFile) {
      setChatUploadProgress('ছবি অপ্টিমাইজ হচ্ছে...');
      try {
        const finalUrl = await compressImage(selectedChatFile);
        await addDoc(collection(db, "messages"), {
          sender: userProfile.name,
          senderUid: currentUser.uid,
          text: msgInput.trim() || '',
          fileUrl: finalUrl,
          fileType: selectedChatFile.type,
          fileName: selectedChatFile.name,
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setChatUploadProgress(null);
        setSelectedChatFile(null);
        setMsgInput('');
        if (chatFileInputRef.current) chatFileInputRef.current.value = '';
      } catch (err) {
        alert('ছবি পাঠাতে সমস্যা হয়েছে।');
        setChatUploadProgress(null);
      }
    } else {
      await addDoc(collection(db, "messages"), {
        sender: userProfile.name,
        senderUid: currentUser.uid,
        text: msgInput.trim(),
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setMsgInput('');
    }
  };

  // অ্যাডমিন হেডার ছবি পরিবর্তন
  const handleHeaderBgUploadFree = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBg = await compressImage(file);
      setHeaderBgUrl(compressedBg);
      await setDoc(doc(db, "settings", "app_config"), { headerBg: compressedBg }, { merge: true });
      alert('হেডার ব্যাকগ্রাউন্ড ছবি সবার জন্য লাইভ আপডেট হয়েছে!');
    } catch (err) {
      alert('ছবি আপলোডে সমস্যা হয়েছে।');
    }
  };

  // গৌরব সাবমিট
  const handleAddPrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prideName.trim() || !prideProfession.trim()) return;

    try {
      await addDoc(collection(db, "batch_pride"), {
        name: prideName.trim(),
        profession: prideProfession.trim(),
        organization: prideOrg.trim() || 'স্বতন্ত্র',
        village: prideVillage.trim() || 'সান্দিকোনা',
        fullAddress: prideFullAddress.trim() || 'কেন্দুয়া, নেত্রকোনা',
        details: prideDetails.trim() || 'ব্যাচের গর্বিত সহপাঠী',
        phone: pridePhone.trim()
      });
      setShowAddPrideModal(false);
      setPrideName('');
      setPrideProfession('');
      setPrideOrg('');
      setPrideVillage('');
      setPrideFullAddress('');
      setPrideDetails('');
      setPridePhone('');
      alert('ব্যাচের গৌরবে যুক্ত হয়েছে!');
    } catch (e) {
      alert('ব্যর্থ হয়েছে।');
    }
  };

  // শিক্ষক সাবমিট
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachName.trim()) return;
    try {
      await addDoc(collection(db, "teachers"), {
        name: teachName.trim(),
        subject: teachSubject.trim() || 'শিক্ষক',
        designation: teachDesig.trim() || 'সহকারী শিক্ষক',
        phone: teachPhone.trim()
      });
      setShowAddTeacherModal(false);
      setTeachName('');
      setTeachSubject('');
      setTeachDesig('');
      setTeachPhone('');
      alert('শিক্ষকের পরিচিতি যুক্ত হয়েছে!');
    } catch (e) {}
  };

  // অ্যাডমিন নোটিশ ব্রডকাস্ট
  const handleSendAdminBroadcast = async () => {
    if (!adminBroadcastMsg.trim()) return;
    setIsSendingBroadcast(true);
    try {
      await addDoc(collection(db, "admin_broadcasts"), {
        title: adminBroadcastTitle.trim() || '📢 জরুরি বার্তা — স্মার্ট রাসেল খান',
        body: adminBroadcastMsg.trim(),
        timestamp: Date.now()
      });
      setAdminBroadcastTitle('');
      setAdminBroadcastMsg('');
      alert('সবার ফোনের নোটিফিকেশন বারে পৌঁছে গেছে!');
    } catch (err) {
      alert('ব্যর্থ হয়েছে।');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleShareApp = async () => {
    const finalDownloadUrl = apkDownloadUrl.trim() || 'https://github.com';
    const shareText = `🎉 সান্দিকোনা স্কুল এন্ড কলেজ — এসএসসি ব্যাচ ২০১৪ পুনর্মিলনী ২০২৭\nআমাদের বন্ধুদের অফিশিয়াল অ্যাপে যুক্ত হোন ও স্মৃতি শেয়ার করুন!\n\n📲 অ্যাপ ডাউনলোড লিংক:\n${finalDownloadUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'পুনর্মিলনী ২০২৭ - এসএসসি ২০১৪', text: shareText }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText);
      alert('অ্যাপের ডাউনলোড লিংক ও দাওয়াত কপি করা হয়েছে!');
    }
  };

  const filteredMembers = allUsers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.area.toLowerCase().includes(searchQuery.toLowerCase()) || m.village.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#F3F6F4',
      minHeight: '100vh',
      color: '#1A2E22',
      paddingBottom: '80px',
      margin: 0,
      userSelect: 'none'
    }}>

      {/* ড্রপ-ডাউন ব্যানার অ্যালার্ট */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '460px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 14px',
          borderRadius: '14px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.4)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1.5px solid #F59E0B',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ fontSize: '22px' }}>{activeToast.icon}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#FCD34D', fontWeight: '800' }}>
              {activeToast.title}
            </h5>
            <p style={{ margin: 0, fontSize: '11px', color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeToast.body}
            </p>
          </div>
          <button onClick={() => setActiveToast(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ইনকামিং অডিও কল স্ক্রিন */}
      {incomingCall && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.96)',
          zIndex: 1000000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '50px 20px',
          color: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.2)', padding: '4px 14px', borderRadius: '20px', fontWeight: '800' }}>
              📞 ইনকামিং অডিও কল
            </span>
            <h2 style={{ fontSize: '26px', margin: '16px 0 4px 0', fontWeight: '900' }}>
              {incomingCall.caller}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>আপনাকে সরাসরি অডিও কল দিচ্ছেন...</p>
          </div>

          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            border: '4px solid #10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.5)'
          }}>
            👤
          </div>

          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <button onClick={rejectOrEndCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            <button onClick={acceptIncomingCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', fontSize: '24px', cursor: 'pointer' }}>📞</button>
          </div>
        </div>
      )}

      {/* রানিং অডিও কল স্ক্রিন */}
      {currentCallSession && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0F172A',
          zIndex: 1000000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '40px 20px',
          color: '#FFFFFF'
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 12px', borderRadius: '20px', fontWeight: '800' }}>● সংযুক্ত অডিও কল</span>
            <h3 style={{ fontSize: '22px', margin: '12px 0 2px 0', fontWeight: '900' }}>
              {currentCallSession.caller === userProfile?.name ? 'আপনার ডায়াল করা কল' : currentCallSession.caller}
            </h3>
            <span style={{ fontSize: '14px', color: '#38BDF8', fontFamily: 'monospace' }}>{formatTimer(callDuration)}</span>
          </div>

          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#1E293B',
            border: isMicMuted ? '4px solid #EF4444' : '4px solid #10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px'
          }}>
            {isMicMuted ? '🔇' : '🎙️'}
          </div>

          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <button onClick={() => setIsMicMuted(!isMicMuted)} style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: isMicMuted ? '#EF4444' : '#334155', color: '#FFFFFF', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
              {isMicMuted ? '🔇' : '🎙️'}
            </button>
            <button onClick={rejectOrEndCall} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '24px', cursor: 'pointer' }}>📞</button>
          </div>
        </div>
      )}

      {/* অথেনটিকেশন স্ট্যাটাস বার */}
      <div style={{
        background: '#062B1A',
        color: '#E2E8F0',
        padding: '5px 12px',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {currentUser && userProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#10B981', fontWeight: '800' }}>● {userProfile.name}</span>
            {userProfile.role === 'super_admin' && (
              <span style={{ background: '#F59E0B', color: '#000', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' }}>
                অ্যাডমিন
              </span>
            )}
          </div>
        ) : (
          <span style={{ color: '#FCD34D' }}>⚠️ অ্যাকাউন্টে লগইন করা নেই</span>
        )}

        <div>
          {currentUser ? (
            <button onClick={handleLogout} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
              লগআউট
            </button>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '2px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}>
              লগইন / সাইন আপ
            </button>
          )}
        </div>
      </div>

      {/* বড় ব্যানার শুধু HOME ট্যাবে থাকবে */}
      {activeTab === 'home' ? (
        <>
          <div style={{
            background: 'linear-gradient(90deg, #0A4D2E 0%, #06321D 100%)',
            color: '#FEF08A',
            padding: '5px 12px',
            fontSize: '11px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
              <span>🕒 সময়:</span>
              <span style={{ color: '#FFFFFF', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>
                {currentTimeStr || '...'}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#E2E8F0', fontWeight: '600' }}>
              📅 {currentDateStr || '...'}
            </div>
          </div>

          <header style={{
            backgroundImage: headerBgUrl 
              ? `linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.72) 100%), url('${headerBgUrl}')`
              : `linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.72) 100%), url('/header-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            backgroundRepeat: 'no-repeat',
            color: '#FFFFFF',
            padding: '20px 14px 14px 14px',
            textAlign: 'center',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <span style={{ fontSize: '10px', backgroundColor: 'rgba(0, 0, 0, 0.65)', color: '#FEF08A', padding: '3px 12px', borderRadius: '16px', border: '1.2px solid rgba(212, 175, 55, 0.7)', fontWeight: '800', display: 'inline-block' }}>
                সান্দিকোনা স্কুল এন্ড কলেজ
              </span>
              <h1 style={{ fontSize: '24px', margin: '6px 0 1px 0', fontWeight: '900', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                পুনর্মিলনী ২০২৭
              </h1>
              <p style={{ fontSize: '13px', margin: 0, fontWeight: '800', color: '#F0FDF4', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                এসএসসি ব্যাচ ২০১৪
              </p>
              <div style={{ marginTop: '6px', display: 'inline-block', backgroundColor: 'rgba(0, 0, 0, 0.65)', padding: '3px 12px', borderRadius: '10px', fontSize: '10px', color: '#F8FAFC', fontWeight: '700' }}>
                🤝 আয়োজনে: এসএসসি ২০১৪ ব্যাচ পুনর্মিলনী সংসদ
              </div>
            </div>
          </header>

          <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '6px 10px', display: 'flex', alignItems: 'center', overflow: 'hidden', borderBottom: '2px solid #D4AF37' }}>
            <span style={{ backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}>
              📢 নোটিশ:
            </span>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
              <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '11px', color: '#FEF08A', fontWeight: '600' }}>
                {announcement}
              </marquee>
            </div>
          </div>

          <div style={{ maxWidth: '500px', margin: '10px auto 0 auto', padding: '0 12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0A4D2E 0%, #116B3E 100%)', color: '#FFFFFF', borderRadius: '14px', padding: '10px 12px', textAlign: 'center', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
              <span style={{ fontSize: '10px', color: '#FEF08A', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                ⏳ ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়:
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>বছর</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>মাস</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>দিন</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>ঘণ্টা</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>মিনিট</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '9px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '500px', margin: '8px auto 0 auto', padding: '0 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#FFFFFF', padding: '9px', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800', fontSize: '11px' }}>
                <span>💬</span> WhatsApp গ্রুপ
              </a>
              <a href={MESSENGER_GROUP_URL} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #00B2FF 0%, #006AFF 100%)', color: '#FFFFFF', padding: '9px', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800', fontSize: '11px' }}>
                <span>⚡</span> Messenger গ্রুপ
              </a>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#0A4D2E', color: '#FFFFFF', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #D4AF37' }}>
          <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', color: '#FEF08A', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
            ← হোমে ফিরুন
          </button>
          <span style={{ fontSize: '13px', fontWeight: '800' }}>
            {activeTab === 'memories' && '📸 পুরনো দিনের স্মৃতি'}
            {activeTab === 'pride' && '🏆 আমাদের ব্যাচের গৌরব'}
            {activeTab === 'directory' && '👥 সহপাঠীদের তালিকা'}
            {activeTab === 'school' && '🏫 বিদ্যালয় ও শিক্ষক পরিচিতি'}
            {activeTab === 'chat' && '💬 এসএসসি ২০১৪ আড্ডা'}
          </span>
          <span style={{ fontSize: '11px', color: '#A7F3D0' }}>ব্যাচ ২০১৪</span>
        </div>
      )}

      {/* মূল পেজসমূহ */}
      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '12px' }}>

        {/* হোম ট্যাব: ফেসবুকের মতো সোশ্যাল টাইমলাইন ফিড */}
        {activeTab === 'home' && (
          <div>
            {/* নতুন পোস্ট তৈরির বক্স */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '12px', marginBottom: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>✍️</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0A4D2E' }}>বন্ধুদের সাথে কিছু শেয়ার করুন:</span>
              </div>
              <form onSubmit={handleCreatePost}>
                <textarea
                  rows={2}
                  placeholder={currentUser ? `${userProfile?.name}, স্কুল জীবনের কোনো স্মৃতি বা ভাবনা লিখুন...` : "পোস্ট করতে প্রথমে লগইন করুন..."}
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  disabled={!currentUser}
                  style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
                
                {newPostFile && (
                  <div style={{ margin: '6px 0', fontSize: '11px', color: '#15803D', fontWeight: '700' }}>
                    📎 ছবি যুক্ত হয়েছে: {newPostFile.name}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <input
                    type="file"
                    ref={postFileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setNewPostFile(f);
                    }}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) { alert('লগইন করুন'); setShowAuthModal(true); return; }
                      postFileInputRef.current?.click();
                    }}
                    style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    📷 ছবি যোগ করুন
                  </button>

                  <button
                    type="submit"
                    disabled={isPosting || !currentUser}
                    style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', opacity: isPosting ? 0.6 : 1 }}
                  >
                    {isPosting ? 'পোস্ট হচ্ছে...' : 'পোস্ট করুন 🚀'}
                  </button>
                </div>
              </form>
            </div>

            {/* ফেসবুকের মতো লাইভ টাইমলাইন পোস্টের তালিকা */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', background: '#FFFFFF', borderRadius: '14px', color: '#64748B', fontSize: '12px' }}>
                  এখনো কোনো পোস্ট দেওয়া হয়নি। প্রথম পোস্টটি আপনিই করুন!
                </div>
              ) : (
                posts.map((post) => {
                  const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;
                  const canDelete = currentUser && (currentUser.uid === post.authorUid || userProfile?.role === 'super_admin');

                  return (
                    <div key={post.id} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '13px', color: '#0F172A', fontWeight: '800' }}>{post.authorName}</h4>
                          <span style={{ fontSize: '10px', color: '#64748B' }}>🏡 {post.authorVillage} • 🕒 {post.dateStr}</span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDeletePost(post.id, post.authorUid)}
                            style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            🗑️ মুছুন
                          </button>
                        )}
                      </div>

                      {post.content && (
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1E293B', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                          {post.content}
                        </p>
                      )}

                      {post.mediaUrl && (
                        <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', backgroundColor: '#0F172A' }}>
                          <img src={post.mediaUrl} alt="Post Attachment" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', display: 'block' }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px', marginBottom: '8px' }}>
                        <span>❤️ {(post.likes || []).length} জন লাইক দিয়েছেন</span>
                        <span>💬 {post.commentsCount || 0} টি মন্তব্য</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleLike(post)}
                          style={{ flex: 1, background: isLiked ? '#FEE2E2' : '#F8FAFC', color: isLiked ? '#DC2626' : '#475569', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <span>{isLiked ? '❤️' : '🤍'}</span> {isLiked ? 'লাইক করেছেন' : 'লাইক দিন'}
                        </button>

                        <button
                          onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                          style={{ flex: 1, background: activeCommentsPostId === post.id ? '#DCFCE7' : '#F8FAFC', color: activeCommentsPostId === post.id ? '#15803D' : '#475569', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <span>💬</span> মন্তব্য করুন
                        </button>
                      </div>

                      {activeCommentsPostId === post.id && (
                        <div style={{ marginTop: '10px', background: '#F8FAFC', borderRadius: '10px', padding: '10px', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', marginBottom: '8px' }}>
                            {commentsList.length === 0 ? (
                              <span style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>প্রথম মন্তব্যটি আপনিই করুন!</span>
                            ) : (
                              commentsList.map(c => (
                                <div key={c.id} style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                                  <strong style={{ color: '#0A4D2E' }}>{c.authorName}:</strong> {c.text}
                                </div>
                              ))
                            )}
                          </div>

                          <form onSubmit={(e) => handleAddComment(e, post.id)} style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="মন্তব্য লিখুন..."
                              value={commentInput}
                              onChange={e => setCommentInput(e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '11px', outline: 'none' }}
                            />
                            <button type="submit" style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                              পাঠান
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* স্মৃতি অ্যালবাম স্লাইডার */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '12px', marginBottom: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', color: '#0A4D2E', fontWeight: '800' }}>📸 পুরনো দিনের স্মৃতি</h4>
                <span style={{ fontSize: '9px', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '8px', fontWeight: '700' }}>লাইভ অ্যালবাম</span>
              </div>

              {memories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', background: '#F8FAFC', borderRadius: '12px', fontSize: '11px' }}>
                  কোনো স্মৃতি যোগ করা হয়নি।
                </div>
              ) : (
                <div>
                  <div style={{ position: 'relative', height: '170px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#0F172A' }}>
                    <img src={memories[currentSlideIndex].mediaUrl} alt="Memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '8px 10px', color: '#FFFFFF' }}>
                      <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: '700' }}>{memories[currentSlideIndex].caption}</p>
                      <span style={{ fontSize: '9px', color: '#FEF08A' }}>👤 শেয়ার করেছেন: {memories[currentSlideIndex].uploader}</span>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('memories')} style={{ width: '100%', marginTop: '8px', background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC', padding: '8px', borderRadius: '10px', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}>
                    📸 সমস্ত স্মৃতি দেখতে ক্লিক করুন ({memories.length}টি) →
                  </button>
                </div>
              )}
            </div>

            {/* কাউন্টার কার্ড */}
            <div onClick={() => setActiveTab('directory')} style={{ background: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '2px solid #BBF7D0', textAlign: 'center', marginBottom: '12px', cursor: 'pointer' }}>
              <span style={{ fontSize: '12px', color: '#137547', fontWeight: '700' }}>এসএসসি ব্যাচ ২০১৪</span>
              <h2 style={{ fontSize: '30px', margin: '2px 0', color: '#0A4D2E', fontWeight: '900' }}>{isLoading ? '...' : `${allUsers.length} জন`}</h2>
              <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: '700', textDecoration: 'underline' }}>👉 সকল সহপাঠীর তালিকা দেখতে ক্লিক করুন</span>
            </div>

            {/* ভেন্যু কার্ড */}
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#0A4D2E', fontWeight: '800' }}>📅 পুনর্মিলনীর সময় ও ভেন্যু</h3>
                <span style={{ fontSize: '9px', backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 6px', borderRadius: '6px', fontWeight: '700' }}>নির্ধারিত</span>
              </div>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#334155' }}>📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ</p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#137547', fontWeight: '700' }}>⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭</p>
            </div>
          </div>
        )}

        {/* খ. স্মৃতি গ্যালারি */}
        {activeTab === 'memories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0A4D2E', fontWeight: '800' }}>📸 বন্ধুদের স্মৃতি গ্যালারি</h3>
                <span style={{ fontSize: '10px', color: '#64748B' }}>স্কুল জীবনের সকল ছবি ও ভিডিও</span>
              </div>
              <button onClick={() => setShowMemoryUploadModal(true)} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                স্মৃতি যোগ করুন ➕
              </button>
            </div>

            {memories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#FFFFFF', borderRadius: '14px', color: '#64748B' }}>কোনো স্মৃতি পাওয়া যায়নি।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {memories.map((item) => (
                  <div key={item.id} style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    <div onContextMenu={(e) => e.preventDefault()} style={{ position: 'relative', width: '100%', backgroundColor: '#000000', userSelect: 'none' }}>
                      <img src={item.mediaUrl} alt={item.caption} style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.55)', color: '#FEF08A', fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        সান্দিকোনা ২০১৪ স্মৃতি
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#1E293B', fontWeight: '700' }}>{item.caption}</p>
                      <span style={{ fontSize: '10px', color: '#0A4D2E', fontWeight: '800', background: '#DCFCE7', padding: '2px 8px', borderRadius: '8px' }}>
                        👤 আপলোডকারী: {item.uploader}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* গ. ব্যাচের গৌরব */}
        {activeTab === 'pride' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0A4D2E', fontWeight: '800' }}>🏆 ব্যাচের গৌরব</h3>
                <span style={{ fontSize: '10px', color: '#64748B' }}>সফল সহপাঠীদের তালিকা</span>
              </div>
              <button onClick={() => setShowAddPrideModal(true)} style={{ background: '#D97706', color: '#FFFFFF', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                যুক্ত হোন ➕
              </button>
            </div>

            {prideList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#FFFFFF', borderRadius: '14px', color: '#64748B' }}>
                এখনো কেউ যুক্ত হননি। আপনার পেশা ও পরিচয় যুক্ত করতে বাটনে চাপ দিন!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {prideList.map((p) => (
                  <div key={p.id} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '14px', border: '1px solid #FEF08A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#0F172A', fontWeight: '800' }}>{p.name}</h4>
                        <span style={{ fontSize: '12px', color: '#D97706', fontWeight: '700' }}>
                          💼 {p.profession} {p.organization ? `(${p.organization})` : ''}
                        </span>
                      </div>
                      <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '9px', padding: '3px 6px', borderRadius: '6px', fontWeight: '800' }}>
                        গৌরবময় ব্যক্তিত্ব
                      </span>
                    </div>

                    <div style={{ marginTop: '6px', background: '#F8FAFC', padding: '6px 8px', borderRadius: '8px', fontSize: '11px', color: '#334155' }}>
                      <p style={{ margin: '2px 0' }}><strong>🏡 নিজ গ্রাম:</strong> {p.village || 'সান্দিকোনা'}</p>
                      <p style={{ margin: '2px 0' }}><strong>📍 পূর্ণ ঠিকানা:</strong> {p.fullAddress || 'কেন্দুয়া, নেত্রকোনা'}</p>
                    </div>

                    <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>{p.details}</p>

                    {p.phone && (
                      <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                        <a href={`tel:${p.phone}`} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>
                          📞 যোগাযোগ করুন
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ঘ. বিদ্যালয়ের ইতিহাস ও শিক্ষক */}
        {activeTab === 'school' && (
          <div>
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#0A4D2E', fontSize: '15px', fontWeight: '800' }}>
                🏫 বিদ্যালয়ের ইতিহাস ও পরিচিতি
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {schoolHistory}
              </p>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0A4D2E', fontWeight: '800' }}>
              👨‍🏫 শ্রদ্ধেয় শিক্ষক ও শিক্ষিকাগণ
            </h4>

            {teachers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', background: '#FFFFFF', borderRadius: '14px', color: '#64748B' }}>শিক্ষক তালিকা শীঘ্রই আসবে।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teachers.map((t) => (
                  <div key={t.id} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h5 style={{ margin: '0 0 2px 0', fontSize: '13px', color: '#0F172A', fontWeight: '800' }}>{t.name}</h5>
                      <span style={{ fontSize: '11px', color: '#137547' }}>{t.designation} • বিষয়: {t.subject}</span>
                    </div>
                    {t.phone && (
                      <a href={`tel:${t.phone}`} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>📞 কল</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ঙ. সহপাঠী ডিরেক্টরি */}
        {activeTab === 'directory' && (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <input type="text" placeholder="🔍 নাম, গ্রাম বা এলাকা দিয়ে খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }} />
            </div>

            <div style={{ fontSize: '11px', color: '#137547', fontWeight: '700', marginBottom: '8px' }}>
              মোট নিবন্ধিত সহপাঠী: {filteredMembers.length} জন
            </div>

            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', background: '#FFFFFF', borderRadius: '14px', color: '#64748B' }}>কোনো সহপাঠী পাওয়া যায়নি।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredMembers.map((m) => (
                  <div key={m.uid} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A', fontWeight: '700' }}>{m.name}</h4>
                      <p style={{ margin: 0, fontSize: '11px', color: '#137547' }}>এসএসসি ২০১৪ • 🏡 {m.village || m.area}</p>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>জার্সি: <strong>{m.tshirt}</strong></span>
                    </div>
                    <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>✓ ভেরিফাইড</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* চ. হোয়াটসঅ্যাপ আড্ডা */}
        {activeTab === 'chat' && (
          <div style={{ background: '#E5DDD5', borderRadius: '16px', border: '1px solid #CBD5E1', height: '72vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', background: '#075E54', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👥</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>এসএসসি ২০১৪ আড্ডা</h4>
                  <span style={{ fontSize: '9px', color: '#D1FAE5' }}>{typingUser ? `✍️ ${typingUser} লিখছেন...` : 'অনলাইন চ্যাট'}</span>
                </div>
              </div>

              <button onClick={initiateCallToAll} style={{ background: '#25D366', border: 'none', color: '#FFFFFF', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📞</span> অডিও কল
              </button>
            </div>

            {!currentUser || !userProfile ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>আড্ডায় প্রবেশ করতে লগইন করুন</h4>
                <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>মেসেজ দেওয়া ও অডিও কলে কথা বলতে আপনার অ্যাকাউন্ট লাগবে।</p>
                <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#075E54', color: '#FFFFFF', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                  লগইন / সাইন আপ করুন
                </button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {chatMessages.map((m) => {
                    const isMe = m.senderUid === currentUser.uid;
                    return (
                      <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: isMe ? '#DCF8C6' : '#FFFFFF', borderRadius: '12px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {!isMe && <span style={{ fontSize: '9px', color: '#075E54', fontWeight: '800', display: 'block', marginBottom: '2px' }}>{m.sender}</span>}
                        {m.fileUrl && <img src={m.fileUrl} alt="Attached" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', display: 'block', marginBottom: '4px' }} />}
                        {m.text && <p style={{ margin: 0, fontSize: '12px', color: '#1E293B', wordBreak: 'break-word' }}>{m.text}</p>}
                        <span style={{ fontSize: '8px', color: '#94A3B8', float: 'right', marginTop: '2px', marginLeft: '6px' }}>{m.time} <span style={{ color: '#34B7F1' }}>✓✓</span></span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {chatUploadProgress && (
                  <div style={{ padding: '6px 12px', background: '#DCFCE7', fontSize: '11px', color: '#15803D', fontWeight: '700' }}>
                    {chatUploadProgress}
                  </div>
                )}

                <form onSubmit={handleSendChatFree} style={{ display: 'flex', alignItems: 'center', padding: '6px', background: '#F0F2F5', borderTop: '1px solid #CBD5E1', gap: '6px' }}>
                  <input type="file" ref={chatFileInputRef} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedChatFile(file);
                  }} accept="image/*" style={{ display: 'none' }} />
                  <button type="button" onClick={() => chatFileInputRef.current?.click()} style={{ border: 'none', background: selectedChatFile ? '#10B981' : '#E2E8F0', color: selectedChatFile ? '#fff' : '#000', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                    {selectedChatFile ? '✓' : '📎'}
                  </button>
                  <input type="text" placeholder={selectedChatFile ? `সংযুক্ত: ${selectedChatFile.name}` : "মেসেজ লিখুন..."} value={msgInput} onChange={(e) => {
                    setMsgInput(e.target.value);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    setDoc(doc(db, "settings", "typing"), { user: userProfile?.name, time: Date.now() });
                    typingTimeoutRef.current = setTimeout(() => setDoc(doc(db, "settings", "typing"), { user: null, time: 0 }), 2500);
                  }} style={{ flex: 1, padding: '9px 12px', borderRadius: '20px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', background: '#FFFFFF' }} />
                  <button type="submit" style={{ background: '#075E54', color: '#FFFFFF', border: 'none', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer' }}>➤</button>
                </form>
              </>
            )}
          </div>
        )}

      </main>

      {/* অথেনটিকেশন মডাল */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '17px', fontWeight: '900' }}>
                {authMode === 'login' ? '🔐 সহপাঠী লগইন' : '📝 নতুন অ্যাকাউন্ট নিবন্ধন'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>

            {authError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', marginBottom: '10px' }}>
                {authError}
              </div>
            )}

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {authMode === 'signup' && (
                <>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>পূর্ণ নাম: *</label>
                    <input required type="text" placeholder="উদাঃ মোঃ রাসেল মিয়া" value={authName} onChange={e => setAuthName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '2px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>নিজ গ্রাম: *</label>
                    <input required type="text" placeholder="উদাঃ সান্দিকোনা" value={authVillage} onChange={e => setAuthVillage(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '2px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>বর্তমান ঠিকানা: *</label>
                    <input required type="text" placeholder="উদাঃ কেন্দুয়া / ঢাকা" value={authArea} onChange={e => setAuthArea(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '2px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>জার্সি সাইজ: *</label>
                    <select value={authTshirt} onChange={e => setAuthTshirt(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '2px', boxSizing: 'border-box', background: '#fff' }}>
                      <option value="M">Medium (M - ৩৮)</option>
                      <option value="L">Large (L - ৪০)</option>
                      <option value="XL">Extra Large (XL - ৪২)</option>
                      <option value="XXL">Double XL (XXL - ৪৪)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700' }}>মোবাইল নম্বর: *</label>
                <input required type="tel" placeholder="017XXXXXXXX" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '2px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700' }}>পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর): *</label>
                <input required type="password" placeholder="গোপন পাসওয়ার্ড দিন" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '2px', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={authSubmitting} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
                {authSubmitting ? 'প্রসেসিং...' : (authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন সম্পন্ন করুন')}
              </button>
            </form>

            <div style={{ marginTop: '10px', textAlign: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
              {authMode === 'login' ? (
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                  অ্যাকাউন্ট নেই? <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: '800', cursor: 'pointer' }}>এখানে নতুন অ্যাকাউন্ট খুলুন</button>
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                  ইতোমধ্যে অ্যাকাউন্ট আছে? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: '800', cursor: 'pointer' }}>সরাসরি লগইন করুন</button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* মেমোরি আপলোড মডাল */}
      {showMemoryUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '15px', fontWeight: '800' }}>📸 পুরনো স্মৃতি যোগ করুন</h3>
              <button onClick={() => setShowMemoryUploadModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleUploadMemoryFree} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" placeholder="ক্যাপশন বা বিবরণ..." value={memCaption} onChange={e => setMemCaption(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input required type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedMemFile(file);
              }} style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }} />

              {memUploadProgress && (
                <div style={{ background: '#DCFCE7', padding: '6px', borderRadius: '6px', textAlign: 'center', fontSize: '11px', color: '#15803D', fontWeight: '700' }}>
                  {memUploadProgress}
                </div>
              )}

              <button type="submit" disabled={memUploadProgress !== null} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>
                {memUploadProgress !== null ? 'সংরক্ষণ হচ্ছে...' : 'আপলোড নিশ্চিত করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* প্রাইড ও শিক্ষক মডাল */}
      {showAddPrideModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#D97706', fontSize: '15px', fontWeight: '800' }}>🏆 ব্যাচের গৌরবে যুক্ত হোন</h3>
              <button onClick={() => setShowAddPrideModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddPrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input required type="text" placeholder="আপনার পুরো নাম *" value={prideName} onChange={e => setPrideName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input required type="text" placeholder="বর্তমান পেশা বা পদবি *" value={prideProfession} onChange={e => setPrideProfession(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="text" placeholder="কর্মস্থল বা প্রতিষ্ঠান" value={prideOrg} onChange={e => setPrideOrg(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input required type="text" placeholder="নিজ গ্রামের নাম *" value={prideVillage} onChange={e => setPrideVillage(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input required type="text" placeholder="পূর্ণ ঠিকানা *" value={prideFullAddress} onChange={e => setPrideFullAddress(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <textarea placeholder="সংক্ষিপ্ত অর্জন বা বিবরণ..." value={prideDetails} onChange={e => setPrideDetails(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="tel" placeholder="মোবাইল নম্বর" value={pridePhone} onChange={e => setPridePhone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <button type="submit" style={{ background: '#D97706', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>
                যুক্ত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddTeacherModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '15px', fontWeight: '800' }}>👨‍🏫 শিক্ষক পরিচিতি যোগ</h3>
              <button onClick={() => setShowAddTeacherModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input required type="text" placeholder="শিক্ষকের নাম *" value={teachName} onChange={e => setTeachName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="text" placeholder="পদবি" value={teachDesig} onChange={e => setTeachDesig(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="text" placeholder="বিষয়" value={teachSubject} onChange={e => setTeachSubject(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="tel" placeholder="মোবাইল নম্বর" value={teachPhone} onChange={e => setTeachPhone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <button type="submit" style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>সংরক্ষণ</button>
            </form>
          </div>
        </div>
      )}

      {/* শেয়ার ও ফুটার */}
      <footer style={{ maxWidth: '500px', margin: '12px auto', padding: '0 12px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF',
          padding: '12px 14px',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', color: '#38BDF8' }}>📲 বন্ধুদের সাথে অ্যাপটি শেয়ার করুন</h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#CBD5E1' }}>সরাসরি ডাউনলোড লিংক সহ পাঠান</p>
          </div>
          <button onClick={handleShareApp} style={{ background: '#25D366', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            শেয়ার করুন
          </button>
        </div>

        <div 
          onClick={() => {
            if (userProfile?.role === 'super_admin') {
              setShowAdmin(true);
            } else {
              alert('অ্যাডমিন প্যানেলে প্রবেশের জন্য স্মার্ট রাসেল খানের অ্যাকাউন্টে লগইন থাকতে হবে।');
            }
          }}
          style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '10px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#137547', fontWeight: '800' }}>
            📱 অ্যাপটি তৈরি করেছেন: স্মার্ট রাসেল খান {userProfile?.role === 'super_admin' ? '(👑 অ্যাডমিন এক্সেস)' : ''}
          </p>
          <p style={{ margin: '2px 0', fontSize: '10px', color: '#334155' }}>
            সরাসরি যোগাযোগ: <a href="tel:01705374798" style={{ color: '#0A4D2E', fontWeight: '700', textDecoration: 'none' }}>01705374798</a>
          </p>
        </div>
      </footer>

      {/* বটম ন্যাভিগেশন বার */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '7px 0',
        zIndex: 1000,
        boxShadow: '0 -3px 12px rgba(0,0,0,0.05)'
      }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'home' ? '800' : '500', fontSize: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('memories')} style={{ border: 'none', background: 'none', color: activeTab === 'memories' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'memories' ? '800' : '500', fontSize: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>📸</span><span>স্মৃতি</span>
        </button>
        <button onClick={() => setActiveTab('pride')} style={{ border: 'none', background: 'none', color: activeTab === 'pride' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'pride' ? '800' : '500', fontSize: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>🏆</span><span>গৌরব</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'directory' ? '800' : '500', fontSize: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>👥</span><span>সহপাঠী</span>
        </button>
        <button onClick={() => setActiveTab('school')} style={{ border: 'none', background: 'none', color: activeTab === 'school' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'school' ? '800' : '500', fontSize: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>🏫</span><span>বিদ্যালয়</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'chat' ? '800' : '500', fontSize: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '15px' }}>💬</span><span>আড্ডা</span>
        </button>
      </nav>

      {/* অ্যাডমিন কন্ট্রোল প্যানেল */}
      {showAdmin && userProfile?.role === 'super_admin' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '16px', fontWeight: '800' }}>👑 অ্যাডমিন কন্ট্রোল প্যানেল</h3>
              <button onClick={() => setShowAdmin(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>বন্ধ করুন</button>
            </div>

            <div>
              {/* নোটিফিকেশন ব্রডকাস্ট */}
              <div style={{ background: '#FEF3C7', border: '1.2px solid #FCD34D', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#92400E', fontWeight: '800' }}>📢 সবার ফোনের নোটিফিকেশন বারে মেসেজ পাঠান:</h4>
                <input type="text" placeholder="বিষয়..." value={adminBroadcastTitle} onChange={e => setAdminBroadcastTitle(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '11px', boxSizing: 'border-box', marginBottom: '5px' }} />
                <textarea rows={2} placeholder="বার্তা লিখুন..." value={adminBroadcastMsg} onChange={e => setAdminBroadcastMsg(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '11px', boxSizing: 'border-box' }} />
                <button onClick={handleSendAdminBroadcast} disabled={isSendingBroadcast} style={{ marginTop: '6px', width: '100%', background: '#D97706', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                  {isSendingBroadcast ? 'পাঠানো হচ্ছে...' : '🚀 সবার ফোনে নোটিফিকেশন পাঠান'}
                </button>
              </div>

              {/* হেডার ছবি পরিবর্তন */}
              <div style={{ background: '#ECFDF5', border: '1.2px solid #A7F3D0', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#065F46', fontWeight: '800' }}>🖼️ হেডার ব্যাকগ্রাউন্ড ছবি পরিবর্তন:</h4>
                <input type="file" ref={bgFileInputRef} onChange={handleHeaderBgUploadFree} accept="image/*" style={{ display: 'none' }} />
                <button onClick={() => bgFileInputRef.current?.click()} style={{ background: '#0D9488', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  গ্যালারি থেকে বন্ধুদের ছবি সিলেক্ট করুন 📷
                </button>
              </div>

              {/* APK ডাউনলোড লিংক ও নোটিশ */}
              <div style={{ background: '#F1F5F9', border: '1.2px solid #CBD5E1', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#0F172A', fontWeight: '800' }}>📥 শেয়ার বাটনের APK ডাউনলোড লিংক:</h4>
                <input type="text" placeholder="ড্রাইভ বা মিডিয়াফায়ার লিংক..." value={newApkUrlInput} onChange={e => setNewApkUrlInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px', boxSizing: 'border-box', marginBottom: '8px' }} />

                <h4 style={{ margin: '4px 0', fontSize: '12px', color: '#0F172A' }}>🏫 বিদ্যালয়ের ইতিহাস লিখুন:</h4>
                <textarea rows={2} value={newHistoryInput || schoolHistory} onChange={e => setNewHistoryInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px', boxSizing: 'border-box', marginBottom: '6px' }} />

                <h4 style={{ margin: '4px 0', fontSize: '12px', color: '#0F172A' }}>📢 স্ক্রলিং নোটিশ আপডেট:</h4>
                <textarea rows={2} value={newNoticeInput || announcement} onChange={e => setNewNoticeInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '11px', boxSizing: 'border-box' }} />

                <button onClick={async () => {
                  const payload: any = {};
                  if (newApkUrlInput.trim()) payload.apkUrl = newApkUrlInput.trim();
                  if (newNoticeInput.trim()) payload.announcement = newNoticeInput.trim();
                  if (newHistoryInput.trim()) payload.schoolHistory = newHistoryInput.trim();

                  await setDoc(doc(db, "settings", "app_config"), payload, { merge: true });
                  if (newApkUrlInput.trim()) setApkDownloadUrl(newApkUrlInput.trim());
                  setNewNoticeInput('');
                  setNewHistoryInput('');
                  setNewApkUrlInput('');
                  alert('সেটিংস সফলভাবে সেভ হয়েছে!');
                }} style={{ marginTop: '6px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  সেভ ও পাবলিশ করুন
                </button>
              </div>

              {/* শিক্ষক তালিকা নিয়ন্ত্রণ */}
              <div style={{ background: '#ECFDF5', border: '1.2px solid #A7F3D0', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '12px', color: '#065F46', fontWeight: '800' }}>👨‍🏫 শিক্ষক তালিকা নিয়ন্ত্রণ ({teachers.length} জন):</h4>
                  <button onClick={() => setShowAddTeacherModal(true)} style={{ background: '#137547', color: '#FFFFFF', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    + নতুন শিক্ষক
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {teachers.map((t) => (
                    <div key={t.id} style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <div>
                        <strong>{t.name}</strong> ({t.designation})<br/>
                        <span style={{ fontSize: '9px', color: '#64748B' }}>বিষয়: {t.subject} {t.phone ? `| ${t.phone}` : ''}</span>
                      </div>
                      <button onClick={async () => {
                        if (window.confirm(`আপনি কি "${t.name}"-কে শিক্ষক তালিকা থেকে বাদ দিতে চান?`)) {
                          await deleteDoc(doc(db, "teachers", t.id));
                        }
                      }} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                        🗑️ বাদ
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* গৌরব তালিকা নিয়ন্ত্রণ */}
              <div style={{ background: '#FEF9C3', border: '1.2px solid #FDE047', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#854D0E', fontWeight: '800' }}>🏆 গৌরব তালিকা নিয়ন্ত্রণ ({prideList.length} জন):</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {prideList.map((p) => (
                    <div key={p.id} style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #FEF08A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <div>
                        <strong>{p.name}</strong> - {p.profession}<br/>
                        <span style={{ fontSize: '9px', color: '#64748B' }}>গ্রাম: {p.village} | ঠিকানা: {p.fullAddress}</span>
                      </div>
                      <button onClick={async () => {
                        if (window.confirm(`আপনি কি "${p.name}"-কে গৌরব তালিকা থেকে বাদ দিতে চান?`)) {
                          await deleteDoc(doc(db, "batch_pride", p.id));
                        }
                      }} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                        🗑️ বাদ
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* মেম্বার ডিলিট তালিকা */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#137547' }}>নিবন্ধিত মেম্বার ({allUsers.length} জন)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {allUsers.map((m, idx) => (
                    <div key={m.uid} style={{ padding: '6px 8px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{idx + 1}. {m.name}</strong> ({m.phone})<br/>
                        <span style={{ color: '#64748B' }}>গ্রাম: {m.village} | জার্সি: {m.tshirt}</span>
                      </div>
                      <button onClick={async () => {
                        if (window.confirm(`আপনি কি "${m.name}"-কে তালিকা থেকে বাদ দিতে চান?`)) {
                          await deleteDoc(doc(db, "users", m.uid));
                        }
                      }} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                        🗑️ বাদ
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
```
