import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User 
} from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment } from "./types";
import ChatRoom from "./components/ChatRoom";

export default function App() {
  // Navigation & Authentication Stages:
  // 'splash' | 'welcome' | 'login' | 'signup_step1' | 'signup_step2' | 'signup_step3' | 'signup_step4' | 'complete_gate' | 'main'
  const [appStage, setAppStage] = useState<string>('splash');
  const [mainNavTab, setMainNavTab] = useState<string>('home');

  // Authenticated State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Login States
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Registration Multi-step Form States
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [regDob, setRegDob] = useState<string>('');
  const [regGender, setRegGender] = useState<string>('পুরুষ');
  const [regProfession, setRegProfession] = useState<string>('');
  const [regCurrentLocation, setRegCurrentLocation] = useState<string>('');
  const [regPermanentAddress, setRegPermanentAddress] = useState<string>('');
  const [regWhatsapp, setRegWhatsapp] = useState<string>('');
  const [regFacebook, setRegFacebook] = useState<string>('');
  const [regBio, setRegBio] = useState<string>('');
  const [regProfileImg, setRegProfileImg] = useState<string>('');

  const [privShowPhone, setPrivShowPhone] = useState<boolean>(false);
  const [privShowDob, setPrivShowDob] = useState<boolean>(false);
  const [privProfileVisible, setPrivProfileVisible] = useState<boolean>(true);
  const [privShowProfession, setPrivShowProfession] = useState<boolean>(true);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Existing Homepage Feature States
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [batchTimeElapsed, setBatchTimeElapsed] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [announcement, setAnnouncement] = useState<string>('স্বাগতম এস এস সি ব্যাচ ২০১৪ কমিউনিটিতে। বন্ধুত্বের বন্ধন অটুট থাকুক আজীবন।');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState<string>('');
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);

  // ----------------------------------------------------
  // Client-Side Image Resizer (Safely keeps size under 100KB)
  // ----------------------------------------------------
  const processImageUpload = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 500;
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
          resolve(canvas.toDataURL('image/jpeg', 0.55));
        };
      };
    });
  };

  // ----------------------------------------------------
  // Persistent Auth Listener & Auto-Route (Phase 1 & 7)
  // ----------------------------------------------------
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUserProfile(data);
            if (!data.profileCompleted || !data.fullName || !data.dateOfBirth) {
              setAppStage('complete_gate');
            } else if (data.accountStatus === 'pending') {
              setAppStage('complete_gate');
            } else {
              setAppStage('main');
            }
          } else {
            setAppStage('complete_gate');
          }
        } catch (e) {
          setAppStage('welcome');
        }
      } else {
        setUserProfile(null);
        setTimeout(() => {
          setAppStage('welcome');
        }, 1800);
      }
    });

    return () => unsubAuth();
  }, []);

  // ----------------------------------------------------
  // Clock & Elapsed Friendship Time Counter
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // Sync Realtime Posts & Members
  // ----------------------------------------------------
  useEffect(() => {
    if (appStage !== 'main') return;

    const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(25));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const pList: PostItem[] = [];
      snap.forEach(d => pList.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(pList);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach(d => uList.push(d.data() as UserProfile));
      setAllMembers(uList);
    });

    return () => {
      unsubPosts();
      unsubUsers();
    };
  }, [appStage]);

  // ----------------------------------------------------
  // Auth Logic: Login
  // ----------------------------------------------------
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
      await signInWithEmailAndPassword(auth, emailToUse, loginPassword);
    } catch (err: any) {
      setAuthError('ভুল ইমেইল/ফোন নম্বর অথবা পাসওয়ার্ড।');
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // Auth Logic: Password Reset
  // ----------------------------------------------------
  const handlePasswordReset = async () => {
    if (!loginIdentifier.includes('@')) {
      alert('পাসওয়ার্ড রিসেটের লিংক পেতে আপনার নিবন্ধিত ইমেইল ঠিকানাটি লিখুন।');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, loginIdentifier.trim());
      alert('আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।');
    } catch (e) {
      alert('ইমেইল পাঠানো যায়নি। দয়া করে সঠিক ইমেইল নিশ্চিত করুন।');
    }
  };

  // ----------------------------------------------------
  // Auth Logic: Multi-Step Registration Completion
  // ----------------------------------------------------
  const handleFinalRegistration = async () => {
    if (!termsAccepted) {
      alert('অ্যাপের নীতিমালা ও গোপনীয়তা শর্তাবলী গ্রহণ করা আবশ্যক।');
      return;
    }
    setIsProcessing(true);

    try {
      const email = regEmail.trim();
      const userCred = await createUserWithEmailAndPassword(auth, email, regPassword);
      const user = userCred.user;
      const isSuperAdmin = regPhone.includes('01705374798');

      const profilePayload: UserProfile = {
        uid: user.uid,
        fullName: regFullName.trim(),
        email: email,
        phoneNumber: regPhone.trim(),
        profileImage: regProfileImg || '',
        coverImage: '',
        schoolName: 'সান্দিকোনা স্কুল এন্ড কলেজ',
        batchYear: '2014',
        dateOfBirth: regDob,
        gender: regGender,
        profession: regProfession.trim(),
        currentLocation: regCurrentLocation.trim(),
        permanentAddress: regPermanentAddress.trim() || 'সান্দিকোনা, কেন্দুয়া, নেত্রকোনা',
        whatsappNumber: regWhatsapp.trim(),
        facebookUrl: regFacebook.trim(),
        bio: regBio.trim(),
        profileCompleted: true,
        accountStatus: isSuperAdmin ? 'approved' : 'approved',
        role: isSuperAdmin ? 'super_admin' : 'member',
        privacySettings: {
          showPhone: privShowPhone,
          showDob: privShowDob,
          profileVisible: privProfileVisible,
          showProfession: privShowProfession
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "users", user.uid), profilePayload);
      setUserProfile(profilePayload);
      setAppStage('main');
    } catch (err: any) {
      alert('রেজিস্ট্রেশন সম্পন্ন করা যায়নি: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ====================================================
  // SCREEN 1: SPLASH SCREEN (Phase 1)
  // ====================================================
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
          width: '95px',
          height: '95px',
          borderRadius: '50%',
          background: '#F59E0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '44px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          marginBottom: '20px'
        }}>
          🎓
        </div>
        <span style={{ fontSize: '13px', color: '#DDD6FE', letterSpacing: '1px' }}>WELCOME TO</span>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '4px 0 10px 0' }}>SSC Batch 2014 Community</h1>
        <h2 style={{ fontSize: '19px', color: '#FEF08A', margin: '0 0 6px 0', fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h2>
        <p style={{ fontSize: '15px', color: '#F3E8FF', margin: '0 0 4px 0' }}>এস এস সি ব্যাচ ২০১৪</p>
        <p style={{ fontSize: '12px', color: '#C4B5FD', margin: '0 0 32px 0' }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</p>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#F59E0B',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  // ====================================================
  // SCREEN 2: WELCOME (Phase 2)
  // ====================================================
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
        padding: '50px 24px 30px 24px',
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
            fontSize: '38px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
          }}>
            🎓
          </div>
          <h1 style={{ fontSize: '23px', fontWeight: '900', margin: '0 0 6px 0' }}>SSC Batch 2014 Community</h1>
          <h3 style={{ fontSize: '16px', color: '#FEF08A', margin: '0 0 4px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
          <p style={{ fontSize: '13px', color: '#DDD6FE', margin: 0 }}>এস এস সি ব্যাচ ২০১৪ • সান্দিকোনা, কেন্দুয়া</p>
        </div>

        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            onClick={() => { setAuthError(''); setAppStage('signup_step1'); }}
            style={{
              background: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
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
              fontSize: '15px',
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

  // ====================================================
  // SCREEN 3: LOGIN (Phase 3)
  // ====================================================
  if (appStage === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '28px 24px', borderRadius: '20px', width: '100%', maxWidth: '380px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <h2 style={{ color: '#581C87', margin: '0 0 4px 0', fontSize: '20px', fontWeight: '900' }}>লগইন করুন</h2>
          <p style={{ color: '#65676B', fontSize: '12px', margin: '0 0 20px 0' }}>আপনার ইমেইল বা ফোন নম্বর দিয়ে প্রবেশ করুন।</p>

          {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px' }}>{authError}</div>}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              required
              type="text"
              placeholder="ইমেইল এড্রেস অথবা মোবাইল নম্বর"
              value={loginIdentifier}
              onChange={e => setLoginIdentifier(e.target.value)}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none' }}
            />

            <div style={{ position: 'relative' }}>
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="পাসওয়ার্ড"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '13px', color: '#7C3AED', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {showPassword ? "লুকান" : "দেখুন"}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#4B5563' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                মনে রাখুন
              </label>
              <span onClick={handlePasswordReset} style={{ color: '#7C3AED', cursor: 'pointer', fontWeight: 'bold' }}>পাসওয়ার্ড ভুলে গেছেন?</span>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              style={{
                background: '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                padding: '13px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              {isProcessing ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
            <button onClick={() => setAppStage('signup_step1')} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              নতুন অ্যাকাউন্ট তৈরি করতে চান? সাইন আপ করুন
            </button>
            <br/><br/>
            <button onClick={() => setAppStage('welcome')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '11px', cursor: 'pointer' }}>
              ← পূর্ববর্তী স্ক্রিনে ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 4: SIGN UP STEP 1 (Account Credentials)
  // ====================================================
  if (appStage === 'signup_step1') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '390px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 'bold' }}>ধাপ ১ / ৪</div>
          <h2 style={{ color: '#581C87', margin: '2px 0 4px 0', fontSize: '19px', fontWeight: '900' }}>অ্যাকাউন্ট তৈরি করুন</h2>
          <p style={{ color: '#65676B', fontSize: '12px', margin: '0 0 16px 0' }}>আপনার প্রাথমিক তথ্য দিন।</p>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (regPassword !== regConfirmPassword) { alert('পাসওয়ার্ড দুটি মেলেনি!'); return; }
            if (regPassword.length < 6) { alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'); return; }
            setAppStage('signup_step2');
          }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input required type="text" placeholder="পূর্ণ নাম *" value={regFullName} onChange={e => setRegFullName(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="email" placeholder="ইমেইল এড্রেস *" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="tel" placeholder="মোবাইল নম্বর (017XXXXXXXX) *" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="password" placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="password" placeholder="কনফার্ম পাসওয়ার্ড *" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} style={{ padding: '11px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '13px' }} />

            <button type="submit" style={{ background: '#7C3AED', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
              পরবর্তী ধাপ: ব্যক্তিগত প্রোফাইল →
            </button>
          </form>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <button onClick={() => setAppStage('welcome')} style={{ background: 'none', border: 'none', color: '#65676B', fontSize: '11px', cursor: 'pointer' }}>বাতিল করুন</button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 4: SIGN UP STEP 2 (Personal Profile)
  // ====================================================
  if (appStage === 'signup_step2') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 'bold' }}>ধাপ ২ / ৪</div>
          <h2 style={{ color: '#581C87', margin: '2px 0 4px 0', fontSize: '18px', fontWeight: '900' }}>ব্যক্তিগত তথ্য</h2>
          <p style={{ color: '#65676B', fontSize: '11px', margin: '0 0 14px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ • এসএসসি ২০১৪</p>

          <form onSubmit={(e) => { e.preventDefault(); setAppStage('signup_step3'); }} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ width: '75px', height: '75px', borderRadius: '50%', background: '#E2E8F0', margin: '0 auto 4px auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #7C3AED' }}>
                {regProfileImg ? <img src={regProfileImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
              </div>
              <label style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>
                প্রোফাইল ছবি নির্বাচন করুন
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const comp = await processImageUpload(file);
                    setRegProfileImg(comp);
                  }
                }} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold' }}>জন্মতারিখ: *</label>
                <input required type="date" value={regDob} onChange={e => setRegDob(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '11px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold' }}>লিঙ্গ: *</label>
                <select value={regGender} onChange={e => setRegGender(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '11px', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="পুরুষ">পুরুষ</option>
                  <option value="মহিলা">মহিলা</option>
                </select>
              </div>
            </div>

            <input required type="text" placeholder="বর্তমান পেশা (যেমন: ব্যবসায়ী / প্রকৌশলী) *" value={regProfession} onChange={e => setRegProfession(e.target.value)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
            <input required type="text" placeholder="বর্তমান ঠিকানা (যেমন: ঢাকা / কেন্দুয়া) *" value={regCurrentLocation} onChange={e => setRegCurrentLocation(e.target.value)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
            <input type="text" placeholder="স্থায়ী গ্রামের নাম (সান্দিকোনা অঞ্চলের)" value={regPermanentAddress} onChange={e => setRegPermanentAddress(e.target.value)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
            <input type="tel" placeholder="হোয়াটসঅ্যাপ নম্বর (ঐচ্ছিক)" value={regWhatsapp} onChange={e => setRegWhatsapp(e.target.value)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
            <input type="text" placeholder="ফেসবুক প্রোফাইল লিংক (ঐচ্ছিক)" value={regFacebook} onChange={e => setRegFacebook(e.target.value)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
            <textarea rows={2} placeholder="সংক্ষিপ্ত পরিচিতি বা বায়ো..." value={regBio} onChange={e => setRegBio(e.target.value)} style={{ padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }} />

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button type="button" onClick={() => setAppStage('signup_step1')} style={{ flex: 1, background: '#E2E8F0', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>← পেছনে</button>
              <button type="submit" style={{ flex: 2, background: '#7C3AED', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>ধাপ ৩: প্রাইভেসি →</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 4: SIGN UP STEP 3 (Privacy & Consent)
  // ====================================================
  if (appStage === 'signup_step3') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '390px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 'bold' }}>ধাপ ৩ / ৪</div>
          <h2 style={{ color: '#581C87', margin: '2px 0 4px 0', fontSize: '18px', fontWeight: '900' }}>প্রাইভেসি ও সম্মতি</h2>
          <p style={{ color: '#65676B', fontSize: '11px', margin: '0 0 16px 0' }}>কোন তথ্যগুলো সহপাঠীদের সাথে উন্মুক্ত রাখতে চান?</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#374151' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
              <span>মোবাইল নম্বর সবার কাছে দৃশ্যমান</span>
              <input type="checkbox" checked={privShowPhone} onChange={e => setPrivShowPhone(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
              <span>জন্মদিন সবাইকে দেখান</span>
              <input type="checkbox" checked={privShowDob} onChange={e => setPrivShowDob(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#F8FAFC', borderRadius: '8px' }}>
              <span>পেশা ও বর্তমান ঠিকানা দেখান</span>
              <input type="checkbox" checked={privShowProfession} onChange={e => setPrivShowProfession(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '10px' }}>
              <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
              <span style={{ fontSize: '11px', color: '#4B5563' }}>আমি সান্দিকোনা স্কুল এন্ড কলেজ এসএসসি ২০১৪ ব্যাচের নীতিমালা ও শর্তাবলী স্বীকার করছি। *</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            <button onClick={() => setAppStage('signup_step2')} style={{ flex: 1, background: '#E2E8F0', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>← পেছনে</button>
            <button onClick={() => setAppStage('signup_step4')} disabled={!termsAccepted} style={{ flex: 2, background: termsAccepted ? '#7C3AED' : '#CBD5E1', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>প্রিভিউ দেখুন →</button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 4: SIGN UP STEP 4 (Preview & Submit)
  // ====================================================
  if (appStage === 'signup_step4') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '390px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 'bold' }}>ধাপ ৪ / ৪: প্রোফাইল প্রিভিউ</div>
          <h2 style={{ color: '#581C87', margin: '2px 0 12px 0', fontSize: '18px', fontWeight: '900' }}>তথ্য নিশ্চিত করুন</h2>

          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#7C3AED', color: '#fff', margin: '0 auto 6px auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              {regProfileImg ? <img src={regProfileImg} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : regFullName.charAt(0)}
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>{regFullName}</h3>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#6B7280' }}>সান্দিকোনা স্কুল এন্ড কলেজ • এসএসসি ২০১৪</p>
          </div>

          <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div><strong>মোবাইল:</strong> {regPhone}</div>
            <div><strong>ইমেইল:</strong> {regEmail}</div>
            <div><strong>পেশা:</strong> {regProfession || 'উল্লেখ নেই'}</div>
            <div><strong>বর্তমান ঠিকানা:</strong> {regCurrentLocation}</div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button onClick={() => setAppStage('signup_step3')} style={{ flex: 1, background: '#E2E8F0', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>সংশোধন</button>
            <button onClick={handleFinalRegistration} disabled={isProcessing} style={{ flex: 2, background: '#10B981', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
              {isProcessing ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন নিশ্চিত করুন ✓'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 5: PROFILE COMPLETION GATE (Phase 5)
  // ====================================================
  if (appStage === 'complete_gate') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>⚠️</div>
          <h2 style={{ color: '#D97706', margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold' }}>প্রোফাইল অসম্পূর্ণ রয়েছে</h2>
          <p style={{ color: '#4B5563', fontSize: '12px', lineHeight: '1.5', margin: '0 0 18px 0' }}>
            কমিউনিটি প্ল্যাটফর্মে প্রবেশের আগে আপনার নাম, জন্মতারিখ ও প্রোফাইল ছবি দিয়ে সম্পূর্ণ তথ্য নিশ্চিত করা আবশ্যক।
          </p>
          <button
            onClick={() => {
              setRegFullName(userProfile?.fullName || '');
              setRegPhone(userProfile?.phoneNumber || '');
              setRegEmail(userProfile?.email || '');
              setAppStage('signup_step2');
            }}
            style={{ width: '100%', background: '#7C3AED', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            প্রোফাইল তথ্য পূরণ করুন
          </button>
          <button onClick={() => signOut(auth)} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer' }}>
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // SCREEN 6: MAIN APPLICATION (Phase 6, 8, 9, 10)
  // ====================================================
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '85px', margin: 0, color: '#1C1E21' }}>
      
      {/* 🌟 1. Fixed Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)',
        color: '#fff',
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
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '900' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
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
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer',
              border: '2px solid #fff',
              overflow: 'hidden'
            }}
          >
            {userProfile?.profileImage ? (
              <img src={userProfile.profileImage} alt="DP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (userProfile?.fullName || 'স').charAt(0)
            )}
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
              color: '#fff',
              textAlign: 'center',
              marginBottom: '10px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#F59E0B',
                margin: '0 auto 8px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: '2px solid #fff'
              }}>
                🎓
              </div>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '20px', margin: '6px 0 2px 0', fontWeight: '900' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* Live Notice */}
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '7px 10px', display: 'flex', alignItems: 'center', overflow: 'hidden', marginBottom: '10px', border: '1px solid #E4E6EB' }}>
              <span style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}>🔴 LIVE</span>
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '12px', color: '#4B5563', fontWeight: '600' }}>
                  {announcement}
                </marquee>
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

            {/* Post Composer */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E4E6EB' }}>
              <form onSubmit={handleCreatePost}>
                <textarea
                  rows={2}
                  placeholder={(userProfile?.fullName || 'সহপাঠী') + ", কিছু লিখুন..."}
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CCD0D5', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F0F2F5' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>পোস্ট করুন</button>
                </div>
              </form>
            </div>

            {/* Timeline Posts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: '#fff', borderRadius: '14px', padding: '12px', border: '1px solid #E4E6EB' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{post.authorName} <span style={{ fontSize: '9px', color: '#65676B' }}>({post.authorVillage})</span></h4>
                  <p style={{ fontSize: '12px', color: '#1C1E21', margin: '6px 0' }}>{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE PAGE (Phase 6) */}
        {mainNavTab === 'profile' && userProfile && (
          <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
            <div style={{ height: '140px', background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 100%)' }} />
            <div style={{ padding: '0 16px 20px 16px', textAlign: 'center', marginTop: '-45px' }}>
              <div style={{
                width: '85px',
                height: '85px',
                borderRadius: '50%',
                border: '3px solid #fff',
                background: '#F59E0B',
                margin: '0 auto 8px auto',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {userProfile.profileImage ? (
                  <img src={userProfile.profileImage} alt="DP" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userProfile.fullName.charAt(0)
                )}
              </div>

              <h2 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: '900', color: '#111827' }}>{userProfile.fullName}</h2>
              <span style={{ fontSize: '11px', background: '#F3E8FF', color: '#6B21A8', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                এসএসসি ব্যাচ ২০১৪ ব্যাজ
              </span>

              <div style={{ margin: '14px 0', fontSize: '12px', color: '#4B5563', lineHeight: '1.6' }}>
                <div>🏫 {userProfile.schoolName}</div>
                <div>💼 {userProfile.profession || 'পেশা উল্লেখ নেই'}</div>
                <div>📍 {userProfile.currentLocation}</div>
                {userProfile.bio && <p style={{ fontStyle: 'italic', color: '#6B7280', marginTop: '8px' }}>"{userProfile.bio}"</p>}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setRegFullName(userProfile.fullName);
                    setRegDob(userProfile.dateOfBirth);
                    setRegGender(userProfile.gender);
                    setRegProfession(userProfile.profession);
                    setRegCurrentLocation(userProfile.currentLocation);
                    setRegBio(userProfile.bio);
                    setAppStage('signup_step2');
                  }}
                  style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  প্রোফাইল এডিট করুন
                </button>
                <button
                  onClick={handleLogout}
                  style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  লগআউট
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIRECTORY */}
        {mainNavTab === 'directory' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#581C87', fontWeight: 'bold' }}>সহপাঠী ডিরেক্টরি</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allMembers.map(m => (
                <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{m.fullName}</h4>
                    <span style={{ fontSize: '10px', color: '#6B7280' }}>{m.profession} • {m.currentLocation}</span>
                  </div>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>অনুমোদিত</span>
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
        padding: '7px 0',
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
