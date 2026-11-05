import React, { useState, useEffect, useRef } from 'react';
import { 
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
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User 
} from "firebase/auth";
import { db, auth } from "./firebase";
import { 
  UserProfile, 
  PostItem, 
  PostComment, 
  MemoryItem, 
  BatchPrideItem, 
  TeacherItem, 
  ActiveCall 
} from "./types";
import ChatRoom from "./components/ChatRoom";
import VoiceRoom from "./components/VoiceRoom";
import NotificationCenter from "./components/NotificationCenter";

interface PollData {
  question: string;
  optionA: string;
  optionB: string;
  votesA: string[];
  votesB: string[];
  isActive: boolean;
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

  // চ্যাট, ভয়েস রুম ও নোটিফিকেশন হাব স্টেট
  const [privateChatRecipient, setPrivateChatRecipient] = useState<UserProfile | null>(null);
  const [showLiveVoiceRoom, setShowLiveVoiceRoom] = useState(false);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // জরিপ / পোল (Poll) স্টেট
  const [activePoll, setActivePoll] = useState<PollData | null>(null);
  const [pollQuestionInput, setPollQuestionInput] = useState('');
  const [pollOptAInput, setPollOptAInput] = useState('');
  const [pollOptBInput, setPollOptBInput] = useState('');

  // সোশ্যাল টাইমলাইন পোস্ট
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostFile, setNewPostFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const postFileInputRef = useRef<HTMLInputElement>(null);

  // ডেটাবেস স্টেটস
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [prideList, setPrideList] = useState<BatchPrideItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);

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
  const isInitialAdminNotifs = useRef(false);

  // ১-অন-১ অডিও কল
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

  // স্মৃতি আপলোড
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

  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/GPwXRoWdZ748lL5182iBCj?s=cl&p=a&mlu=4&ilr=4&iam=2";
  const MESSENGER_GROUP_URL = "https://m.me/j/EHb16biwgroNmlDh/?send_source=gc%3Acopy_invite_link_t";

  // ইমেজ অপ্টিমাইজার
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

  // Auth লিসেনার
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          }
        } catch (e) {}
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const phoneToEmail = (rawPhone: string) => {
    const clean = rawPhone.replace(/[^\d]/g, '');
    return clean + "@sandikona2014.org";
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    const clean = authPhone.replace(/[^\d]/g, '');
    if (clean.length < 11) {
      setAuthError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।');
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
      triggerNativeNotification("স্বাগতম!", "অভিনন্দন " + newProfile.name + ", আপনার অ্যাকাউন্ট তৈরি হয়েছে।");
    } catch (err: any) {
      setAuthError('অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে।');
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

  // নোটিফিকেশন ইঞ্জিন
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swCode = "self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(clients.claim())); self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => { if (clientList.length > 0) return clientList[0].focus(); return clients.openWindow('/'); })); });";
      const blob = new Blob([swCode], { type: 'application/javascript' });
      navigator.serviceWorker.register(URL.createObjectURL(blob))
        .then(reg => { swReg.current = reg; })
        .catch(() => {});
    }

    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

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

  // লাইভ সময় ও কাউন্টার
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

  // ফায়ারবেস ডেটা লিসেনার
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
      setIsLoading(false);

      if (isInitialMembers.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const m = c.doc.data() as UserProfile;
            setUnreadNotifCount(prev => prev + 1);
            triggerNativeNotification("🎉 নতুন সহপাঠী যুক্ত হয়েছেন!", m.name + " (" + (m.village || m.area) + ") পুনর্মিলনীতে যোগ দিয়েছেন।", "🎓");
          }
        });
      } else {
        isInitialMembers.current = true;
      }
    }, () => setIsLoading(false));

    const qAdminNotifs = query(collection(db, "admin_broadcasts"), orderBy("timestamp", "asc"));
    const unsubAdminBroadcast = onSnapshot(qAdminNotifs, (snap) => {
      if (isInitialAdminNotifs.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const d = c.doc.data();
            setUnreadNotifCount(prev => prev + 1);
            triggerNativeNotification(d.title || "📢 অ্যাডমিন বার্তা", d.body || "", "📢");
          }
        });
      } else {
        isInitialAdminNotifs.current = true;
      }
    });

    const unsubPoll = onSnapshot(doc(db, "settings", "active_poll"), (d) => {
      if (d.exists()) {
        setActivePoll(d.data() as PollData);
      } else {
        setActivePoll(null);
      }
    });

    const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const list: PostItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(list);
    });

    const qMemories = query(collection(db, "memories"), orderBy("timestamp", "desc"));
    const unsubMemories = onSnapshot(qMemories, (snap) => {
      const list: MemoryItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MemoryItem));
      setMemories(list);
    });

    const unsubPride = onSnapshot(collection(db, "batch_pride"), (snap) => {
      const list: BatchPrideItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as BatchPrideItem));
      setPrideList(list);
    });

    const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
      const list: TeacherItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as TeacherItem));
      setTeachers(list);
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

    return () => {
      unsubUsers();
      unsubAdminBroadcast();
      unsubPoll();
      unsubPosts();
      unsubMemories();
      unsubPride();
      unsubTeachers();
      unsubSettings();
    };
  }, [currentUser]);

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

  // জরিপ ভোট হ্যান্ডলার
  const handleVotePoll = async (choice: 'A' | 'B') => {
    if (!currentUser || !activePoll) {
      alert('ভোট দিতে প্রথমে লগইন করুন।');
      setShowAuthModal(true);
      return;
    }

    const uid = currentUser.uid;
    let newVotesA = (activePoll.votesA || []).filter(id => id !== uid);
    let newVotesB = (activePoll.votesB || []).filter(id => id !== uid);

    if (choice === 'A') newVotesA.push(uid);
    else newVotesB.push(uid);

    await setDoc(doc(db, "settings", "active_poll"), {
      votesA: newVotesA,
      votesB: newVotesB
    }, { merge: true });
  };

  // অ্যাডমিন জরিপ তৈরি হ্যান্ডলার
  const handleCreatePoll = async () => {
    if (!pollQuestionInput.trim() || !pollOptAInput.trim() || !pollOptBInput.trim()) {
      alert('জরিপের প্রশ্ন এবং দুটি অপশনই পূরণ করুন।');
      return;
    }

    await setDoc(doc(db, "settings", "active_poll"), {
      question: pollQuestionInput.trim(),
      optionA: pollOptAInput.trim(),
      optionB: pollOptBInput.trim(),
      votesA: [],
      votesB: [],
      isActive: true
    });

    setPollQuestionInput('');
    setPollOptAInput('');
    setPollOptBInput('');
    alert('নতুন জরিপ হোমপেজে চালু হয়েছে!');
  };

  // পোস্ট হ্যান্ডলার
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
      alert('পোস্ট টাইমলাইনে প্রকাশিত হয়েছে!');
    } catch (err) {
      alert('পোস্ট করতে সমস্যা হয়েছে।');
    } finally {
      setIsPosting(false);
    }
  };

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
    } catch (e) {}
  };

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
    } catch (e) {}
  };

  const handleDeletePost = async (postId: string, authorUid: string) => {
    if (!currentUser) return;
    const isAuthorized = currentUser.uid === authorUid || userProfile?.role === 'super_admin';
    if (!isAuthorized) return;
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই পোস্টটি মুছে ফেলতে চান?")) return;
    try { await deleteDoc(doc(db, "posts", postId)); } catch (err) {}
  };

  const handleUploadMemoryFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
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
    } catch (err) {
      setMemUploadProgress(null);
    }
  };

  const handleHeaderBgUploadFree = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedBg = await compressImage(file);
      setHeaderBgUrl(compressedBg);
      await setDoc(doc(db, "settings", "app_config"), { headerBg: compressedBg }, { merge: true });
      alert('হেডার ব্যাকগ্রাউন্ড ছবি আপডেট হয়েছে!');
    } catch (err) {}
  };

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
      setPrideName(''); setPrideProfession(''); setPrideOrg(''); setPrideVillage(''); setPrideFullAddress(''); setPrideDetails(''); setPridePhone('');
    } catch (e) {}
  };

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
      setTeachName(''); setTeachSubject(''); setTeachDesig(''); setTeachPhone('');
    } catch (e) {}
  };

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
    } catch (err) {} finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleShareApp = async () => {
    const finalDownloadUrl = apkDownloadUrl.trim() || 'https://github.com';
    const shareText = "🎉 সান্দিকোনা স্কুল এন্ড কলেজ — এসএসসি ব্যাচ ২০১৪ পুনর্মিলনী ২০২৭\nআমাদের বন্ধুদের অফিশিয়াল অ্যাপে যুক্ত হোন!\n\n📲 ডাউনলোড লিংক:\n" + finalDownloadUrl;
    if (navigator.share) {
      try { await navigator.share({ title: 'পুনর্মিলনী ২০২৭ - এসএসসি ২০১৪', text: shareText }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText);
      alert('ডাউনলোড লিংক কপি হয়েছে!');
    }
  };

  const startPrivateChat = (member: UserProfile) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (member.uid === currentUser.uid) {
      alert('নিজের সাথে চ্যাট করা যাবে না!');
      return;
    }
    setPrivateChatRecipient(member);
    setActiveTab('chat');
  };

  const filteredMembers = allUsers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.area.toLowerCase().includes(searchQuery.toLowerCase()) || m.village.toLowerCase().includes(searchQuery.toLowerCase()));

  // পোল শতকরা হিসাব
  const totalVotes = activePoll ? ((activePoll.votesA?.length || 0) + (activePoll.votesB?.length || 0)) : 0;
  const pctA = totalVotes > 0 && activePoll ? Math.round(((activePoll.votesA?.length || 0) / totalVotes) * 100) : 0;
  const pctB = totalVotes > 0 && activePoll ? (100 - pctA) : 0;

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
          border: '1.5px solid #F59E0B'
        }}>
          <div style={{ fontSize: '22px' }}>{activeToast.icon}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#FCD34D', fontWeight: '800' }}>{activeToast.title}</h5>
            <p style={{ margin: 0, fontSize: '11px', color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeToast.body}</p>
          </div>
          <button onClick={() => setActiveToast(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* নোটিফিকেশন হাব ড্রয়ার */}
      <NotificationCenter
        isOpen={showNotifCenter}
        onClose={() => setShowNotifCenter(false)}
        onItemClick={(type) => {
          if (type === 'member') setActiveTab('directory');
        }}
      />

      {/* ভয়েস রুম ওভারলে */}
      {showLiveVoiceRoom && (
        <VoiceRoom
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setShowLiveVoiceRoom(false)}
        />
      )}

      {/* টপ স্ট্যাটাস ও নোটিফিকেশন বেল বার */}
      <div style={{
        background: '#062B1A',
        color: '#E2E8F0',
        padding: '6px 12px',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {currentUser && userProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10B981', fontWeight: '800' }}>● {userProfile.name}</span>
            {userProfile.role === 'super_admin' && (
              <span style={{ background: '#F59E0B', color: '#000', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' }}>অ্যাডমিন</span>
            )}
          </div>
        ) : (
          <span style={{ color: '#FCD34D' }}>⚠️ লগইন করা নেই</span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* স্মার্ট নোটিফিকেশন বেল বাটন */}
          <button
            onClick={() => { setShowNotifCenter(true); setUnreadNotifCount(0); }}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#FFFFFF', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', position: 'relative', fontSize: '12px' }}
          >
            🔔
            {unreadNotifCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#FFFFFF', fontSize: '9px', fontWeight: '900', padding: '1px 5px', borderRadius: '10px' }}>
                {unreadNotifCount}
              </span>
            )}
          </button>

          {currentUser ? (
            <button onClick={handleLogout} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
              লগআউট
            </button>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '3px 10px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}>
              লগইন / নিবন্ধন
            </button>
          )}
        </div>
      </div>

      {/* হোম ব্যানার */}
      {activeTab === 'home' ? (
        <>
          <div style={{ background: 'linear-gradient(90deg, #0A4D2E 0%, #06321D 100%)', color: '#FEF08A', padding: '5px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
              <span>🕒 সময়:</span>
              <span style={{ color: '#FFFFFF', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>{currentTimeStr || '...'}</span>
            </div>
            <div style={{ fontSize: '10px', color: '#E2E8F0', fontWeight: '600' }}>📅 {currentDateStr || '...'}</div>
          </div>

          <header style={{
            backgroundImage: headerBgUrl 
              ? ('linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.72) 100%), url("' + headerBgUrl + '")')
              : 'linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.72) 100%), url("/header-bg.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            backgroundRepeat: 'no-repeat',
            color: '#FFFFFF',
            padding: '20px 14px 14px 14px',
            textAlign: 'center',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <span style={{ fontSize: '10px', backgroundColor: 'rgba(0, 0, 0, 0.65)', color: '#FEF08A', padding: '3px 12px', borderRadius: '16px', border: '1.2px solid rgba(212, 175, 55, 0.7)', fontWeight: '800', display: 'inline-block' }}>
                সান্দিকোনা স্কুল এন্ড কলেজ
              </span>
              <h1 style={{ fontSize: '24px', margin: '6px 0 1px 0', fontWeight: '900', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>পুনর্মিলনী ২০২৭</h1>
              <p style={{ fontSize: '13px', margin: 0, fontWeight: '800', color: '#F0FDF4', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>এসএসসি ব্যাচ ২০১৪</p>
              <div style={{ marginTop: '6px', display: 'inline-block', backgroundColor: 'rgba(0, 0, 0, 0.65)', padding: '3px 12px', borderRadius: '10px', fontSize: '10px', color: '#F8FAFC', fontWeight: '700' }}>
                🤝 আয়োজনে: এসএসসি ২০১৪ ব্যাচ পুনর্মিলনী সংসদ
              </div>
            </div>
          </header>

          <div style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '6px 10px', display: 'flex', alignItems: 'center', overflow: 'hidden', borderBottom: '2px solid #D4AF37' }}>
            <span style={{ backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}>📢 নোটিশ:</span>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
              <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '11px', color: '#FEF08A', fontWeight: '600' }}>{announcement}</marquee>
            </div>
          </div>

          <div style={{ maxWidth: '500px', margin: '10px auto 0 auto', padding: '0 12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0A4D2E 0%, #116B3E 100%)', color: '#FFFFFF', borderRadius: '14px', padding: '10px 12px', textAlign: 'center', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
              <span style={{ fontSize: '10px', color: '#FEF08A', fontWeight: '700', display: 'block', marginBottom: '4px' }}>⏳ ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়:</span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>বছর</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>মাস</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>দিন</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>ঘণ্টা</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '9px', display: 'block', color: '#D1FAE5' }}>মিনিট</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '9px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: '500px', margin: '8px auto 0 auto', padding: '0 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', color: '#FFFFFF', padding: '9px', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800', fontSize: '11px' }}><span>💬</span> WhatsApp গ্রুপ</a>
              <a href={MESSENGER_GROUP_URL} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #00B2FF 0%, #006AFF 100%)', color: '#FFFFFF', padding: '9px', borderRadius: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '800', fontSize: '11px' }}><span>⚡</span> Messenger গ্রুপ</a>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#0A4D2E', color: '#FFFFFF', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #D4AF37' }}>
          <button onClick={() => { setActiveTab('home'); setPrivateChatRecipient(null); }} style={{ background: 'none', border: 'none', color: '#FEF08A', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>← হোমে ফিরুন</button>
          <span style={{ fontSize: '13px', fontWeight: '800' }}>
            {activeTab === 'memories' && '📸 পুরনো দিনের স্মৃতি'}
            {activeTab === 'pride' && '🏆 আমাদের ব্যাচের গৌরব'}
            {activeTab === 'directory' && '👥 সহপাঠীদের তালিকা'}
            {activeTab === 'school' && '🏫 বিদ্যালয় ও শিক্ষক পরিচিতি'}
            {activeTab === 'chat' && (privateChatRecipient ? ('💬 ' + privateChatRecipient.name) : '💬 ব্যাচ গ্রুপ আড্ডা')}
          </span>
          <span style={{ fontSize: '11px', color: '#A7F3D0' }}>ব্যাচ ২০১৪</span>
        </div>
      )}

      {/* মূল পেজসমূহ */}
      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '12px' }}>

        {activeTab === 'home' && (
          <div>
            {/* লাইভ ভয়েস রুম কার্ড */}
            <div style={{ background: 'linear-gradient(135deg, #06321D 0%, #0A4D2E 100%)', color: '#FFFFFF', borderRadius: '16px', padding: '14px', marginBottom: '14px', border: '1.5px solid #10B981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#10B981', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '10px' }}>● লাইভ কনফারেন্স</span>
                <h3 style={{ margin: '4px 0 2px 0', fontSize: '15px', fontWeight: '900', color: '#FEF08A' }}>🎙️ এসএসসি ২০১৪ ভয়েস রুম</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#E2E8F0' }}>একসাথে কথা বলুন ও মিটিং করুন</p>
              </div>
              <button
                onClick={() => {
                  if (!currentUser) { setShowAuthModal(true); return; }
                  setShowLiveVoiceRoom(true);
                }}
                style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                রুমে ঢুকুন 🎧
              </button>
            </div>

            {/* ৭নং ধাপ: লাইভ জরিপ / ভোটিং কার্ড */}
            {activePoll && activePoll.isActive && (
              <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '14px', marginBottom: '14px', border: '2px solid #FCD34D', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
                <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>📊 ব্যাচ মতামত জরিপ</span>
                <h4 style={{ margin: '6px 0 10px 0', fontSize: '14px', color: '#0F172A', fontWeight: '800' }}>{activePoll.question}</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => handleVotePoll('A')}
                    style={{ position: 'relative', overflow: 'hidden', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '12px' }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pctA + '%', background: '#DCFCE7', zIndex: 0 }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>{activePoll.optionA}</span>
                    <span style={{ position: 'relative', zIndex: 1, color: '#15803D' }}>{pctA + '%'}</span>
                  </button>

                  <button
                    onClick={() => handleVotePoll('B')}
                    style={{ position: 'relative', overflow: 'hidden', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '12px' }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pctB + '%', background: '#FEF3C7', zIndex: 0 }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>{activePoll.optionB}</span>
                    <span style={{ position: 'relative', zIndex: 1, color: '#B45309' }}>{pctB + '%'}</span>
                  </button>
                </div>
                <span style={{ fontSize: '10px', color: '#64748B', display: 'block', marginTop: '6px', textAlign: 'right' }}>মোট ভোট: {totalVotes} টি</span>
              </div>
            )}

            {/* পোস্ট তৈরির বক্স */}
            <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '12px', marginBottom: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>✍️</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0A4D2E' }}>বন্ধুদের সাথে কিছু শেয়ার করুন:</span>
              </div>
              <form onSubmit={handleCreatePost}>
                <textarea
                  rows={2}
                  placeholder={currentUser ? (userProfile?.name + ", স্কুল জীবনের কোনো স্মৃতি বা ভাবনা লিখুন...") : "পোস্ট করতে প্রথমে লগইন করুন..."}
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  disabled={!currentUser}
                  style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
                
                {newPostFile && <div style={{ margin: '6px 0', fontSize: '11px', color: '#15803D', fontWeight: '700' }}>📎 ছবি যুক্ত: {newPostFile.name}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <input type="file" ref={postFileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) setNewPostFile(f); }} accept="image/*" style={{ display: 'none' }} />
                  <button type="button" onClick={() => { if (!currentUser) { setShowAuthModal(true); return; } postFileInputRef.current?.click(); }} style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>📷 ছবি যোগ করুন</button>
                  <button type="submit" disabled={isPosting || !currentUser} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>{isPosting ? 'পোস্ট হচ্ছে...' : 'পোস্ট করুন 🚀'}</button>
                </div>
              </form>
            </div>

            {/* পোস্ট ফিড */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {posts.map((post) => {
                const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;
                const canDelete = currentUser && (currentUser.uid === post.authorUid || userProfile?.role === 'super_admin');

                return (
                  <div key={post.id} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', color: '#0F172A', fontWeight: '800' }}>{post.authorName}</h4>
                        <span style={{ fontSize: '10px', color: '#64748B' }}>🏡 {post.authorVillage} • 🕒 {post.dateStr}</span>
                      </div>
                      {canDelete && (
                        <button onClick={() => handleDeletePost(post.id, post.authorUid)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>🗑️ মুছুন</button>
                      )}
                    </div>

                    {post.content && <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#1E293B', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{post.content}</p>}

                    {post.mediaUrl && (
                      <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', backgroundColor: '#0F172A' }}>
                        <img src={post.mediaUrl} alt="Post" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', display: 'block' }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px', marginBottom: '8px' }}>
                      <span>❤️ {(post.likes || []).length} লাইক</span>
                      <span>💬 {post.commentsCount || 0} মন্তব্য</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleToggleLike(post)} style={{ flex: 1, background: isLiked ? '#FEE2E2' : '#F8FAFC', color: isLiked ? '#DC2626' : '#475569', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                        {isLiked ? '❤️ লাইক করেছেন' : '🤍 লাইক দিন'}
                      </button>
                      <button onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)} style={{ flex: 1, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
                        💬 মন্তব্য করুন
                      </button>
                    </div>

                    {activeCommentsPostId === post.id && (
                      <div style={{ marginTop: '10px', background: '#F8FAFC', borderRadius: '10px', padding: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', marginBottom: '8px' }}>
                          {commentsList.map(c => (
                            <div key={c.id} style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                              <strong style={{ color: '#0A4D2E' }}>{c.authorName}:</strong> {c.text}
                            </div>
                          ))}
                        </div>
                        <form onSubmit={(e) => handleAddComment(e, post.id)} style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" placeholder="মন্তব্য লিখুন..." value={commentInput} onChange={e => setCommentInput(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: '14px', border: '1px solid #CBD5E1', fontSize: '11px', outline: 'none' }} />
                          <button type="submit" style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '14px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>পাঠান</button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* কাউন্টার কার্ড */}
            <div onClick={() => setActiveTab('directory')} style={{ background: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '2px solid #BBF7D0', textAlign: 'center', marginBottom: '12px', cursor: 'pointer' }}>
              <span style={{ fontSize: '12px', color: '#137547', fontWeight: '700' }}>এসএসসি ব্যাচ ২০১৪</span>
              <h2 style={{ fontSize: '30px', margin: '2px 0', color: '#0A4D2E', fontWeight: '900' }}>{isLoading ? '...' : (allUsers.length + " জন")}</h2>
              <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: '700', textDecoration: 'underline' }}>👉 সকল সহপাঠীর তালিকা দেখতে ক্লিক করুন</span>
            </div>
          </div>
        )}

        {activeTab === 'memories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0A4D2E', fontWeight: '800' }}>📸 স্মৃতি গ্যালারি</h3>
              <button onClick={() => setShowMemoryUploadModal(true)} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>স্মৃতি যোগ করুন ➕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {memories.map((item) => (
                <div key={item.id} style={{ background: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <div onContextMenu={(e) => e.preventDefault()} style={{ position: 'relative', width: '100%', backgroundColor: '#000000' }}>
                    <img src={item.mediaUrl} alt={item.caption} style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700' }}>{item.caption}</p>
                    <span style={{ fontSize: '10px', color: '#0A4D2E', fontWeight: '800', background: '#DCFCE7', padding: '2px 8px', borderRadius: '8px' }}>👤 {item.uploader}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pride' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0A4D2E', fontWeight: '800' }}>🏆 ব্যাচের গৌরব</h3>
              <button onClick={() => setShowAddPrideModal(true)} style={{ background: '#D97706', color: '#FFFFFF', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>যুক্ত হোন ➕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {prideList.map((p) => (
                <div key={p.id} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '14px', border: '1px solid #FEF08A' }}>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '800' }}>{p.name}</h4>
                  <span style={{ fontSize: '12px', color: '#D97706', fontWeight: '700' }}>💼 {p.profession}</span>
                  <div style={{ marginTop: '6px', background: '#F8FAFC', padding: '6px 8px', borderRadius: '8px', fontSize: '11px' }}>
                    <p style={{ margin: '2px 0' }}><strong>🏡 নিজ গ্রাম:</strong> {p.village}</p>
                    <p style={{ margin: '2px 0' }}><strong>📍 ঠিকানা:</strong> {p.fullAddress}</p>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#475569' }}>{p.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'school' && (
          <div>
            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#0A4D2E', fontSize: '15px', fontWeight: '800' }}>🏫 বিদ্যালয়ের ইতিহাস</h3>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{schoolHistory}</p>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#0A4D2E', fontWeight: '800' }}>👨‍🏫 শ্রদ্ধেয় শিক্ষকগণ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teachers.map((t) => (
                <div key={t.id} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '800' }}>{t.name}</h5>
                    <span style={{ fontSize: '11px', color: '#137547' }}>{t.designation} • {t.subject}</span>
                  </div>
                  {t.phone && <a href={"tel:" + t.phone} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700' }}>📞 কল</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <div>
            <input type="text" placeholder="🔍 নাম বা গ্রাম দিয়ে খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '12px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMembers.map((m) => (
                <div key={m.uid} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: '#137547' }}>🏡 {m.village || m.area} • জার্সি: {m.tshirt}</p>
                  </div>
                  <button onClick={() => startPrivateChat(m)} style={{ background: '#075E54', color: '#FFFFFF', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>💬 ইনবক্স</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatRoom
            currentUser={currentUser}
            userProfile={userProfile}
            recipientUser={privateChatRecipient}
            onBack={() => setPrivateChatRecipient(null)}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}

      </main>

      {/* অথেনটিকেশন মডাল */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '17px', fontWeight: '900' }}>{authMode === 'login' ? '🔐 লগইন' : '📝 নতুন নিবন্ধন'}</h3>
              <button onClick={() => setShowAuthModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px' }}>✕</button>
            </div>
            {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '10px' }}>{authError}</div>}
            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {authMode === 'signup' && (
                <>
                  <input required type="text" placeholder="পূর্ণ নাম *" value={authName} onChange={e => setAuthName(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                  <input required type="text" placeholder="নিজ গ্রাম *" value={authVillage} onChange={e => setAuthVillage(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                  <input required type="text" placeholder="বর্তমান ঠিকানা *" value={authArea} onChange={e => setAuthArea(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                  <select value={authTshirt} onChange={e => setAuthTshirt(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#fff' }}>
                    <option value="M">Medium (M)</option><option value="L">Large (L)</option><option value="XL">XL</option><option value="XXL">XXL</option>
                  </select>
                </>
              )}
              <input required type="tel" placeholder="মোবাইল নম্বর (017...)" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <input required type="password" placeholder="পাসওয়ার্ড (৬ অক্ষর)" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <button type="submit" disabled={authSubmitting} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800' }}>{authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন করুন'}</button>
            </form>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: '800', fontSize: '11px' }}>
                {authMode === 'login' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ফুটার */}
      <footer style={{ maxWidth: '500px', margin: '12px auto', padding: '0 12px' }}>
        <div style={{ background: '#0F172A', color: '#FFFFFF', padding: '12px 14px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div><h4 style={{ margin: 0, fontSize: '13px', color: '#38BDF8' }}>📲 অ্যাপটি শেয়ার করুন</h4></div>
          <button onClick={handleShareApp} style={{ background: '#25D366', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>শেয়ার</button>
        </div>
        <div onClick={() => { if (userProfile?.role === 'super_admin') setShowAdmin(true); }} style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '14px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#137547', fontWeight: '800' }}>📱 অ্যাপ নির্মাতা: স্মার্ট রাসেল খান (01705374798) {userProfile?.role === 'super_admin' ? '👑' : ''}</p>
        </div>
      </footer>

      {/* বটম ন্যাভিগেশন */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-around', padding: '7px 0', zIndex: 1000 }}>
        <button onClick={() => { setActiveTab('home'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontWeight: '800', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '15px' }}>🏠</span><span>হোম</span></button>
        <button onClick={() => { setActiveTab('memories'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'memories' ? '#0A4D2E' : '#94A3B8', fontWeight: '800', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '15px' }}>📸</span><span>স্মৃতি</span></button>
        <button onClick={() => { setActiveTab('pride'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'pride' ? '#0A4D2E' : '#94A3B8', fontWeight: '800', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '15px' }}>🏆</span><span>গৌরব</span></button>
        <button onClick={() => { setActiveTab('directory'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontWeight: '800', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '15px' }}>👥</span><span>সহপাঠী</span></button>
        <button onClick={() => { setActiveTab('school'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'school' ? '#0A4D2E' : '#94A3B8', fontWeight: '800', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '15px' }}>🏫</span><span>বিদ্যালয়</span></button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#0A4D2E' : '#94A3B8', fontWeight: '800', fontSize: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ fontSize: '15px' }}>💬</span><span>আড্ডা</span></button>
      </nav>

      {/* অ্যাডমিন কন্ট্রোল প্যানেল (লাইভ জরিপ তৈরি ও নোটিশ সহ) */}
      {showAdmin && userProfile?.role === 'super_admin' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px', width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '16px', fontWeight: '800' }}>👑 অ্যাডমিন কন্ট্রোল প্যানেল</h3>
              <button onClick={() => setShowAdmin(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>বন্ধ করুন</button>
            </div>

            {/* পুশ নোটিফিকেশন ব্রডকাস্ট */}
            <div style={{ background: '#FEF3C7', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#92400E' }}>📢 পুশ নোটিফিকেশন পাঠান:</h4>
              <input type="text" placeholder="বিষয়..." value={adminBroadcastTitle} onChange={e => setAdminBroadcastTitle(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #FDE68A', marginBottom: '5px', boxSizing: 'border-box' }} />
              <textarea rows={2} placeholder="বার্তা..." value={adminBroadcastMsg} onChange={e => setAdminBroadcastMsg(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #FDE68A', boxSizing: 'border-box' }} />
              <button onClick={handleSendAdminBroadcast} style={{ marginTop: '6px', width: '100%', background: '#D97706', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '800' }}>🚀 নোটিফিকেশন পাঠান</button>
            </div>

            {/* নতুন লাইভ জরিপ / পোল তৈরি */}
            <div style={{ background: '#E0F2FE', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#0369A1' }}>📊 নতুন মতামত জরিপ (Poll) চালু করুন:</h4>
              <input type="text" placeholder="জরিপের প্রশ্ন (উদাঃ জার্সির রঙ কী হবে?)" value={pollQuestionInput} onChange={e => setPollQuestionInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #BAE6FD', marginBottom: '5px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="অপশন ১ (উদাঃ সবুজ)" value={pollOptAInput} onChange={e => setPollOptAInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #BAE6FD', marginBottom: '5px', boxSizing: 'border-box' }} />
              <input type="text" placeholder="অপশন ২ (উদাঃ সাদা)" value={pollOptBInput} onChange={e => setPollOptBInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #BAE6FD', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button onClick={handleCreatePoll} style={{ flex: 1, background: '#0284C7', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>জরিপ চালু করুন</button>
                {activePoll?.isActive && (
                  <button onClick={() => setDoc(doc(db, "settings", "active_poll"), { isActive: false }, { merge: true })} style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>বন্ধ করুন</button>
                )}
              </div>
            </div>

            {/* ব্যাকগ্রাউন্ড ও সেটিংস */}
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
              <input type="file" ref={bgFileInputRef} onChange={handleHeaderBgUploadFree} accept="image/*" style={{ display: 'none' }} />
              <button onClick={() => bgFileInputRef.current?.click()} style={{ width: '100%', background: '#0D9488', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '6px', marginBottom: '8px', fontWeight: '700', fontSize: '11px' }}>🖼️ হেডার ছবি পরিবর্তন</button>
              <input type="text" placeholder="APK ডাউনলোড লিংক..." value={newApkUrlInput} onChange={e => setNewApkUrlInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #CBD5E1', marginBottom: '6px', boxSizing: 'border-box' }} />
              <textarea rows={2} placeholder="স্ক্রলিং নোটিশ..." value={newNoticeInput || announcement} onChange={e => setNewNoticeInput(e.target.value)} style={{ width: '100%', padding: '7px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <button onClick={async () => {
                const payload: any = {};
                if (newApkUrlInput.trim()) payload.apkUrl = newApkUrlInput.trim();
                if (newNoticeInput.trim()) payload.announcement = newNoticeInput.trim();
                await setDoc(doc(db, "settings", "app_config"), payload, { merge: true });
                alert('সেভ হয়েছে!');
              }} style={{ marginTop: '6px', width: '100%', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: '700' }}>সেটিংস সেভ করুন</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
