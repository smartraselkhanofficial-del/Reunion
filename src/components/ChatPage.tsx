import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  type?: 'text' | 'image' | 'audio';
  mediaPath?: string;
  mediaType?: string;
};

type Props = {
  currentUser: User;
  currentProfile: UserProfile | null;
  friend: UserProfile;
  onBack: () => void;
};

const MEDIA_FUNCTION = 'https://hbuprpgjpwtiqjfgqyai.supabase.co/functions/v1/chat-media';

export default function ChatPage({ currentUser, currentProfile, friend, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState('');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    const loadPrivateMedia = async () => {
      const pending = messages.filter(m => m.mediaPath && !signedUrls[m.mediaPath!]);
      for (const message of pending) {
        try {
          const token = await currentUser.getIdToken();
          const result = await fetch(MEDIA_FUNCTION, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'sign', chatId, friendUid: friend.uid, path: message.mediaPath })
          });
          const data = await result.json();
          if (!result.ok) throw new Error(data.error || 'মিডিয়া দেখা যাচ্ছে না।');
          if (!cancelled && data.signedUrl) setSignedUrls(prev => ({ ...prev, [message.mediaPath!]: data.signedUrl }));
        } catch (error: any) {
          if (!cancelled) setNotice(error?.message || 'ব্যক্তিগত মিডিয়া লোড করা যায়নি।');
        }
      }
    };
    loadPrivateMedia();
    return () => { cancelled = true; };
  }, [messages, chatId, friend.uid, currentUser, signedUrls]);

  const saveMessage = async (type: 'image' | 'audio', path: string, mediaType: string) => {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: currentUser.uid,
      senderName: currentProfile?.fullName || currentProfile?.name || 'বন্ধু',
      text: '',
      timestamp: Date.now(),
      type,
      mediaPath: path,
      mediaType
    });
  };

  const uploadMedia = async (file: File, type: 'image' | 'audio') => {
    if (sending) return;
    setSending(true);
    setNotice('');
    try {
      const token = await currentUser.getIdToken();
      const form = new FormData();
      form.append('action', 'upload');
      form.append('chatId', chatId);
      form.append('friendUid', friend.uid);
      form.append('file', file, file.name || (type === 'image' ? 'photo' : 'voice'));
      const result = await fetch(MEDIA_FUNCTION, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || 'ফাইল পাঠানো যায়নি।');
      await saveMessage(type, data.path, data.type || file.type);
      setSignedUrls(prev => ({ ...prev, [data.path]: data.signedUrl }));
    } catch (error: any) {
      setNotice(error?.message || 'মিডিয়া পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setSending(false);
    }
  };

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

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setNotice('এই ফোনের অ্যাপে ভয়েস রেকর্ডিং সমর্থিত নয়।');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => setNotice('ভয়েস রেকর্ড করা যায়নি।');
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        const rawMime = recorder.mimeType || 'audio/webm';
        const mimeType = rawMime.split(';')[0].trim().toLowerCase();
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) {
          setNotice('রেকর্ডিংয়ে কোনো শব্দ পাওয়া যায়নি। আবার রেকর্ড করুন।');
          return;
        }
        const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
        setNotice('ভয়েস মেসেজ পাঠানো হচ্ছে...');
        await uploadMedia(file, 'audio');
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setNotice('রেকর্ডিং চলছে। শেষ হলে আবার মাইক্রোফোন বাটনে চাপ দিন।');
    } catch {
      setNotice('মাইক্রোফোন ব্যবহারের অনুমতি দিন, তারপর আবার চেষ্টা করুন।');
    }
  };

  const stopVoiceRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  };

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

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
          const mediaUrl = message.mediaPath ? signedUrls[message.mediaPath] : '';
          return <div key={message.id} style={{ alignSelf:mine?'flex-end':'flex-start', maxWidth:'82%', background:mine?'#6D28D9':'#fff', color:mine?'#fff':'#1F2937', padding:'9px 12px', borderRadius:mine?'14px 14px 3px 14px':'14px 14px 14px 3px', boxShadow:'0 1px 3px rgba(0,0,0,.08)', fontSize:14 }}>
            {!mine && <strong style={{ display:'block',fontSize:10,color:'#6D28D9',marginBottom:3 }}>{message.senderName || friend.fullName || friend.name}</strong>}
            {message.type === 'image' && (mediaUrl ? <img src={mediaUrl} alt="চ্যাটের ছবি" style={{ display:'block',maxWidth:'100%',maxHeight:260,borderRadius:9 }} /> : <small>ছবি লোড হচ্ছে...</small>)}
            {message.type === 'audio' && (mediaUrl ? <audio controls src={mediaUrl} style={{ maxWidth:220 }} /> : <small>ভয়েস লোড হচ্ছে...</small>)}
            {(!message.type || message.type === 'text') && <div style={{ whiteSpace:'pre-wrap',overflowWrap:'anywhere' }}>{message.text}</div>}
            <small style={{ display:'block',textAlign:'right',fontSize:9,opacity:.7,marginTop:4 }}>{new Date(message.timestamp).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'})}</small>
          </div>;
        })}
      </div>
      <form onSubmit={sendMessage} style={{ display:'flex',gap:7,padding:10,borderTop:'1px solid #EDE9FE',background:'#fff',alignItems:'center' }}>
        <label title="ছবি পাঠান" style={{ cursor:sending?'default':'pointer',color:'#6D28D9',fontSize:21,opacity:sending?0.5:1 }}>
          📷<input type="file" accept="image/jpeg,image/png,image/webp" disabled={sending} onChange={event=>{const file=event.target.files?.[0];if(file)uploadMedia(file,'image');event.currentTarget.value='';}} style={{ display:'none' }} />
        </label>
        <button type="button" title={recording?'রেকর্ডিং বন্ধ করুন':'ভয়েস রেকর্ড করুন'} disabled={sending} onClick={recording?stopVoiceRecording:startVoiceRecording} style={{ border:0,background:recording?'#DC2626':'transparent',color:recording?'#fff':'#6D28D9',fontSize:19,borderRadius:20,padding:'5px 8px' }}>{recording?'■':'🎙️'}</button>
        <input value={draft} onChange={event=>setDraft(event.target.value)} placeholder="মেসেজ লিখুন..." style={{ flex:1,minWidth:0,border:'1px solid #DDD6FE',borderRadius:22,padding:'11px 14px',outline:'none',fontSize:14 }} />
        <button type="submit" disabled={sending || !draft.trim()} style={{ border:0,borderRadius:22,padding:'0 14px',height:40,background:'#6D28D9',color:'#fff',fontWeight:700,opacity:(sending || !draft.trim()) ? 0.5 : 1 }}>{sending?'...':'পাঠান'}</button>
      </form>
    </section>
  );
}
