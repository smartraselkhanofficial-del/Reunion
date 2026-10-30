import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc, 
  setDoc 
} from "firebase/firestore";

// ফায়ারবেস কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyBuY0Ns2bX1RlSK8673LnSQWnNpMcEJhRw",
  authDomain: "reunion-2027-4cedf.firebaseapp.com",
  projectId: "reunion-2027-4cedf",
  storageBucket: "reunion-2027-4cedf.firebasestorage.app",
  messagingSenderId: "221061203254",
  appId: "1:221061203254:web:834a0b5f60ced9429adf97"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface Member {
  id: string;
  name: string;
  phone: string;
  tshirt: string;
  area: string;
  createdAt?: any;
}

interface ChatMsg {
  id: string;
  sender: string;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  time: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'register' | 'chat'>('home');
  const [searchQuery, setSearchQuery] = useState('');

  // ডেটাবেস স্টেট
  const [members, setMembers] = useState<Member[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [announcement, setAnnouncement] = useState('পবিত্র ঈদুল আজহা ২০২৭ উপলক্ষে সান্দিকোনা স্কুল এন্ড কলেজের এসএসসি ২০১৪ ব্যাচের পুনর্মিলনী অনুষ্ঠিত হবে। সকল বন্ধুদের রেজিস্ট্রেশন করার অনুরোধ জানানো হচ্ছে।');
  const [isLoading, setIsLoading] = useState(true);

  // গোপন অ্যাডমিন প্যানেল স্টেট
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const ADMIN_PIN = '74798';

  // রেজিস্ট্রেশন ফরম স্টেট
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tshirt, setTshirt] = useState('L');
  const [area, setArea] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // হোয়াটসঅ্যাপ স্টাইল চ্যাট ও মিডিয়া স্টেট
  const [chatUser, setChatUser] = useState(() => localStorage.getItem('sandikona_chat_username') || '');
  const [isJoinedChat, setIsJoinedChat] = useState(() => !!localStorage.getItem('sandikona_chat_username'));
  const [msgInput, setMsgInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // কলিং মোডাল স্টেট (অডিও / ভিডিও)
  const [callingMode, setCallingMode] = useState<'none' | 'audio' | 'video'>('none');

  // ১. ফায়ারবেস থেকে লাইভ মেম্বার, চ্যাট ও এনাউন্সমেন্ট সিঙ্ক
  useEffect(() => {
    // মেম্বার লিস্ট
    const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
      const list: Member[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Member));
      setMembers(list);
      setIsLoading(false);
    }, () => setIsLoading(false));

    // চ্যাট মেসেজ
    const unsubChat = onSnapshot(collection(db, "messages"), (snap) => {
      const msgs: ChatMsg[] = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as ChatMsg));
      msgs.sort((a, b) => (a.id > b.id ? 1 : -1));
      setChatMessages(msgs);
    });

    // লাইভ স্ক্রলিং নোটিশ
    const unsubNotice = onSnapshot(doc(db, "settings", "announcement"), (d) => {
      if (d.exists() && d.data()?.text) {
        setAnnouncement(d.data().text);
      }
    });

    return () => {
      unsubMembers();
      unsubChat();
      unsubNotice();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  // গোপন অ্যাডমিন প্যানেল ট্রিগার (৩ বার ক্লিক)
  const handleAdminTrigger = () => {
    const next = clickCount + 1;
    if (next >= 3) {
      setClickCount(0);
      setShowAdmin(true);
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  // অ্যাডমিন কর্তৃক লাইভ স্ক্রলিং নোটিশ আপডেট
  const handleUpdateNotice = async () => {
    if (!newNoticeInput.trim()) return;
    try {
      await setDoc(doc(db, "settings", "announcement"), { text: newNoticeInput.trim() });
      setAnnouncement(newNoticeInput.trim());
      setNewNoticeInput('');
      alert('সফলভাবে লাইভ এনাউন্সমেন্ট নোটিশ আপডেট করা হয়েছে!');
    } catch (err) {
      alert('নোটিশ আপডেট করতে ব্যর্থ হয়েছে।');
    }
  };

  // মেম্বার রেজিস্ট্রেশন হ্যান্ডলার (ডুপ্লিকেট সুরক্ষা সহ)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsSubmitting(true);

    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 11) {
      setRegError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      setIsSubmitting(false);
      return;
    }

    const exists = members.some(m => m.phone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
    if (exists) {
      setRegError('⚠️ এই নম্বর দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে! একজন বন্ধু একবারই নিবন্ধন করতে পারবেন।');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "members"), {
        name: name.trim(),
        phone: cleanPhone,
        batch: '2014',
        tshirt,
        area: area.trim() || 'সান্দিকোনা, কেন্দুয়া',
        createdAt: new Date().toISOString()
      });

      setRegSuccess(true);
      setName('');
      setPhone('');
      setArea('');
    } catch (err: any) {
      setRegError('ক্লাউডে সংরক্ষণ করতে ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ চেক করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ফাইল / ছবি / ভিডিও সিলেক্ট হ্যান্ডলার
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('অনুগ্রহ করে ২.৫ মেগাবাইটের কম সাইজের ছবি বা ভিডিও সিলেক্ট করুন।');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile({
        url: reader.result as string,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // চ্যাট মেসেজ ও ফাইল পাঠানো
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() && !attachedFile) return;

    const payload: any = {
      sender: chatUser || 'এসএসসি ২০১৪ বন্ধু',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    if (msgInput.trim()) payload.text = msgInput.trim();
    if (attachedFile) {
      payload.fileUrl = attachedFile.url;
      payload.fileType = attachedFile.type;
    }

    try {
      await addDoc(collection(db, "messages"), payload);
      setMsgInput('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  // সর্বজনীন অ্যাপ শেয়ার অপশন
  const handleShareApp = async () => {
    const shareData = {
      title: 'পুনর্মিলনী ২০২৭ - এসএসসি ব্যাচ ২০১৪',
      text: 'সান্দিকোনা স্কুল এন্ড কলেজের এসএসসি ব্যাচ ২০১৪-এর পুনর্মিলনী ২০২৭ অফিসিয়াল অ্যাপে যুক্ত হোন ও রেজিস্ট্রেশন করুন!',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share dismissed');
      }
    } else {
      navigator.clipboard.writeText(`${shareData.text} \nডাউনলোড লিংক: ${window.location.href}`);
      alert('অ্যাপের লিংক ও দাওয়াত কপি করা হয়েছে! বন্ধুদের হোয়াটসঅ্যাপ বা মেসেঞ্জারে পাঠিয়ে দিন।');
    }
  };

  const filteredMembers = members.filter(m => {
    return m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           m.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.phone.includes(searchQuery);
  });

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#F0F4F2',
      minHeight: '100vh',
      color: '#1A2E22',
      paddingBottom: '80px',
      margin: 0
    }}>
      
      {/* ১. প্রিমিয়াম হেডার ব্যানার */}
      <header style={{
        background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 60%, #083E24 100%)',
        color: '#FFFFFF',
        padding: '20px 16px 14px 16px',
        textAlign: 'center',
        boxShadow: '0 4px 16px rgba(10, 77, 46, 0.25)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <span style={{
            fontSize: '11px',
            backgroundColor: 'rgba(212, 175, 55, 0.25)',
            color: '#FDE68A',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            fontWeight: '700'
          }}>
            সান্দিকোনা স্কুল এন্ড কলেজ
          </span>
          <h1 style={{ fontSize: '24px', margin: '8px 0 2px 0', fontWeight: '800' }}>
            পুনর্মিলনী ২০২৭
          </h1>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.95, fontWeight: '600' }}>
            শুধুমাত্র এসএসসি ব্যাচ ২০১৪
          </p>
          <div style={{
            marginTop: '6px',
            display: 'inline-block',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#E2E8F0'
          }}>
            🤝 আয়োজনে: এসএসসি ২০১৪ ব্যাচ
          </div>
        </div>
      </header>

      {/* ২. লাইভ স্ক্রলিং এনাউন্সমেন্ট বার (ব্রেকিং নিউজ টিকার) */}
      <div style={{
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        borderBottom: '2px solid #D4AF37'
      }}>
        <span style={{
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          fontSize: '10px',
          fontWeight: '800',
          padding: '3px 8px',
          borderRadius: '4px',
          marginRight: '10px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          📢 নোটিশ:
        </span>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
          <marquee behavior="scroll" direction="left" scrollamount="5" style={{ fontSize: '12px', color: '#FEF08A', fontWeight: '500' }}>
            {announcement}
          </marquee>
        </div>
      </div>

      {/* ৩. মূল বডি কনটেন্ট */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '14px' }}>

        {/* ক. ড্যাশবোর্ড ট্যাব */}
        {activeTab === 'home' && (
          <div>
            {/* এসএসসি ২০১৪ লাইভ নিবন্ধিত কাউন্টার */}
            <div style={{
              background: '#FFFFFF',
              padding: '18px',
              borderRadius: '20px',
              border: '1px solid #BBF7D0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              textAlign: 'center',
              marginBottom: '14px'
            }}>
              <span style={{ fontSize: '13px', color: '#137547', fontWeight: '700' }}>এসএসসি ব্যাচ ২০১৪</span>
              <h2 style={{ fontSize: '32px', margin: '6px 0 2px 0', color: '#0A4D2E', fontWeight: '800' }}>
                {isLoading ? '...' : `${members.length} জন`}
              </h2>
              <span style={{ fontSize: '11px', color: '#64748B' }}>সরাসরি নিবন্ধিত সহপাঠী বন্ধু</span>
            </div>

            {/* বন্ধুদের সাথে অ্যাপ শেয়ার কার্ড */}
            <div style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              color: '#FFFFFF',
              padding: '16px',
              borderRadius: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              boxShadow: '0 4px 14px rgba(15,23,42,0.15)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#38BDF8' }}>📲 বন্ধুদের অ্যাপটি শেয়ার করুন</h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#CBD5E1' }}>হোয়াটসঅ্যাপ, ফেসবুক ও মেসেঞ্জারে লিংক পাঠান</p>
              </div>
              <button
                onClick={handleShareApp}
                style={{
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                শেয়ার করুন
              </button>
            </div>

            {/* ইভেন্ট বিবরণী */}
            <div style={{
              background: '#FFFFFF',
              padding: '20px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0A4D2E', fontWeight: '700' }}>📅 পুনর্মিলনীর সময় ও ভেন্যু</h3>
                <span style={{ fontSize: '10px', backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 8px', borderRadius: '8px', fontWeight: '700' }}>নির্ধারিত</span>
              </div>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#334155' }}>
                📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ
              </p>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#137547', fontWeight: '700' }}>
                ⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭
              </p>
              <p style={{ fontSize: '12px', margin: '6px 0', color: '#64748B' }}>
                কেন্দুয়া, নেত্রকোনা, বাংলাদেশ
              </p>

              <button
                onClick={() => setActiveTab('register')}
                style={{
                  width: '100%',
                  marginTop: '14px',
                  background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                📝 এখনই নিজের নাম নিবন্ধন করুন
              </button>
            </div>
          </div>
        )}

        {/* খ. সহপাঠী ডিরেক্টরি ট্যাব */}
        {activeTab === 'directory' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 নাম, এলাকা বা ফোন দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#137547', fontWeight: '700', marginBottom: '10px' }}>
              মোট সহপাঠী: {filteredMembers.length} জন
            </div>

            {filteredMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: '#FFFFFF', borderRadius: '16px', color: '#64748B' }}>কোনো সহপাঠী পাওয়া যায়নি।</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredMembers.map((m) => (
                  <div key={m.id} style={{
                    background: '#FFFFFF',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#0F172A', fontWeight: '700' }}>{m.name}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#137547', fontWeight: '600' }}>
                        এসএসসি ২০১৪ • <span style={{ color: '#64748B', fontWeight: '400' }}>{m.area}</span>
                      </p>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>জার্সি: <strong>{m.tshirt}</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a
                        href={`tel:${m.phone}`}
                        style={{
                          background: '#DCFCE7',
                          color: '#137547',
                          textDecoration: 'none',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      >
                        📞 কল
                      </a>
                      <a
                        href={`https://wa.me/88${m.phone.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#25D366',
                          color: '#FFFFFF',
                          textDecoration: 'none',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* গ. এসএসসি ২০১৪ রেজিস্ট্রেশন ফরম */}
        {activeTab === 'register' && (
          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0A4D2E', fontSize: '18px', fontWeight: '700' }}>📝 এসএসসি ২০১৪ নিবন্ধন ফরম</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>সতর্কতা: একজন ব্যক্তি একটি মোবাইল নম্বর দিয়ে একবারই নিবন্ধন করতে পারবেন।</p>

            {regError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }}>
                {regError}
              </div>
            )}

            {regSuccess ? (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', padding: '20px', borderRadius: '16px', textAlign: 'center', color: '#137547' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>🎉 অভিনন্দন! নিবন্ধন সফল হয়েছে</h3>
                <p style={{ margin: 0, fontSize: '13px' }}>আপনার তথ্য কেন্দ্রীয় ক্লাউড ডেটাবেসে সংরক্ষিত হয়েছে।</p>
                <button onClick={() => { setRegSuccess(false); setActiveTab('directory'); }} style={{ marginTop: '14px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                  সহপাঠী তালিকায় দেখুন
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>আপনার পুরো নাম: *</label>
                  <input required type="text" placeholder="উদাঃ মোঃ রাসেল মিয়া" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>মোবাইল নম্বর (যোগাযোগের জন্য): *</label>
                  <input required type="tel" placeholder="017XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>এলাকার নাম লিখুন: *</label>
                  <input required type="text" placeholder="উদাঃ সান্দিকোনা / কেন্দুয়া / ঢাকা" value={area} onChange={e => setArea(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>টি-শার্ট সাইজ (পুনর্মিলনী জার্সির মাপ): *</label>
                  <select value={tshirt} onChange={e => setTshirt(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', background: '#FFFFFF', outline: 'none' }}>
                    <option value="M">Medium (M - ৩৮)</option>
                    <option value="L">Large (L - ৪০)</option>
                    <option value="XL">Extra Large (XL - ৪২)</option>
                    <option value="XXL">Double XL (XXL - ৪৪)</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} style={{ background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 100%)', color: '#FFFFFF', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '700', fontSize: '15px', marginTop: '6px', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন নিশ্চিত করুন'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ঘ. হোয়াটসঅ্যাপ স্টাইল আড্ডা (অডিও/ভিডিও কল ও ফটো/ভিডিও আপলোড সহ) */}
        {activeTab === 'chat' && (
          <div style={{
            background: '#EFEAE2',
            borderRadius: '20px',
            border: '1px solid #CBD5E1',
            height: '74vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            {/* হোয়াটসঅ্যাপ স্টাইল চ্যাট হেডার */}
            <div style={{
              padding: '10px 14px',
              background: '#075E54',
              color: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  👥
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>এসএসসি ২০১৪ আড্ডা</h4>
                  <span style={{ fontSize: '10px', color: '#D1FAE5' }}>অনলাইন গ্রুপ কল ও চ্যাট</span>
                </div>
              </div>

              {/* কলিং বাটনসমূহ (অডিও ও ভিডিও কল) */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCallingMode('audio')}
                  title="১০০ জনের অডিও কল"
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  📞 অডিও
                </button>
                <button
                  onClick={() => setCallingMode('video')}
                  title="১০০ জনের ভিডিও কল"
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  📹 ভিডিও
                </button>
              </div>
            </div>

            {!isJoinedChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', marginBottom: '10px' }}>
                  💬
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>আড্ডায় যুক্ত হতে আপনার নাম দিন</h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>নামটি দিয়ে প্রবেশ করলেই সবার সাথে চ্যাট ও ফটো শেয়ার করতে পারবেন।</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (chatUser.trim()) {
                    localStorage.setItem('sandikona_chat_username', chatUser.trim());
                    setIsJoinedChat(true);
                  }
                }} style={{ width: '100%', maxWidth: '280px' }}>
                  <input
                    required
                    type="text"
                    placeholder="আপনার নাম লিখুন..."
                    value={chatUser}
                    onChange={(e) => setChatUser(e.target.value)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '10px', textAlign: 'center', outline: 'none' }}
                  />
                  <button type="submit" style={{ width: '100%', background: '#075E54', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    👉 আড্ডায় প্রবেশ করুন
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* মেসেজ তালিকা ভিউপোর্ট */}
                <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {chatMessages.map((m) => {
                    const isMe = m.sender === chatUser;
                    return (
                      <div key={m.id} style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        backgroundColor: isMe ? '#E7FFDB' : '#FFFFFF',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                        position: 'relative'
                      }}>
                        {!isMe && (
                          <span style={{ fontSize: '10px', color: '#075E54', fontWeight: '700', display: 'block', marginBottom: '3px' }}>
                            {m.sender}
                          </span>
                        )}

                        {/* যদি কোনো ছবি থাকে */}
                        {m.fileUrl && m.fileType?.startsWith('image') && (
                          <img src={m.fileUrl} alt="Attached" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '4px', display: 'block' }} />
                        )}

                        {/* যদি কোনো ভিডিও থাকে */}
                        {m.fileUrl && m.fileType?.startsWith('video') && (
                          <video src={m.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', marginBottom: '4px', display: 'block' }} />
                        )}

                        {/* যদি অন্যান্য ফাইল হয় */}
                        {m.fileUrl && !m.fileType?.startsWith('image') && !m.fileType?.startsWith('video') && (
                          <a href={m.fileUrl} download="shared-file" style={{ display: 'inline-block', fontSize: '11px', color: '#0284C7', marginBottom: '4px', textDecoration: 'underline' }}>
                            📎 ফাইল ডাউনলোড করুন
                          </a>
                        )}

                        {m.text && <p style={{ margin: 0, fontSize: '13px', color: '#1E293B', wordBreak: 'break-word' }}>{m.text}</p>}
                        <span style={{ fontSize: '9px', color: '#94A3B8', float: 'right', marginTop: '3px', marginLeft: '8px' }}>
                          {m.time} {isMe ? '✓✓' : ''}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* ফাইল সিলেক্ট প্রিভিউ বক্স */}
                {attachedFile && (
                  <div style={{ padding: '6px 12px', background: '#F1F5F9', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                      📎 প্রস্তুত ফাইল: {attachedFile.name}
                    </span>
                    <button onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                      বাতিল
                    </button>
                  </div>
                )}

                {/* হোয়াটসঅ্যাপ স্টাইল ইনপুট ও অ্যাটাচমেন্ট বার */}
                <form onSubmit={handleSendChat} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: '#F0F2F5', borderTop: '1px solid #CBD5E1', gap: '6px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="ছবি বা ভিডিও সংযুক্ত করুন"
                    style={{ border: 'none', background: '#E2E8F0', padding: '8px 10px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}
                  >
                    📎
                  </button>

                  <input
                    type="text"
                    placeholder="মেসেজ লিখুন..."
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                  />
                  <button type="submit" style={{ background: '#075E54', color: '#FFFFFF', border: 'none', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    ➤
                  </button>
                </form>
              </>
            )}
          </div>
        )}

      </main>

      {/* ৪. অডিও / ভিডিও লাইভ কলিং মোডাল */}
      {callingMode !== 'none' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', background: '#0F172A', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>
              {callingMode === 'video' ? '📹 এসএসসি ২০১৪ লাইভ ভিডিও রুম' : '📞 এসএসসি ২০১৪ লাইভ অডিও রুম'}
            </span>
            <button
              onClick={() => setCallingMode('none')}
              style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
            >
              কল শেষ করুন
            </button>
          </div>
          <iframe
            src={`https://meet.jit.si/SandikonaSSC2014Conference#config.startWithVideoMuted=${callingMode === 'audio'}&config.prejoinPageEnabled=false`}
            allow="microphone; camera; autoplay; display-capture"
            style={{ width: '100%', flex: 1, border: 'none' }}
            title="SSC 2014 Live Call"
          />
        </div>
      )}

      {/* ৫. ফুটার (এখানে ৩ বার টাচ করলে গোপন অ্যাডমিন প্যানেল খুলবে) */}
      <footer style={{ maxWidth: '520px', margin: '14px auto', padding: '0 16px' }}>
        <div 
          onClick={handleAdminTrigger}
          style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer', userSelect: 'none' }}
        >
          <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#137547', fontWeight: '700' }}>
            📱 অ্যাপটি তৈরি করেছেন: স্মার্ট রাসেল খান (লুকানো অ্যাডমিন)
          </p>
          <p style={{ margin: '2px 0', fontSize: '11px', color: '#334155' }}>
            সরাসরি যোগাযোগ: <a href="tel:01705374798" style={{ color: '#0A4D2E', fontWeight: '700', textDecoration: 'none' }}>01705374798</a>
          </p>
          <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', padding: '4px 10px', borderRadius: '20px', border: '1px solid #86EFAC' }}>
            <span style={{ fontSize: '10px', color: '#166534', fontWeight: '700' }}>হটলাইন ও সার্বিক সহযোগিতা:</span>
            <a href="https://wa.me/8801951695069" style={{ fontSize: '10px', color: '#137547', textDecoration: 'none', fontWeight: '700' }}>
              WhatsApp 01951695069
            </a>
            <span style={{ fontSize: '10px', color: '#64748B' }}>বা</span>
            <a href="tel:01951695069" style={{ fontSize: '10px', color: '#0A4D2E', textDecoration: 'none', fontWeight: '700' }}>কল</a>
          </div>
        </div>
      </footer>

      {/* ৬. প্রিমিয়াম বটম বার (অডিও ট্যাব বাদ দিয়ে সহজ ৪টি বাটন) */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0',
        zIndex: 1000,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.05)'
      }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'home' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🏠</span>
          <span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'directory' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>👥</span>
          <span>সহপাঠী</span>
        </button>
        <button onClick={() => setActiveTab('register')} style={{ border: 'none', background: 'none', color: activeTab === 'register' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'register' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>📝</span>
          <span>নিবন্ধন</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'chat' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>💬</span>
          <span>আড্ডা</span>
        </button>
      </nav>

      {/* ৭. গোপন অ্যাডমিন প্যানেল মোডাল */}
      {showAdmin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '17px', fontWeight: '700' }}>👑 গোপন অ্যাডমিন কন্ট্রোল</h3>
              <button onClick={() => { setShowAdmin(false); setIsAdminLoggedIn(false); setAdminPin(''); }} style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>বন্ধ করুন</button>
            </div>

            {!isAdminLoggedIn ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>সম্মানিত আয়োজক (স্মার্ট রাসেল খান), আপনার ৫ ডিজিটের সিক্রেট পিন দিন:</p>
                <input
                  type="password"
                  placeholder="সিক্রেট পিন"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  style={{ width: '65%', padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', textAlign: 'center', fontSize: '16px', letterSpacing: '4px', marginBottom: '14px', outline: 'none' }}
                />
                <br />
                <button
                  onClick={() => {
                    if (adminPin === ADMIN_PIN) {
                      setIsAdminLoggedIn(true);
                    } else {
                      alert('ভুল সিক্রেট পিন!');
                    }
                  }}
                  style={{ background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div>
                {/* লাইভ এনাউন্সমেন্ট নোটিশ এডিটর */}
                <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '14px', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#0F172A' }}>📢 লাইভ স্ক্রলিং নোটিশ আপডেট করুন:</h4>
                  <textarea
                    rows={2}
                    placeholder="নতুন নোটিশ এখানে লিখুন..."
                    value={newNoticeInput}
                    onChange={e => setNewNoticeInput(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                  />
                  <button
                    onClick={handleUpdateNotice}
                    style={{ marginTop: '8px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    নোটিশ পাবলিশ করুন
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#137547' }}>মোট নিবন্ধিত: {members.length} জন</span>
                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,নাম,মোবাইল,ব্যাচ,জার্সি সাইজ,ঠিকানা\n" + 
                        members.map(e => `"${e.name}","${e.phone}","২০১৪","${e.tshirt}","${e.area}"`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Sandikona_SSC_2014_Members.csv");
                      document.body.appendChild(link);
                      link.click();
                    }}
                    style={{ background: '#137547', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    📥 এক্সেল ডাউনলোড
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map((m, idx) => (
                    <div key={m.id} style={{ padding: '10px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{idx + 1}. {m.name} (এসএসসি ১৪)</strong>
                        <span style={{ color: '#0A4D2E', fontWeight: '700' }}>জার্সি: {m.tshirt}</span>
                      </div>
                      <div style={{ color: '#475569', marginTop: '3px' }}>
                        মোবাইল: <a href={`tel:${m.phone}`} style={{ color: '#0284C7', fontWeight: '700' }}>{m.phone}</a> | {m.area}
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                        <a href={`tel:${m.phone}`} style={{ textDecoration: 'none', background: '#DCFCE7', color: '#137547', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>📞 কল</a>
                        <a href={`https://wa.me/88${m.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#25D366', color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>💬 হোয়াটসঅ্যাপ</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
