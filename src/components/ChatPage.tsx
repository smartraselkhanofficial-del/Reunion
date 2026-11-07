import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { UserProfile } from '../types';

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
};

type Props = {
  currentUser: User;
  currentProfile: UserProfile | null;
  friend: UserProfile;
  onBack: () => void;
};

export default function ChatPage({ currentUser, currentProfile, friend, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const chatId = useMemo(
    () => [currentUser.uid, friend.uid].sort().join('__'),
    [currentUser.uid, friend.uid]
  );

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(messagesQuery, snapshot => {
      setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Message)));
      setNotice('');
    }, error => {
      setNotice(error.code === 'permission-denied'
        ? 'চ্যাট ব্যবহারের Firestore অনুমতি নেই। ডেটাবেস Rules আপডেট করতে হবে।'
        : 'মেসেজ লোড করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
    });
    return unsubscribe;
  }, [chatId]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setNotice('');
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        senderName: currentProfile?.fullName || currentProfile?.name || 'বন্ধু',
        text,
        timestamp: Date.now(),
        type: 'text'
      });
      setDraft('');
    } catch (error: any) {
      setNotice(error?.code === 'permission-denied'
        ? 'মেসেজ পাঠানোর অনুমতি নেই। Firestore Rules আপডেট করতে হবে।'
        : 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setSending(false);
    }
  };

  return (
    <section style={{ background:'#fff', borderRadius:16, overflow:'hidden', border:'1px solid #E9D5FF', minHeight:'70vh', display:'flex', flexDirection:'column' }}>
      <header style={{ background:'linear-gradient(135deg,#4C1D95,#6D28D9)', color:'#fff', padding:'12px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ border:0, background:'transparent', color:'#fff', fontSize:22, padding:'2px 8px' }}>‹</button>
        <div style={{ width:38, height:38, borderRadius:'50%', overflow:'hidden', background:'#A78BFA', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>
          {friend.profileImage ? <img src={friend.profileImage} alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : (friend.fullName || friend.name || 'ব').charAt(0)}
        </div>
        <div><strong style={{ display:'block',fontSize:14 }}>{friend.fullName || friend.name || 'বন্ধু'}</strong><small style={{ color:'#E9D5FF' }}>ব্যক্তিগত চ্যাট</small></div>
      </header>
      {notice && <div style={{ margin:10, padding:9, borderRadius:8, background:'#FEF2F2', color:'#B91C1C', fontSize:12 }}>{notice}</div>}
      <div style={{ flex:1, padding:12, display:'flex', flexDirection:'column', gap:8, overflowY:'auto', background:'#F8F7FC' }}>
        {messages.length === 0 && <p style={{ textAlign:'center', color:'#64748B', fontSize:13, marginTop:35 }}>এখনো কোনো মেসেজ নেই। কথা শুরু করুন।</p>}
        {messages.map(message => {
          const mine = message.senderId === currentUser.uid;
          return <div key={message.id} style={{ alignSelf:mine?'flex-end':'flex-start', maxWidth:'82%', background:mine?'#6D28D9':'#fff', color:mine?'#fff':'#1F2937', padding:'9px 12px', borderRadius:mine?'14px 14px 3px 14px':'14px 14px 14px 3px', boxShadow:'0 1px 3px rgba(0,0,0,.08)', fontSize:14 }}>
            {!mine && <strong style={{ display:'block',fontSize:10,color:'#6D28D9',marginBottom:3 }}>{message.senderName || friend.fullName || friend.name}</strong>}
            <div style={{ whiteSpace:'pre-wrap',overflowWrap:'anywhere' }}>{message.text}</div>
            <small style={{ display:'block',textAlign:'right',fontSize:9,opacity:.7,marginTop:4 }}>{new Date(message.timestamp).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'})}</small>
          </div>;
        })}
      </div>
      <form onSubmit={sendMessage} style={{ display:'flex',gap:8,padding:10,borderTop:'1px solid #EDE9FE',background:'#fff' }}>
        <input value={draft} onChange={event=>setDraft(event.target.value)} placeholder="মেসেজ লিখুন..." style={{ flex:1,minWidth:0,border:'1px solid #DDD6FE',borderRadius:22,padding:'11px 14px',outline:'none',fontSize:14 }} />
        <button type="submit" disabled={sending || !draft.trim()} style={{ border:0,borderRadius:22,padding:'0 18px',background:'#6D28D9',color:'#fff',fontWeight:700,opacity:sending||!draft.trim()?.5:1 }}>{sending?'...':'পাঠান'}</button>
      </form>
    </section>
  );
}
