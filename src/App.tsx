import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User 
} from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem } from "./types";
import ChatRoom from "./components/ChatRoom";

// ==========================================
// 🛡️ STEP 3: REACT ERROR BOUNDARY
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash Log:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#DC2626', margin: '0 0 8px 0', fontSize: '18px' }}>
            অ্যাপটি লোড হতে সমস্যা হয়েছে
          </h2>
          <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 16px 0', maxWidth: '320px', lineHeight: '1.5' }}>
            {"ত্রুটি: " + this.state.errorMessage}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              backgroundColor: '#581C87',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            অ্যাপ রিস্টার্ট করুন 🔄
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 🚀 MAIN APPLICATION COMPONENT
// ==========================================
function MainApplication() {
  const [appStage, setAppStage] = useState<string>('splash');
  const [mainNavTab, setMainNavTab] = useState<string>('home');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // ফর্ম স্টেটস
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [regDob, setRegDob] = useState<string>('');
  const [regGender, setRegGender] = useState<string>('পুরুষ');
  const [regProfession, setRegProfession] = useState<string>('');
  const [regCurrentLocation, setRegCurrentLocation] = useState<string>('');
  const [regBio, setRegBio] = useState<string>('');
  const [regProfileImg, setRegProfileImg] = useState<string>('');

  // হোমপেজ লাইভ ফিচার স্টেটস
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState<string>('');
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);

  // নিরাপদ প্রোফাইল অ্যাডাপ্টার (যাতে কোনো ফিল্ড মিসিং থাকলে ক্র্যাশ না করে)
  const formatProfileData = (uid: string, raw: any, emailFallback: string): UserProfile => {
    return {
      uid: uid,
      fullName: raw?.fullName || raw?.name || 'সহপাঠী',
      email: raw?.email || emailFallback || '',
      phoneNumber: raw?.phoneNumber || raw?.phone || '',
      profileImage: raw?.profileImage || raw?.avatarUrl || '',
      coverImage: raw?.coverImage || raw?.coverUrl || '',
      schoolName: raw?.schoolName || 'সান্দিকোনা স্কুল এন্ড কলেজ',
      batchYear: '2014',
      dateOfBirth: raw?.dateOfBirth || raw?.dob || '1998-01-01',
      gender: raw?.gender || 'পুরুষ',
      profession: raw?.profession || 'উল্লেখ নেই',
      currentLocation: raw?.currentLocation || raw?.area || 'কেন্দুয়া, নেত্রকোনা',
      permanentAddress: raw?.permanentAddress || raw?.village || 'সান্দিকোনা',
      whatsappNumber: raw?.whatsappNumber || '',
      facebookUrl: raw?.facebookUrl || '',
      bio: raw?.bio || '',
      profileCompleted: Boolean(raw?.profileCompleted !== undefined ? raw?.profileCompleted : true),
      accountStatus: raw?.accountStatus || 'approved',
      role: raw?.role || (raw?.phoneNumber?.includes('01705374798') ? 'super_admin' : 'member'),
      privacySettings: raw?.privacySettings || { showPhone: false, showDob: false, profileVisible: true, showProfession: true },
      createdAt: raw?.createdAt || Date.now(),
      updatedAt: raw?.updatedAt || Date.now()
    };
  };

  // 1. Persistent Auth Session Handler (With Null-Safety)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const safeProfile = formatProfileData(user.uid, userDoc.data(), user.email || '');
            setUserProfile(safeProfile);
            setAppStage('main'); // সাকসেসফুল ফেচ শেষে সরাসরি মেইনে নিয়ে যাওয়া
          } else {
            // ডকুমেন্টস মিসিং থাকলে ব্যাকআপ প্রোফাইল তৈরি
            const fallbackProfile = formatProfileData(user.uid, {}, user.email || '');
            setUserProfile(fallbackProfile);
            setAppStage('main');
          }
        } catch (e) {
          console.error("Firestore Fetch Exception:", e);
          // নেটওয়ার্ক ফেইল করলেও অ্যাপ যেন সাদা না হয়
          const fallbackProfile = formatProfileData(user.uid, {}, user.email || '');
          setUserProfile(fallbackProfile);
          setAppStage('main');
        }
      } else {
        setUserProfile(null);
        setTimeout(() => {
          setAppStage('welcome');
        }, 1200);
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Clock & Elapsed Friendship Time Counter
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

  // 3. Realtime Posts & Directory Listener
  useEffect(() => {
    if (appStage !== 'main') return;

    const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const pList: PostItem[] = [];
      snap.forEach(d => pList.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(pList);
    }, (err) => console.log("Post fetch handled:", err));

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach(d => uList.push(formatProfileData(d.id, d.data(), '')));
      setAllMembers(uList);
    }, (err) => console.log("User fetch handled:", err));

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, [appStage]);

  // Login Action
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsProcessing(true);

    let emailToUse = loginIdentifier.trim();
    if (!emailToUse.includes('@')) {
      const cleanPhone = emailToUse.replace(/[^\d]/g, '');
      emailToUse = cleanPhone + "@sandikona2014.org";
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, emailToUse, loginPassword);
      const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
      const safeProfile = formatProfileData(userCred.user.uid, userDoc.exists() ? userDoc.data() : {}, emailToUse);
      setUserProfile(safeProfile);
      setAppStage('main'); // সাকসেসফুল প্রমাণ পেয়ে তবেই মেইন অ্যাপ
    } catch (err: any) {
      setAuthError('ভুল ইমেইল/ফোন অথবা পাসওয়ার্ড। দয়া করে সঠিক তথ্য দিন।');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sign Up Action
  const handleSignUpStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (regPassword !== regConfirmPassword) {
      setAuthError('পাসওয়ার্ড দুটি মিলছে না!');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setIsProcessing(true);
    try {
      const email = regEmail.trim();
      const userCred = await createUserWithEmailAndPassword(auth, email, regPassword);
      const newProfile = formatProfileData(userCred.user.uid, {
        fullName: regFullName.trim(),
        email: email,
        phoneNumber: regPhone.trim(),
        profileCompleted: true
      }, email);

      await setDoc(doc(db, "users", userCred.user.uid), newProfile);
      setUserProfile(newProfile);
      setAppStage('main');
    } catch (err: any) {
      setAuthError(err.message || 'নিবন্ধনে সমস্যা হয়েছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("আপনি কি নিশ্চিতভাবে লগআউট করতে চান?")) {
      await signOut(auth);
      setAppStage('welcome');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newPostText.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        authorUid: currentUser.uid,
        authorName: userProfile?.fullName || 'সহপাঠী',
        authorVillage: userProfile?.permanentAddress || 'সান্দিকোনা',
        content: newPostText.trim(),
        likes: [],
        commentsCount: 0,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setNewPostText('');
    } catch (e) {}
  };

  // ==========================================
  // RENDER: SPLASH SCREEN
  // ==========================================
  if (appStage === 'splash') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3B0764 0%, #6B21A8 50%, #1E1B4B 100%)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: '#F59E0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          marginBottom: '16px'
        }}>
          🎓
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px 0' }}>SSC Batch 2014 Community</h1>
        <h2 style={{ fontSize: '17px', color: '#FEF08A', margin: '0 0 4px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h2>
        <p style={{ fontSize: '13px', margin: '0 0 24px 0', opacity: 0.9 }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা</p>
        <div style={{ fontSize: '12px', color: '#DDD6FE' }}>সেশন যাচাই করা হচ্ছে...</div>
      </div>
    );
  }

  // ==========================================
  // RENDER: WELCOME SCREEN
  // ==========================================
  if (appStage === 'welcome') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2E1065 0%, #581C87 50%, #1E1B4B 100%)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '48px 20px 24px 20px',
        textAlign: 'center'
      }}>
        <div>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#F59E0B',
            margin: '0 auto 16px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px'
          }}>
            🎓
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>SSC Batch 2014 Community</h1>
          <h3 style={{ fontSize: '16px', color: '#FEF08A', margin: '0 0 4px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
          <p style={{ fontSize: '12px', color: '#DDD6FE', margin: 0 }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</p>
        </div>

        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => { setAuthError(''); setAppStage('signup_step1'); }}
            style={{
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            নতুন অ্যাকাউন্ট তৈরি করুন (Sign Up)
          </button>

          <button
            onClick={() => { setAuthError(''); setAppStage('login'); }}
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            আগে থেকেই অ্যাকাউন্ট আছে (Login)
          </button>
        </div>

        <p style={{ fontSize: '11px', color: '#C4B5FD', margin: 0 }}>বন্ধুত্বের বন্ধন অটুট থাকুক আজীবন।</p>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOGIN SCREEN
  // ==========================================
  if (appStage === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '18px', width: '100%', maxWidth: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#581C87', margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>লগইন করুন</h2>
          <p style={{ color: '#65676B', fontSize: '12px', margin: '0 0 16px 0' }}>আপনার নিবন্ধিত তথ্য দিয়ে প্রবেশ করুন।</p>

          {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px' }}>{authError}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              required
              type="text"
              placeholder="ইমেইল অথবা মোবাইল নম্বর"
              value={loginIdentifier}
              onChange={e => setLoginIdentifier(e.target.value)}
              style={{ padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none' }}
            />

            <div style={{ position: 'relative' }}>
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="পাসওয়ার্ড"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px', color: '#7C3AED', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {showPassword ? "লুকান" : "দেখুন"}
              </span>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              style={{
                background: '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              {isProcessing ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px' }}>
            <button onClick={() => setAppStage('signup_step1')} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 'bold', cursor: 'pointer' }}>
              নতুন অ্যাকাউন্ট খুলতে চান? সাইন আপ করুন
            </button>
            <br/><br/>
            <button onClick={() => setAppStage('welcome')} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
              ← ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SIGN UP SCREEN
  // ==========================================
  if (appStage === 'signup_step1') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '18px', width: '100%', maxWidth: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#581C87', margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>নতুন অ্যাকাউন্ট তৈরি</h2>
          <p style={{ color: '#65676B', fontSize: '11px', margin: '0 0 16px 0' }}>এসএসসি ব্যাচ ২০১৪ • সান্দিকোনা স্কুল এন্ড কলেজ</p>

          {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px' }}>{authError}</div>}

          <form onSubmit={handleSignUpStep1} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <input required type="text" placeholder="আপনার পূর্ণ নাম *" value={regFullName} onChange={e => setRegFullName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px' }} />
            <input required type="email" placeholder="ইমেইল এড্রেস *" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px' }} />
            <input required type="tel" placeholder="মোবাইল নম্বর (017XXXXXXXX) *" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px' }} />
            <input required type="password" placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px' }} />
            <input required type="password" placeholder="কনফার্ম পাসওয়ার্ড *" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px' }} />

            <button type="submit" disabled={isProcessing} style={{ background: '#10B981', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
              {isProcessing ? 'তৈরি হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন ✓'}
            </button>
          </form>

          <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '11px' }}>
            <button onClick={() => setAppStage('login')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>
              ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN APPLICATION (NO WHITE SCREEN GUARANTEED)
  // ==========================================
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#F0F2F5',
      minHeight: '100vh',
      paddingBottom: '85px',
      margin: 0,
      color: '#1C1E21'
    }}>
      {/* 🌟 Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)',
        color: '#FFFFFF',
        padding: '10px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
            <span style={{ fontSize: '9px', color: '#E9D5FF' }}>এস এস সি ব্যাচ ২০১৪</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '9px', color: '#FCD34D', textAlign: 'right', lineHeight: '1.2' }}>
            <div>{currentTimeStr || '...'}</div>
            <div>{currentDateStr || '...'}</div>
          </div>
          <span style={{ fontSize: '18px', cursor: 'pointer' }} onClick={() => setMainNavTab('chat')}>💬</span>
          <div
            onClick={() => setMainNavTab('profile')}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#10B981',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer',
              border: '2px solid #FFFFFF',
              overflow: 'hidden'
            }}
          >
            {(userProfile?.fullName || 'স').charAt(0)}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '580px', margin: '0 auto', padding: '10px' }}>
        
        {/* HOMEPAGE */}
        {mainNavTab === 'home' && (
          <div>
            {/* School Welcome Banner */}
            <div style={{
              backgroundImage: "linear-gradient(135deg, rgba(88, 28, 135, 0.88) 0%, rgba(124, 58, 237, 0.88) 100%), url('/header-bg.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '16px',
              padding: '18px',
              color: '#FFFFFF',
              textAlign: 'center',
              marginBottom: '10px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#F59E0B',
                margin: '0 auto 8px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                border: '2px solid #FFFFFF'
              }}>
                🎓
              </div>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '19px', margin: '6px 0 2px 0', fontWeight: 'bold' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* Friendship Counter */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: '14px', padding: '12px', marginBottom: '10px', color: '#FFFFFF', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#93C5FD', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                🎓 এস এস সি ২০১৪ পাসের পর আমাদের বন্ধুত্বের অতিবাহিত সময়
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div><span style={{ fontSize: '15px', fontWeight: 'bold' }}>{batchTimeElapsed.years}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>বছর</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: 'bold' }}>{batchTimeElapsed.months}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>মাস</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: 'bold' }}>{batchTimeElapsed.days}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>দিন</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: 'bold' }}>{batchTimeElapsed.hours}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>ঘণ্টা</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: 'bold' }}>{batchTimeElapsed.minutes}</span><span style={{ fontSize: '9px', display: 'block', opacity: 0.8 }}>মিনিট</span></div>
                <div><span style={{ fontSize: '15px', fontWeight: 'bold', color: '#FEF08A' }}>{batchTimeElapsed.seconds}</span><span style={{ fontSize: '9px', display: 'block', color: '#FEF08A' }}>সেকেন্ড</span></div>
              </div>
            </div>

            {/* Post Composer */}
            <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E4E6EB' }}>
              <form onSubmit={handleCreatePost}>
                <textarea
                  rows={2}
                  placeholder={(userProfile?.fullName || 'সহপাঠী') + ", কিছু লিখুন..."}
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F0F2F5' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" style={{ background: '#7C3AED', color: '#FFFFFF', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>পোস্ট করুন</button>
                </div>
              </form>
            </div>

            {/* Timeline Posts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: '#FFFFFF', borderRadius: '14px', padding: '12px', border: '1px solid #E4E6EB' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{post.authorName} <span style={{ fontSize: '9px', color: '#65676B' }}>({post.authorVillage})</span></h4>
                  <p style={{ fontSize: '12px', color: '#1C1E21', margin: '6px 0' }}>{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE PAGE */}
        {mainNavTab === 'profile' && (
          <div style={{ background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 100%)' }} />
            <div style={{ padding: '0 16px 20px 16px', textAlign: 'center', marginTop: '-40px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid #FFFFFF',
                background: '#F59E0B',
                margin: '0 auto 8px auto',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                color: '#FFFFFF'
              }}>
                {(userProfile?.fullName || 'স').charAt(0)}
              </div>

              <h2 style={{ margin: '0 0 2px 0', fontSize: '17px', fontWeight: 'bold', color: '#111827' }}>{userProfile?.fullName}</h2>
              <span style={{ fontSize: '11px', background: '#F3E8FF', color: '#6B21A8', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                এসএসসি ব্যাচ ২০১৪
              </span>

              <div style={{ margin: '14px 0', fontSize: '12px', color: '#4B5563', lineHeight: '1.6' }}>
                <div>🏫 {userProfile?.schoolName}</div>
                <div>📱 {userProfile?.phoneNumber}</div>
                <div>📍 {userProfile?.currentLocation}</div>
              </div>

              <button
                onClick={handleLogout}
                style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                লগআউট করুন
              </button>
            </div>
          </div>
        )}

        {/* DIRECTORY */}
        {mainNavTab === 'directory' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#581C87', fontWeight: 'bold' }}>সহপাঠী ডিরেক্টরি</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allMembers.map(m => (
                <div key={m.uid} style={{ background: '#FFFFFF', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{m.fullName}</h4>
                    <span style={{ fontSize: '10px', color: '#6B7280' }}>{m.currentLocation}</span>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>নিবন্ধিত</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT */}
        {mainNavTab === 'chat' && (
          <ChatRoom
            currentUser={currentUser}
            userProfile={userProfile}
            recipientUser={null}
            onBack={() => setMainNavTab('home')}
            onOpenAuth={() => setAppStage('login')}
          />
        )}
      </main>

      {/* 🧭 Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E4E6EB',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '6px 0',
        zIndex: 1000,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}>
        <button onClick={() => setMainNavTab('home')} style={{ border: 'none', background: 'none', color: mainNavTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => setMainNavTab('directory')} style={{ border: 'none', background: 'none', color: mainNavTab === 'directory' ? '#7C3AED' : '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>👥</span><span>সহপাঠী</span>
        </button>
        <button onClick={() => setMainNavTab('chat')} style={{ border: 'none', background: 'none', color: mainNavTab === 'chat' ? '#7C3AED' : '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>💬</span><span>আড্ডা</span>
        </button>
        <button onClick={() => setMainNavTab('profile')} style={{ border: 'none', background: 'none', color: mainNavTab === 'profile' ? '#7C3AED' : '#65676B', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>👤</span><span>প্রোফাইল</span>
        </button>
      </nav>
    </div>
  );
}

// Wrap with Error Boundary
export function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <MainApplication />
    </ErrorBoundary>
  );
}
