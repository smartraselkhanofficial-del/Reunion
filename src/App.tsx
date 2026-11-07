import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment } from "./types";
import ProfilePage from './components/ProfilePage';
import PublicProfilePage from './components/PublicProfilePage';

export default function App() {
  const [appStage, setAppStage] = useState<'splash' | 'welcome' | 'login' | 'signup' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'memories' | 'pride' | 'school' | 'community' | 'contact' | 'profile' | 'publicProfile'>('home');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileProfession, setProfileProfession] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileWhatsapp, setProfileWhatsapp] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [authError, setAuthError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  const [announcement, setAnnouncement] = useState('স্বাগতম এস এস সি ব্যাচ ২০১৪ কমিউনিটিতে। সবাই বন্ধুদের আমন্ত্রণ জানান এবং কমিউনিটির সঙ্গে যুক্ত থাকুন।');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  // 1. Auth Listener & Session Restoration
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            setAppStage('main');
          }
        });
      } else {
        setUserProfile(null);
        setTimeout(() => setAppStage('welcome'), 1500);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Live Clock & Friendship Counter (Asia/Dhaka)
  useEffect(() => {
    const sscDate = new Date('2014-05-17T00:00:00');
    const timer = setInterval(() => {
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
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Realtime Database Listeners
  useEffect(() => {
    if (appStage !== 'main') return;
    const unsubMembers = onSnapshot(collection(db, "users"), (snap) => {
      setMemberProfiles(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    const unsubPosts = onSnapshot(query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20)), (snap) => {
      const list: PostItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(list);
    });
    const unsubConfig = onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists() && d.data()?.announcement) setAnnouncement(d.data().announcement);
    });
    return () => { unsubMembers(); unsubPosts(); unsubConfig(); };
  }, [appStage]);

  useEffect(() => {
    if (!activeCommentsPostId) return;
    const unsubComments = onSnapshot(query(collection(db, "posts", activeCommentsPostId, "comments"), orderBy("timestamp", "asc")), (snap) => {
      const list: PostComment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostComment));
      setCommentsList(list);
    });
    return () => unsubComments();
  }, [activeCommentsPostId]);

  // Auth Functions
  const phoneToEmail = (phone: string) => phone.replace(/[^\d]/g, '') + "@sandikona2014.org";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await signInWithEmailAndPassword(auth, phoneToEmail(authPhone), authPassword);
    } catch (err) {
      setAuthError('ভুল মোবাইল নম্বর বা পাসওয়ার্ড।');
    } finally { setIsProcessing(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const cleanPhone = authPhone.replace(/[^\d]/g, '');
    try {
      const userCred = await createUserWithEmailAndPassword(auth, phoneToEmail(cleanPhone), authPassword);
      const newProfile: UserProfile = {
        uid: userCred.user.uid,
        name: authName.trim(),
        fullName: authName.trim(),
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        email: profileEmail.trim(),
        profession: profileProfession.trim(),
        currentLocation: profileLocation.trim(),
        permanentAddress: profileAddress.trim(),
        whatsappNumber: profileWhatsapp.trim(),
        bio: profileBio.trim(),
        schoolName: 'সান্দিকোনা স্কুল এন্ড কলেজ',
        batchYear: '২০১৪',
        profileCompleted: false,
        privacySettings: { showPhone: false, showDob: false, profileVisible: true, showProfession: true },
        tshirt: 'L',
        area: 'কেন্দুয়া',
        village: 'সান্দিকোনা',
        role: cleanPhone.includes('01705374798') ? 'super_admin' : 'member',
        status: 'approved',
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", userCred.user.uid), newProfile);
    } catch (e) {
      setAuthError('অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে। নম্বরটি আগে ব্যবহার করা হয়েছে কি না বা ইন্টারনেট সংযোগ পরীক্ষা করুন।');
    } finally { setIsProcessing(false); }
  };

  // Post Functions
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !newPostText.trim()) return;
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "posts"), {
        authorUid: currentUser.uid,
        authorName: userProfile.name || userProfile.fullName || 'বন্ধু',
        authorImage: userProfile.profileImage || '',
        authorVillage: userProfile.village || userProfile.area || userProfile.permanentAddress || 'সান্দিকোনা',
        content: newPostText.trim(),
        likes: [],
        commentsCount: 0,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setNewPostText('');
    } catch (err) {} finally { setIsProcessing(false); }
  };

  const handleToggleLike = async (post: PostItem) => {
    if (!currentUser) return;
    const likes = post.likes || [];
    const isLiked = likes.includes(currentUser.uid);
    const updatedLikes = isLiked ? likes.filter(id => id !== currentUser.uid) : [...likes, currentUser.uid];
    await setDoc(doc(db, "posts", post.id), { likes: updatedLikes }, { merge: true });
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !commentInput.trim()) return;
    try {
      await addDoc(collection(db, "posts", postId, "comments"), { authorName: (userProfile.name || userProfile.fullName || 'বন্ধু'), authorUid: currentUser.uid, text: commentInput.trim(), timestamp: Date.now() });
      const target = posts.find(p => p.id === postId);
      if (target) await setDoc(doc(db, "posts", postId), { commentsCount: (target.commentsCount || 0) + 1 }, { merge: true });
      setCommentInput('');
    } catch (e) {}
  };

  // ----------------------------------------------------
  // RENDER: SPLASH SCREEN
  // ----------------------------------------------------
  if (appStage === 'splash') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #3B0764 0%, #6B21A8 50%, #1E1B4B 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', marginBottom: '16px' }}>🎓</div>
        <h1 style={{ fontSize: '20px', margin: '0 0 6px 0', fontWeight: 'bold' }}>SSC Batch 2014 Community</h1>
        <h2 style={{ fontSize: '15px', color: '#FEF08A', margin: '0 0 4px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h2>
        <p style={{ fontSize: '12px', margin: 0, opacity: 0.8 }}>এস এস সি ব্যাচ ২০১৪ • সান্দিকোনা, নেত্রকোনা</p>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: WELCOME / AUTH
  // ----------------------------------------------------
  if (appStage === 'welcome' || appStage === 'login' || appStage === 'signup') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '380px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 10px auto' }}>🎓</div>
            <h2 style={{ color: '#581C87', margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>
              {appStage === 'welcome' ? 'স্বাগতম' : (appStage === 'login' ? 'লগইন করুন' : 'নতুন অ্যাকাউন্ট')}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</p>
          </div>

          {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px', textAlign: 'center' }}>{authError}</div>}

          {appStage === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => setAppStage('signup')} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>নতুন অ্যাকাউন্ট তৈরি করুন</button>
              <button onClick={() => setAppStage('login')} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>আগে থেকেই অ্যাকাউন্ট আছে</button>
            </div>
          )}

          {appStage !== 'welcome' && (
            <form onSubmit={appStage === 'login' ? handleLogin : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {appStage === 'signup' && (
                <>
                  <input required type="text" placeholder="আপনার পূর্ণ নাম" value={authName} onChange={e => setAuthName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                  <input type="email" placeholder="ইমেইল (ঐচ্ছিক)" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                  <input type="text" placeholder="পেশা" value={profileProfession} onChange={e => setProfileProfession(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                  <input type="text" placeholder="বর্তমান ঠিকানা" value={profileLocation} onChange={e => setProfileLocation(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                  <input type="text" placeholder="স্থায়ী ঠিকানা / গ্রাম" value={profileAddress} onChange={e => setProfileAddress(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                  <input type="tel" placeholder="WhatsApp নম্বর" value={profileWhatsapp} onChange={e => setProfileWhatsapp(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
                  <textarea placeholder="নিজের সম্পর্কে কিছু লিখুন" value={profileBio} onChange={e => setProfileBio(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', minHeight: '70px', outline: 'none' }} />
                  <div style={{ fontSize: '11px', color: '#6D28D9', background: '#F5F3FF', padding: '9px', borderRadius: '8px' }}>স্কুল: সান্দিকোনা স্কুল এন্ড কলেজ • ব্যাচ: ২০১৪। বাকি তথ্য ও ছবি পরে প্রোফাইল থেকে যোগ করতে পারবেন।</div>
                </>
              )}
              <input required type="tel" placeholder="মোবাইল নম্বর (017XXXXXXXX)" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
              <input required type="password" placeholder="পাসওয়ার্ড" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }} />
              
              {appStage === 'login' && <div style={{ fontSize: '11px', color: '#7C3AED', textAlign: 'right', cursor: 'pointer' }}>পাসওয়ার্ড ভুলে গেছেন?</div>}

              <button type="submit" disabled={isProcessing} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '4px', cursor: 'pointer' }}>
                {isProcessing ? 'প্রসেসিং...' : (appStage === 'login' ? 'লগইন করুন' : 'নিবন্ধন সম্পন্ন করুন')}
              </button>
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button type="button" onClick={() => setAppStage(appStage === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {appStage === 'login' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'লগইন করুন'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ====================================================
  // RENDER: MAIN APPLICATION (HOMEPAGE RESTORATION)
  // ====================================================
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '70px', margin: 0 }}>
      
      {/* 1. PREMIUM HEADER */}
      <header style={{
        background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #4338CA 100%)',
        color: '#FFFFFF',
        padding: '12px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
      }}>
        {/* Left Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px', cursor: 'pointer' }}>☰</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '900', letterSpacing: '0.5px' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
            <span style={{ fontSize: '10px', color: '#E9D5FF', fontWeight: 'bold' }}>এস এস সি ব্যাচ ২০১৪</span>
          </div>
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '9px', color: '#FCD34D', textAlign: 'right', fontWeight: 'bold' }}>
            <div style={{ letterSpacing: '1px' }}>{currentTimeStr || '...'}</div>
            <div>{currentDateStr || '...'}</div>
          </div>
          
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <span style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#EF4444', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '2px 5px', borderRadius: '50%' }}>৩</span>
          </div>
          
          <span style={{ fontSize: '18px', cursor: 'pointer' }}>💬</span>
          
          <div onClick={() => setActiveTab('profile')} title="আমার প্রোফাইল" style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', border: '2px solid #fff', cursor: 'pointer' }}>{userProfile?.profileImage ? <img src={userProfile.profileImage} alt="প্রোফাইল" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (userProfile?.name || userProfile?.fullName || 'স').charAt(0)}</div>
          <span style={{ fontSize: '18px', cursor: 'pointer' }}>⋮</span>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '12px' }}>
        
        {/* HOMEPAGE ONLY */}
        {activeTab === 'profile' && currentUser && userProfile && <ProfilePage userId={currentUser.uid} profile={userProfile} onBack={() => setActiveTab('home')} />}
        {activeTab === 'publicProfile' && selectedProfile && <PublicProfilePage profile={selectedProfile} onBack={() => { setSelectedProfile(null); setActiveTab('home'); }} />}
        {activeTab === 'friends' && (
          <section style={{ background:'#fff', borderRadius:16, padding:14 }}>
            <h2 style={{ color:'#4C1D95', marginTop:0 }}>আমাদের বন্ধুরা</h2>
            <p style={{ color:'#64748B', fontSize:12 }}>নিবন্ধিত সদস্য: {memberProfiles.length} জন</p>
            {memberProfiles.filter(m => m.uid !== currentUser?.uid).map(member => (
              <button key={member.uid} onClick={() => { setSelectedProfile(member); setActiveTab('publicProfile'); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 4px', border:0, borderBottom:'1px solid #EDE9FE', background:'#fff', textAlign:'left' }}>
                <span style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', background:'#7C3AED', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, flexShrink:0 }}>{member.profileImage ? <img src={member.profileImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (member.fullName || member.name || 'ব').charAt(0)}</span>
                <span><strong style={{display:'block',color:'#1F2937'}}>{member.fullName || member.name || 'নাম নেই'}</strong><small style={{color:'#64748B'}}>{member.profession || 'ব্যাচ ২০১৪'}</small></span>
              </button>
            ))}
          </section>
        )}
        {activeTab === 'home' && (
          <div>
            {/* 2. WELCOME BANNER */}
            <div style={{ 
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              borderRadius: '16px', 
              padding: '20px', 
              color: '#fff', 
              textAlign: 'center', 
              marginBottom: '10px', 
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F59E0B', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: '2px solid #fff' }}>🎓</div>
              <h2 style={{ fontSize: '22px', margin: '0 0 4px 0', fontWeight: '900' }}>স্বাগতম</h2>
              <h3 style={{ fontSize: '16px', margin: '0 0 4px 0', color: '#FEF08A', fontWeight: 'bold' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h3>
              <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* 3. LIVE SCROLLING NOTICE */}
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '12px', border: '1px solid #E4E6EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '10px', fontWeight: '900', padding: '3px 8px', borderRadius: '4px', marginRight: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🔴</span> LIVE
              </span>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                <marquee behavior="scroll" direction="left" scrollamount="4" style={{ fontSize: '12px', color: '#1E293B', fontWeight: '600' }}>
                  {announcement}
                </marquee>
              </div>
            </div>

            {/* 4. FRIENDSHIP LIVE COUNTER */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: '14px', padding: '14px', marginBottom: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(30,58,138,0.2)' }}>
              <span style={{ fontSize: '11px', color: '#93C5FD', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                🎓 এস এস সি ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '8px', width: '40px' }}><span style={{ fontSize: '16px', fontWeight: '900', display: 'block' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '9px' }}>বছর</span></div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '8px', width: '40px' }}><span style={{ fontSize: '16px', fontWeight: '900', display: 'block' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '9px' }}>মাস</span></div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '8px', width: '40px' }}><span style={{ fontSize: '16px', fontWeight: '900', display: 'block' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '9px' }}>দিন</span></div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '8px', width: '40px' }}><span style={{ fontSize: '16px', fontWeight: '900', display: 'block' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '9px' }}>ঘণ্টা</span></div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '8px', width: '40px' }}><span style={{ fontSize: '16px', fontWeight: '900', display: 'block' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '9px' }}>মিনিট</span></div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 8px', borderRadius: '8px', width: '40px', border: '1px solid #FEF08A' }}><span style={{ fontSize: '16px', fontWeight: '900', color: '#FEF08A', display: 'block' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '9px', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>

            {/* 5. POST COMPOSER */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '12px 14px', marginBottom: '16px', border: '1px solid #E4E6EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {(userProfile?.name || 'স').charAt(0)}
                </div>
                <input 
                  type="text" 
                  placeholder="কিছু লিখুন, ছবি দিন..." 
                  value={newPostText} 
                  onChange={e => setNewPostText(e.target.value)} 
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: 'none', background: '#F0F2F5', fontSize: '13px', outline: 'none' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E4E6EB', paddingTop: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#65676B', fontWeight: 'bold' }}>
                  <span style={{ cursor: 'pointer' }}>🖼️ ছবি</span>
                  <span style={{ cursor: 'pointer' }}>📹 ভিডিও</span>
                  <span style={{ cursor: 'pointer' }}>😊 অনুভূতি</span>
                  <span style={{ cursor: 'pointer' }}>📊 পোল</span>
                </div>
                <button onClick={handleCreatePost} disabled={isProcessing} style={{ background: '#6D28D9', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isProcessing ? '...' : 'পোস্ট করুন'}
                </button>
              </div>
            </div>

            {/* 6. NEWS FEED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {posts.map(post => {
                const isLiked = currentUser && (post.likes || []).includes(currentUser.uid);
                return (
                  <div key={post.id} style={{ background: '#fff', borderRadius: '16px', padding: '14px', border: '1px solid #E4E6EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    {/* Post Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => { const author = memberProfiles.find(m => m.uid === post.authorUid); if (author) { setSelectedProfile(author); setActiveTab('publicProfile'); } }} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#6D28D9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', position: 'relative', overflow:'hidden', padding:0, border:0, cursor:'pointer', flexShrink:0 }}>
                          {(memberProfiles.find(m => m.uid === post.authorUid)?.profileImage || post.authorImage) ? <img src={memberProfiles.find(m => m.uid === post.authorUid)?.profileImage || post.authorImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (post.authorName || 'ব').charAt(0)}
                          <span style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#22C55E', borderRadius: '50%', border: '2px solid #fff' }}></span>
                        </button>
                        <div>
                          <h4 onClick={() => { const author = memberProfiles.find(m => m.uid === post.authorUid); if (author) { setSelectedProfile(author); setActiveTab('publicProfile'); } }} style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#050505', display: 'flex', alignItems: 'center', gap: '4px', cursor:'pointer' }}>
                            {post.authorName || 'অজানা বন্ধু'} <span style={{ color: '#0866FF', fontSize: '12px' }}>✔</span>
                          </h4>
                          <span style={{ fontSize: '11px', color: '#65676B' }}>{post.dateStr || 'সময় উল্লেখ নেই'} • 🌎</span>
                        </div>
                      </div>
                      <span style={{ color: '#65676B', cursor: 'pointer', fontSize: '18px' }}>⋮</span>
                    </div>
                    
                    {/* Post Content */}
                    <p style={{ fontSize: '14px', color: '#1C1E21', whiteSpace: 'pre-line', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                      {post.content}
                    </p>
                    
                    {/* Post Stats */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#65676B', borderBottom: '1px solid #E4E6EB', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>❤️👍 {(post.likes || []).length}</span>
                      <span>{post.commentsCount} মন্তব্য</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleToggleLike(post)} style={{ flex: 1, background: '#F0F2F5', color: '#65676B', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                        {post.likes.includes(currentUser?.uid || '') ? '❤️ লাইকড' : '🤍 লাইক'}
                      </button>
                      <button onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)} style={{ flex: 1, background: '#F0F2F5', color: '#65676B', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                        💬 কমেন্ট
                      </button>
                    </div>

                    {activeCommentsPostId === post.id && (
                      <div style={{ marginTop: '12px', background: '#F0F2F5', borderRadius: '10px', padding: '10px' }}>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {commentsList.map(c => <div key={c.id} style={{ background: '#fff', padding: '6px 8px', borderRadius: '8px', fontSize: '12px' }}><strong style={{ color: '#581C87' }}>{c.authorName}: </strong>{c.text}</div>)}
                        </div>
                        <form onSubmit={(e) => handleAddComment(e, post.id)} style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" placeholder="মন্তব্য করুন..." value={commentInput} onChange={e => setCommentInput(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #CCD0D5', fontSize: '12px', outline: 'none' }} />
                          <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>পাঠান</button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 🧭 BOTTOM NAVIGATION (7 Tabs) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('friends')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>👥</span><span>বন্ধু</span>
        </button>
        <button onClick={() => alert('স্মৃতি সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>📸</span><span>স্মৃতি</span>
        </button>
        <button onClick={() => alert('গৌরব সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🏆</span><span>গৌরব</span>
        </button>
        <button onClick={() => alert('বিদ্যালয় সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🏫</span><span>বিদ্যালয়</span>
        </button>
        <button onClick={() => setActiveTab('community')} style={{ border: 'none', background: 'none', color: activeTab === 'community' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🌐</span><span>কমিউনিটি</span>
        </button>
        <button onClick={() => alert('যোগাযোগ সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>📞</span><span>যোগাযোগ</span>
        </button>
      </nav>
    </div>
  );
}
