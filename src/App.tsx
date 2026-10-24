import React, { useState, useEffect } from 'react';

// ============================================================================
// 🔥 আপনার ফ্রি ক্লাউড ডাটাবেস লিংক (এখানে আপনার ফায়ারবেস লিংকটি বসান)
// ============================================================================
const FIREBASE_DB_URL = 'https://reunion2027-default-rtdb.firebaseio.com'; 

interface RegisteredMember {
  id: string;
  name: string;
  phone: string;
  batch: string;
  tshirt: string;
  area: string;
  regDate: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'register' | 'chat' | 'audio'>('home');
  const [batchFilter, setBatchFilter] = useState<'all' | '2014' | '2016'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ক্লাউড মেম্বার ও চ্যাট স্টেট
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // গোপন অ্যাডমিন প্যানেল স্টেট
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const ADMIN_SECRET_PIN = '74798'; // স্মার্ট রাসেল খানের সিক্রেট পিন

  // রেজিস্ট্রেশন ফর্ম স্টেট
  const [regForm, setRegForm] = useState({ name: '', phone: '', batch: '2014', tshirt: 'L', area: '' });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // চ্যাট স্টেট
  const [isJoinedChat, setIsJoinedChat] = useState(false);
  const [chatUserName, setChatUserName] = useState('');
  const [inputMsg, setInputMsg] = useState('');

  // অডিও রুম
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  const JITSI_AUDIO_ROOM_URL = 'https://meet.jit.si/SandikonaReunion2027Audio100#config.startWithVideoMuted=true&config.prejoinPageEnabled=false';

  // -------------------------------------------------------------
  // ১. ক্লাউড থেকে সব ফোনের ডাটা প্রতি ৫ সেকেন্ড পর পর অটো-সিঙ্ক
  // -------------------------------------------------------------
  const syncFromCloud = async () => {
    if (!FIREBASE_DB_URL || FIREBASE_DB_URL.includes('default-rtdb.firebaseio.com')) {
      // যদি ইউজার লিংক না বসায়, লোকাল ডাটা দেখাবে
      const local = localStorage.getItem('sandikona_members_backup');
      if (local && members.length === 0) setMembers(JSON.parse(local));
      setIsLoading(false);
      return;
    }

    try {
      // ক্লাউড থেকে সব মেম্বার আনা
      const resMembers = await fetch(`${FIREBASE_DB_URL}/members.json`);
      const dataMembers = await resMembers.json();
      if (dataMembers) {
        const loaded: RegisteredMember[] = Object.keys(dataMembers).map(key => ({
          id: key,
          ...dataMembers[key]
        })).reverse();
        setMembers(loaded);
        localStorage.setItem('sandikona_members_backup', JSON.stringify(loaded));
      }

      // ক্লাউড থেকে চ্যাট মেসেজ আনা
      const resChat = await fetch(`${FIREBASE_DB_URL}/messages.json`);
      const dataChat = await resChat.json();
      if (dataChat) {
        const loadedMsgs: ChatMessage[] = Object.keys(dataChat).map(key => ({
          id: key,
          ...dataChat[key]
        }));
        setMessages(loadedMsgs);
      }
    } catch (err) {
      console.log('Syncing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncFromCloud();
    const interval = setInterval(syncFromCloud, 4000); // প্রতি ৪ সেকেন্ড পর পর লাইভ আপডেট
    return () => clearInterval(interval);
  }, []);

  // গোপন অ্যাডমিন প্যানেল ট্রিগার (৩ বার ক্লিক)
  const handleSecretAdminTrigger = () => {
    const nextCount = adminClickCount + 1;
    if (nextCount >= 3) {
      setAdminClickCount(0);
      setShowAdminModal(true);
    } else {
      setAdminClickCount(nextCount);
      setTimeout(() => setAdminClickCount(0), 2000);
    }
  };

  // -------------------------------------------------------------
  // ২. ক্লাউড ডাটাবেসে রিয়েল রেজিস্ট্রেশন জমা দেওয়া
  // -------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsSubmitting(true);

    const cleanPhone = regForm.phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 11) {
      setRegError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      setIsSubmitting(false);
      return;
    }

    // ক্লাউডে ডুপ্লিকেট নম্বর চেক
    const isDuplicate = members.some(m => m.phone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
    if (isDuplicate) {
      setRegError('⚠️ এই মোবাইল নম্বর দিয়ে ইতোমধ্যেই রেজিস্ট্রেশন সম্পন্ন হয়েছে! একজন একবারের বেশি নিবন্ধন করতে পারবেন না।');
      setIsSubmitting(false);
      return;
    }

    const newMemberData = {
      name: regForm.name.trim(),
      phone: cleanPhone,
      batch: regForm.batch,
      tshirt: regForm.tshirt,
      area: regForm.area.trim() || 'সান্দিকোনা, কেন্দুয়া',
      regDate: new Date().toLocaleDateString('bn-BD')
    };

    try {
      if (FIREBASE_DB_URL && !FIREBASE_DB_URL.includes('default-rtdb.firebaseio.com')) {
        // সরাসরি ক্লাউডে POST রিকোয়েস্ট (সবার ফোনে চলে যাবে)
        await fetch(`${FIREBASE_DB_URL}/members.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMemberData)
        });
        await syncFromCloud();
      } else {
        // ফলব্যাক লোকাল
        const fallback = [{ id: Date.now().toString(), ...newMemberData }, ...members];
        setMembers(fallback);
        localStorage.setItem('sandikona_members_backup', JSON.stringify(fallback));
      }

      setRegSuccess(true);
      setRegForm({ name: '', phone: '', batch: '2014', tshirt: 'L', area: '' });
    } catch (error) {
      setRegError('ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ৩. ক্লাউডে চ্যাট মেসেজ পাঠানো
  // -------------------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsgObj = {
      sender: chatUserName || 'সহপাঠী',
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      if (FIREBASE_DB_URL && !FIREBASE_DB_URL.includes('default-rtdb.firebaseio.com')) {
        await fetch(`${FIREBASE_DB_URL}/messages.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsgObj)
        });
        syncFromCloud();
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), ...newMsgObj }]);
      }
      setInputMsg('');
    } catch (err) {
      console.log(err);
    }
  };

  const count2014 = members.filter(m => m.batch === '2014').length;
  const count2016 = members.filter(m => m.batch === '2016').length;

  const filteredMembers = members.filter(m => {
    const matchesBatch = batchFilter === 'all' || m.batch === batchFilter;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.area.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBatch && matchesSearch;
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', backgroundColor: '#F8FAF9', color: '#1e293b', paddingBottom: '85px', margin: 0 }}>
      
      {/* ব্যানার */}
      <header style={{ background: 'linear-gradient(135deg, #0D5C3A 0%, #15803d 100%)', color: 'white', padding: '20px 16px', boxShadow: '0 4px 12px rgba(13,92,58,0.2)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', background: 'rgba(212,175,55,0.25)', color: '#fef08a', padding: '4px 14px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.5)', fontWeight: 'bold' }}>
            সান্দিকোনা স্কুল এন্ড কলেজ
          </span>
          <h1 style={{ fontSize: '24px', margin: '8px 0 2px 0', fontWeight: '800' }}>পুনর্মিলনী ২০২৭</h1>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.95 }}>এসএসসি ব্যাচ ২০১৪ ও এইচএসসি ব্যাচ ২০১৬</p>
          <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.2)', padding: '2px 10px', borderRadius: '6px', fontSize: '11px', marginTop: '6px' }}>
            🤝 আয়োজনে: এসএসসি ও এইচএসসি ২০১৪ ব্যাচ
          </div>
        </div>
      </header>

      {/* কনটেন্ট ভিউ */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        
        {/* হোম ট্যাব */}
        {activeTab === 'home' && (
          <div>
            {/* লাইভ সদস্য কাউন্টার */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এসএসসি ২০১৪</span>
                <h3 style={{ fontSize: '26px', margin: '4px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>
                  {isLoading ? '...' : `${count2014} জন`}
                </h3>
                <span style={{ fontSize: '10px', color: '#64748b' }}>সরাসরি নিবন্ধিত</span>
              </div>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এইচএসসি ২০১৬</span>
                <h3 style={{ fontSize: '26px', margin: '4px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>
                  {isLoading ? '...' : `${count2016} জন`}
                </h3>
                <span style={{ fontSize: '10px', color: '#64748b' }}>সরাসরি নিবন্ধিত</span>
              </div>
            </div>

            {/* ভেন্যু ও তারিখ */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0D5C3A', fontWeight: 'bold' }}>📅 পুনর্মিলনীর সময় ও ভেন্যু</h3>
                <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>চূড়ান্ত</span>
              </div>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#334155' }}>📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ</p>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#15803d', fontWeight: 'bold' }}>⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭</p>
              <p style={{ fontSize: '12px', margin: '6px 0', color: '#64748b' }}>আয়োজক: এসএসসি ও এইচএসসি ২০১৪ ব্যাচ পুনর্মিলনী সংসদ</p>
              
              <button 
                onClick={() => setActiveTab('register')}
                style={{ width: '100%', marginTop: '12px', background: '#0D5C3A', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
              >
                📝 রেজিস্ট্রেশন ফরম পূরণ করুন
              </button>
            </div>

            {/* ১০০ জনের অডিও রুম */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#38bdf8' }}>🎙️ ১০০ জনের লাইভ অডিও আড্ডা</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>একসাথে ১০০ জন সরাসরি কথা বলতে পারবেন</p>
              </div>
              <button 
                onClick={() => setActiveTab('audio')}
                style={{ background: '#0284c7', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                রুম খুলুন
              </button>
            </div>
          </div>
        )}

        {/* সহপাঠী ডিরেক্টরি */}
        {activeTab === 'directory' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 সহপাঠীর নাম বা এলাকা দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setBatchFilter('all')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === 'all' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === 'all' ? 'white' : '#475569', cursor: 'pointer' }}>সব ব্যাচ ({members.length})</button>
              <button onClick={() => setBatchFilter('2014')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === '2014' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === '2014' ? 'white' : '#475569', cursor: 'pointer' }}>এসএসসি ২০১৪ ({count2014})</button>
              <button onClick={() => setBatchFilter('2016')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === '2016' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === '2016' ? 'white' : '#475569', cursor: 'pointer' }}>এইচএসসি ২০১৬ ({count2016})</button>
            </div>

            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#fff', borderRadius: '16px' }}>
                এখনো কোনো সহপাঠী নিবন্ধিত হয়নি। প্রথম নিবন্ধনটি আপনিই করুন!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredMembers.map((m) => (
                  <div key={m.id} style={{ background: '#fff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', color: '#0f172a' }}>{m.name}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>{m.batch === '2014' ? 'এসএসসি ২০১৪' : 'এইচএসসি ২০১৬'} • <span style={{ color: '#64748b', fontWeight: 'normal' }}>{m.area}</span></p>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>টি-শার্ট: <strong>{m.tshirt}</strong></span>
                    </div>
                    <a 
                      href={`tel:${m.phone}`}
                      style={{ background: '#dcfce7', color: '#15803d', textDecoration: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      📞 কল
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* রেজিস্ট্রেশন ফরম */}
        {activeTab === 'register' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0D5C3A', fontSize: '18px' }}>📝 পুনর্মিলনী ২০২৭ নিবন্ধন ফরম</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>সতর্কতা: একজন ব্যক্তি শুধুমাত্র একবারই নিবন্ধন করতে পারবেন।</p>

            {regError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }}>
                {regError}
              </div>
            )}

            {regSuccess ? (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#15803d' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>🎉 অভিনন্দন! আপনার রেজিস্ট্রেশন সম্পন্ন হয়েছে</h3>
                <p style={{ margin: 0, fontSize: '13px' }}>আপনার তথ্য কেন্দ্রীয় ক্লাউড ডাটাবেসে সংরক্ষিত হয়েছে।</p>
                <button onClick={() => { setRegSuccess(false); setActiveTab('directory'); }} style={{ marginTop: '14px', background: '#0D5C3A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  সহপাঠী তালিকায় দেখুন
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>আপনার পুরো নাম: *</label>
                  <input required type="text" placeholder="উদাঃ মোঃ রাসেল মিয়া" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>মোবাইল নম্বর (লগইন ও যোগাযোগের জন্য): *</label>
                  <input required type="tel" placeholder="017XXXXXXXX" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>আপনার ব্যাচ নির্বাচন করুন: *</label>
                  <select value={regForm.batch} onChange={e => setRegForm({...regForm, batch: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="2014">এসএসসি ব্যাচ ২০১৪</option>
                    <option value="2016">এইচএসসি ব্যাচ ২০১৬</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>বর্তমান বাসস্থান বা কর্মস্থল:</label>
                  <input type="text" placeholder="উদাঃ সান্দিকোনা / কেন্দুয়া / ঢাকা" value={regForm.area} onChange={e => setRegForm({...regForm, area: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>টি-শার্ট সাইজ (জার্সির মাপ): *</label>
                  <select value={regForm.tshirt} onChange={e => setRegForm({...regForm, tshirt: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="M">Medium (M - ৩৮)</option>
                    <option value="L">Large (L - ৪০)</option>
                    <option value="XL">Extra Large (XL - ৪২)</option>
                    <option value="XXL">Double XL (XXL - ৪৪)</option>
                  </select>
                </div>
                <button type="submit" disabled={isSubmitting} style={{ background: '#0D5C3A', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', marginTop: '6px', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন নিশ্চিত করুন'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* চ্যাটরুম */}
        {activeTab === 'chat' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', height: '68vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0D5C3A' }}>💬 লাইভ আড্ডা রুম</span>
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>সবার ফোনে সিঙ্ক</span>
            </div>

            {!isJoinedChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px' }}>লাইভ আড্ডায় জয়েন করুন</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>চ্যাটে কথা বলার জন্য আপনার নাম লিখে জয়েন বাটনে চাপ দিন।</p>
                <form onSubmit={(e) => { e.preventDefault(); if (chatUserName.trim()) setIsJoinedChat(true); }} style={{ width: '100%', maxWidth: '300px' }}>
                  <input
                    required
                    type="text"
                    placeholder="আপনার নাম লিখুন..."
                    value={chatUserName}
                    onChange={(e) => setChatUserName(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '10px', textAlign: 'center' }}
                  />
                  <button type="submit" style={{ width: '100%', background: '#0D5C3A', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                    👉 চ্যাটে জয়েন করুন
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.map((m, idx) => (
                    <div key={idx} style={{ alignSelf: m.sender === chatUserName ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>{m.sender}</span>
                      <div style={{ background: m.sender === chatUserName ? '#0D5C3A' : '#f1f5f9', color: m.sender === chatUserName ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: '14px', fontSize: '13px' }}>
                        {m.text}
                      </div>
                      <span style={{ fontSize: '9px', color: '#cbd5e1', float: 'right', marginTop: '2px' }}>{m.time}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <input
                    type="text"
                    placeholder="মেসেজ লিখুন..."
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  <button type="submit" style={{ marginLeft: '8px', background: '#0D5C3A', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                    পাঠান
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* ১০০ জনের অডিও রুম */}
        {activeTab === 'audio' && (
          <div style={{ background: '#0f172a', color: 'white', borderRadius: '20px', padding: '16px', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>🎙️ ১০০ জনের লাইভ অডিও রুম</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>সবাই সরাসরি কথা বলতে ও শুনতে পারবেন</span>
              </div>
              <span style={{ background: '#10b981', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>অনলাইন</span>
            </div>

            {!isAudioConnected ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '50px', marginBottom: '10px' }}>🎧</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>ভয়েস আড্ডায় যুক্ত হতে চান?</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                  নিচের বাটনে চাপ দিলে লাইভ অডিও রুম কানেক্ট হবে এবং ১০০ জন সহপাঠী একসাথে কথা বলতে পারবেন।
                </p>
                <button
                  onClick={() => setIsAudioConnected(true)}
                  style={{ background: '#0284c7', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                >
                  🟢 অডিও রুমে প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                <iframe
                  src={JITSI_AUDIO_ROOM_URL}
                  allow="microphone; camera; autoplay; display-capture"
                  style={{ width: '100%', height: '52vh', border: 'none', borderRadius: '12px', backgroundColor: '#000' }}
                  title="Audio Room"
                />
                <button
                  onClick={() => setIsAudioConnected(false)}
                  style={{ marginTop: '10px', background: '#dc2626', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🚪 অডিও রুম থেকে বের হন
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ফুটার (এখানে ৩ বার ক্লিক করলেই গোপন অ্যাডমিন প্যানেল খুলবে) */}
      <footer style={{ maxWidth: '600px', margin: '16px auto', padding: '0 16px' }}>
        <div 
          onClick={handleSecretAdminTrigger}
          style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer', userSelect: 'none' }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>
            📱 অ্যাপটি তৈরি করেছেন: স্মার্ট রাসেল খান (লুকানো অ্যাডমিন)
          </p>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#334155' }}>
            সরাসরি যোগাযোগ: <a href="tel:01705374798" style={{ color: '#0D5C3A', fontWeight: 'bold', textDecoration: 'none' }}>01705374798</a>
          </p>
          <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', padding: '6px 12px', borderRadius: '20px', border: '1px solid #86efac' }}>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>হটলাইন ও সার্বিক সহযোগিতা:</span>
            <a href="https://wa.me/8801951695069" style={{ fontSize: '11px', color: '#15803d', textDecoration: 'none', fontWeight: 'bold' }}>
              WhatsApp 01951695069
            </a>
            <span style={{ fontSize: '11px', color: '#64748b' }}>বা</span>
            <a href="tel:01951695069" style={{ fontSize: '11px', color: '#0D5C3A', textDecoration: 'none', fontWeight: 'bold' }}>কল</a>
          </div>
        </div>
      </footer>

      {/* পাবলিক বটম বার (অ্যাডমিন বাটন সম্পূর্ণ লুকানো) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'home' ? 'bold' : 'normal', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>🏠</span>
          <span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'directory' ? 'bold' : 'normal', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>👥</span>
          <span>সহপাঠী</span>
        </button>
        <button onClick={() => setActiveTab('register')} style={{ border: 'none', background: 'none', color: activeTab === 'register' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'register' ? 'bold' : 'normal', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>📝</span>
          <span>নিবন্ধন</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'chat' ? 'bold' : 'normal', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>💬</span>
          <span>আড্ডা</span>
        </button>
        <button onClick={() => setActiveTab('audio')} style={{ border: 'none', background: 'none', color: activeTab === 'audio' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'audio' ? 'bold' : 'normal', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>🎙️</span>
          <span>অডিও</span>
        </button>
      </nav>

      {/* গোপন অ্যাডমিন ড্যাশবোর্ড মোডাল */}
      {showAdminModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#0D5C3A', fontSize: '17px' }}>👑 গোপন অ্যাডমিন ড্যাশবোর্ড</h3>
              <button onClick={() => { setShowAdminModal(false); setIsAdminAuthenticated(false); setAdminPinInput(''); }} style={{ border: 'none', background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>বন্ধ করুন</button>
            </div>

            {!isAdminAuthenticated ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>সম্মানিত মালিক (স্মার্ট রাসেল খান), আপনার ৫ ডিজিটের সিক্রেট পিন দিন:</p>
                <input
                  type="password"
                  placeholder="সিক্রেট পিন (74798)"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  style={{ width: '70%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '16px', letterSpacing: '4px', marginBottom: '14px' }}
                />
                <br />
                <button
                  onClick={() => {
                    if (adminPinInput === ADMIN_SECRET_PIN) {
                      setIsAdminAuthenticated(true);
                    } else {
                      alert('ভুল সিক্রেট পিন!');
                    }
                  }}
                  style={{ background: '#0D5C3A', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#15803d' }}>ক্লাউডে মোট নিবন্ধিত: {members.length} জন</span>
                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,নাম,মোবাইল,ব্যাচ,জার্সি সাইজ,ঠিকানা\n" + 
                        members.map(e => `"${e.name}","${e.phone}","${e.batch}","${e.tshirt}","${e.area}"`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Reunion_2027_All_Members.csv");
                      document.body.appendChild(link);
                      link.click();
                    }}
                    style={{ background: '#15803d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    📥 এক্সেল ডাউনলোড
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {members.map((m, idx) => (
                    <div key={m.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{idx + 1}. {m.name} ({m.batch === '2014' ? 'এসএসসি ১৪' : 'এইচএসসি ১৬'})</strong>
                        <span style={{ color: '#0D5C3A', fontWeight: 'bold' }}>টি-শার্ট: {m.tshirt}</span>
                      </div>
                      <div style={{ color: '#475569', marginTop: '3px' }}>
                        মোবাইল: <a href={`tel:${m.phone}`} style={{ color: '#0284c7', fontWeight: 'bold' }}>{m.phone}</a> | {m.area}
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                        <a href={`tel:${m.phone}`} style={{ textDecoration: 'none', background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>📞 সরাসরি কল</a>
                        <a href={`https://wa.me/88${m.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#25D366', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>💬 হোয়াটসঅ্যাপ</a>
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
