import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment, EventRegistration } from "./types";
import ChatRoom from "./components/ChatRoom";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'profile' | 'chat'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authVillage, setAuthVillage] = useState('');
  const [authArea, setAuthArea] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // চ্যাট
  const [privateChatRecipient, setPrivateChatRecipient] = useState<UserProfile | null>(null);

  // সোশ্যাল টাইমলাইন
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // ডেটাবেস স্টেটস
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [eventRegs, setEventRegs] = useState<EventRegistration[]>([]);
  const [showEventRegModal, setShowEventRegModal] = useState(false);
  const [eventGuestCount, setEventGuestCount] = useState(0);

  // ইউটিলিটি
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
        });
      } else {
        setUserProfile(null);
      }
    });

    // রানিং ঘড়ি ও ২০১৪ থেকে সময় গণনা
    const sscDate = new Date('2014-05-17T00:00:00');
    const updateTimer = () => {
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
      if (days < 0) { days += 30; months--; }
      if (months < 0) { months += 12; years--; }
      setBatchTimeElapsed({ years, months, days, hours, minutes, seconds });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20));
    onSnapshot(qPosts, (snap) => {
      const list: PostItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(list);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });

    const unsubEvents = onSnapshot(collection(db, "event_registrations"), (snap) => {
      const list: EventRegistration[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as EventRegistration));
      setEventRegs(list);
    });

    return () => { unsubscribe(); clearInterval(interval); unsubUsers(); unsubEvents(); };
  }, []);

  useEffect(() => {
    if (!activeCommentsPostId) return;
    const qComments = query(collection(db, "posts", activeCommentsPostId, "comments"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(qComments, (snap) => {
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
        area: authArea.trim() || 'কেন্দুয়া',
        village: authVillage.trim() || 'সান্দিকোনা',
        role: isSuperAdmin ? 'super_admin' : 'member',
        status: isSuperAdmin ? 'approved' : 'pending',
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", userCred.user.uid), newProfile);
      setShowAuthModal(false);
      alert('নিবন্ধন সফল হয়েছে!');
    } catch (e) { alert('নিবন্ধনে সমস্যা হয়েছে।'); }
  };

  const handleLogout = async () => { if (window.confirm("লগআউট করতে চান?")) { await signOut(auth); setActiveTab('home'); } };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) { setShowAuthModal(true); return; }
    if (!newPostText.trim()) return;

    setIsPosting(true);
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
    } catch (err) {} finally { setIsPosting(false); }
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

  const startPrivateChat = (member: UserProfile) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    setPrivateChatRecipient(member);
    setActiveTab('chat');
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '90px', margin: 0, color: '#1C1E21' }}>
      
      {/* 🌟 টপ হেডার (রেফারেন্স ইমেজ স্টাইল) */}
      <div style={{ background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
            <span style={{ fontSize: '10px', color: '#E9D5FF' }}>এস এস সি ব্যাচ ২০১৪</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => { setPrivateChatRecipient(null); setActiveTab('chat'); }}>💬</span>
          {currentUser && userProfile ? (
            <div onClick={() => setActiveTab('profile')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer', border: '2px solid #fff' }}>
              {userProfile.name.charAt(0)}
            </div>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>লগইন</button>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '10px' }}>
        
        {activeTab === 'home' && (
          <div>
            {/* 🏫 স্কুল ওয়েলকাম ব্যানার */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', borderRadius: '16px', padding: '16px', color: '#fff', textAlign: 'center', marginBottom: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #7C3AED' }}>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '20px', margin: '6px 0 2px 0', fontWeight: '900' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', opacity: 0.9 }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* ⏳ ফ্রেন্ডশিপ লাইভ কাউন্টার */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: '16px', padding: '14px', marginBottom: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(30,58,138,0.2)' }}>
              <span style={{ fontSize: '11px', color: '#93C5FD', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                🎓 এস এস সি ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '16px', fontWeight: '900' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>বছর</span></div>
                <div><span style={{ fontSize: '16px', fontWeight: '900' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>মাস</span></div>
                <div><span style={{ fontSize: '16px', fontWeight: '900' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>দিন</span></div>
                <div><span style={{ fontSize: '16px', fontWeight: '900' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>ঘণ্টা</span></div>
                <div><span style={{ fontSize: '16px', fontWeight: '900' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>মিনিট</span></div>
                <div><span style={{ fontSize: '16px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '9px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>

            {/* ✍️ পোস্ট কম্পোজার */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '12px', marginBottom: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E4E6EB' }}>
              <form onSubmit={handleCreatePost}>
                <textarea rows={2} placeholder={currentUser ? (userProfile?.name + ", কিছু লিখুন, ছবি দিন...") : "পোস্ট করতে লগইন করুন..."} value={newPostText} onChange={e => setNewPostText(e.target.value)} disabled={!currentUser} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F0F2F5' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="submit" disabled={isPosting || !currentUser} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isPosting ? 'পোস্ট হচ্ছে...' : 'পোস্ট করুন'}
                  </button>
                </div>
              </form>
            </div>

            {/* 📰 নিউজ ফিড */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {posts.map(post => {
                const isLiked = currentUser && post.likes.includes(currentUser.uid);
                return (
                  <div key={post.id} style={{ background: '#fff', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #E4E6EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{post.authorName.charAt(0)}</div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#050505' }}>{post.authorName}</h4>
                          <span style={{ fontSize: '10px', color: '#65676B' }}>{post.dateStr} • {post.authorVillage}</span>
                        </div>
                      </div>
                      {(currentUser?.uid === post.authorUid || userProfile?.role === 'super_admin') && (
                        <button onClick={() => handleDeletePost(post.id, post.authorUid)} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '14px', cursor: 'pointer' }}>🗑️</button>
                      )}
                    </div>
                    
                    <p style={{ fontSize: '13px', color: '#1C1E21', whiteSpace: 'pre-line', margin: '0 0 10px 0' }}>{post.content}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#65676B', borderBottom: '1px solid #E4E6EB', paddingBottom: '6px', marginBottom: '8px' }}>
                      <span>❤️ {post.likes.length} লাইক</span>
                      <span>💬 {post.commentsCount} কমেন্ট</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleToggleLike(post)} style={{ flex: 1, background: isLiked ? '#FEE2E2' : '#F0F2F5', color: isLiked ? '#DC2626' : '#65676B', border: 'none', padding: '7px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                        {isLiked ? '❤️ লাইকড' : '🤍 লাইক'}
                      </button>
                      <button onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)} style={{ flex: 1, background: '#F0F2F5', color: '#65676B', border: 'none', padding: '7px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                        💬 কমেন্ট
                      </button>
                    </div>

                    {activeCommentsPostId === post.id && (
                      <div style={{ marginTop: '10px', background: '#F0F2F5', borderRadius: '10px', padding: '10px' }}>
                        <div style={{ maxHeight: '140px', overflowY: 'auto', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {commentsList.map(c => <div key={c.id} style={{ background: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '11px' }}><strong style={{ color: '#581C87' }}>{c.authorName}: </strong>{c.text}</div>)}
                        </div>
                        <form onSubmit={(e) => handleAddComment(e, post.id)} style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" placeholder="মন্তব্য লিখুন..." value={commentInput} onChange={e => setCommentInput(e.target.value)} style={{ flex: 1, padding: '7px 12px', borderRadius: '20px', border: '1px solid #CCD0D5', fontSize: '11px', outline: 'none' }} />
                          <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>পাঠান</button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Directory */}
        {activeTab === 'directory' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#581C87', fontWeight: 'bold' }}>👥 সহপাঠী ডিরেক্টরি</h3>
            <input type="text" placeholder="নাম দিয়ে খুঁজুন..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'approved' && u.name.includes(searchQuery)).map(m => (
                <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village} • জার্সি: {m.tshirt}</p>
                  </div>
                  {m.uid !== currentUser?.uid && (
                    <button onClick={() => { setPrivateChatRecipient(m); setActiveTab('chat'); }} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      💬 মেসেজ
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Engine */}
        {activeTab === 'chat' && (
          <ChatRoom 
            currentUser={currentUser} 
            userProfile={userProfile} 
            recipientUser={privateChatRecipient} 
            onBack={() => { setPrivateChatRecipient(null); setActiveTab('directory'); }}
            onOpenAuth={() => setShowAuthModal(true)} 
          />
        )}
      </main>

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
              <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>{authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন সম্পন্ন করুন'}</button>
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

      {/* 🧭 9. FIXED BOTTOM NAVIGATION BAR */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => alert('বন্ধু সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>👥</span><span>বন্ধু</span>
        </button>
        <button onClick={() => alert('স্মৃতি সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>📸</span><span>স্মৃতি</span>
        </button>
        <button onClick={() => alert('গৌরব সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🏆</span><span>গৌরব</span>
        </button>
        <button onClick={() => alert('বিদ্যালয় সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🏫</span><span>বিদ্যালয়</span>
        </button>
        <button onClick={() => { setPrivateChatRecipient(null); setActiveTab('chat'); }} style={{ border: 'none', background: 'none', color: activeTab === 'chat' && !privateChatRecipient ? '#7C3AED' : '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>🌐</span><span>কমিউনিটি</span>
        </button>
        <button onClick={() => alert('যোগাযোগ সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '10px', fontWeight: 'grey', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '18px' }}>📞</span><span>যোগাযোগ</span>
        </button>
      </nav>
    </div>
  );
}
