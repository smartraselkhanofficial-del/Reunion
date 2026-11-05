import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, doc, setDoc, query, orderBy } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase";
import { UserProfile, ChatMsg } from "../types";

interface ChatRoomProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  recipientUser?: UserProfile | null; // যদি প্রাইভেট চ্যাট হয়
  onBack?: () => void;
  onOpenAuth: () => void;
}

export default function ChatRoom({ currentUser, userProfile, recipientUser, onBack, onOpenAuth }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUserTyping, setOtherUserTyping] = useState<string | null>(null);
  
  const typingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // চ্যাটের আইডি নির্ধারণ (গ্রুপ নাকি প্রাইভেট)
  const isPrivate = !!recipientUser;
  const convoId = isPrivate && currentUser 
    ? [currentUser.uid, recipientUser.uid].sort().join("_") 
    : "batch_2014_public";

  // মেসেজ ও টাইপিং লিসেনার
  useEffect(() => {
    const qMessages = query(collection(db, "conversations", convoId, "messages"), orderBy("timestamp", "asc"));
    const unsubMsgs = onSnapshot(qMessages, (snap) => {
      const list: ChatMsg[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ChatMsg));
      setMessages(list);
    });

    const unsubTyping = onSnapshot(doc(db, "conversations", convoId, "typing", "status"), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data?.user && data.user !== userProfile?.name && (Date.now() - data.time < 3000)) {
          setOtherUserTyping(data.user);
        } else {
          setOtherUserTyping(null);
        }
      }
    });

    return () => { unsubMsgs(); unsubTyping(); };
  }, [convoId, userProfile?.name]);

  // নতুন মেসেজ আসলে অটো স্ক্রল
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) { onOpenAuth(); return; }
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, "conversations", convoId, "messages"), {
        sender: userProfile.name,
        senderUid: currentUser.uid,
        text: textToSend,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
      });
      setDoc(doc(db, "conversations", convoId, "typing", "status"), { user: null, time: 0 });
    } catch (err) {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!userProfile) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setDoc(doc(db, "conversations", convoId, "typing", "status"), { user: userProfile.name, time: Date.now() });

    typingTimerRef.current = setTimeout(() => {
      setDoc(doc(db, "conversations", convoId, "typing", "status"), { user: null, time: 0 });
    }, 2500);
  };

  return (
    <div style={{ background: '#E5DDD5', borderRadius: '16px', height: '75vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
      
      {/* চ্যাট হেডার */}
      <div style={{ background: '#075E54', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isPrivate && onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>←</button>
        )}
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
          {isPrivate ? '👤' : '👥'}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            {isPrivate ? recipientUser?.name : 'এসএসসি ২০১৪ ব্যাচ আড্ডা'}
          </h4>
          <span style={{ fontSize: '10px', color: '#D1FAE5' }}>
            {otherUserTyping ? `✍️ ${otherUserTyping} লিখছেন...` : (isPrivate ? 'প্রাইভেট চ্যাট' : 'গ্রুপ চ্যাট')}
          </span>
        </div>
      </div>

      {/* মেসেজ ভিউপোর্ট */}
      <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748B', fontSize: '12px', marginTop: '20px' }}>কোনো মেসেজ নেই। সালাম দিয়ে শুরু করুন!</div>
        ) : (
          messages.map(m => {
            const isMe = currentUser?.uid === m.senderUid;
            return (
              <div key={m.id} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: isMe ? '#DCF8C6' : '#FFFFFF',
                borderRadius: '12px',
                padding: '8px 12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {!isMe && !isPrivate && <span style={{ fontSize: '10px', color: '#075E54', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>{m.sender}</span>}
                <p style={{ margin: 0, fontSize: '13px', color: '#1E293B' }}>{m.text}</p>
                <span style={{ fontSize: '9px', color: '#94A3B8', float: 'right', marginTop: '4px', marginLeft: '8px' }}>{m.time} {isMe && <span style={{ color: '#34B7F1' }}>✓✓</span>}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ইনপুট বক্স */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '10px', background: '#F0F2F5', borderTop: '1px solid #CBD5E1', gap: '8px' }}>
        <input 
          type="text" 
          placeholder="মেসেজ লিখুন..." 
          value={inputText} 
          onChange={handleInputChange} 
          style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }} 
        />
        <button type="submit" style={{ background: '#075E54', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer' }}>➤</button>
      </form>
    </div>
  );
}
