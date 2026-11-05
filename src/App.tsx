import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment, MemoryItem, BatchPrideItem, TeacherItem, ChatMsg, ActiveCall } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'pride' | 'directory' | 'chat' | 'school' | 'profile'>('home');
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

  // ডেটাবেস স্টেটস
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [prideList, setPrideList] = useState<BatchPrideItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);

  // ইউটিলিটি স্টেটস
  const [announcement, setAnnouncement] = useState('পবিত্র ঈদুল আজহা ২০২৭ উপলক্ষে সান্দিকোনা স্কুল এন্ড কলেজের এসএসসি ২০১৪ ব্যাচের পুনর্মিলনী অনুষ্ঠিত হবে।');
  const [headerBgUrl, setHeaderBgUrl] = useState<string>('');
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  // ফায়ারবেস Auth লিসেনার
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
          });
        } catch (e) {}
      } else {
        setUserProfile(null);
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
      const email = phoneToEmail(clean);
      const userCredential = await createUserWithEmailAndPassword(auth, email, authPassword);
      const isSuperAdmin = clean.includes('01705374798') || clean.includes('1705374798');
      
      const newProfile: UserProfile = {
        uid: userCredential.user.uid,
        name: authName.trim(),
        phone: clean,
        tshirt: authTshirt,
        area: authArea.trim() || 'কেন্দুয়া',
        village: authVillage.trim() || 'সান্দিকোনা',
        role: isSuperAdmin ? 'super_admin' : 'member',
        status: isSuperAdmin ? 'approved' : 'pending', // Pending for normal users
        createdAt: Date.now()
      };

      await setDoc(doc(db, "users", userCredential.user.uid), newProfile);
      setShowAuthModal(false);
      triggerNativeNotification("স্বাগতম!", "অ্যাকাউন্ট তৈরি হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।");
    } catch (err: any) {
      setAuthError('অ্যাকাউন্ট তৈরিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    const clean = authPhone.replace(/[^\d]/g, '');
    try {
      await signInWithEmailAndPassword(auth, phoneToEmail(clean), authPassword);
      setShowAuthModal(false);
    } catch (err) {
      setAuthError('ভুল মোবাইল নম্বর বা পাসওয়ার্ড।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("লগআউট করতে চান?")) { await signOut(auth); setActiveTab('home'); setShowAdmin(false); }
  };

  const triggerNativeNotification = (title: string, body: string, icon = '🔔') => {
    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 4000);
  };

  // ডেটা ফেচিং
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });
    const unsubMemories = onSnapshot(query(collection(db, "memories"), orderBy("timestamp", "desc")), (snap) => {
      const list: MemoryItem[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MemoryItem));
      setMemories(list);
    });
    return () => { unsubUsers(); unsubMemories(); };
  }, []);

  // অ্যাডমিন ভেরিফিকেশন (Approve / Reject)
  const handleVerifyUser = async (uid: string, newStatus: 'approved' | 'rejected') => {
    if (!window.confirm("আপনি কি নিশ্চিত?")) return;
    await setDoc(doc(db, "users", uid), { status: newStatus }, { merge: true });
    alert("স্ট্যাটাস আপডেট হয়েছে!");
  };

  // Pending Screen Logic
  const isPending = userProfile && userProfile.status === 'pending' && userProfile.role !== 'super_admin';
  const isRejected = userProfile && userProfile.status === 'rejected' && userProfile.role !== 'super_admin';

  if (isPending || isRejected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F3F6F4', padding: '20px', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '30px 20px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>{isPending ? '⏳' : '❌'}</div>
          <h2 style={{ color: isPending ? '#D97706' : '#DC2626', margin: '0 0 10px 0', fontSize: '20px' }}>
            {isPending ? 'অ্যাকাউন্ট অনুমোদনের অপেক্ষায়' : 'অ্যাকাউন্ট বাতিল করা হয়েছে'}
          </h2>
          <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>
            {isPending 
              ? 'আপনার অ্যাকাউন্টটি অ্যাডমিন প্যানেলে ভেরিফিকেশনের অপেক্ষায় আছে। পরিচয় নিশ্চিত হওয়ার পর আপনাকে সম্পূর্ণ অ্যাক্সেস দেওয়া হবে।' 
              : 'আপনার অ্যাকাউন্টটি বাতিল করা হয়েছে। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।'}
          </p>
          <button onClick={handleLogout} style={{ marginTop: '20px', background: '#0A4D2E', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}>
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#F3F6F4', minHeight: '100vh', paddingBottom: '85px', margin: 0, userSelect: 'none' }}>
      
      {activeToast && (
        <div style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', backgroundColor: '#0F172A', color: '#fff', padding: '12px', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px' }}>{activeToast.icon}</div>
          <div>
            <h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#FCD34D' }}>{activeToast.title}</h5>
            <p style={{ margin: 0, fontSize: '11px' }}>{activeToast.body}</p>
          </div>
        </div>
      )}

      {/* Auth Bar */}
      <div style={{ background: '#062B1A', color: '#E2E8F0', padding: '6px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {currentUser && userProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10B981', fontWeight: 'bold' }}>● {userProfile.name}</span>
            {userProfile.role === 'super_admin' && <span style={{ background: '#F59E0B', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>অ্যাডমিন</span>}
          </div>
        ) : (
          <span style={{ color: '#FCD34D' }}>⚠️ লগইন করা নেই</span>
        )}
        <button onClick={currentUser ? handleLogout : () => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: currentUser ? '#EF4444' : '#10B981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {currentUser ? 'লগআউট' : 'লগইন / সাইন আপ'}
        </button>
      </div>

      {activeTab === 'home' && (
        <header style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(5,35,20,0.8) 100%), url('/header-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', color: '#fff', padding: '25px 15px', textAlign: 'center', borderRadius: '0 0 20px 20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.5)', color: '#FEF08A', padding: '4px 12px', borderRadius: '15px', border: '1px solid #D4AF37' }}>সান্দিকোনা স্কুল এন্ড কলেজ</span>
          <h1 style={{ fontSize: '26px', margin: '8px 0 2px 0', fontWeight: '900' }}>পুনর্মিলনী ২০২৭</h1>
          <p style={{ fontSize: '14px', margin: 0, fontWeight: 'bold', color: '#F0FDF4' }}>এসএসসি ব্যাচ ২০১৪</p>
        </header>
      )}

      <main style={{ maxWidth: '500px', margin: '0 auto', padding: '14px' }}>
        {activeTab === 'home' && (
          <>
            <div onClick={() => setActiveTab('directory')} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '2px solid #BBF7D0', textAlign: 'center', marginBottom: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '12px', color: '#137547', fontWeight: 'bold' }}>নিবন্ধিত সহপাঠী</span>
              <h2 style={{ fontSize: '32px', margin: '4px 0', color: '#0A4D2E', fontWeight: '900' }}>{allUsers.filter(u => u.status === 'approved').length} জন</h2>
              <span style={{ fontSize: '11px', color: '#0284C7', textDecoration: 'underline' }}>সবাইকে দেখতে ক্লিক করুন</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <button onClick={() => setActiveTab('chat')} style={{ background: '#075E54', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                💬 গ্রুপ আড্ডা
              </button>
              <button onClick={() => setActiveTab('memories')} style={{ background: '#D97706', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                📸 স্মৃতির গ্যালারি
              </button>
            </div>
          </>
        )}

        {/* Phase 1: User Profile */}
        {activeTab === 'profile' && userProfile && (
          <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ height: '150px', background: '#0A4D2E', position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '10px' }}>কভার ফটো (শীঘ্রই আসছে)</div>
            </div>
            <div style={{ padding: '0 16px', marginTop: '-40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #fff', background: '#137547', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#fff' }}>
                {userProfile.name.charAt(0)}
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              <h2 style={{ margin: '0', fontSize: '20px', color: '#0F172A', fontWeight: '900' }}>{userProfile.name}</h2>
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748B' }}>এসএসসি ২০১৪ • 🏡 {userProfile.village}, {userProfile.area}</p>
              <div style={{ marginTop: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold' }}>👤 প্রোফাইল স্ট্যাটাস:</p>
                <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>✅ ভেরিফাইড মেম্বার</span>
              </div>
            </div>
          </div>
        )}

        {/* Directory */}
        {activeTab === 'directory' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0A4D2E', fontWeight: 'bold' }}>👥 সহপাঠী ডিরেক্টরি</h3>
            <input type="text" placeholder="নাম দিয়ে খুঁজুন..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'approved' && u.name.includes(searchQuery)).map(m => (
                <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village} • জার্সি: {m.tshirt}</p>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>✓ ভেরিফাইড</span>
                </div>
              ))}
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

            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              {authMode === 'login' ? 
                <button onClick={() => setAuthMode('signup')} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: 'bold' }}>নতুন অ্যাকাউন্ট খুলুন</button> : 
                <button onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#0A4D2E', fontWeight: 'bold' }}>সরাসরি লগইন করুন</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel for Approval */}
      {showAdmin && userProfile?.role === 'super_admin' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '15px', fontWeight: '800' }}>👑 অ্যাডমিন ভেরিফিকেশন প্যানেল</h3>
              <button onClick={() => setShowAdmin(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px' }}>✕</button>
            </div>
            
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#D97706' }}>অপেক্ষমান (Pending) মেম্বারসমূহ:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'pending').map(m => (
                <div key={m.uid} style={{ background: '#FEF3C7', padding: '10px', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold' }}>{m.name} ({m.phone})</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleVerifyUser(m.uid, 'approved')} style={{ flex: 1, background: '#16A34A', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>✅ অনুমোদন দিন</button>
                    <button onClick={() => handleVerifyUser(m.uid, 'rejected')} style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>❌ বাতিল করুন</button>
                  </div>
                </div>
              ))}
              {allUsers.filter(u => u.status === 'pending').length === 0 && <p style={{ fontSize: '12px', color: '#64748B', textAlign: 'center' }}>কোনো অপেক্ষমান রিকোয়েস্ট নেই।</p>}
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
          <button onClick={() => setActiveTab('profile')} style={{ border: 'none', background: 'none', color: activeTab === 'profile' ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>👤</span><span>প্রোফাইল</span>
          </button>
        )}
        {userProfile?.role === 'super_admin' && (
          <button onClick={() => setShowAdmin(true)} style={{ border: 'none', background: 'none', color: '#D97706', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>👑</span><span>অ্যাডমিন</span>
          </button>
        )}
      </nav>
    </div>
  );
}
