import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";

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

// ইন্টারফেস ডেফিনেশন
interface Member {
  id: string;
  name: string;
  phone: string;
  tshirt: string;
  area: string;
  createdAt?: any;
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
  details: string;
  phone: string;
  photoUrl?: string;
}

interface TeacherItem {
  id: string;
  name: string;
  subject: string;
  designation: string;
  phone?: string;
  photoUrl?: string;
}

interface ChatMsg {
  id: string;
  sender: string;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  timestamp: number;
  time: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'directory' | 'pride' | 'chat' | 'school' | 'register'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // ডেটাবেস স্টেটস
  const [members, setMembers] = useState<Member[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [prideList, setPrideList] = useState<BatchPrideItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  
  // সেটিংস
  const [announcement, setAnnouncement] = useState('পবিত্র ঈদুল আজহা ২০২৭ উপলক্ষে সান্দিকোনা স্কুল এন্ড কলেজের এসএসসি ২০১৪ ব্যাচের পুনর্মিলনী অনুষ্ঠিত হবে।');
  const [schoolHistory, setSchoolHistory] = useState('ঐতিহ্যবাহী সান্দিকোনা স্কুল এন্ড কলেজ নেত্রকোনা জেলার কেন্দুয়া উপজেলার একটি স্বনামধন্য বিদ্যাপীঠ। দীর্ঘকাল ধরে এই প্রতিষ্ঠানটি অত্র অঞ্চলের শিক্ষা বিস্তারে এক অনন্য ভূমিকা পালন করে আসছে। আমাদের এসএসসি ২০১৪ ব্যাচ এই বিদ্যালয়ের অন্যতম স্মরণীয় একটি ব্যাচ।');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://github.com');
  const [headerBgUrl, setHeaderBgUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // রানিং লাইভ ঘড়ি ও ব্যাচ টাইম কাউন্টার স্টেট
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  // মেমোরি স্লাইডার ইনডেক্স
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // নোটিফিকেশন পারমিশন ও টোস্ট
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);
  const isInitialMembers = useRef(false);
  const isInitialMessages = useRef(false);
  const isInitialAdminNotifs = useRef(false);

  // অ্যাডমিন প্যানেল স্টেট
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const ADMIN_PIN = '74798';

  // অ্যাডমিন ইনপুট স্টেটস
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const [newHistoryInput, setNewHistoryInput] = useState('');
  const [newApkUrlInput, setNewApkUrlInput] = useState('');
  const [adminBroadcastTitle, setAdminBroadcastTitle] = useState('');
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // নতুন মেমোরি আপলোড মডাল স্টেট
  const [showMemoryUploadModal, setShowMemoryUploadModal] = useState(false);
  const [memUploader, setMemUploader] = useState(() => localStorage.getItem('sandikona_user_name') || '');
  const [memCaption, setMemCaption] = useState('');
  const [memFile, setMemFile] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [isUploadingMemory, setIsUploadingMemory] = useState(false);

  // নতুন গৌরব যোগ করার স্টেট
  const [showAddPrideModal, setShowAddPrideModal] = useState(false);
  const [prideName, setPrideName] = useState('');
  const [prideProfession, setPrideProfession] = useState('');
  const [prideOrg, setPrideOrg] = useState('');
  const [prideDetails, setPrideDetails] = useState('');
  const [pridePhone, setPridePhone] = useState('');

  // নতুন শিক্ষক যোগ করার স্টেট (অ্যাডমিন)
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [teachName, setTeachName] = useState('');
  const [teachSubject, setTeachSubject] = useState('');
  const [teachDesig, setTeachDesig] = useState('');
  const [teachPhone, setTeachPhone] = useState('');

  // রেজিস্ট্রেশন স্টেট
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tshirt, setTshirt] = useState('L');
  const [area, setArea] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // চ্যাট স্টেট
  const [chatUser, setChatUser] = useState(() => localStorage.getItem('sandikona_user_name') || '');
  const [isJoinedChat, setIsJoinedChat] = useState(() => !!localStorage.getItem('sandikona_user_name'));
  const [msgInput, setMsgInput] = useState('');
  const [attachedChatFile, setAttachedChatFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [callingMode, setCallingMode] = useState<'none' | 'audio' | 'video'>('none');

  // সোশ্যাল গ্রুপ লিংক
  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/GPwXRoWdZ748lL5182iBCj?s=cl&p=a&mlu=4&ilr=4&iam=2";
  const MESSENGER_GROUP_URL = "https://m.me/j/EHb16biwgroNmlDh/?send_source=gc%3Acopy_invite_link_t";

  // ========================================================
  // ১. ঘড়ি এবং ২০১৪ থেকে লাইভ সময় গণনার ইঞ্জিন
  // ========================================================
  useEffect(() => {
    // এসএসসি ২০১৪ পরীক্ষার সমাপ্তি/ফলাফলের বেসলাইন (১৭ মে ২০১৪)
    const sscDate = new Date('2014-05-17T00:00:00');

    const updateTimers = () => {
      const now = new Date();
      // লাইভ ডিজিটাল ঘড়ি
      setCurrentTimeStr(now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateStr(now.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

      // ২০১৪ থেকে অতিবাহিত সময় হিসাব
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

    updateTimers();
    const timerInterval = setInterval(updateTimers, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // মেমোরি স্লাইড শো অটো রোটেশন
  useEffect(() => {
    if (memories.length > 1) {
      const slideInterval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % memories.length);
      }, 3500);
      return () => clearInterval(slideInterval);
    }
  }, [memories.length]);

  // ========================================================
  // ২. ফুল পারমিশন ম্যানেজার ও অডিও অ্যালার্ট
  // ========================================================
  const requestAllAppPermissions = async () => {
    if ("Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
      } catch (e) {}
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach(t => t.stop());
      } catch (e) {}
    }
  };

  useEffect(() => {
    requestAllAppPermissions();
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
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const notifyUser = (title: string, body: string, icon: string = '🔔') => {
    playChimeSound();
    if (navigator.vibrate) navigator.vibrate([150, 75, 150]);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, icon: '/header-bg.jpg' }); } catch (e) {}
    }
    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 6000);
  };

  // ========================================================
  // ৩. ফায়ারবেস ডেটাবেস লাইভ সিঙ্ক
  // ========================================================
  useEffect(() => {
    // মেম্বার লিস্ট
    const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
      const list: Member[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Member));
      setMembers(list);
      setIsLoading(false);

      if (isInitialMembers.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const m = c.doc.data() as Member;
            notifyUser("🎉 নতুন সহপাঠী যুক্ত হয়েছেন!", `${m.name} (${m.area}) ব্যাচে নিবন্ধন করেছেন।`, "🎓");
          }
        });
      } else {
        isInitialMembers.current = true;
      }
    }, () => setIsLoading(false));

    // পুরনো দিনের স্মৃতি (ছবি ও ভিডিও)
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

    // শিক্ষক পরিচিতি
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
            if (m.sender !== chatUser) {
              notifyUser(`💬 ${m.sender}`, m.text || "📷 মিডিয়া পাঠিয়েছেন", "💬");
            }
          }
        });
      } else {
        isInitialMessages.current = true;
      }
    });

    // অ্যাডমিন সরাসরি নোটিফিকেশন ব্রডকাস্ট
    const qAdminNotifs = query(collection(db, "admin_broadcasts"), orderBy("timestamp", "asc"));
    const unsubAdminBroadcast = onSnapshot(qAdminNotifs, (snap) => {
      if (isInitialAdminNotifs.current) {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const d = c.doc.data();
            notifyUser(d.title || "📢 অ্যাডমিন বার্তা", d.body || "", "📢");
          }
        });
      } else {
        isInitialAdminNotifs.current = true;
      }
    });

    // গ্লোবাল কনফিগারেশন ও স্কুল ইতিহাস
    const unsubSettings = onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.announcement) setAnnouncement(data.announcement);
        if (data?.schoolHistory) setSchoolHistory(data.schoolHistory);
        if (data?.apkUrl) setApkDownloadUrl(data.apkUrl);
        if (data?.headerBg) setHeaderBgUrl(data.headerBg);
      }
    });

    // টাইপিং ইন্ডিকেটর
    const unsubTyping = onSnapshot(doc(db, "settings", "typing"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.user && data.user !== chatUser && Date.now() - data.time < 3500) {
          setTypingUser(data.user);
        } else {
          setTypingUser(null);
        }
      }
    });

    return () => {
      unsubMembers();
      unsubMemories();
      unsubPride();
      unsubTeachers();
      unsubChat();
      unsubAdminBroadcast();
      unsubSettings();
      unsubTyping();
    };
  }, [chatUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // ========================================================
  // ৪. মেমোরি ও ফাইল আপলোড হ্যান্ডলার
  // ========================================================
  const handleMemoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('অনুগ্রহ করে ৮ মেগাবাইটের কম সাইজের ছবি বা ছোট ভিডিও সিলেক্ট করুন।');
      return;
    }

    const isVideo = file.type.startsWith('video');
    const reader = new FileReader();
    reader.onloadend = () => {
      setMemFile({
        url: reader.result as string,
        type: isVideo ? 'video' : 'image'
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memFile) {
      alert('অনুগ্রহ করে একটি ছবি বা ভিডিও সিলেক্ট করুন।');
      return;
    }
    if (!memUploader.trim()) {
      alert('আপনার নাম লিখুন যাতে সবাই বুঝতে পারে কে পোস্ট করেছে।');
      return;
    }

    setIsUploadingMemory(true);
    try {
      await addDoc(collection(db, "memories"), {
        uploader: memUploader.trim(),
        caption: memCaption.trim() || 'স্কুল জীবনের সোনালী স্মৃতি',
        mediaUrl: memFile.url,
        mediaType: memFile.type,
        timestamp: Date.now()
      });
      localStorage.setItem('sandikona_user_name', memUploader.trim());
      setShowMemoryUploadModal(false);
      setMemFile(null);
      setMemCaption('');
      alert('আপনার স্মৃতি সফলভাবে যোগ হয়েছে!');
    } catch (err) {
      alert('আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsUploadingMemory(false);
    }
  };

  // ব্যাচের গৌরব যোগ করার হ্যান্ডলার
  const handleAddPrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prideName.trim() || !prideProfession.trim()) return;

    try {
      await addDoc(collection(db, "batch_pride"), {
        name: prideName.trim(),
        profession: prideProfession.trim(),
        organization: prideOrg.trim() || 'স্বতন্ত্র',
        details: prideDetails.trim() || 'ব্যাচের গর্বিত সহপাঠী',
        phone: pridePhone.trim()
      });
      setShowAddPrideModal(false);
      setPrideName('');
      setPrideProfession('');
      setPrideOrg('');
      setPrideDetails('');
      setPridePhone('');
      alert('ব্যাচের গৌরবে আপনার তথ্য সফলভাবে যুক্ত হয়েছে!');
    } catch (e) {
      alert('যুক্ত করা যায়নি।');
    }
  };

  // অ্যাডমিন শিক্ষক যোগ
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
    } catch (e) {
      alert('ব্যর্থ হয়েছে।');
    }
  };

  // অ্যাডমিন কনফিগ ও স্কুল ইতিহাস আপডেট
  const handleUpdateConfig = async () => {
    try {
      const payload: any = {};
      if (newNoticeInput.trim()) payload.announcement = newNoticeInput.trim();
      if (newHistoryInput.trim()) payload.schoolHistory = newHistoryInput.trim();
      if (newApkUrlInput.trim()) payload.apkUrl = newApkUrlInput.trim();

      await setDoc(doc(db, "settings", "app_config"), payload, { merge: true });
      if (newNoticeInput.trim()) setNewNoticeInput('');
      if (newHistoryInput.trim()) setNewHistoryInput('');
      if (newApkUrlInput.trim()) setNewApkUrlInput('');
      alert('সফলভাবে সেটিংস ও স্কুলের ইতিহাস আপডেট হয়েছে!');
    } catch (err) {
      alert('আপডেট করা যায়নি।');
    }
  };

  // অ্যাডমিন নোটিফিকেশন ব্রডকাস্ট
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
      alert('সকল সহপাঠীর ফোনে নোটিফিকেশন পৌঁছে গেছে!');
    } catch (err) {
      alert('ব্যর্থ হয়েছে।');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // রেজিস্ট্রেশন হ্যান্ডলার
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsSubmitting(true);

    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 11) {
      setRegError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      setIsSubmitting(false);
      return;
    }

    const exists = members.some(m => m.phone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
    if (exists) {
      setRegError('⚠️ এই নম্বর দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে!');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "members"), {
        name: name.trim(),
        phone: cleanPhone,
        batch: '2014',
        tshirt,
        area: area.trim() || 'সান্দিকোনা, কেন্দুয়া',
        createdAt: new Date().toISOString()
      });
      setRegSuccess(true);
      setName('');
      setPhone('');
      setArea('');
    } catch (err) {
      setRegError('সংরক্ষণ করা যায়নি।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // চ্যাট মেসেজ সেন্ড
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() && !attachedChatFile) return;

    const payload: any = {
      sender: chatUser || 'এসএসসি ২০১৪ বন্ধু',
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (msgInput.trim()) payload.text = msgInput.trim();
    if (attachedChatFile) {
      payload.fileUrl = attachedChatFile.url;
      payload.fileType = attachedChatFile.type;
      payload.fileName = attachedChatFile.name;
    }

    try {
      await addDoc(collection(db, "messages"), payload);
      setMsgInput('');
      setAttachedChatFile(null);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
    } catch (e) {}
  };

  // সোশ্যাল শেয়ার
  const handleShareApp = async () => {
    const finalDownloadUrl = apkDownloadUrl.trim() || 'https://github.com';
    const shareText = `🎉 সান্দিকোনা স্কুল এন্ড কলেজ — এসএসসি ব্যাচ ২০১৪ পুনর্মিলনী ২০২৭\nআমাদের বন্ধুদের অফিসিয়াল অ্যাপে এখনই যুক্ত হোন ও স্মৃতিগুলো শেয়ার করুন!\n\n📲 অ্যাপ ডাউনলোড লিংক:\n${finalDownloadUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'পুনর্মিলনী ২০২৭ - এসএসসি ২০১৪',
          text: shareText
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText);
      alert('অ্যাপের ডাউনলোড লিংক ও দাওয়াত কপি করা হয়েছে!');
    }
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.area.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#F3F6F4',
      minHeight: '100vh',
      color: '#1A2E22',
      paddingBottom: '90px',
      margin: 0,
      userSelect: 'none',
      WebkitTouchCallout: 'none'
    }}>

      {/* লাইভ ড্রপ-ডাউন পুশ নোটিফিকেশন ব্যানার */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '480px',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: '16px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.4)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '2px solid #F59E0B',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ fontSize: '24px' }}>{activeToast.icon}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h5 style={{ margin: '0 0 2px 0', fontSize: '13px', color: '#FCD34D', fontWeight: '800' }}>
              {activeToast.title}
            </h5>
            <p style={{ margin: 0, fontSize: '12px', color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeToast.body}
            </p>
          </div>
          <button onClick={() => setActiveToast(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* টপ রানিং লাইভ ঘড়ি ও তারিখ বার */}
      <div style={{
        background: 'linear-gradient(90deg, #0A4D2E 0%, #06321D 100%)',
        color: '#FEF08A',
        padding: '6px 14px',
        fontSize: '11px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(212, 175, 55, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}>
          <span>🕒 লাইভ সময়:</span>
          <span style={{ color: '#FFFFFF', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
            {currentTimeStr || '...'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#E2E8F0', fontWeight: '500' }}>
          📅 {currentDateStr || '...'}
        </div>
      </div>

      {/* নোটিফিকেশন অন প্রম্পট (অন না থাকলে) */}
      {notifPermission !== 'granted' && (
        <div style={{
          backgroundColor: '#FEF3C7',
          color: '#92400E',
          padding: '8px 12px',
          fontSize: '11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #FDE68A'
        }}>
          <span>🔔 জরুরি নোটিশ পেতে নোটিফিকেশন অন করুন</span>
          <button
            onClick={requestAllAppPermissions}
            style={{
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            অন করুন
          </button>
        </div>
      )}

      {/* ১. বন্ধুদের উজ্জ্বল ছবির ব্যাকগ্রাউন্ড সহ হেডার ব্যানার */}
      <header style={{
        backgroundImage: headerBgUrl 
          ? `linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.70) 100%), url('${headerBgUrl}')`
          : `linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.70) 100%), url('/header-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        backgroundRepeat: 'no-repeat',
        color: '#FFFFFF',
        padding: '24px 16px 18px 16px',
        textAlign: 'center',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <span style={{
            fontSize: '11px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            color: '#FEF08A',
            padding: '4px 14px',
            borderRadius: '20px',
            border: '1.5px solid rgba(212, 175, 55, 0.7)',
            fontWeight: '800',
            backdropFilter: 'blur(4px)',
            display: 'inline-block'
          }}>
            সান্দিকোনা স্কুল এন্ড কলেজ
          </span>

          <h1 style={{ 
            fontSize: '27px', 
            margin: '8px 0 2px 0', 
            fontWeight: '900', 
            textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.9)' 
          }}>
            পুনর্মিলনী ২০২৭
          </h1>

          <p style={{ 
            fontSize: '15px', 
            margin: 0, 
            fontWeight: '800', 
            color: '#F0FDF4',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)' 
          }}>
            এসএসসি ব্যাচ ২০১৪
          </p>

          <div style={{
            marginTop: '8px',
            display: 'inline-block',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: '4px 14px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#F8FAFC',
            fontWeight: '700',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            🤝 আয়োজনে: এসএসসি ২০১৪ ব্যাচ পুনর্মিলনী সংসদ
          </div>
        </div>
      </header>

      {/* ২. লাইভ স্ক্রলিং নোটিশ বার */}
      <div style={{
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        borderBottom: '2px solid #D4AF37'
      }}>
        <span style={{
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          fontSize: '10px',
          fontWeight: '800',
          padding: '3px 8px',
          borderRadius: '4px',
          marginRight: '10px',
          flexShrink: 0
        }}>
          📢 নোটিশ:
        </span>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
          <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '12px', color: '#FEF08A', fontWeight: '600' }}>
            {announcement}
          </marquee>
        </div>
      </div>

      {/* ৩. ২০১৪ সাল থেকে একসাথে কাটানো লাইভ সময় কাউন্টার (রিয়েলটাইম টিকিং) */}
      <div style={{ maxWidth: '520px', margin: '12px auto 0 auto', padding: '0 14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A4D2E 0%, #116B3E 100%)',
          color: '#FFFFFF',
          borderRadius: '18px',
          padding: '14px 16px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(10, 77, 46, 0.2)',
          border: '1px solid rgba(212, 175, 55, 0.4)'
        }}>
          <span style={{ fontSize: '11px', color: '#FEF08A', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
            ⏳ ২০১৪ সালে এসএসসি পাসের পর থেকে আমাদের বন্ধুত্বের সময়:
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.years}</span>
              <span style={{ fontSize: '10px', display: 'block', color: '#D1FAE5' }}>বছর</span>
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.months}</span>
              <span style={{ fontSize: '10px', display: 'block', color: '#D1FAE5' }}>মাস</span>
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.days}</span>
              <span style={{ fontSize: '10px', display: 'block', color: '#D1FAE5' }}>দিন</span>
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.hours}</span>
              <span style={{ fontSize: '10px', display: 'block', color: '#D1FAE5' }}>ঘণ্টা</span>
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>{batchTimeElapsed.minutes}</span>
              <span style={{ fontSize: '10px', display: 'block', color: '#D1FAE5' }}>মিনিট</span>
            </div>
            <div>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span>
              <span style={{ fontSize: '10px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span>
            </div>
          </div>
        </div>
      </div>

      {/* ৪. ১-ক্লিকে হোয়াটসঅ্যাপ গ্রুপ ও মেসেঞ্জার গ্রুপে যুক্ত হওয়ার সেকশন */}
      <div style={{ maxWidth: '520px', margin: '10px auto 0 auto', padding: '0 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              color: '#FFFFFF',
              padding: '12px',
              borderRadius: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              fontWeight: '800',
              fontSize: '12px'
            }}
          >
            <span style={{ fontSize: '18px' }}>💬</span>
            <span>WhatsApp গ্রুপ</span>
          </a>

          <a
            href={MESSENGER_GROUP_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'linear-gradient(135deg, #00B2FF 0%, #006AFF 100%)',
              color: '#FFFFFF',
              padding: '12px',
              borderRadius: '16px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 106, 255, 0.25)',
              fontWeight: '800',
              fontSize: '12px'
            }}
          >
            <span style={{ fontSize: '18px' }}>⚡</span>
            <span>Messenger গ্রুপ</span>
          </a>
        </div>
      </div>

      {/* ৫. মূল কনটেন্ট ভিউয়ার */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '14px' }}>

        {/* ======================================================== */}
        {/* ক. ড্যাশবোর্ড / হোম ট্যাব */}
        {/* ======================================================== */}
        {activeTab === 'home' && (
          <div>
            {/* ৭নং নির্দেশনা: পুরনো দিনের স্মৃতির লাইভ স্লাইডার অ্যালবাম */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '14px',
              marginBottom: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#0A4D2E', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📸</span> পুরনো দিনের স্মৃতি
                </h4>
                <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: '10px', fontWeight: '700' }}>
                  লাইভ অ্যালবাম
                </span>
              </div>

              {/* স্লাইড ভিউপোর্ট */}
              {memories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748B', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #CBD5E1' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>এখনো কোনো পুরনো স্মৃতি আপলোড করা হয়নি।</p>
                  <button
                    onClick={() => { setActiveTab('memories'); setShowMemoryUploadModal(true); }}
                    style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    প্রথম স্মৃতিটি আপনিই শেয়ার করুন ➕
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    position: 'relative',
                    height: '210px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    backgroundColor: '#0F172A'
                  }}>
                    {memories[currentSlideIndex].mediaType === 'image' ? (
                      <img
                        src={memories[currentSlideIndex].mediaUrl}
                        alt="Memory"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <video
                        src={memories[currentSlideIndex].mediaUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                    )}

                    {/* ওয়াটারমার্ক ও ক্যাপশন ওভারলে */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                      padding: '12px',
                      color: '#FFFFFF'
                    }}>
                      <p style={{ margin: '0 0 3px 0', fontSize: '12px', fontWeight: '700' }}>
                        {memories[currentSlideIndex].caption}
                      </p>
                      <span style={{ fontSize: '10px', color: '#FEF08A' }}>
                        👤 শেয়ার করেছেন: {memories[currentSlideIndex].uploader}
                      </span>
                    </div>
                  </div>

                  {/* সমস্ত স্মৃতি দেখার বড় কল-টু-অ্যাকশন বাটন */}
                  <button
                    onClick={() => setActiveTab('memories')}
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      background: '#F0FDF4',
                      color: '#15803D',
                      border: '1.5px solid #86EFAC',
                      padding: '10px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    📸 সমস্ত স্মৃতি ও ভিডিও দেখতে ক্লিক করুন ({memories.length}টি) →
                  </button>
                </div>
              )}
            </div>

            {/* কাউন্টার কার্ড */}
            <div 
              onClick={() => setActiveTab('directory')}
              title="সহপাঠীদের তালিকা দেখতে চাপ দিন"
              style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '20px',
                border: '2px solid #BBF7D0',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                textAlign: 'center',
                marginBottom: '14px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '13px', color: '#137547', fontWeight: '700' }}>এসএসসি ব্যাচ ২০১৪</span>
              <h2 style={{ fontSize: '34px', margin: '4px 0', color: '#0A4D2E', fontWeight: '900' }}>
                {isLoading ? '...' : `${members.length} জন`}
              </h2>
              <span style={{ fontSize: '12px', color: '#0284C7', fontWeight: '700', textDecoration: 'underline' }}>
                👉 সকল সহপাঠীর তালিকা দেখতে এখানে ক্লিক করুন
              </span>
            </div>

            {/* পুনর্মিলনী ইভেন্ট কার্ড */}
            <div style={{
              background: '#FFFFFF',
              padding: '18px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0A4D2E', fontWeight: '800' }}>📅 পুনর্মিলনীর সময় ও ভেন্যু</h3>
                <span style={{ fontSize: '10px', backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: '8px', fontWeight: '700' }}>নির্ধারিত</span>
              </div>
              <p style={{ fontSize: '13px', margin: '5px 0', color: '#334155' }}>
                📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ
              </p>
              <p style={{ fontSize: '13px', margin: '5px 0', color: '#137547', fontWeight: '700' }}>
                ⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭
              </p>
              <p style={{ fontSize: '12px', margin: '5px 0', color: '#64748B' }}>
                কেন্দুয়া, নেত্রকোনা, বাংলাদেশ
              </p>

              <button
                onClick={() => setActiveTab('register')}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                📝 পুনর্মিলনী নিবন্ধন ফরম পূরণ করুন
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* খ. "পুরনো দিনের স্মৃতি" গ্যালারি পেজ (স্ক্রিনশট/ডাউনলোড গার্ড সহ) */}
        {/* ======================================================== */}
        {activeTab === 'memories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0A4D2E', fontWeight: '800' }}>📸 পুরনো দিনের স্মৃতি</h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>স্কুল জীবনের অবিস্মরণীয় মুহূর্তগুলো</span>
              </div>
              <button
                onClick={() => setShowMemoryUploadModal(true)}
                style={{
                  background: '#0A4D2E',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                স্মৃতি যোগ করুন ➕
              </button>
            </div>

            {memories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', background: '#FFFFFF', borderRadius: '18px', color: '#64748B' }}>
                কোনো ছবি বা ভিডিও নেই। প্রথম স্মৃতিটি আপনিই শেয়ার করুন!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {memories.map((item) => (
                  <div key={item.id} style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                    position: 'relative'
                  }}>
                    {/* সিকিউরিটি ওয়াটারমার্ক ও নো-ডাউনলোড লেয়ার */}
                    <div 
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ position: 'relative', width: '100%', backgroundColor: '#000000', userSelect: 'none' }}
                    >
                      {item.mediaType === 'image' ? (
                        <img
                          src={item.mediaUrl}
                          alt={item.caption}
                          onContextMenu={(e) => e.preventDefault()}
                          style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                        />
                      ) : (
                        <video
                          src={item.mediaUrl}
                          controls
                          controlsList="nodownload noplaybackrate"
                          disablePictureInPicture
                          onContextMenu={(e) => e.preventDefault()}
                          style={{ width: '100%', maxHeight: '380px', display: 'block' }}
                        />
                      )}

                      {/* অ্যান্টি-কপি ওয়াটারমার্ক */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '9px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        pointerEvents: 'none',
                        fontWeight: '700'
                      }}>
                        সান্দিকোনা ২০১৪ স্মৃতি
                      </div>
                    </div>

                    {/* ক্যাপশন ও কে আপলোড করেছে তার নাম */}
                    <div style={{ padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#1E293B', fontWeight: '600' }}>
                        {item.caption}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#0A4D2E', fontWeight: '800', background: '#DCFCE7', padding: '3px 10px', borderRadius: '12px' }}>
                          👤 আপলোড করেছেন: {item.uploader}
                        </span>
                        <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                          {new Date(item.timestamp).toLocaleDateString('bn-BD')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* গ. "ব্যাচের গৌরব" (Achievers List) */}
        {/* ======================================================== */}
        {activeTab === 'pride' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0A4D2E', fontWeight: '800' }}>🏆 আমাদের ব্যাচের গৌরব</h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>যারা বিশেষ অবদান রেখে সুনাম রাখছেন</span>
              </div>
              <button
                onClick={() => setShowAddPrideModal(true)}
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                যুক্ত হোন ➕
              </button>
            </div>

            {prideList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', background: '#FFFFFF', borderRadius: '18px', color: '#64748B' }}>
                এখনো কেউ যুক্ত হননি। আপনার অর্জন বা পেশা শেয়ার করতে উপরের বাটনে চাপ দিন!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {prideList.map((p) => (
                  <div key={p.id} style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #FEF08A',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '16px', color: '#0F172A', fontWeight: '800' }}>{p.name}</h4>
                        <span style={{ fontSize: '12px', color: '#D97706', fontWeight: '700' }}>
                          💼 {p.profession} {p.organization ? `(${p.organization})` : ''}
                        </span>
                      </div>
                      <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '10px', padding: '3px 8px', borderRadius: '8px', fontWeight: '800' }}>
                        গৌরবময় ব্যক্তিত্ব
                      </span>
                    </div>

                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                      {p.details}
                    </p>

                    {p.phone && (
                      <div style={{ marginTop: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                        <a href={`tel:${p.phone}`} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
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

        {/* ======================================================== */}
        {/* ঘ. বিদ্যালয়ের ইতিহাস ও শিক্ষক-শিক্ষিকা পরিচিতি */}
        {/* ======================================================== */}
        {activeTab === 'school' && (
          <div>
            {/* স্কুলের পরিচিতি ও ইতিহাস */}
            <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '20px', border: '1px solid #E2E8F0', marginBottom: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#0A4D2E', fontSize: '17px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🏫</span> বিদ্যালয়ের ইতিহাস ও পরিচিতি
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {schoolHistory}
              </p>
            </div>

            {/* শ্রদ্ধেয় শিক্ষক-শিক্ষিকাদের পরিচিতি */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#0A4D2E', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👨‍🏫</span> শ্রদ্ধেয় শিক্ষক ও শিক্ষিকাগণ
              </h4>
            </div>

            {teachers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', background: '#FFFFFF', borderRadius: '16px', color: '#64748B' }}>
                শিক্ষকদের তালিকা শীঘ্রই আপডেট করা হবে।
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teachers.map((t) => (
                  <div key={t.id} style={{
                    background: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h5 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A', fontWeight: '800' }}>{t.name}</h5>
                      <span style={{ fontSize: '12px', color: '#137547', fontWeight: '600' }}>
                        {t.designation} • বিষয়: {t.subject}
                      </span>
                    </div>
                    {t.phone && (
                      <a href={`tel:${t.phone}`} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#15803D', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                        📞 কল
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ঙ. সহপাঠী ডিরেক্টরি (নম্বর পাবলিক থেকে গোপন) */}
        {/* ======================================================== */}
        {activeTab === 'directory' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 সহপাঠীর নাম বা এলাকা দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#137547', fontWeight: '700', marginBottom: '10px' }}>
              মোট নিবন্ধিত সহপাঠী: {filteredMembers.length} জন
            </div>

            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#FFFFFF', borderRadius: '16px', color: '#64748B' }}>কোনো সহপাঠী পাওয়া যায়নি।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredMembers.map((m) => (
                  <div key={m.id} style={{
                    background: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>{m.name}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#137547', fontWeight: '600' }}>
                        এসএসসি ২০১৪ • <span style={{ color: '#64748B', fontWeight: '400' }}>📍 {m.area}</span>
                      </p>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>জার্সি সাইজ: <strong>{m.tshirt}</strong></span>
                    </div>
                    <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
                      ✓ নিবন্ধিত
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* চ. রেজিস্ট্রেশন ফরম */}
        {/* ======================================================== */}
        {activeTab === 'register' && (
          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0A4D2E', fontSize: '18px', fontWeight: '800' }}>📝 পুনর্মিলনী ২০২৭ নিবন্ধন ফরম</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>সতর্কতা: একজন ব্যক্তি একটি মোবাইল নম্বর দিয়ে একবারই নিবন্ধন করতে পারবেন।</p>

            {regError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '14px' }}>
                {regError}
              </div>
            )}

            {regSuccess ? (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', padding: '20px', borderRadius: '16px', textAlign: 'center', color: '#137547' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>🎉 অভিনন্দন! নিবন্ধন সফল হয়েছে</h3>
                <p style={{ margin: 0, fontSize: '13px' }}>আপনার তথ্য কেন্দ্রীয় ক্লাউড ডেটাবেসে সংরক্ষিত হয়েছে।</p>
                <button onClick={() => { setRegSuccess(false); setActiveTab('directory'); }} style={{ marginTop: '14px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                  সহপাঠী তালিকায় দেখুন
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>আপনার পুরো নাম: *</label>
                  <input required type="text" placeholder="উদাঃ মোঃ রাসেল মিয়া" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>মোবাইল নম্বর (যোগাযোগের জন্য): *</label>
                  <input required type="tel" placeholder="017XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>এলাকার নাম লিখুন: *</label>
                  <input required type="text" placeholder="উদাঃ সান্দিকোনা / কেন্দুয়া / ঢাকা" value={area} onChange={e => setArea(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>টি-শার্ট সাইজ (পুনর্মিলনী জার্সির মাপ): *</label>
                  <select value={tshirt} onChange={e => setTshirt(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', background: '#FFFFFF', outline: 'none' }}>
                    <option value="M">Medium (M - ৩৮)</option>
                    <option value="L">Large (L - ৪০)</option>
                    <option value="XL">Extra Large (XL - ৪২)</option>
                    <option value="XXL">Double XL (XXL - ৪৪)</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} style={{ background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', marginTop: '6px', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন নিশ্চিত করুন'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ছ. হোয়াটসঅ্যাপ স্টাইল আড্ডা (চ্যাট ও ইন-অ্যাপ কল) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div style={{
            background: '#E5DDD5',
            borderRadius: '20px',
            border: '1px solid #CBD5E1',
            height: '74vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              padding: '10px 14px',
              background: '#075E54',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  👥
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>এসএসসি ২০১৪ আড্ডা</h4>
                  <span style={{ fontSize: '10px', color: '#D1FAE5' }}>
                    {typingUser ? `✍️ ${typingUser} টাইপ করছেন...` : 'অনলাইন গ্রুপ চ্যাট'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCallingMode('audio')}
                  title="ইন-অ্যাপ অডিও কল"
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  📞 অডিও
                </button>
                <button
                  onClick={() => setCallingMode('video')}
                  title="ইন-অ্যাপ ভিডিও কল"
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  📹 ভিডিও
                </button>
              </div>
            </div>

            {!isJoinedChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', marginBottom: '10px' }}>
                  💬
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>আড্ডায় প্রবেশ করতে নাম দিন</h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>একবার নাম লিখলেই এই ফোনে স্থায়ীভাবে সংরক্ষিত থাকবে।</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (chatUser.trim()) {
                    localStorage.setItem('sandikona_user_name', chatUser.trim());
                    setIsJoinedChat(true);
                  }
                }} style={{ width: '100%', maxWidth: '280px' }}>
                  <input
                    required
                    type="text"
                    placeholder="আপনার নাম লিখুন..."
                    value={chatUser}
                    onChange={(e) => setChatUser(e.target.value)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '10px', textAlign: 'center', outline: 'none' }}
                  />
                  <button type="submit" style={{ width: '100%', background: '#075E54', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    👉 আড্ডায় প্রবেশ করুন
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {chatMessages.map((m) => {
                    const isMe = m.sender === chatUser;
                    return (
                      <div key={m.id} style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        backgroundColor: isMe ? '#DCF8C6' : '#FFFFFF',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)'
                      }}>
                        {!isMe && (
                          <span style={{ fontSize: '10px', color: '#075E54', fontWeight: '800', display: 'block', marginBottom: '3px' }}>
                            {m.sender}
                          </span>
                        )}

                        {m.fileUrl && m.fileType?.startsWith('image') && (
                          <img src={m.fileUrl} alt="Attached" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block', marginBottom: '4px' }} />
                        )}

                        {m.fileUrl && m.fileType?.startsWith('video') && (
                          <video src={m.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block', marginBottom: '4px' }} />
                        )}

                        {m.text && <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', wordBreak: 'break-word' }}>{m.text}</p>}
                        
                        <span style={{ fontSize: '9px', color: '#94A3B8', float: 'right', marginTop: '3px', marginLeft: '8px' }}>
                          {m.time} <span style={{ color: '#34B7F1', fontWeight: 'bold' }}>✓✓</span>
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendChat} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: '#F0F2F5', borderTop: '1px solid #CBD5E1', gap: '6px' }}>
                  <input
                    type="file"
                    ref={chatFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAttachedChatFile({ url: reader.result as string, type: file.type, name: file.name });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    style={{ border: 'none', background: '#E2E8F0', padding: '8px 10px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}
                  >
                    📎
                  </button>

                  <input
                    type="text"
                    placeholder="মেসেজ লিখুন..."
                    value={msgInput}
                    onChange={(e) => {
                      setMsgInput(e.target.value);
                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      setDoc(doc(db, "settings", "typing"), { user: chatUser, time: Date.now() });
                      typingTimeoutRef.current = setTimeout(() => {
                        setDoc(doc(db, "settings", "typing"), { user: null, time: 0 });
                      }, 2500);
                    }}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                  />
                  <button type="submit" style={{ background: '#075E54', color: '#FFFFFF', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer' }}>
                    ➤
                  </button>
                </form>
              </>
            )}
          </div>
        )}

      </main>

      {/* ইন-অ্যাপ কলিং ওভারলে স্ক্রিন */}
      {callingMode !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000000', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', background: '#075E54', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              {callingMode === 'video' ? '📹 এসএসসি ২০১৪ ভিডিও আড্ডা' : '📞 এসএসসি ২০১৪ অডিও আড্ডা'}
            </span>
            <button
              onClick={() => setCallingMode('none')}
              style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
            >
              কল কাটুন ✕
            </button>
          </div>
          <iframe
            src={`https://meet.jit.si/SandikonaSSC2014CallSession#config.startWithVideoMuted=${callingMode === 'audio'}&config.prejoinPageEnabled=false`}
            allow="microphone; camera; autoplay; display-capture"
            style={{ width: '100%', flex: 1, border: 'none' }}
            title="SSC 2014 In-App Call"
          />
        </div>
      )}

      {/* নতুন স্মৃতি আপলোড মডাল */}
      {showMemoryUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '16px', fontWeight: '800' }}>📸 পুরনো স্মৃতি যোগ করুন</h3>
              <button onClick={() => setShowMemoryUploadModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleUploadMemory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700' }}>আপনার নাম: *</label>
                <input required type="text" placeholder="কে আপলোড করছেন?" value={memUploader} onChange={e => setMemUploader(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700' }}>স্মৃতির বিবরণ বা ক্যাপশন:</label>
                <input type="text" placeholder="উদাঃ ২০১৪ সালের বিদায় অনুষ্ঠান" value={memCaption} onChange={e => setMemCaption(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700' }}>ছবি বা ভিডিও সিলেক্ট করুন: *</label>
                <input required type="file" accept="image/*,video/*" onChange={handleMemoryFileSelect} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={isUploadingMemory} style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '6px' }}>
                {isUploadingMemory ? 'আপলোড হচ্ছে...' : 'আপলোড নিশ্চিত করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ব্যাচের গৌরব যোগ মডাল */}
      {showAddPrideModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#D97706', fontSize: '16px', fontWeight: '800' }}>🏆 ব্যাচের গৌরবে যুক্ত হোন</h3>
              <button onClick={() => setShowAddPrideModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddPrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required type="text" placeholder="আপনার নাম *" value={prideName} onChange={e => setPrideName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input required type="text" placeholder="আপনার বর্তমান পেশা বা পদবি *" value={prideProfession} onChange={e => setPrideProfession(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="text" placeholder="প্রতিষ্ঠান বা কর্মস্থল" value={prideOrg} onChange={e => setPrideOrg(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <textarea placeholder="সংক্ষিপ্ত অর্জন বা বিবরণ..." value={prideDetails} onChange={e => setPrideDetails(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="tel" placeholder="মোবাইল নম্বর (যোগাযোগের জন্য)" value={pridePhone} onChange={e => setPridePhone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <button type="submit" style={{ background: '#D97706', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                যুক্ত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* শিক্ষক যোগ মডাল (অ্যাডমিন) */}
      {showAddTeacherModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '16px', fontWeight: '800' }}>👨‍🏫 শিক্ষক পরিচিতি যোগ</h3>
              <button onClick={() => setShowAddTeacherModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required type="text" placeholder="শিক্ষকের নাম *" value={teachName} onChange={e => setTeachName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="text" placeholder="পদবি (উদাঃ প্রধান শিক্ষক / সহকারী শিক্ষক)" value={teachDesig} onChange={e => setTeachDesig(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="text" placeholder="বিষয় (উদাঃ গণিত / বিজ্ঞান / ইংরেজি)" value={teachSubject} onChange={e => setTeachSubject(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <input type="tel" placeholder="মোবাইল নম্বর" value={teachPhone} onChange={e => setTeachPhone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }} />
              <button type="submit" style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                সংরক্ষণ করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* সর্বজনীন শেয়ার বাটন ও ফুটার */}
      <footer style={{ maxWidth: '520px', margin: '14px auto', padding: '0 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF',
          padding: '16px',
          borderRadius: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          boxShadow: '0 4px 14px rgba(15,23,42,0.15)'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#38BDF8' }}>📲 বন্ধুদের সাথে অ্যাপটি শেয়ার করুন</h4>
            <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#CBD5E1' }}>সরাসরি ডাউনলোড লিংক সহ পাঠান</p>
          </div>
          <button
            onClick={handleShareApp}
            style={{
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            শেয়ার করুন
          </button>
        </div>

        {/* ৩ বার চাপ দিয়ে অ্যাডমিন প্যানেল ওপেন */}
        <div 
          onClick={() => {
            const next = clickCount + 1;
            if (next >= 3) { setClickCount(0); setShowAdmin(true); }
            else { setClickCount(next); setTimeout(() => setClickCount(0), 2000); }
          }}
          style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer' }}
        >
          <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#137547', fontWeight: '800' }}>
            📱 অ্যাপটি তৈরি করেছেন: স্মার্ট রাসেল খান
          </p>
          <p style={{ margin: '2px 0', fontSize: '11px', color: '#334155' }}>
            সরাসরি যোগাযোগ: <a href="tel:01705374798" style={{ color: '#0A4D2E', fontWeight: '700', textDecoration: 'none' }}>01705374798</a>
          </p>
          <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', padding: '4px 10px', borderRadius: '20px', border: '1px solid #86EFAC' }}>
            <span style={{ fontSize: '10px', color: '#166534', fontWeight: '700' }}>হটলাইন ও সার্বিক সহযোগিতা:</span>
            <a href="https://wa.me/8801951695069" style={{ fontSize: '10px', color: '#137547', textDecoration: 'none', fontWeight: '700' }}>
              WhatsApp 01951695069
            </a>
            <span style={{ fontSize: '10px', color: '#64748B' }}>বা</span>
            <a href="tel:01951695069" style={{ fontSize: '10px', color: '#0A4D2E', textDecoration: 'none', fontWeight: '700' }}>কল</a>
          </div>
        </div>
      </footer>

      {/* প্রিমিয়াম বটম ন্যাভিগেশন বার (সবার জন্য সহজ ও সুশৃঙ্খল) */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.05)'
      }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'home' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🏠</span>
          <span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('memories')} style={{ border: 'none', background: 'none', color: activeTab === 'memories' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'memories' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>📸</span>
          <span>স্মৃতি</span>
        </button>
        <button onClick={() => setActiveTab('pride')} style={{ border: 'none', background: 'none', color: activeTab === 'pride' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'pride' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🏆</span>
          <span>গৌরব</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'directory' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>👥</span>
          <span>সহপাঠী</span>
        </button>
        <button onClick={() => setActiveTab('school')} style={{ border: 'none', background: 'none', color: activeTab === 'school' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'school' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🏫</span>
          <span>বিদ্যালয়</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'chat' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>💬</span>
          <span>আড্ডা</span>
        </button>
      </nav>

      {/* ৮. গোপন অ্যাডমিন কন্ট্রোল প্যানেল মোডাল */}
      {showAdmin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '17px', fontWeight: '800' }}>👑 অ্যাডমিন কন্ট্রোল প্যানেল</h3>
              <button onClick={() => { setShowAdmin(false); setIsAdminLoggedIn(false); setAdminPin(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>বন্ধ করুন</button>
            </div>

            {!isAdminLoggedIn ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>সম্মানিত আয়োজক (স্মার্ট রাসেল খান), আপনার ৫ ডিজিটের সিক্রেট পিন দিন:</p>
                <input
                  type="password"
                  placeholder="সিক্রেট পিন"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  style={{ width: '65%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '16px', letterSpacing: '4px', marginBottom: '14px', outline: 'none' }}
                />
                <br />
                <button
                  onClick={() => {
                    if (adminPin === ADMIN_PIN) setIsAdminLoggedIn(true);
                    else alert('ভুল সিক্রেট পিন!');
                  }}
                  style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div>
                {/* নোটিফিকেশন ব্রডকাস্ট */}
                <div style={{ background: '#FEF3C7', border: '1.5px solid #FCD34D', padding: '14px', borderRadius: '14px', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#92400E', fontWeight: '800' }}>📢 সবাইকে নোটিফিকেশন / নোট পাঠান:</h4>
                  <input
                    type="text"
                    placeholder="নোটিসের বিষয়..."
                    value={adminBroadcastTitle}
                    onChange={e => setAdminBroadcastTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '12px', boxSizing: 'border-box', marginBottom: '6px', background: '#FFFFFF' }}
                  />
                  <textarea
                    rows={2}
                    placeholder="আপনার বার্তা বা নোটটি লিখুন..."
                    value={adminBroadcastMsg}
                    onChange={e => setAdminBroadcastMsg(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '12px', boxSizing: 'border-box', background: '#FFFFFF' }}
                  />
                  <button
                    onClick={handleSendAdminBroadcast}
                    disabled={isSendingBroadcast}
                    style={{ marginTop: '8px', width: '100%', background: '#D97706', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    {isSendingBroadcast ? 'পাঠানো হচ্ছে...' : '🚀 সবার ফোনে নোটিফিকেশন পাঠান'}
                  </button>
                </div>

                {/* স্কুলের ইতিহাস ও নোটিশ এডিটর */}
                <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#0F172A' }}>🏫 বিদ্যালয়ের ইতিহাস লিখুন / আপডেট করুন:</h4>
                  <textarea
                    rows={3}
                    value={newHistoryInput || schoolHistory}
                    onChange={e => setNewHistoryInput(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginBottom: '8px' }}
                  />

                  <h4 style={{ margin: '6px 0', fontSize: '13px', color: '#0F172A' }}>📢 স্ক্রলিং নোটিশ আপডেট:</h4>
                  <textarea
                    rows={2}
                    value={newNoticeInput || announcement}
                    onChange={e => setNewNoticeInput(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box' }}
                  />

                  <button
                    onClick={handleUpdateConfig}
                    style={{ marginTop: '8px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    সেভ ও পাবলিশ করুন
                  </button>
                </div>

                {/* শিক্ষক যোগ করার বাটন */}
                <div style={{ marginBottom: '14px' }}>
                  <button
                    onClick={() => setShowAddTeacherModal(true)}
                    style={{ width: '100%', background: '#137547', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    👨‍🏫 নতুন শিক্ষক পরিচিতি যোগ করুন ➕
                  </button>
                </div>

                {/* মেম্বার ও ফেক এন্ট্রি ডিলিট সেকশন */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#137547' }}>নিবন্ধিত মেম্বার ব্যবস্থাপনা ({members.length} জন)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {members.map((m, idx) => (
                      <div key={m.id} style={{ padding: '8px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{idx + 1}. {m.name}</strong> ({m.phone})<br/>
                          <span style={{ color: '#64748B' }}>{m.area} • জার্সি: {m.tshirt}</span>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm(`আপনি কি "${m.name}"-কে বাদ দিতে চান?`)) {
                              await deleteDoc(doc(db, "members", m.id));
                            }
                          }}
                          style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          🗑️ বাদ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
