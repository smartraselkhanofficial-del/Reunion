import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment, MemoryItem, BatchPrideItem, TeacherItem, ChatMsg, ActiveCall, EventRegistration } from "./types";
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
  const [authTshirt, setAuthTshirt] = useState('L');
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

  // অ্যাডমিন প্যানেল
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon: string } | null>(null);

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

    // Phase 5: ইভেন্ট রেজিস্ট্রেশন লিসেনার
    const unsubEvents = onSnapshot(collection(db, "event_registrations"), (snap) => {
      const list: EventRegistration[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as EventRegistration));
      setEventRegs(list);
    });

    return () => { unsubscribe(); unsubUsers(); unsubEvents(); };
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

  const handleLogout = async () => { if (window.confirm("লগআউট করতে চান?")) { await signOut(auth); setActiveTab('home'); } };

  // ==========================================
  // 📝 Phase 5: Event Registration Actions
  // ==========================================
  const handleEventRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    try {
      await setDoc(doc(db, "event_registrations", currentUser.uid), {
        uid: currentUser.uid,
        name: userProfile.name,
        phone: userProfile.phone,
        tshirt: userProfile.tshirt,
        guestCount: eventGuestCount,
        paymentStatus: 'unpaid',
        timestamp: Date.now()
      });
      setShowEventRegModal(false);
      triggerNativeNotification("সফল!", "পুনর্মিলনী ইভেন্টে আপনার প্রাথমিক রেজিস্ট্রেশন সম্পন্ন হয়েছে।", "🎉");
    } catch (e) {
      alert("রেজিস্ট্রেশনে সমস্যা হয়েছে।");
    }
  };

  const handlePaymentStatus = async (uid: string, status: 'unpaid' | 'paid') => {
    if (userProfile?.role !== 'super_admin') return;
    try {
      await setDoc(doc(db, "event_registrations", uid), { paymentStatus: status }, { merge: true });
    } catch (e) {}
  };

  // সোশ্যাল পোস্ট
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
    if (!currentUser || !userProfile) return;
    if (!commentInput.trim()) return;
    try {
      await addDoc(collection(db, "posts", postId, "comments"), { authorName: userProfile.name, authorUid: currentUser.uid, text: commentInput.trim(), timestamp: Date.now() });
      const targetPost = posts.find(p => p.id === postId);
      if (targetPost) await setDoc(doc(db, "posts", postId), { commentsCount: (targetPost.commentsCount || 0) + 1 }, { merge: true });
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

  const triggerNativeNotification = (title: string, body: string, icon = '🔔') => {
    setActiveToast({ title, body, icon });
    setTimeout(() => setActiveToast(null), 4000);
  };

  const hasRegisteredForEvent = currentUser ? eventRegs.some(r => r.uid === currentUser.uid) : false;
  const myEventReg = currentUser ? eventRegs.find(r => r.uid === currentUser.uid) : null;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#F3F6F4', minHeight: '100vh', paddingBottom: '85px', margin: 0, userSelect: 'none' }}>
      
      {activeToast && (
        <div style={{ position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '460px', backgroundColor: '#0F172A', color: '#fff', padding: '12px', borderRadius: '12px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px' }}>{activeToast.icon}</div>
          <div><h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#FCD34D' }}>{activeToast.title}</h5><p style={{ margin: 0, fontSize: '11px' }}>{activeToast.body}</p></div>
        </div>
      )}

      <div style={{ background: '#062B1A', color: '#E2E8F0', padding: '6px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        {currentUser && userProfile ? (
          <span style={{ color: '#10B981', fontWeight: 'bold' }}>● {userProfile.name}</span>
        ) : (
          <span style={{ color: '#FCD34D' }}>⚠️ লগইন করা নেই</span>
        )}
        <button onClick={currentUser ? handleLogout : () => { setAuthMode('login'); setShowAuthModal(true); }} style={{ background: currentUser ? '#EF4444' : '#10B981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {currentUser ? 'লগআউট' : 'লগইন'}
        </button>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '14px' }}>
        
        {/* ==========================================
            🏠 Home (Social Feed & Event Card) 
            ========================================== */}
        {activeTab === 'home' && (
          <div>
            {/* Phase 5: Reunion Event Card */}
            <div style={{ background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)', borderRadius: '16px', padding: '16px', marginBottom: '16px', color: '#fff', boxShadow: '0 4px 12px rgba(10, 77, 46, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>আসন্ন ইভেন্ট</span>
                  <h3 style={{ margin: '6px 0 2px 0', fontSize: '18px', fontWeight: '900', color: '#FEF08A' }}>পুনর্মিলনী ২০২৭</h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>স্থান: সান্দিকোনা স্কুল এন্ড কলেজ</p>
                </div>
                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '900', display: 'block' }}>{eventRegs.length}</span>
                  <span style={{ fontSize: '9px' }}>জন কনফার্ম</span>
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                {hasRegisteredForEvent ? (
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>✓ আপনার রেজিস্ট্রেশন সম্পন্ন হয়েছে</span>
                    <span style={{ fontSize: '10px', background: myEventReg?.paymentStatus === 'paid' ? '#10B981' : '#F59E0B', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      {myEventReg?.paymentStatus === 'paid' ? 'পেমেন্ট ক্লিয়ার' : 'পেমেন্ট বাকি'}
                    </span>
                  </div>
                ) : (
                  <button onClick={() => { if(!currentUser) {setShowAuthModal(true); return;} setShowEventRegModal(true); }} style={{ width: '100%', background: '#FEF08A', color: '#0A4D2E', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>
                    📝 ইভেন্টে রেজিস্ট্রেশন করুন
                  </button>
                )}
              </div>
            </div>

            {/* Create Post Box */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '12px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <form onSubmit={handleCreatePost}>
                <textarea rows={3} placeholder={currentUser ? `${userProfile?.name}, কিছু শেয়ার করুন...` : "পোস্ট করতে লগইন করুন..."} value={newPostText} onChange={e => setNewPostText(e.target.value)} disabled={!currentUser} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button type="submit" disabled={isPosting || !currentUser} style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                    {isPosting ? 'পোস্ট হচ্ছে...' : 'পোস্ট করুন'}
                  </button>
                </div>
              </form>
            </div>

            {/* Newsfeed Posts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map(post => {
                const isLiked = currentUser && post.likes.includes(currentUser.uid);
                return (
                  <div key={post.id} style={{ background: '#fff', borderRadius: '16px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#137547', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{post.authorName.charAt(0)}</div>
                        <div><h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>{post.authorName}</h4><span style={{ fontSize: '10px', color: '#64748B' }}>{post.dateStr}</span></div>
                      </div>
                      {(currentUser?.uid === post.authorUid || userProfile?.role === 'super_admin') && <button onClick={() => handleDeletePost(post.id, post.authorUid)} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '16px' }}>🗑️</button>}
                    </div>
                    
                    <p style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-line', margin: '0 0 12px 0' }}>{post.content}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '8px' }}>
                      <span>❤️ {post.likes.length} লাইক</span>
                      <span>💬 {post.commentsCount} কমেন্ট</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleToggleLike(post)} style={{ flex: 1, background: isLiked ? '#FEE2E2' : '#F8FAFC', color: isLiked ? '#DC2626' : '#475569', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold' }}>
                        {isLiked ? '❤️ লাইকড' : '🤍 লাইক'}
                      </button>
                      <button onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)} style={{ flex: 1, background: '#F8FAFC', color: '#475569', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold' }}>
                        💬 কমেন্ট
                      </button>
                    </div>

                    {activeCommentsPostId === post.id && (
                      <div style={{ marginTop: '12px', background: '#F8FAFC', borderRadius: '10px', padding: '10px' }}>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {commentsList.map(c => <div key={c.id} style={{ background: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }}><strong style={{ color: '#0A4D2E' }}>{c.authorName}: </strong>{c.text}</div>)}
                        </div>
                        <form onSubmit={(e) => handleAddComment(e, post.id)} style={{ display: 'flex', gap: '6px' }}>
                          <input type="text" placeholder="মন্তব্য লিখুন..." value={commentInput} onChange={e => setCommentInput(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '20px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
                          <button type="submit" style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>পাঠান</button>
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
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0A4D2E', fontWeight: 'bold' }}>👥 সহপাঠী ডিরেক্টরি</h3>
            <input type="text" placeholder="নাম দিয়ে খুঁজুন..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '12px', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'approved' && u.name.includes(searchQuery)).map(m => (
                <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village} • জার্সি: {m.tshirt}</p>
                  </div>
                  {m.uid !== currentUser?.uid && (
                    <button onClick={() => startPrivateChat(m)} style={{ background: '#128C7E', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
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

      {/* Event Registration Modal */}
      {showEventRegModal && userProfile && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '360px' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#0A4D2E', fontSize: '17px', fontWeight: '900' }}>পুনর্মিলনী ২০২৭ নিবন্ধন</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>আপনার অংশগ্রহণ নিশ্চিত করুন।</p>
            
            <form onSubmit={handleEventRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E293B' }}>আপনার নাম:</label>
                <input type="text" value={userProfile.name} disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E293B' }}>টি-শার্ট সাইজ:</label>
                <input type="text" value={userProfile.tshirt} disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E293B' }}>আপনার সাথে কতজন অতিথি (গেস্ট) আসবেন?</label>
                <select value={eventGuestCount} onChange={e => setEventGuestCount(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', marginTop: '4px' }}>
                  <option value={0}>কেউ না (০)</option>
                  <option value={1}>১ জন</option>
                  <option value={2}>২ জন</option>
                  <option value={3}>৩ জন</option>
                </select>
              </div>
              <button type="submit" style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', marginTop: '10px' }}>
                নিবন্ধন কনফার্ম করুন
              </button>
            </form>
            <button onClick={() => setShowEventRegModal(false)} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#DC2626', width: '100%', fontWeight: 'bold' }}>বাতিল</button>
          </div>
        </div>
      )}

      {/* Admin Panel: Event Management */}
      {showAdmin && userProfile?.role === 'super_admin' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '15px', fontWeight: '800' }}>👑 ইভেন্ট ম্যানেজমেন্ট প্যানেল</h3>
              <button onClick={() => setShowAdmin(false)} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '6px' }}>✕</button>
            </div>
            
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0A4D2E' }}>নিবন্ধিত সদস্য ({eventRegs.length} জন):</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {eventRegs.map(r => (
                <div key={r.id} style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold', color: '#0F172A' }}>{r.name}</p>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>গেস্ট: {r.guestCount} | সাইজ: {r.tshirt}</span>
                  </div>
                  <button 
                    onClick={() => handlePaymentStatus(r.id, r.paymentStatus === 'paid' ? 'unpaid' : 'paid')}
                    style={{ background: r.paymentStatus === 'paid' ? '#10B981' : '#E2E8F0', color: r.paymentStatus === 'paid' ? '#fff' : '#475569', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold' }}
                  >
                    {r.paymentStatus === 'paid' ? 'পেমেন্ট ক্লিয়ার ✓' : 'পেমেন্ট বাকি'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>🏠</span><span>ফিড</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>👥</span><span>ডিরেক্টরি</span>
        </button>
        <button onClick={() => { setPrivateChatRecipient(null); setActiveTab('chat'); }} style={{ border: 'none', background: 'none', color: activeTab === 'chat' && !privateChatRecipient ? '#0A4D2E' : '#94A3B8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>💬</span><span>আড্ডা</span>
        </button>
        {userProfile?.role === 'super_admin' && (
          <button onClick={() => setShowAdmin(true)} style={{ border: 'none', background: 'none', color: '#D97706', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '18px' }}>👑</span><span>অ্যাডমিন</span>
          </button>
        )}
      </nav>
    </div>
  );
}
