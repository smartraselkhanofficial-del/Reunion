import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment, MemoryItem, BatchPrideItem, TeacherItem, FriendRequest, EventRegistration } from "./types";
import ChatRoom from "./components/ChatRoom";
import ReunionPoll from "./components/ReunionPoll";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'pride' | 'directory' | 'chat' | 'school' | 'friends' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsSubTab, setFriendsSubTab] = useState<'all' | 'requests'>('all');

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

  // চ্যাট ও ইনবক্স
  const [privateChatRecipient, setPrivateChatRecipient] = useState<UserProfile | null>(null);

  // সোশ্যাল টাইমলাইন ও নিউজফিড
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // ডেটাবেস স্টেটস
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [prideList, setPrideList] = useState<BatchPrideItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [myFriends, setMyFriends] = useState<string[]>([]);
  const [eventRegs, setEventRegs] = useState<EventRegistration[]>([]);

  // সেটিংস ও ইউটিলিটি
  const [announcement, setAnnouncement] = useState('স্বাগতম এস এস সি ব্যাচ ২০১৪ কমিউনিটিতে। সবাই বন্ধুদের আমন্ত্রণ জানান এবং যুক্ত থাকুন।');
  const [schoolHistory, setSchoolHistory] = useState('ঐতিহ্যবাহী সান্দিকোনা স্কুল এন্ড কলেজ নেত্রকোনা জেলার কেন্দুয়া উপজেলার একটি স্বনামধন্য বিদ্যাপীঠ।');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://github.com');
  const [headerBgUrl, setHeaderBgUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // ঘড়ি ও কাউন্টার
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // নোটিফিকেশন ও অ্যাডমিন
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const [newHistoryInput, setNewHistoryInput] = useState('');
  const [newApkUrlInput, setNewApkUrlInput] = useState('');
  const [adminBroadcastTitle, setAdminBroadcastTitle] = useState('');
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // মডাল স্টেটস
  const [showMemoryUploadModal, setShowMemoryUploadModal] = useState(false);
  const [memCaption, setMemCaption] = useState('');
  const [selectedMemFile, setSelectedMemFile] = useState<File | null>(null);
  const [memUploadProgress, setMemUploadProgress] = useState<string | null>(null);

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

  const [showEventRegModal, setShowEventRegModal] = useState(false);
  const [eventGuestCount, setEventGuestCount] = useState(0);

  const bgFileInputRef = useRef<HTMLInputElement>(null);

  WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/GPwXRoWdZ748lL5182iBCj?s=cl&p=a&mlu=4&ilr=4&iam=2";
  MESSENGER_GROUP_URL = "https://m.me/j/EHb16biwgroNmlDh/?send_source=gc%3Acopy_invite_link_t";

  // 100% সুরক্ষিত ও ফ্রি ইমেজ কম্প্রেশন (যেকোনো সাইজের ছবি ক্র্যাশ ছাড়াই সেভ হবে)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
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
          resolve(canvas.toDataURL('image/jpeg', 0.5)); // ৪-৫ এমবি ছবিকে মাত্র ৫০-৬০ কিলোবাইটে রূপান্তর
        };
      };
    });
  };

  // ফায়ারবেস Auth ও ডেটা লিসেনার
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
        });

        // ফ্রেন্ড রিকোয়েস্ট ও বন্ধু লিস্ট
        onSnapshot(query(collection(db, "friend_requests"), where("receiverUid", "==", user.uid)), (snap) => {
          const list: FriendRequest[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as FriendRequest));
          setFriendRequests(list);
        });

        onSnapshot(query(collection(db, "friend_requests"), where("status", "==", "accepted")), (snap) => {
          const friends: string[] = [];
          snap.forEach(d => {
            const req = d.data() as FriendRequest;
            if (req.senderUid === user.uid) friends.push(req.receiverUid);
            else if (req.receiverUid === user.uid) friends.push(req.senderUid);
          });
          setMyFriends(friends);
        });
      } else {
        setUserProfile(null);
        setFriendRequests([]);
        setMyFriends([]);
      }
    });

    // রানিং ঘড়ি ও ২০১৪ থেকে সময় গণনা
    const sscDate = new Date('2014-05-17T00:00:00');
    const updateTimer = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('bn-BD', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateStr(now.toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

      let years = now.getFullYear() - sscDate.getFullYear();
      let months = now.getMonth() - sscDate.getMonth();
      let days = now.getDate() - sscDate.getDate();
      let hours = now.getHours() - sscDate.getHours();
      let minutes = now.getMinutes() - sscDate.getMinutes();
      let seconds = now.getSeconds() - sscDate.getSeconds();

      if (seconds < 0) { seconds += 60; minutes--; }
      if (minutes < 0) { minutes += 60; hours--; }
      if (hours < 0) { hours += 24; days--; }
      if (days < 0) { days += 30; months--; }
      if (months < 0) { months += 12; years--; }
      setBatchTimeElapsed({ years, months, days, hours, minutes, seconds });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20)), (snap) => {
      const list: PostItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(list);
    });

    onSnapshot(query(collection(db, "memories"), orderBy("timestamp", "desc")), (snap) => {
      const list: MemoryItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MemoryItem));
      setMemories(list);
    });

    onSnapshot(collection(db, "batch_pride"), (snap) => {
      const list: BatchPrideItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as BatchPrideItem));
      setPrideList(list);
    });

    onSnapshot(collection(db, "teachers"), (snap) => {
      const list: TeacherItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as TeacherItem));
      setTeachers(list);
    });

    onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });

    onSnapshot(collection(db, "event_registrations"), (snap) => {
      const list: EventRegistration[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as EventRegistration));
      setEventRegs(list);
    });

    onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.announcement) setAnnouncement(data.announcement);
        if (data?.schoolHistory) setSchoolHistory(data.schoolHistory);
        if (data?.apkUrl) setApkDownloadUrl(data.apkUrl);
        if (data?.headerBg) setHeaderBgUrl(data.headerBg);
      }
    });

    return () => { unsubscribe(); clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!activeCommentsPostId) return;
    const unsub = onSnapshot(query(collection(db, "posts", activeCommentsPostId, "comments"), orderBy("timestamp", "asc")), (snap) => {
      const list: PostComment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostComment));
      setCommentsList(list);
    });
    return () => unsub();
  }, [activeCommentsPostId]);

  const phoneToEmail = (rawPhone: string) => rawPhone.replace(/[^\d]/g, '') + "@sandikona2014.org";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, phoneToEmail(authPhone), authPassword); setShowAuthModal(false); } 
    catch (err) { alert('ভুল মোবাইল নম্বর বা পাসওয়ার্ড।'); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = authPhone.replace(/[^\d]/g, '');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, phoneToEmail(clean), authPassword);
      const isSuperAdmin = clean.includes('01705374798') || clean.includes('1705374798');
      
      const newProfile: UserProfile = {
        uid: userCred.user.uid,
        name: authName.trim(),
        phone: clean,
        tshirt: 'L',
        area: 'কেন্দুয়া',
        village: authVillage.trim() || 'সান্দিকোনা',
        role: isSuperAdmin ? 'super_admin' : 'member',
        status: isSuperAdmin ? 'approved' : 'pending',
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", userCred.user.uid), newProfile);
      setShowAuthModal(false);
      alert('নিবন্ধন সফল হয়েছে! অ্যাডমিন অনুমোদনের পর সম্পূর্ণ অ্যাক্সেস পাবেন।');
    } catch (e) { alert('নিবন্ধনে সমস্যা হয়েছে।'); }
  };

  const handleLogout = async () => { if (window.confirm("লগআউট করতে চান?")) { await signOut(auth); setActiveTab('home'); } };

  // পোস্ট ও স্মৃতি হ্যান্ডলার
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) { setShowAuthModal(true); return; }
    if (!newPostText.trim()) return;

    try {
      await addDoc(collection(db, "posts"), {
        authorUid: currentUser.uid,
        authorName: userProfile.name,
        authorVillage: userProfile.village,
        content: newPostText.trim(),
        likes: [],
        commentsCount: 0,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setNewPostText('');
      alert('পোস্ট সফলভাবে প্রকাশিত হয়েছে!');
    } catch (e) {}
  };

  const handleToggleLike = async (post: PostItem) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    const isLiked = post.likes.includes(currentUser.uid);
    const updatedLikes = isLiked ? post.likes.filter(uid => uid !== currentUser.uid) : [...post.likes, currentUser.uid];
    try { await setDoc(doc(db, "posts", post.id), { likes: updatedLikes }, { merge: true }); } catch (e) {}
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !commentInput.trim()) return;
    try {
      await addDoc(collection(db, "posts", postId, "comments"), { authorName: userProfile.name, authorUid: currentUser.uid, text: commentInput.trim(), timestamp: Date.now() });
      const target = posts.find(p => p.id === postId);
      if (target) await setDoc(doc(db, "posts", postId), { commentsCount: (target.commentsCount || 0) + 1 }, { merge: true });
      setCommentInput('');
    } catch (e) {}
  };

  const handleDeletePost = async (postId: string, authorUid: string) => {
    if (currentUser && (currentUser.uid === authorUid || userProfile?.role === 'super_admin')) {
      if (window.confirm("পোস্টটি মুছে ফেলতে চান?")) await deleteDoc(doc(db, "posts", postId));
    }
  };

  const handleUploadMemoryFree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) { setShowAuthModal(true); return; }
    if (!selectedMemFile) return;

    setMemUploadProgress('ছবি অপ্টিমাইজ হচ্ছে...');
    try {
      const compressedUrl = await compressImage(selectedMemFile);
      await addDoc(collection(db, "memories"), {
        uploader: userProfile.name,
        caption: memCaption.trim() || 'স্কুল জীবনের স্মৃতি',
        mediaUrl: compressedUrl,
        mediaType: 'image',
        timestamp: Date.now()
      });
      setMemUploadProgress(null);
      setShowMemoryUploadModal(false);
      setSelectedMemFile(null);
      setMemCaption('');
      alert('স্মৃতি সফলভাবে আপলোড হয়েছে!');
    } catch (err) {
      alert('আপলোড ত্রুটি হয়েছে।');
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
      alert('হেডার ব্যাকগ্রাউন্ড আপডেট হয়েছে!');
    } catch (e) {}
  };

  const triggerNativeNotification = (title: string, body: string, icon = '🔔') => {
    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 4000);
  };

  const hasRegisteredForEvent = currentUser ? eventRegs.some(r => r.uid === currentUser.uid) : false;
  const myEventReg = currentUser ? eventRegs.find(r => r.uid === currentUser.uid) : null;

  // Pending Screen Check
  const isPending = userProfile && userProfile.status === 'pending' && userProfile.role !== 'super_admin';

  if (isPending) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F3F6F4', padding: '20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '30px 20px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>⏳</div>
          <h2 style={{ color: '#D97706', margin: '0 0 10px 0', fontSize: '20px' }}>অ্যাকাউন্ট অনুমোদনের অপেক্ষায়</h2>
          <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>আপনার অ্যাকাউন্টটি অ্যাডমিন প্যানেলে ভেরিফিকেশনের অপেক্ষায় আছে। পরিচয় নিশ্চিত হওয়ার পর আপনাকে সম্পূর্ণ অ্যাক্সেস দেওয়া হবে।</p>
          <button onClick={handleLogout} style={{ marginTop: '20px', background: '#0A4D2E', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>লগআউট করুন</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '90px', margin: 0, color: '#1C1E21' }}>
      
      {activeToast && (
        <div style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '460px', backgroundColor: '#0F172A', color: '#fff', padding: '12px', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px' }}>{activeToast.icon}</div>
          <div><h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#FCD34D' }}>{activeToast.title}</h5><p style={{ margin: 0, fontSize: '11px' }}>{activeToast.body}</p></div>
        </div>
      )}

      {/* 🌟 1. TOP HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
            <span style={{ fontSize: '9px', color: '#E9D5FF' }}>এস এস সি ব্যাচ ২০১৪</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '9px', color: '#FCD34D', textAlign: 'right', lineHeight: '1.2' }}>
            <div>{currentTimeStr || '...'}</div>
            <div>{currentDateStr || '...'}</div>
          </div>
          <span style={{ fontSize: '18px', cursor: 'pointer' }} onClick={() => { setPrivateChatRecipient(null); setActiveTab('chat'); }}>💬</span>
          {currentUser && userProfile ? (
            <div onClick={() => setActiveTab('profile')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', border: '2px solid #fff' }}>
              {userProfile.name.charAt(0)}
            </div>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>লগইন</button>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '10px' }}>
        
        {/* ==========================================
            🏠 HOME TAB (Newsfeed, Banner & Event)
            ========================================== */}
        {activeTab === 'home' && (
          <div>
            {/* 🏫 2. WELCOME BANNER */}
            <div style={{ 
              backgroundImage: headerBgUrl ? ("linear-gradient(135deg, rgba(88, 28, 135, 0.85) 0%, rgba(124, 58, 237, 0.85) 100%), url('" + headerBgUrl + "')") : "linear-gradient(135deg, rgba(88, 28, 135, 0.85) 0%, rgba(124, 58, 237, 0.85) 100%), url('/header-bg.jpg')",
              backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px', padding: '18px', color: '#fff', textAlign: 'center', marginBottom: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', border: '1px solid #7C3AED' 
            }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F59E0B', margin: '0 auto 8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '2px solid #fff' }}>🎓</div>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '20px', margin: '6px 0 2px 0', fontWeight: '900' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', opacity: 0.95, fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* 📢 3. LIVE NOTICE TICKER */}
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '7px 10px', display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '10px', border: '1px solid #E4E6EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}>🔴 LIVE</span>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '12px', color: '#4B5563', fontWeight: '600' }}>{announcement}</marquee>
              </div>
            </div>

            {/* ⏳ 4. FRIENDSHIP LIVE COUNTER */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: '14px', padding: '12px', marginBottom: '10px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(30,58,138,0.2)' }}>
              <span style={{ fontSize: '10px', color: '#93C5FD', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🎓 এস এস সি ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়</span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.years}</span>বছর</div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.months}</span>মাস</div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.days}</span>দিন</div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.hours}</span>ঘণ্টা</div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.minutes}</span>মিনিট</div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span>সেকেন্ড</div>
              </div>
            </div>

            {/* Reunion Event Card */}
            <div style={{ background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)', borderRadius: '14px', padding: '14px', marginBottom: '10px', color: '#fff', boxShadow: '0 4px 12px rgba(10, 77, 46, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '900', color: '#FEF08A' }}>পুনর্মিলনী ২০২৭</h3>
                  <p style={{ margin: 0, fontSize: '11px', opacity: 0.9 }}>সান্দিকোনা স্কুল এন্ড কলেজ মাঠ</p>
                </div>
                <button onClick={() => { if(!currentUser) {setShowAuthModal(true); return;} setShowEventRegModal(true); }} style={{ background: '#FEF08A', color: '#0A4D2E', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '900', fontSize: '11px', cursor: 'pointer' }}>
                  {hasRegisteredForEvent ? 'রেজিস্টার্ড ✓' : 'রেজিস্ট্রেশন'}
                </button>
              </div>
            </div>

            {/* ✍️ 5. POST COMPOSER */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E4E6EB' }}>
              <form onSubmit={handleCreatePost}>
                <textarea rows={2} placeholder={currentUser ? (userProfile?.name + ", কিছু লিখুন, ছবি দিন...") : "পোস্ট করতে লগইন করুন..."} value={newPostText} onChange={e => setNewPostText(e.target.value)} disabled={!currentUser} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F0F2F5' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" disabled={isPosting || !currentUser} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isPosting ? 'পোস্ট হচ্ছে...' : 'পোস্ট করুন'}
                  </button>
                </div>
              </form>
            </div>

            {/* 📰 6. NEWS FEED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {posts.map(post => {
                const isLiked = currentUser && post.likes.includes(currentUser.uid);
                return (
                  <div key={post.id} style={{ background: '#fff', borderRadius: '14px', padding: '12px', border: '1px solid #E4E6EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{post.authorName.charAt(0)}</div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#050505' }}>{post.authorName}</h4>
                          <span style={{ fontSize: '9px', color: '#65676B' }}>{post.dateStr} • {post.authorVillage}</span>
                        </div>
                      </div>
                      {(currentUser?.uid === post.authorUid || userProfile?.role === 'super_admin') && (
                        <button onClick={() => deleteDoc(doc(db, "posts", post.id))} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '13px', cursor: 'pointer' }}>🗑️</button>
                      )}
                    </div>
                    
                    <p style={{ fontSize: '12px', color: '#1C1E21', whiteSpace: 'pre-line', margin: '0 0 8px 0' }}>{post.content}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#65676B', borderBottom: '1px solid #E4E6EB', paddingBottom: '4px', marginBottom: '6px' }}>
                      <span>❤️ {post.likes.length} লাইক</span>
                      <span>💬 {post.commentsCount} কমেন্ট</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleToggleLike(post)} style={{ flex: 1, background: isLiked ? '#FEE2E2' : '#F0F2F5', color: isLiked ? '#DC2626' : '#65676B', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                        {isLiked ? '❤️ লাইকড' : '🤍 লাইক'}
                      </button>
                      <button onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)} style={{ flex: 1, background: '#F0F2F5', color: '#65676B', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                        💬 কমেন্ট
                      </button>
                    </div>

                    {activeCommentsPostId === post.id && (
                      <div style={{ marginTop: '8px', background: '#F0F2F5', borderRadius: '8px', padding: '8px' }}>
                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {commentsList.map(c => <div key={c.id} style={{ background: '#fff', padding: '5px 8px', borderRadius: '6px', fontSize: '11px' }}><strong style={{ color: '#581C87' }}>{c.authorName}: </strong>{c.text}</div>)}
                        </div>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          if (!currentUser || !commentInput.trim()) return;
                          addDoc(collection(db, "posts", post.id, "comments"), { authorName: userProfile?.name, authorUid: currentUser.uid, text: commentInput.trim(), timestamp: Date.now() });
                          setCommentInput('');
                        }} style={{ display: 'flex', gap: '4px' }}>
                          <input type="text" placeholder="মন্তব্য লিখুন..." value={commentInput} onChange={e => setCommentInput(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: '16px', border: '1px solid #CCD0D5', fontSize: '11px', outline: 'none' }} />
                          <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>পাঠান</button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FRIENDS TAB */}
        {activeTab === 'friends' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#581C87', fontWeight: 'bold' }}>👥 বন্ধু তালিকা</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'approved' && u.uid !== currentUser?.uid).map(m => (
                <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village} • {m.area}</p>
                  </div>
                  <button onClick={() => { setPrivateChatRecipient(m); setActiveTab('chat'); }} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    💬 মেসেজ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEMORIES TAB */}
        {activeTab === 'memories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#581C87', fontWeight: 'bold' }}>📸 স্মৃতি গ্যালারি</h3>
              <button onClick={() => setShowMemoryUploadModal(true)} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>স্মৃতি দিন ➕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memories.map(item => (
                <div key={item.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <img src={item.mediaUrl} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', backgroundColor: '#000' }} />
                  <div style={{ padding: '10px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold' }}>{item.caption}</p>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>আপলোডকারী: {item.uploader}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRIDE TAB */}
        {activeTab === 'pride' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#D97706', fontWeight: 'bold' }}>🏆 ব্যাচের গৌরব</h3>
              <button onClick={() => setShowAddPrideModal(true)} style={{ background: '#D97706', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>যুক্ত হোন ➕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {prideList.map(p => (
                <div key={p.id} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #FEF08A' }}>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold' }}>{p.name}</h4>
                  <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 'bold' }}>{p.profession} ({p.organization})</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#475569' }}>{p.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHOOL TAB */}
        {activeTab === 'school' && (
          <div>
            <div style={{ background: '#fff', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#0A4D2E', fontWeight: 'bold' }}>🏫 সান্দিকোনা স্কুল এন্ড কলেজ</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>{schoolHistory}</p>
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0A4D2E', fontWeight: 'bold' }}>👨‍🏫 শিক্ষকবৃন্দ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teachers.map(t => (
                <div key={t.id} style={{ background: '#fff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h5 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold' }}>{t.name}</h5>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>{t.designation} • বিষয়: {t.subject}</span>
                  </div>
                  {t.phone && <a href={"tel:" + t.phone} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}>📞 কল</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT / COMMUNITY TAB */}
        {activeTab === 'chat' && (
          <ChatRoom currentUser={currentUser} userProfile={userProfile} recipientUser={privateChatRecipient} onBack={() => { setPrivateChatRecipient(null); setActiveTab('home'); }} onOpenAuth={() => setShowAuthModal(true)} />
        )}
      </main>

      {/* Memory Upload Modal */}
      {showMemoryUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0A4D2E' }}>📸 স্মৃতি আপলোড</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if(!selectedMemFile || !currentUser) return;
              const reader = new FileReader();
              reader.onloadend = async () => {
                await addDoc(collection(db, "memories"), { uploader: userProfile?.name || 'সহপাঠী', caption: memCaption, mediaUrl: reader.result as string, mediaType: 'image', timestamp: Date.now() });
                setShowMemoryUploadModal(false); setSelectedMemFile(null); setMemCaption('');
                alert('স্মৃতি সফলভাবে আপলোড হয়েছে!');
              };
              reader.readAsDataURL(selectedMemFile);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" placeholder="ক্যাপশন..." value={memCaption} onChange={e => setMemCaption(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              <input required type="file" accept="image/*" onChange={e => setSelectedMemFile(e.target.files?.[0] || null)} style={{ padding: '6px' }} />
              <button type="submit" style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}>আপলোড করুন</button>
            </form>
            <button onClick={() => setShowMemoryUploadModal(false)} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#DC2626', width: '100%' }}>বাতিল</button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#581C87' }}>{authMode === 'login' ? '🔐 লগইন' : '📝 নিবন্ধন'}</h3>
            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {authMode === 'signup' && (
                <>
                  <input required type="text" placeholder="আপনার নাম *" value={authName} onChange={e => setAuthName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                  <input required type="text" placeholder="নিজ গ্রাম *" value={authVillage} onChange={e => setAuthVillage(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </>
              )}
              <input required type="tel" placeholder="মোবাইল নম্বর *" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <input required type="password" placeholder="পাসওয়ার্ড *" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন সম্পন্ন করুন'}</button>
            </form>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              {authMode === 'login' ? 
                <button onClick={() => setAuthMode('signup')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>নতুন অ্যাকাউন্ট খুলুন</button> : 
                <button onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>সরাসরি লগইন করুন</button>
              }
            </div>
            <button onClick={() => setShowAuthModal(false)} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#DC2626', width: '100%', cursor: 'pointer' }}>বাতিল</button>
          </div>
        </div>
      )}

      {/* 🧭 9. FIXED BOTTOM NAVIGATION BAR (Exactly 7 Buttons as specified) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => { setActiveTab('home'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => { setActiveTab('friends'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'friends' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>👥</span><span>বন্ধু</span>
        </button>
        <button onClick={() => { setActiveTab('memories'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'memories' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>📸</span><span>স্মৃতি</span>
        </button>
        <button onClick={() => { setActiveTab('pride'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'pride' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏆</span><span>গৌরব</span>
        </button>
        <button onClick={() => { setActiveTab('school'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'school' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏫</span><span>বিদ্যালয়</span>
        </button>
        <button onClick={() => { setActiveTab('chat'); setPrivateChatRecipient(null); }} style={{ border: 'none', background: 'none', color: activeTab === 'chat' && !privateChatRecipient ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🌐</span><span>কমিউনিটি</span>
        </button>
        <button onClick={() => alert('যোগাযোগ সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>📞</span><span>যোগাযোগ</span>
        </button>
      </nav>
    </div>
  );
}
