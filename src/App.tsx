import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment } from "./types";
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
  
  // ইউটিলিটি
  const [announcement, setAnnouncement] = useState('স্বাগতম এস এস সি ব্যাচ ২০১৪ কমিউনিটিতে। সবাই বন্ধুদের আমন্ত্রণ জানান এবং কমিউনিটির সঙ্গে যুক্ত থাকুন।');
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

    onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists() && d.data()?.announcement) {
        setAnnouncement(d.data().announcement);
      }
    });

    return () => { unsubscribe(); clearInterval(interval); unsubUsers(); };
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
        area: 'কেন্দুয়া',
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

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '85px', margin: 0, color: '#1C1E21' }}>
      
      {/* 🌟 1. TOP HEADER (Purple/Blue Gradient with Clock & Profile) */}
      <div style={{ background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', cursor: 'pointer' }}>☰</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '900' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
            <span style={{ fontSize: '9px', color: '#E9D5FF' }}>এস এস সি ব্যাচ ২০১৪</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '9px', color: '#FCD34D', textAlign: 'right', lineHeight: '1.2' }}>
            <div>{currentTimeStr || '...'}</div>
            <div>{currentDateStr || '...'}</div>
          </div>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px' }}>🔔</span>
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', fontSize: '8px', fontWeight: 'bold', padding: '1px 3px', borderRadius: '50%' }}>৩</span>
          </div>
          <span style={{ fontSize: '17px', cursor: 'pointer' }} onClick={() => { setPrivateChatRecipient(null); setActiveTab('chat'); }}>💬</span>
          {currentUser && userProfile ? (
            <div onClick={() => setActiveTab('profile')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', border: '2px solid #fff' }}>
              {userProfile.name.charAt(0)}
            </div>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>লগইন</button>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '580px', margin: '0 auto', padding: '10px' }}>
        
        {activeTab === 'home' && (
          <div>
            {/* 🏫 2. SCHOOL WELCOME BANNER */}
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)', borderRadius: '14px', padding: '14px', color: '#fff', textAlign: 'center', marginBottom: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', border: '1px solid #7C3AED' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F59E0B', margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '2px solid #fff' }}>🎓</div>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '18px', margin: '4px 0 2px 0', fontWeight: '900' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '11px', opacity: 0.9 }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '10px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* 📢 3. LIVE NOTICE TICKER */}
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '7px 10px', display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '10px', border: '1px solid #E4E6EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}>
                🔴 LIVE
              </span>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '11px', color: '#4B5563', fontWeight: '600' }}>
                  {announcement}
                </marquee>
              </div>
            </div>

            {/* ⏳ 4. FRIENDSHIP LIVE COUNTER */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: '14px', padding: '12px', marginBottom: '10px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 12px rgba(30,58,138,0.2)' }}>
              <span style={{ fontSize: '10px', color: '#93C5FD', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                🎓 এস এস সি ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '14px', fontWeight: '900' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '8px', display: 'block', opacity: 0.8 }}>বছর</span></div>
                <div><span style={{ fontSize: '14px', fontWeight: '900' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '8px', display: 'block', opacity: 0.8 }}>মাস</span></div>
                <div><span style={{ fontSize: '14px', fontWeight: '900' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '8px', display: 'block', opacity: 0.8 }}>দিন</span></div>
                <div><span style={{ fontSize: '14px', fontWeight: '900' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '8px', display: 'block', opacity: 0.8 }}>ঘণ্টা</span></div>
                <div><span style={{ fontSize: '14px', fontWeight: '900' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '8px', display: 'block', opacity: 0.8 }}>মিনিট</span></div>
                <div><span style={{ fontSize: '14px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '8px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>

            {/* ✍️ 5. COMPACT POST COMPOSER */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E4E6EB' }}>
              <form onSubmit={handleCreatePost}>
                <textarea rows={2} placeholder={currentUser ? (userProfile?.name + ", কিছু লিখুন, ছবি দিন...") : "পোস্ট করতে লগইন করুন..."} value={newPostText} onChange={e => setNewPostText(e.target.value)} disabled={!currentUser} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F0F2F5' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#65676B', fontWeight: 'bold' }}>
                    <span>🖼️ ছবি</span> <span>📹 ভিডিও</span> <span>😊 অনুভূতি</span>
                  </div>
                  <button type="submit" disabled={isPosting || !currentUser} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isPosting ? 'পোস্ট...' : 'পোস্ট করুন'}
                  </button>
                </div>
              </form>
            </div>

            {/* 📰 6. NEWS FEED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {posts.map(post => {
                const isLiked = currentUser && post.likes.includes(currentUser.uid);
                return (
                  <div key={post.id} style={{ background: '#fff', borderRadius: '14px', padding: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E4E6EB' }}>
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

        {activeTab === 'chat' && (
          <ChatRoom currentUser={currentUser} userProfile={userProfile} onOpenAuth={() => setShowAuthModal(true)} />
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#581C87' }}>লগইন করুন</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input required type="tel" placeholder="মোবাইল নম্বর *" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <input required type="password" placeholder="পাসওয়ার্ড *" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <button type="submit" style={{ background: '#581C87', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>লগইন করুন</button>
            </form>
            <button onClick={() => setShowAuthModal(false)} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#DC2626', width: '100%', cursor: 'pointer' }}>বাতিল</button>
          </div>
        </div>
      )}

      {/* 🧭 7. FIXED BOTTOM NAVIGATION BAR (Exactly 7 Buttons as specified in Master Prompt) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => alert('বন্ধু সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>👥</span><span>বন্ধু</span>
        </button>
        <button onClick={() => alert('স্মৃতি সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>📸</span><span>স্মৃতি</span>
        </button>
        <button onClick={() => alert('গৌরব সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏆</span><span>গৌরব</span>
        </button>
        <button onClick={() => alert('বিদ্যালয় সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏫</span><span>বিদ্যালয়</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🌐</span><span>কমিউনিটি</span>
        </button>
        <button onClick={() => alert('যোগাযোগ সেকশন')} style={{ border: 'none', background: 'none', color: '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>📞</span><span>যোগাযোগ</span>
        </button>
      </nav>
    </div>
  );
}
