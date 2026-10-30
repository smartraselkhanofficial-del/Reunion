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

interface Member {
  id: string;
  name: string;
  phone: string;
  tshirt: string;
  area: string;
  createdAt?: any;
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
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'register' | 'chat'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // ডেটাবেস স্টেট
  const [members, setMembers] = useState<Member[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [announcement, setAnnouncement] = useState('পবিত্র ঈদুল আজহা ২০২৭ উপলক্ষে সান্দিকোনা স্কুল এন্ড কলেজের এসএসসি ২০১৪ ব্যাচের পুনর্মিলনী অনুষ্ঠিত হবে। সকল বন্ধুদের রেজিস্ট্রেশন করার অনুরোধ জানানো হচ্ছে।');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://drive.google.com');
  const [headerBgUrl, setHeaderBgUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // নোটিফিকেশন পারমিশন স্টেট
  const [notifPermission, setNotifPermission] = useState<string>('default');

  // ইন-অ্যাপ নোটিফিকেশন ব্যানার
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);
  const isInitialMembers = useRef(false);
  const isInitialMessages = useRef(false);
  const isInitialAdminNotifs = useRef(false);

  // টাইপিং ইন্ডিকেটর স্টেট
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  // গোপন অ্যাডমিন প্যানেল স্টেট
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const [newApkUrlInput, setNewApkUrlInput] = useState('');
  
  // অ্যাডমিন ব্রডকাস্ট নোট স্টেট
  const [adminBroadcastTitle, setAdminBroadcastTitle] = useState('');
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const ADMIN_PIN = '74798'; // স্মার্ট রাসেল খানের সিক্রেট পিন

  // রেজিস্ট্রেশন ফরম স্টেট
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tshirt, setTshirt] = useState('L');
  const [area, setArea] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // হোয়াটসঅ্যাপ স্টাইল চ্যাট ও স্থায়ী নাম
  const [chatUser, setChatUser] = useState(() => localStorage.getItem('sandikona_user_name') || '');
  const [isJoinedChat, setIsJoinedChat] = useState(() => !!localStorage.getItem('sandikona_user_name'));
  const [msgInput, setMsgInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ইন-অ্যাপ কলিং স্টেট (অডিও / ভিডিও)
  const [callingMode, setCallingMode] = useState<'none' | 'audio' | 'video'>('none');

  // ========================================================
  // ১. সকল পারমিশন হ্যান্ডলার (নোটিফিকেশন, ক্যামেরা, মাইক)
  // ========================================================
  const checkAndRequestNotificationPermission = async () => {
    if ("Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
      } catch (e) {
        setNotifPermission(Notification.permission);
      }
    }
  };

  useEffect(() => {
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => console.log("Media initialized"));
    }
  }, []);

  // সাউন্ড ও ভাইব্রেশন ইঞ্জিন
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
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const notifyUser = (title: string, body: string, icon: string = '🔔') => {
    playChimeSound();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);

    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch (e) {}
    }

    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 6000);
  };

  // ========================================================
  // ২. ফায়ারবেস থেকে লাইভ মেম্বার, চ্যাট ও অ্যাডমিন ব্রডকাস্ট সিঙ্ক
  // ========================================================
  useEffect(() => {
    // মেম্বার লিস্ট
    const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
      const list: Member[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Member));
      setMembers(list);
      setIsLoading(false);

      if (isInitialMembers.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newMem = change.doc.data() as Member;
            notifyUser("🎉 নতুন সহপাঠী যুক্ত হয়েছেন!", `${newMem.name} (${newMem.area}) পুনর্মিলনীতে নিবন্ধন করেছেন।`, "🎓");
          }
        });
      } else {
        isInitialMembers.current = true;
      }
    }, () => setIsLoading(false));

    // হোয়াটসঅ্যাপ মেসেজ লিসেনার (সঠিক সিকোয়েন্সে)
    const qMessages = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    const unsubChat = onSnapshot(qMessages, (snap) => {
      const msgs: ChatMsg[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as ChatMsg));
      setChatMessages(msgs);

      if (isInitialMessages.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newMsg = change.doc.data() as ChatMsg;
            if (newMsg.sender !== chatUser) {
              notifyUser(`💬 ${newMsg.sender}`, newMsg.text || "📷 একটি ছবি/ফাইল পাঠিয়েছেন", "💬");
            }
          }
        });
      } else {
        isInitialMessages.current = true;
      }
    });

    // অ্যাডমিন সরাসরি ব্রডকাস্ট নোটিফিকেশন লিসেনার
    const qAdminNotifs = query(collection(db, "admin_broadcasts"), orderBy("timestamp", "asc"));
    const unsubAdminBroadcast = onSnapshot(qAdminNotifs, (snap) => {
      if (isInitialAdminNotifs.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            notifyUser(
              data.title || "📢 অ্যাডমিন বার্তা — স্মার্ট রাসেল খান", 
              data.body || "", 
              "📢"
            );
          }
        });
      } else {
        isInitialAdminNotifs.current = true;
      }
    });

    // স্ক্রলিং নোটিশ, ডাউনলোড লিংক ও ব্যানার ইমেজ সিঙ্ক
    const unsubSettings = onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.announcement) setAnnouncement(data.announcement);
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
      unsubChat();
      unsubAdminBroadcast();
      unsubSettings();
      unsubTyping();
    };
  }, [chatUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab, typingUser]);

  // গোপন অ্যাডমিন প্যানেল ট্রিগার
  const handleAdminTrigger = () => {
    const next = clickCount + 1;
    if (next >= 3) {
      setClickCount(0);
      setShowAdmin(true);
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  // অ্যাডমিন কর্তৃক সবাইকে লাইভ পুশ নোটিফিকেশন পাঠানো
  const handleSendAdminBroadcast = async () => {
    if (!adminBroadcastMsg.trim()) {
      alert('অনুগ্রহ করে নোটিফিকেশনের বার্তাটি লিখুন।');
      return;
    }

    setIsSendingBroadcast(true);
    try {
      await addDoc(collection(db, "admin_broadcasts"), {
        title: adminBroadcastTitle.trim() || '📢 জরুরি বার্তা — স্মার্ট রাসেল খান',
        body: adminBroadcastMsg.trim(),
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('bn-BD')
      });
      setAdminBroadcastTitle('');
      setAdminBroadcastMsg('');
      alert('সফলভাবে সকল সহপাঠীর ফোনে নোটিফিকেশন পৌঁছে গেছে!');
    } catch (err) {
      alert('নোটিফিকেশন পাঠাতে সমস্যা হয়েছে। ইন্টারনেট চেক করুন।');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // অ্যাডমিন নোটিশ ও ডাউনলোড লিংক আপডেট
  const handleUpdateConfig = async () => {
    try {
      const payload: any = {};
      if (newNoticeInput.trim()) payload.announcement = newNoticeInput.trim();
      if (newApkUrlInput.trim()) payload.apkUrl = newApkUrlInput.trim();

      await setDoc(doc(db, "settings", "app_config"), payload, { merge: true });
      if (newNoticeInput.trim()) setAnnouncement(newNoticeInput.trim());
      if (newApkUrlInput.trim()) setApkDownloadUrl(newApkUrlInput.trim());
      setNewNoticeInput('');
      setNewApkUrlInput('');
      alert('সফলভাবে কনফিগারেশন আপডেট করা হয়েছে!');
    } catch (err) {
      alert('আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  // গ্যালারি থেকে হেডার ব্যাকগ্রাউন্ড ছবি পরিবর্তন
  const handleHeaderBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('অনুগ্রহ করে ৩ মেগাবাইটের কম সাইজের ছবি সিলেক্ট করুন।');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setHeaderBgUrl(base64);
      try {
        await setDoc(doc(db, "settings", "app_config"), { headerBg: base64 }, { merge: true });
        alert('হেডার ব্যাকগ্রাউন্ড ছবি সবার অ্যাপে সফলভাবে আপডেট হয়েছে!');
      } catch (err) {
        alert('ছবি ক্লাউডে সেভ করতে সমস্যা হয়েছে।');
      }
    };
    reader.readAsDataURL(file);
  };

  // অ্যাডমিন মেম্বার ডিলিট
  const handleDeleteMember = async (id: string, memberName: string) => {
    if (!window.confirm(`আপনি কি "${memberName}"-কে তালিকা থেকে বাদ দিতে চান?`)) return;
    try {
      await deleteDoc(doc(db, "members", id));
      alert(`"${memberName}"-কে তালিকা থেকে বাদ দেওয়া হয়েছে।`);
    } catch (err) {
      alert('ডিলিট করা যায়নি।');
    }
  };

  // মেম্বার রেজিস্ট্রেশন হ্যান্ডলার
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
      setRegError('ক্লাউডে সংরক্ষণ করা যায়নি। ইন্টারনেট চেক করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // চ্যাটে টাইপিং সেন্ড
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsgInput(e.target.value);
    if (!chatUser) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setDoc(doc(db, "settings", "typing"), { user: chatUser, time: Date.now() });

    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(db, "settings", "typing"), { user: null, time: 0 });
    }, 2500);
  };

  // মিডিয়া ফাইল নির্বাচন
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('ফাইল সাইজ ৩ মেগাবাইটের কম হতে হবে।');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile({
        url: reader.result as string,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // হোয়াটসঅ্যাপ চ্যাট সেন্ড (সঠিক সিকোয়েন্সে)
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() && !attachedFile) return;

    setIsUploadingMedia(true);
    const now = Date.now();
    const payload: any = {
      sender: chatUser || 'এসএসসি ২০১৪ বন্ধু',
      timestamp: now,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (msgInput.trim()) payload.text = msgInput.trim();
    if (attachedFile) {
      payload.fileUrl = attachedFile.url;
      payload.fileType = attachedFile.type;
      payload.fileName = attachedFile.name;
    }

    try {
      await addDoc(collection(db, "messages"), payload);
      setMsgInput('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setDoc(doc(db, "settings", "typing"), { user: null, time: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // ডাউনলোড লিংক সহ শেয়ার হ্যান্ডলার
  const handleShareApp = async () => {
    const finalDownloadUrl = apkDownloadUrl.trim() || 'https://github.com';
    const shareText = `🎉 সান্দিকোনা স্কুল এন্ড কলেজ — পুনর্মিলনী ২০২৭\nএসএসসি ব্যাচ ২০১৪-এর অফিসিয়াল মোবাইল অ্যাপে যুক্ত হোন ও রেজিস্ট্রেশন সম্পন্ন করুন!\n\n📲 অ্যাপ ডাউনলোড লিংক:\n${finalDownloadUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'পুনর্মিলনী ২০২৭ - এসএসসি ব্যাচ ২০১৪',
          text: shareText
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText);
      alert('অ্যাপের ডাউনলোড লিংক ও দাওয়াত কপি করা হয়েছে! বন্ধুদের হোয়াটসঅ্যাপ বা ফেসবুকে মেসেজ দিন।');
    }
  };

  const filteredMembers = members.filter(m => {
    return m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           m.area.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#F0F4F2',
      minHeight: '100vh',
      color: '#1A2E22',
      paddingBottom: '85px',
      margin: 0
    }}>

      {/* লাইভ ড্রপ-ডাউন নোটিফিকেশন ব্যানার */}
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

      {/* নোটিফিকেশন অন করার স্মার্ট প্রম্পট বার */}
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
            onClick={checkAndRequestNotificationPermission}
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

      {/* ১. বন্ধুদের ছবি একদম উজ্জ্বল ও স্পষ্ট ব্যাকগ্রাউন্ড হেডার */}
      <header style={{
        backgroundImage: headerBgUrl 
          ? `linear-gradient(180deg, rgba(0, 0, 0, 0.30) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.65) 100%), url('${headerBgUrl}')`
          : `linear-gradient(180deg, rgba(0, 0, 0, 0.30) 0%, rgba(10, 77, 46, 0.25) 50%, rgba(5, 35, 20, 0.65) 100%), url('/header-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 25%',
        backgroundRepeat: 'no-repeat',
        color: '#FFFFFF',
        padding: '28px 16px 20px 16px',
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
            padding: '5px 14px',
            borderRadius: '20px',
            border: '1.5px solid rgba(212, 175, 55, 0.7)',
            fontWeight: '800',
            letterSpacing: '0.5px',
            backdropFilter: 'blur(4px)',
            display: 'inline-block'
          }}>
            সান্দিকোনা স্কুল এন্ড কলেজ
          </span>

          <h1 style={{ 
            fontSize: '28px', 
            margin: '10px 0 2px 0', 
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
            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.9)' 
          }}>
            এসএসসি ব্যাচ ২০১৪
          </p>

          <div style={{
            marginTop: '10px',
            display: 'inline-block',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: '5px 16px',
            borderRadius: '14px',
            fontSize: '11px',
            color: '#F8FAFC',
            fontWeight: '700',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            🤝 আয়োজনে: এসএসসি ২০১৪ ব্যাচ পুনর্মিলনী পরিষদ
          </div>
        </div>
      </header>

      {/* ২. লাইভ স্ক্রলিং নোটিশ */}
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
          <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '12px', color: '#FEF08A', fontWeight: '500' }}>
            {announcement}
          </marquee>
        </div>
      </div>

      {/* ৩. মূল বডি */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '14px' }}>

        {/* হোম ট্যাব */}
        {activeTab === 'home' && (
          <div>
            <div 
              onClick={() => setActiveTab('directory')}
              title="সহপাঠীদের তালিকা দেখতে চাপ দিন"
              style={{
                background: '#FFFFFF',
                padding: '18px',
                borderRadius: '20px',
                border: '2px solid #BBF7D0',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
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
                👉 সহপাঠী তালিকা দেখতে এখানে ক্লিক করুন
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              padding: '20px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0A4D2E', fontWeight: '700' }}>📅 পুনর্মিলনীর সময় ও ভেন্যু</h3>
                <span style={{ fontSize: '10px', backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: '8px', fontWeight: '700' }}>নির্ধারিত</span>
              </div>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#334155' }}>
                📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ
              </p>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#137547', fontWeight: '700' }}>
                ⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭
              </p>
              <p style={{ fontSize: '12px', margin: '6px 0', color: '#64748B' }}>
                কেন্দুয়া, নেত্রকোনা, বাংলাদেশ
              </p>

              <button
                onClick={() => setActiveTab('register')}
                style={{
                  width: '100%',
                  marginTop: '14px',
                  background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(10, 77, 46, 0.2)'
                }}
              >
                📝 রেজিস্ট্রেশন ফরম পূরণ করুন
              </button>
            </div>
          </div>
        )}

        {/* সহপাঠী ডিরেক্টরি (নম্বর ও হোয়াটসঅ্যাপ গোপন) */}
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
              মোট নিবন্ধিত বন্ধু: {filteredMembers.length} জন
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
                    <span style={{ background: '#DCFCE7', color: '#15803d', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', fontWeight: '700' }}>
                      ✓ নিবন্ধিত
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* রেজিস্ট্রেশন ফরম */}
        {activeTab === 'register' && (
          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0A4D2E', fontSize: '18px', fontWeight: '700' }}>📝 এসএসসি ২০১৪ নিবন্ধন ফরম</h3>
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

        {/* হোয়াটসঅ্যাপ স্টাইল আড্ডা */}
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
                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        position: 'relative'
                      }}>
                        {!isMe && (
                          <span style={{ fontSize: '10px', color: '#075E54', fontWeight: '800', display: 'block', marginBottom: '3px' }}>
                            {m.sender}
                          </span>
                        )}

                        {m.fileUrl && m.fileType?.startsWith('image') && (
                          <div style={{ marginBottom: '4px' }}>
                            <img src={m.fileUrl} alt="Attached" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                            <a href={m.fileUrl} download={m.fileName || "image.jpg"} style={{ display: 'inline-block', fontSize: '10px', color: '#0284C7', marginTop: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
                              ⬇️ ছবি ডাউনলোড করুন
                            </a>
                          </div>
                        )}

                        {m.fileUrl && m.fileType?.startsWith('video') && (
                          <div style={{ marginBottom: '4px' }}>
                            <video src={m.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                            <a href={m.fileUrl} download={m.fileName || "video.mp4"} style={{ display: 'inline-block', fontSize: '10px', color: '#0284C7', marginTop: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
                              ⬇️ ভিডিও ডাউনলোড করুন
                            </a>
                          </div>
                        )}

                        {m.fileUrl && !m.fileType?.startsWith('image') && !m.fileType?.startsWith('video') && (
                          <a href={m.fileUrl} download={m.fileName || "file"} style={{ display: 'inline-block', fontSize: '11px', color: '#0284C7', margin: '4px 0', textDecoration: 'underline', fontWeight: 'bold' }}>
                            ⬇️ {m.fileName || 'ফাইলটি ডাউনলোড করুন'}
                          </a>
                        )}

                        {m.text && <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', wordBreak: 'break-word' }}>{m.text}</p>}
                        
                        <span style={{ fontSize: '9px', color: '#94A3B8', float: 'right', marginTop: '3px', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>{m.time}</span>
                          <span style={{ color: '#34B7F1', fontWeight: 'bold' }}>✓✓</span>
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {attachedFile && (
                  <div style={{ padding: '6px 12px', background: '#F1F5F9', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                      📎 নির্বাচিত: {attachedFile.name}
                    </span>
                    <button onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                      বাতিল
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendChat} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: '#F0F2F5', borderTop: '1px solid #CBD5E1', gap: '6px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="ছবি বা ফাইল সংযুক্ত করুন"
                    style={{ border: 'none', background: '#E2E8F0', padding: '8px 10px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}
                  >
                    📎
                  </button>

                  <input
                    type="text"
                    placeholder="মেসেজ লিখুন..."
                    value={msgInput}
                    onChange={handleInputChange}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                  />
                  <button type="submit" disabled={isUploadingMedia} style={{ background: '#075E54', color: '#FFFFFF', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: isUploadingMedia ? 0.6 : 1 }}>
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

      {/* সর্বজনীন অ্যাপ শেয়ার বাটন ও ফুটার */}
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
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            শেয়ার করুন
          </button>
        </div>

        <div 
          onClick={handleAdminTrigger}
          style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer', userSelect: 'none' }}
        >
          <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#137547', fontWeight: '700' }}>
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
        padding: '10px 0',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.05)'
      }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'home' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🏠</span>
          <span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'directory' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>👥</span>
          <span>সহপাঠী</span>
        </button>
        <button onClick={() => setActiveTab('register')} style={{ border: 'none', background: 'none', color: activeTab === 'register' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'register' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>📝</span>
          <span>নিবন্ধন</span>
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
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '17px', fontWeight: '700' }}>👑 অ্যাডমিন কন্ট্রোল প্যানেল</h3>
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
                    if (adminPin === ADMIN_PIN) {
                      setIsAdminLoggedIn(true);
                    } else {
                      alert('ভুল সিক্রেট পিন!');
                    }
                  }}
                  style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div>
                {/* 🔔 অ্যাডমিন কর্তৃক সবাইকে লাইভ পুশ নোটিফিকেশন/নোট পাঠানোর বক্স */}
                <div style={{ background: '#FEF3C7', border: '1.5px solid #FCD34D', padding: '14px', borderRadius: '14px', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#92400E', fontWeight: '800' }}>
                    📢 সবাইকে নোটিফিকেশন / নোট পাঠান:
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#B45309' }}>
                    এখানে লিখে সেন্ড করলে সাথে সাথে সব সহপাঠীর মোবাইল বেজে উঠবে!
                  </p>
                  <input
                    type="text"
                    placeholder="নোটিসের বিষয় (উদাঃ জরুরি পুনর্মিলনী মিটিং)"
                    value={adminBroadcastTitle}
                    onChange={e => setAdminBroadcastTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '12px', boxSizing: 'border-box', marginBottom: '8px', outline: 'none', background: '#FFFFFF' }}
                  />
                  <textarea
                    rows={2}
                    placeholder="আপনার বার্তা বা নোটটি লিখুন..."
                    value={adminBroadcastMsg}
                    onChange={e => setAdminBroadcastMsg(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '12px', boxSizing: 'border-box', outline: 'none', background: '#FFFFFF' }}
                  />
                  <button
                    onClick={handleSendAdminBroadcast}
                    disabled={isSendingBroadcast}
                    style={{ marginTop: '8px', width: '100%', background: '#D97706', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', opacity: isSendingBroadcast ? 0.6 : 1 }}
                  >
                    {isSendingBroadcast ? 'পাঠানো হচ্ছে...' : '🚀 সবার ফোনে নোটিফিকেশন পাঠান'}
                  </button>
                </div>

                {/* গ্যালারি থেকে হেডার ব্যাকগ্রাউন্ড ছবি পরিবর্তন */}
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#065F46' }}>🖼️ হেডার ব্যাকগ্রাউন্ড ছবি পরিবর্তন:</h4>
                  <input
                    type="file"
                    ref={bgFileInputRef}
                    onChange={handleHeaderBgUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => bgFileInputRef.current?.click()}
                    style={{ background: '#0D9488', color: '#FFFFFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    গ্যালারি থেকে বন্ধুদের ছবি সিলেক্ট করুন
                  </button>
                </div>

                {/* APK ডাউনলোড লিংক ও নোটিশ এডিটর */}
                <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '14px', marginBottom: '14px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#0F172A' }}>📥 শেয়ারের জন্য সরাসরি APK ডাউনলোড লিংক:</h4>
                  <input
                    type="text"
                    placeholder="উদাঃ https://drive.google.com/..."
                    value={newApkUrlInput}
                    onChange={e => setNewApkUrlInput(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginBottom: '8px', outline: 'none' }}
                  />

                  <h4 style={{ margin: '6px 0', fontSize: '13px', color: '#0F172A' }}>📢 স্ক্রলিং নোটিশ আপডেট:</h4>
                  <textarea
                    rows={2}
                    placeholder="নতুন নোটিশ এখানে লিখুন..."
                    value={newNoticeInput}
                    onChange={e => setNewNoticeInput(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                  />

                  <button
                    onClick={handleUpdateConfig}
                    style={{ marginTop: '8px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '7px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    সেভ ও পাবলিশ করুন
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#137547' }}>মোট নিবন্ধিত: {members.length} জন</span>
                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,নাম,মোবাইল,ব্যাচ,জার্সি সাইজ,ঠিকানা\n" + 
                        members.map(e => `"${e.name}","${e.phone}","২০১৪","${e.tshirt}","${e.area}"`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Sandikona_SSC_2014_Members.csv");
                      document.body.appendChild(link);
                      link.click();
                    }}
                    style={{ background: '#137547', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    📥 এক্সেল ডাউনলোড
                  </button>
                </div>

                {/* অ্যাডমিন মেম্বার লিস্ট (কল, হোয়াটসঅ্যাপ ও ডিলিট বাটন) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map((m, idx) => (
                    <div key={m.id} style={{ padding: '10px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{idx + 1}. {m.name} (এসএসসি ১৪)</strong>
                        <span style={{ color: '#0A4D2E', fontWeight: '700' }}>জার্সি: {m.tshirt}</span>
                      </div>
                      <div style={{ color: '#475569', marginTop: '3px' }}>
                        মোবাইল: <a href={`tel:${m.phone}`} style={{ color: '#0284C7', fontWeight: '700' }}>{m.phone}</a> | {m.area}
                      </div>
                      
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <a href={`tel:${m.phone}`} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#137547', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>📞 কল</a>
                          <a href={`https://wa.me/88${m.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#25D366', color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>💬 হোয়াটসঅ্যাপ</a>
                        </div>
                        <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          🗑️ বাদ দিন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
