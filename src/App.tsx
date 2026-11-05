import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, FriendRequest } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'profile' | 'friends'>('home');
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

  // ডেটাবেস স্টেটস
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [myFriends, setMyFriends] = useState<string[]>([]); // Array of approved friend UIDs

  // ইউটিলিটি
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);

  // ফায়ারবেস Auth লিসেনার
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
        });

        // আমার কাছে আসা ফ্রেন্ড রিকোয়েস্ট লিসেনার
        const qIncoming = query(collection(db, "friend_requests"), where("receiverUid", "==", user.uid));
        onSnapshot(qIncoming, (snap) => {
          const list: FriendRequest[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as FriendRequest));
          setFriendRequests(list);
        });

        // আমি যাদের বন্ধু হয়েছি (Accepted Friends) লিসেনার
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
    return () => unsubscribe();
  }, []);

  const phoneToEmail = (rawPhone: string) => rawPhone.replace(/[^\d]/g, '') + "@sandikona2014.org";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    const clean = authPhone.replace(/[^\d]/g, '');
    if (clean.length < 11) { setAuthError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।'); setAuthSubmitting(false); return; }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, phoneToEmail(clean), authPassword);
      const isSuperAdmin = clean.includes('01705374798') || clean.includes('1705374798');
      
      const newProfile: UserProfile = {
        uid: userCredential.user.uid,
        name: authName.trim(),
        phone: clean,
        tshirt: 'L',
        area: 'কেন্দুয়া',
        village: authVillage.trim() || 'সান্দিকোনা',
        role: isSuperAdmin ? 'super_admin' : 'member',
        status: isSuperAdmin ? 'approved' : 'pending',
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", userCredential.user.uid), newProfile);
      setShowAuthModal(false);
      triggerNativeNotification("স্বাগতম!", "অ্যাকাউন্ট তৈরি হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।");
    } catch (err) {
      setAuthError('অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, phoneToEmail(authPhone), authPassword);
      setShowAuthModal(false);
    } catch (err) {
      setAuthError('ভুল মোবাইল নম্বর বা পাসওয়ার্ড।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("লগআউট করতে চান?")) { await signOut(auth); setActiveTab('home'); }
  };

  const triggerNativeNotification = (title: string, body: string, icon = '🔔') => {
    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 4000);
  };

  // ডেটা ফেচিং (সকল ইউজার)
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });
    return () => unsubUsers();
  }, []);

  // ==========================================
  // 🤝 Phase 2: Friend Request Actions
  // ==========================================
  const handleSendFriendRequest = async (receiverUid: string) => {
    if (!currentUser || !userProfile) { alert("লগইন করুন"); return; }
    
    // Document ID = sender_receiver যাতে একই রিকোয়েস্ট ২ বার না যায়
    const reqId = `${currentUser.uid}_${receiverUid}`;
    try {
      await setDoc(doc(db, "friend_requests", reqId), {
        senderUid: currentUser.uid,
        senderName: userProfile.name,
        receiverUid: receiverUid,
        status: 'pending',
        timestamp: Date.now()
      });
      triggerNativeNotification("রিকোয়েস্ট পাঠানো হয়েছে", "আপনার বন্ধুর কাছে নোটিফিকেশন চলে গেছে।", "📩");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptRequest = async (reqId: string) => {
    try {
      await setDoc(doc(db, "friend_requests", reqId), { status: 'accepted' }, { merge: true });
      triggerNativeNotification("বন্ধুত্ব গ্রহণ করা হয়েছে!", "এখন আপনারা একে অপরের মেসেজ দেখতে পারবেন।", "🤝");
    } catch (e) {}
  };

  const handleRejectRequest = async (reqId: string) => {
    if (window.confirm("রিকোয়েস্ট বাতিল করবেন?")) {
      try { await deleteDoc(doc(db, "friend_requests", reqId)); } catch (e) {}
    }
  };

  const getFriendshipStatus = (targetUid: string) => {
    if (myFriends.includes(targetUid)) return 'accepted'; // Already friends
    
    // Check if I sent a request
    const iSent = allUsers.some(u => false); // We need a global request list for perfect UI, simplified here for speed
    // For now, we will query on click or just show 'Add Friend'
    return 'none';
  };

  // Pending Screen Logic
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
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#F3F6F4', minHeight: '100vh', paddingBottom: '85px', margin: 0, userSelect: 'none' }}>
      
      {activeToast && (
        <div style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '460px', backgroundColor: '#0F172A', color: '#fff', padding: '12px', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px' }}>{activeToast.icon}</div>
          <div><h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#FCD34D' }}>{activeToast.title}</h5><p style={{ margin: 0, fontSize: '11px' }}>{activeToast.body}</p></div>
        </div>
      )}

      {/* Auth Bar */}
      <div style={{ background: '#062B1A', color: '#E2E8F0', padding: '6px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {currentUser && userProfile ? (
          <span style={{ color: '#10B981', fontWeight: 'bold' }}>● {userProfile.name}</span>
        ) : (
          <span style={{ color: '#FCD34D' }}>⚠️ লগইন করা নেই</span>
        )}
        <button onClick={currentUser ? handleLogout : () => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: currentUser ? '#EF4444' : '#10B981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {currentUser ? 'লগআউট' : 'লগইন / সাইন আপ'}
        </button>
      </div>

      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        
        {/* হোম */}
        {activeTab === 'home' && (
          <div onClick={() => setActiveTab('directory')} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '2px solid #BBF7D0', textAlign: 'center', marginBottom: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '12px', color: '#137547', fontWeight: 'bold' }}>নিবন্ধিত সহপাঠী</span>
            <h2 style={{ fontSize: '32px', margin: '4px 0', color: '#0A4D2E', fontWeight: '900' }}>{allUsers.filter(u => u.status === 'approved').length} জন</h2>
            <span style={{ fontSize: '11px', color: '#0284C7', textDecoration: 'underline' }}>সবাইকে দেখতে ক্লিক করুন</span>
          </div>
        )}

        {/* ডিরেক্টরি (Add Friend Logic) */}
        {activeTab === 'directory' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0A4D2E', fontWeight: 'bold' }}>👥 সহপাঠী ডিরেক্টরি</h3>
            <input type="text" placeholder="নাম দিয়ে খুঁজুন..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '12px', boxSizing: 'border-box' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'approved' && u.name.includes(searchQuery)).map(m => {
                // আমি নিজে হলে দেখাব না
                if (m.uid === currentUser?.uid) return null;

                const isMyFriend = myFriends.includes(m.uid);
                
                return (
                  <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A' }}>{m.name}</h4>
                      <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village}</p>
                    </div>
                    
                    {isMyFriend ? (
                      <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>🤝 বন্ধু</span>
                    ) : (
                      <button onClick={() => handleSendFriendRequest(m.uid)} style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ➕ বন্ধু যোগ করুন
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase 2: ফ্রেন্ড রিকোয়েস্ট ও আমার বন্ধুরা ট্যাব */}
        {activeTab === 'friends' && currentUser && (
          <div>
            {/* আসা রিকোয়েস্ট */}
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#D97706', fontWeight: 'bold' }}>📩 ফ্রেন্ড রিকোয়েস্ট ({friendRequests.filter(r => r.status === 'pending').length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {friendRequests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #FCD34D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0F172A' }}>{req.senderName}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleAcceptRequest(req.id)} style={{ background: '#16A34A', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>কনফার্ম</button>
                    <button onClick={() => handleRejectRequest(req.id)} style={{ background: '#E2E8F0', color: '#334155', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>ডিলিট</button>
                  </div>
                </div>
              ))}
              {friendRequests.filter(r => r.status === 'pending').length === 0 && <span style={{ fontSize: '11px', color: '#64748B' }}>কোনো রিকোয়েস্ট নেই।</span>}
            </div>

            {/* আমার বন্ধুরা */}
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0A4D2E', fontWeight: 'bold' }}>🤝 আমার বন্ধুরা ({myFriends.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myFriends.map(friendUid => {
                const friendProfile = allUsers.find(u => u.uid === friendUid);
                if (!friendProfile) return null;
                return (
                  <div key={friendUid} style={{ background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0F172A' }}>{friendProfile.name}</span>
                  </div>
                );
              })}
              {myFriends.length === 0 && <span style={{ fontSize: '11px', color: '#64748B' }}>আপনি এখনো কাউকে বন্ধু হিসেবে যুক্ত করেননি। ডিরেক্টরি থেকে বন্ধু যোগ করুন।</span>}
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '16px', fontWeight: '900' }}>{authMode === 'login' ? '🔐 লগইন' : '📝 নিবন্ধন'}</h3>
              <button onClick={() => setShowAuthModal(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px' }}>✕</button>
            </div>
            {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '10px' }}>{authError}</div>}
            
            <form onSubmit={authMode === 'login' ? handleLogin : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {authMode === 'signup' && (
                <>
                  <input required type="text" placeholder="আপনার নাম *" value={authName} onChange={e => setAuthName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                  <input required type="text" placeholder="নিজ গ্রাম *" value={authVillage} onChange={e => setAuthVillage(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
                </>
              )}
              <input required type="tel" placeholder="মোবাইল নম্বর (017XXXXXXXX) *" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <input required type="password" placeholder="পাসওয়ার্ড *" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              
              <button type="submit" disabled={authSubmitting} style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '4px' }}>
                {authSubmitting ? 'প্রসেসিং...' : (authMode === 'login' ? 'লগইন করুন' : 'নিবন্ধন সম্পন্ন করুন')}
              </button>
            </form>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              {authMode === 'login' ? 
                <button onClick={() => setAuthMode('signup')} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: 'bold' }}>নতুন অ্যাকাউন্ট খুলুন</button> : 
                <button onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: 'bold' }}>সরাসরি লগইন করুন</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>👥</span><span>সহপাঠী</span>
        </button>
        {userProfile && userProfile.status === 'approved' && (
          <button onClick={() => setActiveTab('friends')} style={{ border: 'none', background: 'none', color: activeTab === 'friends' ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>🤝</span><span>বন্ধুরা</span>
          </button>
        )}
      </nav>
    </div>
  );
}
