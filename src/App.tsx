import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment } from "./types";

export default function App() {
  // অ্যাপ স্টেজ: 'splash' | 'welcome' | 'login' | 'signup' | 'complete_profile' | 'main'
  const [appStage, setAppStage] = useState<'splash' | 'welcome' | 'login' | 'signup' | 'complete_profile' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'profile' | 'chat'>('home');

  // ফায়ারবেস ইউজার ও প্রোফাইল
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // ফর্ম স্টেটস
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [genderInput, setGenderInput] = useState('পুরুষ');
  const [professionInput, setProfessionInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [facebookInput, setFacebookInput] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // সোশ্যাল ফিড স্টেটস
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // 1. Splash Screen & Persistent Session Check (Phase 1 & 7)
  useEffect(() => {
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);
              if (profile.profileCompleted) {
                setAppStage('main');
              } else {
                setAppStage('complete_profile');
              }
            } else {
              setAppStage('complete_profile');
            }
          } catch (e) {
            setAppStage('welcome');
          }
        } else {
          setAppStage('welcome');
        }
      });
      return () => unsubscribe();
    }, 2000); // 2 seconds splash animation

    return () => clearTimeout(timer);
  }, []);

  // ডাটাবেস লিসেনার (जब ইউজার মেইন অ্যাপে থাকে)
  useEffect(() => {
    if (appStage !== 'main') return;

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

    return () => { unsubUsers(); };
  }, [appStage]);

  // কমেন্ট লিসেনার
  useEffect(() => {
    if (!activeCommentsPostId) return;
    const unsub = onSnapshot(query(collection(db, "posts", activeCommentsPostId, "comments"), orderBy("timestamp", "asc")), (snap) => {
      const list: PostComment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as PostComment));
      setCommentsList(list);
    });
    return () => unsub();
  }, [activeCommentsPostId]);

  // 3. Login Handler (Phase 3)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const docSnap = await getDoc(doc(db, "users", userCred.user.uid));
      if (docSnap.exists() && docSnap.data().profileCompleted) {
        setAppStage('main');
      } else {
        setAppStage('complete_profile');
      }
    } catch (err: any) {
      setAuthError('ভুল ইমেইল বা পাসওয়ার্ড। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // 4. Sign Up Step 1 (Phase 4)
  const handleSignUpStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (passwordInput !== confirmPasswordInput) {
      setAuthError('পাসওয়ার্ড দুটি মিলছে না।');
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setAuthSubmitting(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const isSuperAdmin = phoneInput.includes('01705374798') || phoneInput.includes('1705374798');

      // প্রাথমিক ডিরেক্টরি ডকুমেন্ট তৈরি
      const tempProfile: UserProfile = {
        uid: userCred.user.uid,
        fullName: fullNameInput.trim() || 'সহপাঠী',
        email: emailInput.trim(),
        phoneNumber: phoneInput.trim(),
        schoolName: 'সান্দিকোনা স্কুল এন্ড কলেজ',
        batchYear: '2014',
        dateOfBirth: '',
        gender: 'পুরুষ',
        profession: '',
        currentLocation: 'কেন্দুয়া, নেত্রকোনা',
        bio: '',
        profileCompleted: false,
        accountStatus: 'approved',
        role: isSuperAdmin ? 'super_admin' : 'member',
        privacySettings: { showPhone: false, showDob: false, profileVisible: true, showProfession: true },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "users", userCred.user.uid), tempProfile);
      setUserProfile(tempProfile);
      setAppStage('complete_profile');
    } catch (err: any) {
      setAuthError(err.message || 'নিবন্ধনে সমস্যা হয়েছে।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // 5. Complete Profile Step 2-4 (Phase 4 & 5)
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setAuthSubmitting(true);

    try {
      const updatedProfile: UserProfile = {
        ...userProfile!,
        fullName: fullNameInput.trim() || userProfile!.fullName,
        dateOfBirth: dobInput,
        gender: genderInput,
        profession: professionInput.trim(),
        currentLocation: locationInput.trim() || 'কেন্দুয়া, নেত্রকোনা',
        whatsappNumber: whatsappInput.trim(),
        facebookUrl: facebookInput.trim(),
        bio: bioInput.trim(),
        profileImage: avatarPreview || '',
        profileCompleted: true,
        updatedAt: Date.now()
      };

      await setDoc(doc(db, "users", currentUser.uid), updatedProfile, { merge: true });
      setUserProfile(updatedProfile);
      setAppStage('main');
    } catch (err) {
      alert('প্রোফাইল সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Image Upload handler (Phase 4)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    if (window.confirm("লগআউট করতে চান?")) {
      await signOut(auth);
      setAppStage('welcome');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !newPostText.trim()) return;
    try {
      await addDoc(collection(db, "posts"), {
        authorUid: currentUser.uid,
        authorName: userProfile.fullName,
        authorVillage: userProfile.currentLocation,
        content: newPostText.trim(),
        likes: [],
        commentsCount: 0,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setNewPostText('');
    } catch (e) {}
  };

  const handleToggleLike = async (post: PostItem) => {
    if (!currentUser) return;
    const isLiked = post.likes.includes(currentUser.uid);
    const updatedLikes = isLiked ? post.likes.filter(id => id !== currentUser.uid) : [...post.likes, currentUser.uid];
    await setDoc(doc(db, "posts", post.id), { likes: updatedLikes }, { merge: true });
  };

  // ==========================================
  // RENDER UI BASED ON APP STAGE
  // ==========================================

  // PHASE 1: SPLASH SCREEN
  if (appStage === 'splash') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>🎓</div>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 8px 0' }}>SSC Batch 2014 Community</h1>
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#FEF08A', margin: '0 0 4px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h2>
        <p style={{ fontSize: '14px', margin: '0 0 20px 0', opacity: 0.9 }}>এস এস সি ব্যাচ ২০১৪</p>
        <p style={{ fontSize: '12px', opacity: 0.7 }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</p>
        <div style={{ marginTop: '30px', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // PHASE 2: WELCOME SCREEN
  if (appStage === 'welcome') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 50%, #4C1D95 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px 20px', textAlign: 'center' }}>
        <div>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F59E0B', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>🎓</div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 6px 0' }}>SSC Batch 2014 Community</h1>
          <h3 style={{ fontSize: '16px', color: '#FEF08A', margin: '0 0 4px 0', fontWeight: '800' }}>সান্দিকোনা স্কুল এন্ড কলেজ</h3>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>এস এস সি ব্যাচ ২০১৪ • সান্দিকোনা, কেন্দুয়া, নেত্রকোনা</p>
        </div>

        <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => setAppStage('signup')} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            নতুন অ্যাকাউন্ট তৈরি করুন (Sign Up)
          </button>
          <button onClick={() => setAppStage('login')} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '900', cursor: 'pointer' }}>
            আগে থেকেই অ্যাকাউন্ট আছে (Login)
          </button>
        </div>

        <div style={{ fontSize: '11px', opacity: '0.6' }}>বন্ধুত্বের বন্ধন অটুট থাকুক আজীবন।</div>
      </div>
    );
  }

  // PHASE 3: LOGIN SCREEN
  if (appStage === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '385px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#581C87', margin: '0 0 6px 0', fontSize: '20px', fontWeight: '900' }}>স্বাগতম ফিরে আসায়!</h2>
          <p style={{ color: '#65676B', fontSize: '12px', margin: '0 0 18px 0' }}>আপনার ইমেইল বা ফোন নম্বর দিয়ে লগইন করুন।</p>
          
          {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px' }}>{authError}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input required type="text" placeholder="ইমেইল অথবা মোবাইল নম্বর" value={emailInput} onChange={e => setEmailInput(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none' }} />
            <input required type="password" placeholder="পাসওয়ার্ড" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px', outline: 'none' }} />
            <button type="submit" disabled={authSubmitting} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '6px' }}>
              {authSubmitting ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
            <button onClick={() => setAppStage('signup')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>নতুন অ্যাকাউন্ট নেই? সাইন আপ করুন</button>
            <br/><br/>
            <button onClick={() => setAppStage('welcome')} style={{ background: 'none', border: 'none', color: '#65676B', cursor: 'pointer' }}>← ফিরে যান</button>
          </div>
        </div>
      </div>
    );
  }

  // PHASE 4: SIGN UP (Step 1)
  if (appStage === 'signup') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '385px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#581C87', margin: '0 0 6px 0', fontSize: '20px', fontWeight: '900' }}>নতুন অ্যাকাউন্ট</h2>
          <p style={{ color: '#65676B', fontSize: '12px', margin: '0 0 18px 0' }}>এসএসসি ২০১৪ ব্যাচ কমিউনিটিতে যুক্ত হোন।</p>
          
          {authError && <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '10px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px' }}>{authError}</div>}

          <form onSubmit={handleSignUpStep1} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input required type="text" placeholder="আপনার পূর্ণ নাম *" value={fullNameInput} onChange={e => setFullNameInput(e.target.value)} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="email" placeholder="ইমেইল এড্রেস *" value={emailInput} onChange={e => setEmailInput(e.target.value)} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="tel" placeholder="মোবাইল নম্বর (017XXXXXXXX) *" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="password" placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            <input required type="password" placeholder="কনফার্ম পাসওয়ার্ড *" value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)} style={{ padding: '11px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '13px' }} />
            
            <button type="submit" disabled={authSubmitting} style={{ background: '#10B981', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '6px' }}>
              {authSubmitting ? 'প্রসেসিং...' : 'পরবর্তী ধাপ (প্রোফাইল)'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
            <button onClick={() => setAppStage('login')} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন</button>
          </div>
        </div>
      </div>
    );
  }

  // PHASE 5: COMPLETE PROFILE GATE (Step 2 to 4)
  if (appStage === 'complete_profile') {
    return (
      <div style={{ minHeight: '100vh', background: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#581C87', margin: '0 0 4px 0', fontSize: '18px', fontWeight: '900' }}>প্রোফাইল তথ্য পূরণ করুন</h2>
          <p style={{ color: '#65676B', fontSize: '11px', margin: '0 0 16px 0' }}>সান্দিকোনা স্কুল এন্ড কলেজ • এসএসসি ব্যাচ ২০১৪</p>

          <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Avatar Upload */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E2E8F0', margin: '0 auto 6px auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #7C3AED' }}>
                {avatarPreview ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
              </div>
              <label style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 'bold', cursor: 'pointer' }}>
                প্রোফাইল ছবি আপলোড করুন
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }}>পূর্ণ নাম:</label>
              <input type="text" value={fullNameInput} onChange={e => setFullNameInput(e.target.value)} placeholder="আপনার নাম" style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginTop: '2px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }}>জন্মতারিখ:</label>
                <input type="date" value={dobInput} onChange={e => setDobInput(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginTop: '2px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }}>লিঙ্গ:</label>
                <select value={genderInput} onChange={e => setGenderInput(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginTop: '2px', background: '#fff' }}>
                  <option value="পুরুষ">পুরুষ</option>
                  <option value="মহিলা">মহিলা</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }}>পেশা / বর্তমান অবস্থান:</label>
              <input type="text" placeholder="উদাঃ চাকরিজীবী / ঢাকা" value={professionInput} onChange={e => setProfessionInput(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginTop: '2px' }} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }}>নিজ গ্রাম / এলাকা:</label>
              <input type="text" placeholder="উদাঃ সান্দিকোনা" value={locationInput} onChange={e => setLocationInput(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginTop: '2px' }} />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#4B5563' }}>বায়ো (সংক্ষিপ্ত পরিচিতি):</label>
              <textarea rows={2} placeholder="স্কুল জীবন বা বর্তমান নিয়ে কিছু লিখুন..." value={bioInput} onChange={e => setBioInput(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', marginTop: '2px' }} />
            </div>

            <button type="submit" disabled={authSubmitting} style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
              {authSubmitting ? 'সেভ হচ্ছে...' : 'প্রোফাইল সেভ করে প্রবেশ করুন 🚀'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PHASE 6: MAIN APP
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '90px', margin: 0, color: '#1C1E21' }}>
      
      {/* 🌟 Top Header */}
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
          <span style={{ fontSize: '18px', cursor: 'pointer' }} onClick={() => setActiveTab('chat')}>💬</span>
          {userProfile && (
            <div onClick={() => setActiveTab('profile')} style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', border: '2px solid #fff', overflow: 'hidden' }}>
              {userProfile.profileImage ? <img src={userProfile.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userProfile.fullName.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '10px' }}>
        
        {/* HOMEPAGE */}
        {activeTab === 'home' && (
          <div>
            {/* School Welcome Banner */}
            <div style={{ backgroundImage: "linear-gradient(135deg, rgba(88, 28, 135, 0.85) 0%, rgba(124, 58, 237, 0.85) 100%), url('/header-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '16px', padding: '18px', color: '#fff', textAlign: 'center', marginBottom: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 10px', borderRadius: '10px', color: '#FEF08A', fontWeight: 'bold' }}>স্বাগতম</span>
              <h2 style={{ fontSize: '20px', margin: '6px 0 2px 0', fontWeight: '900' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', opacity: 0.95, fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
              <span style={{ fontSize: '11px', color: '#E9D5FF' }}>📍 সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</span>
            </div>

            {/* Post Composer */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E4E6EB' }}>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!currentUser || !userProfile || !newPostText.trim()) return;
                await addDoc(collection(db, "posts"), {
                  authorUid: currentUser.uid,
                  authorName: userProfile.fullName,
                  authorVillage: userProfile.village || userProfile.currentLocation,
                  content: newPostText.trim(),
                  likes: [],
                  commentsCount: 0,
                  timestamp: Date.now(),
                  dateStr: new Date().toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                });
                setNewPostText('');
              }}>
                <textarea rows={2} placeholder={userProfile?.fullName + ", কিছু লিখুন..."} value={newPostText} onChange={e => setNewPostText(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #CCD0D5', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F0F2F5' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>পোস্ট করুন</button>
                </div>
              </form>
            </div>

            {/* News Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {posts.map(post => (
                <div key={post.id} style={{ background: '#fff', borderRadius: '14px', padding: '12px', border: '1px solid #E4E6EB' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#050505' }}>{post.authorName} <span style={{ fontSize: '9px', color: '#65676B' }}>({post.authorVillage})</span></h4>
                  <p style={{ fontSize: '12px', color: '#1C1E21', margin: '6px 0' }}>{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Profile Page */}
        {activeTab === 'profile' && userProfile && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#7C3AED', color: '#fff', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', overflow: 'hidden' }}>
              {userProfile.profileImage ? <img src={userProfile.profileImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userProfile.fullName.charAt(0)}
            </div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#0F172A' }}>{userProfile.fullName}</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>🏡 গ্রামের বাড়ি: {userProfile.village} • বর্তমান: {userProfile.currentLocation}</p>
            {userProfile.bio && <p style={{ margin: '12px 0', fontSize: '12px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', color: '#334155' }}>{userProfile.bio}</p>}
            <button onClick={handleLogout} style={{ marginTop: '20px', background: '#EF4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>লগআউট করুন</button>
          </div>
        )}

        {activeTab === 'chat' && (
          <ChatRoom currentUser={currentUser} userProfile={{ uid: userProfile?.uid || '', name: userProfile?.fullName || 'সহপাঠী', role: userProfile?.role || 'member' } as any} onOpenAuth={() => {}} />
        )}
      </main>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'space-around', padding: '6px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>🏠</span><span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('profile')} style={{ border: 'none', background: 'none', color: activeTab === 'profile' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>👤</span><span>প্রোফাইল</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#7C3AED' : '#65676B', fontSize: '9px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '16px' }}>💬</span><span>আড্ডা</span>
        </button>
      </nav>
    </div>
  );
}
