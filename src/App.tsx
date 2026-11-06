import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment, FriendRequest } from "./types";
import ChatRoom from "./components/ChatRoom";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'directory' | 'profile' | 'chat'>('home');
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
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // চ্যাট ও নিউজফিড
  const [privateChatRecipient, setPrivateChatRecipient] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // ডেটাবেস ও ফ্রেন্ডস স্টেট
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [myFriends, setMyFriends] = useState<string[]>([]);
  
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

        // ফ্রেন্ড রিকোয়েস্ট লিসেনার
        const qIncoming = query(collection(db, "friend_requests"), where("receiverUid", "==", user.uid));
        onSnapshot(qIncoming, (snap) => {
          const list: FriendRequest[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as FriendRequest));
          setFriendRequests(list);
        });

        // আমার বন্ধু লিস্ট
        const qFriends = query(collection(db, "friend_requests"), where("status", "==", "accepted"));
        onSnapshot(qFriends, (snap) => {
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

    onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });

    onSnapshot(doc(db, "settings", "app_config"), (d) => {
      if (d.exists() && d.data()?.announcement) setAnnouncement(d.data().announcement);
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
      alert('নিবন্ধন সফল হয়েছে!');
    } catch (e) { alert('নিবন্ধনে সমস্যা হয়েছে।'); }
  };

  const handleSendFriendRequest = async (receiverUid: string) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    const reqId = currentUser.uid + "_" + receiverUid;
    try {
      await setDoc(doc(db, "friend_requests", reqId), {
        senderUid: currentUser.uid,
        senderName: userProfile?.name || 'সহপাঠী',
        receiverUid: receiverUid,
        status: 'pending',
        timestamp: Date.now()
      });
      alert('ফ্রেন্ড রিকোয়েস্ট পাঠানো হয়েছে!');
    } catch (e) { alert('পাঠানো যায়নি।'); }
  };

  const handleAcceptRequest = async (reqId: string) => {
    try {
      await setDoc(doc(db, "friend_requests", reqId), { status: 'accepted' }, { merge: true });
    } catch (e) {}
  };

  const handleRejectRequest = async (reqId: string) => {
    try { await deleteDoc(doc(db, "friend_requests", reqId)); } catch (e) {}
  };

  const approvedMembers = allUsers.filter(u => u.status === 'approved' && u.uid !== currentUser?.uid);
  const pendingRequests = friendRequests.filter(r => r.status === 'pending');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '85px', margin: 0, color: '#1C1E21' }}>
      
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
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', border: '2px solid #fff' }}>
              {userProfile.name.charAt(0)}
            </div>
          ) : (
            <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>লগইন</button>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '10px' }}>
        
        {/* ==========================================
            🏠 HOME TAB (Newsfeed)
            ========================================== */}
        {activeTab === 'home' && (
          <div>
            <div style={{ backgroundImage: "linear-gradient(135deg, rgba(88, 28, 135, 0.85) 0%, rgba(124, 58, 237, 0.85) 100%), url('/header-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px', padding: '18px', color: '#fff', textAlign: 'center', marginBottom: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '20px', margin: '6px 0 2px 0', fontWeight: '900' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', opacity: 0.95, fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* Notice Ticker */}
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '7px 10px', display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '10px', border: '1px solid #E4E6EB' }}>
              <span style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}>🔴 LIVE</span>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '12px', color: '#4B5563', fontWeight: '600' }}>{announcement}</marquee>
              </div>
            </div>

            {/* Friendship Counter */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: '14px', padding: '12px', marginBottom: '10px', color: '#fff', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#93C5FD', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🎓 এস এস সি ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়</span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>বছর</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>মাস</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>দিন</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>ঘণ্টা</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>মিনিট</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: '900', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '9px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            👥 FRIENDS TAB (Premium Redesign)
            ========================================== */}
        {activeTab === 'friends' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#581C87', fontWeight: 'bold' }}>বন্ধু তালিকা ও রিকোয়েস্ট</h3>
            </div>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <button onClick={() => setFriendsSubTab('all')} style={{ flex: 1, background: friendsSubTab === 'all' ? '#7C3AED' : '#E2E8F0', color: friendsSubTab === 'all' ? '#fff' : '#334155', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                সকল বন্ধু ({approvedMembers.length})
              </button>
              <button onClick={() => setFriendsSubTab('requests')} style={{ flex: 1, background: friendsSubTab === 'requests' ? '#7C3AED' : '#E2E8F0', color: friendsSubTab === 'requests' ? '#fff' : '#334155', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                অনুরোধ ({pendingRequests.length})
              </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '12px' }}>
              <input type="text" placeholder="বন্ধুর নাম বা গ্রাম দিয়ে খুঁজুন..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '12px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }} />
            </div>

            {/* Tab 1: All Friends */}
            {friendsSubTab === 'all' && (
              approvedMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>👥</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0F172A' }}>এখনো কোনো বন্ধু যুক্ত হয়নি।</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>আপনার ব্যাচের বন্ধুদের আমন্ত্রণ জানান এবং সংযুক্ত থাকুন।</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {approvedMembers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.village.toLowerCase().includes(searchQuery.toLowerCase())).map(m => {
                    const isFriend = myFriends.includes(m.uid);
                    return (
                      <div key={m.uid} style={{ background: '#fff', borderRadius: '16px', padding: '12px 14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                            {m.avatarUrl ? <img src={m.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : m.name.charAt(0)}
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>{m.name}</h4>
                            <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village} • 📍 {m.area}</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isFriend ? (
                            <button onClick={() => { setPrivateChatRecipient(m); setActiveTab('chat'); }} style={{ background: '#075E54', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                              💬 মেসেজ
                            </button>
                          ) : (
                            <button onClick={() => handleSendFriendRequest(m.uid)} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                              ➕ বন্ধু করুন
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Tab 2: Friend Requests */}
            {friendsSubTab === 'requests' && (
              pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📩</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0F172A' }}>কোনো নতুন রিকোয়েস্ট নেই।</h4>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ background: '#fff', borderRadius: '16px', padding: '12px 14px', border: '1px solid #FCD34D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>{req.senderName}</h4>
                        <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 'bold' }}>ফ্রেন্ড রিকোয়েস্ট পাঠিয়েছেন</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleAcceptRequest(req.id)} style={{ background: '#16A34A', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>গ্রহণ</button>
                        <button onClick={() => handleRejectRequest(req.id)} style={{ background: '#EF4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>বাতিল</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatRoom currentUser={currentUser} userProfile={userProfile} recipientUser={privateChatRecipient} onBack={() => { setPrivateChatRecipient(null); setActiveTab('home'); }} onOpenAuth={() => setShowAuthModal(true)} />
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

      {/* 🧭 8. FIXED BOTTOM NAVIGATION BAR (Exactly 7 Buttons) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('friends')} style={{ border: 'none', background: 'none', color: activeTab === 'friends' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
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
