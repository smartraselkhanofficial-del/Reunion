import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, getDoc, deleteDoc, query, orderBy, where, limit } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem, PostComment, StoryItem, FriendRequest } from "./types";
import ChatRoom from "./components/ChatRoom"; // নতুন যুক্ত করা চ্যাট ফাইল

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'profile' | 'friends' | 'chat'>('home');
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

  // চ্যাটের জন্য নতুন স্টেট
  const [privateChatRecipient, setPrivateChatRecipient] = useState<UserProfile | null>(null);

  // Social Feed States
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsList, setCommentsList] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [myFriends, setMyFriends] = useState<string[]>([]);

  // ফায়ারবেস লিসেনার
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
        });

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
        setMyFriends([]);
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

    return () => { unsubscribe(); unsubUsers(); };
  }, []);

  // কমেন্ট লিসেনার
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
    const currentLikes = post.likes || [];
    const isLiked = currentLikes.includes(currentUser.uid);
    const updatedLikes = isLiked ? currentLikes.filter(uid => uid !== currentUser.uid) : [...currentLikes, currentUser.uid];
    try { await setDoc(doc(db, "posts", post.id), { likes: updatedLikes }, { merge: true }); } catch (e) {}
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
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

  // প্রাইভেট চ্যাট শুরু করার ফাংশন
  const startPrivateChat = (member: UserProfile) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    setPrivateChatRecipient(member);
    setActiveTab('chat');
  };

  if (userProfile && userProfile.status === 'pending' && userProfile.role !== 'super_admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F3F6F4' }}>
        <h2>⏳ অ্যাকাউন্ট অনুমোদনের অপেক্ষায়</h2>
        <button onClick={handleLogout} style={{ background: '#0A4D2E', color: '#fff', padding: '10px 20px', borderRadius: '10px' }}>লগআউট করুন</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#F3F6F4', minHeight: '100vh', paddingBottom: '85px', margin: 0, userSelect: 'none' }}>
      
      {/* Top Nav */}
      <div style={{ background: '#0A4D2E', color: '#fff', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Reunion 2027</h2>
        <button onClick={currentUser ? handleLogout : () => setShowAuthModal(true)} style={{ background: currentUser ? '#EF4444' : '#10B981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
          {currentUser ? 'লগআউট' : 'লগইন'}
        </button>
      </div>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '14px' }}>
        
        {/* ==========================================
            🏠 Home (Social Feed) 
            ========================================== */}
        {activeTab === 'home' && (
          <div>
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
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleToggleLike(post)} style={{ flex: 1, background: isLiked ? '#FEE2E2' : '#F8FAFC', color: isLiked ? '#DC2626' : '#475569', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold' }}>{isLiked ? '❤️ লাইকড' : '🤍 লাইক'} ({post.likes.length})</button>
                      <button onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)} style={{ flex: 1, background: '#F8FAFC', color: '#475569', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold' }}>💬 কমেন্ট ({post.commentsCount})</button>
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

        {/* ==========================================
            👥 Directory & Chat Initiate 
            ========================================== */}
        {activeTab === 'directory' && (
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#0A4D2E', fontWeight: 'bold' }}>👥 সহপাঠী ডিরেক্টরি</h3>
            <input type="text" placeholder="নাম দিয়ে খুঁজুন..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '12px', boxSizing: 'border-box' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allUsers.filter(u => u.status === 'approved' && u.name.includes(searchQuery)).map(m => (
                <div key={m.uid} style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#0F172A' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>🏡 {m.village}</p>
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

        {/* ==========================================
            💬 Chat Engine (Group & Private) 
            ========================================== */}
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
            <h3 style={{ margin: '0 0 12px 0', color: '#0A4D2E' }}>লগইন করুন</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input required type="tel" placeholder="মোবাইল নম্বর *" value={authPhone} onChange={e => setAuthPhone(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <input required type="password" placeholder="পাসওয়ার্ড *" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1' }} />
              <button type="submit" style={{ background: '#0A4D2E', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>লগইন করুন</button>
            </form>
            <button onClick={() => setShowAuthModal(false)} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#DC2626', width: '100%' }}>বাতিল</button>
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
      </nav>
    </div>
  );
}
