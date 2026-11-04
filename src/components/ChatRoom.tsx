import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  setDoc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase";
import { UserProfile, ChatMsg } from "../types";

interface ChatRoomProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  recipientUser?: UserProfile | null;
  onBack?: () => void;
  onOpenAuth: () => void;
}

export default function ChatRoom({ currentUser, userProfile, recipientUser, onBack, onOpenAuth }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState<string | null>(null);
  const typingTimerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ১-অন-১ চ্যাট নাকি ব্যাচ গ্রুপ চ্যাট নির্ধারণ
  const isPrivate = !!recipientUser;
  const convoId = isPrivate && currentUser
    ? [currentUser.uid, recipientUser.uid].sort().join("_")
    : "batch_2014_public";

  // মেসেজ লিসেনার
  useEffect(() => {
    const qMessages = query(
      collection(db, "conversations", convoId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(qMessages, (snap) => {
      const list: ChatMsg[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ChatMsg));
      setMessages(list);
    });

    // টাইপিং লিসেনার
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

    return () => {
      unsub();
      unsubTyping();
    };
  }, [convoId, userProfile?.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // মেসেজ পাঠানো
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, "conversations", convoId, "messages"), {
        sender: userProfile.name,
        senderUid: currentUser.uid,
        text: textToSend,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      // টাইপিং স্ট্যাটাস ক্লিয়ার
      setDoc(doc(db, "conversations", convoId, "typing", "status"), { user: null, time: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  // টাইপিং ব্রডকাস্ট
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
      
      {/* হেডার বার */}
      <div style={{ background: '#075E54', color: '#FFFFFF', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPrivate && onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer', paddingRight: '4px' }}>
              ←
            </button>
          )}
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
            {isPrivate ? '👤' : '👥'}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800' }}>
              {isPrivate ? recipientUser?.name : 'এসএসসি ২০১৪ ব্যাচ আড্ডা'}
            </h4>
            <span style={{ fontSize: '10px', color: '#D1FAE5' }}>
              {otherUserTyping ? ('✍️ ' + otherUserTyping + ' লিখছেন...') : (isPrivate ? ('🏡 ' + (recipientUser?.village || recipientUser?.area)) : 'অনলাইন চ্যাট')}
            </span>
          </div>
        </div>
      </div>

      {/* মেসেজ এরিয়া */}
      {!currentUser ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 10px 0' }}>চ্যাটে কথা বলতে প্রথমে অ্যাকাউন্টে লগইন করুন।</p>
          <button onClick={onOpenAuth} style={{ background: '#075E54', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            লগইন করুন
          </button>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.length === 0 ? (
              <span style={{ fontSize: '11px', color: '#64748B', textAlign: 'center', margin: 'auto' }}>
                কোনো মেসেজ নেই। সালাম দিয়ে কথোপকথন শুরু করুন!
              </span>
            ) : (
              messages.map(m => {
                const isMe = m.senderUid === currentUser.uid;
                return (
                  <div key={m.id} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    backgroundColor: isMe ? '#DCF8C6' : '#FFFFFF',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {!isMe && !isPrivate && (
                      <span style={{ fontSize: '10px', color: '#075E54', fontWeight: '800', display: 'block', marginBottom: '2px' }}>
                        {m.sender}
                      </span>
                    )}
                    <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', wordBreak: 'break-word' }}>{m.text}</p>
                    <span style={{ fontSize: '9px', color: '#94A3B8', float: 'right', marginTop: '2px', marginLeft: '6px' }}>
                      {m.time} <span style={{ color: '#34B7F1' }}>✓✓</span>
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ইনপুট বক্স */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '8px', background: '#F0F2F5', borderTop: '1px solid #CBD5E1', gap: '6px' }}>
            <input
              type="text"
              placeholder="মেসেজ লিখুন..."
              value={inputText}
              onChange={handleInputChange}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
            />
            <button type="submit" style={{ background: '#075E54', color: '#FFFFFF', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ➤
            </button>
          </form>
        </>
      )}
    </div>
  );
}
