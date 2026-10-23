import React, { useState, useEffect } from 'react';

// সহপাঠীর টাইপ ইন্টারফেস
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
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'register' | 'chat' | 'audio' | 'admin'>('home');
  const [batchFilter, setBatchFilter] = useState<'all' | '2014' | '2016'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // অ্যাডমিন পিন (স্মার্ট রাসেল খানের জন্য গোপন কোড: 74798)
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const ADMIN_SECRET_PIN = '74798'; 

  // রেজিস্ট্রেশন স্টেট ও লোকাল ডাটাবেস হ্যান্ডলার
  const [members, setMembers] = useState<RegisteredMember[]>(() => {
    const saved = localStorage.getItem('reunion_registered_members');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      { id: '1', name: 'স্মার্ট রাসেল খান', phone: '01705374798', batch: '2014', tshirt: 'XL', area: 'সান্দিকোনা, কেন্দুয়া', regDate: 'অ্যাডমিন/আয়োজক' },
      { id: '2', name: 'মোঃ রফিকুল ইসলাম', phone: '01811223344', batch: '2014', tshirt: 'L', area: 'কেন্দুয়া বাজার', regDate: 'আজ' },
      { id: '3', name: 'তানভীর আহমেদ', phone: '01955667788', batch: '2016', tshirt: 'M', area: 'নেত্রকোনা সদর', regDate: 'গতকাল' }
    ];
  });

  const [regForm, setRegForm] = useState({ name: '', phone: '', batch: '2014', tshirt: 'L', area: '' });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // চ্যাট স্টেট
  const [isJoinedChat, setIsJoinedChat] = useState(false);
  const [chatUserName, setChatUserName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'স্মার্ট রাসেল খান (আয়োজক)', text: 'আসসালামু আলাইকুম। সান্দিকোনা স্কুল এন্ড কলেজের সকল বন্ধুদের স্বাগতম!', time: '১০:০০ AM' },
    { id: '2', sender: 'সিস্টেম', text: '📢 পুনর্মিলনী ২০২৭-এর অফিশিয়াল গ্রুপ চ্যাটে আপনাকে স্বাগতম।', time: '১০:০১ AM', isSystem: true }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // ১০০ জনের অডিও রুম স্টেট
  const [isInAudioRoom, setIsInAudioRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [audioParticipants, setAudioParticipants] = useState<string[]>([
    'স্মার্ট রাসেল খান (হোস্ট)', 'মোঃ রফিকুল ইসলাম', 'তানভীর আহমেদ', 'আরিফুল হক'
  ]);

  // ডাটা সেভ রাখা
  useEffect(() => {
    localStorage.setItem('reunion_registered_members', JSON.stringify(members));
  }, [members]);

  // ডুপ্লিকেট চেকিং সহ রেজিস্ট্রেশন সাবমিট
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    // ১. ফোন নম্বর নরমাল করা
    const cleanPhone = regForm.phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 11) {
      setRegError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }

    // ২. ডুপ্লিকেট চেক (একই মোবাইল দিয়ে একাধিকবার রেজিস্ট্রেশন রোধ)
    const alreadyExists = members.some(m => m.phone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
    if (alreadyExists) {
      setRegError('⚠️ এই মোবাইল নম্বর দিয়ে ইতোমধ্যেই রেজিস্ট্রেশন সম্পন্ন হয়েছে! একজন একবারের বেশি নিবন্ধন করতে পারবেন না।');
      return;
    }

    // ৩. নতুন মেম্বার যুক্ত করা
    const newMember: RegisteredMember = {
      id: Date.now().toString(),
      name: regForm.name.trim(),
      phone: cleanPhone,
      batch: regForm.batch,
      tshirt: regForm.tshirt,
      area: regForm.area.trim() || 'সান্দিকোনা, কেন্দুয়া',
      regDate: new Date().toLocaleDateString('bn-BD')
    };

    const updated = [newMember, ...members];
    setMembers(updated);
    setRegSuccess(true);
    setRegForm({ name: '', phone: '', batch: '2014', tshirt: 'L', area: '' });
  };

  // চ্যাটে জয়েন হওয়া
  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatUserName.trim()) return;

    setIsJoinedChat(true);
    // সবার কাছে নোটিফিকেশন মেসেজ
    const joinNotice: ChatMessage = {
      id: Date.now().toString(),
      sender: 'সিস্টেম',
      text: `🎉 সহপাঠী "${chatUserName}" চ্যাটে জয়েন হয়েছেন!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    setMessages(prev => [...prev, joinNotice]);
  };

  // চ্যাট মেসেজ সেন্ড
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newChatMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: chatUserName || 'সহপাঠী',
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newChatMessage]);
    setInputMsg('');
  };

  // অডিও রুমে যুক্ত হওয়া / ত্যাগ করা
  const toggleAudioRoom = () => {
    if (isInAudioRoom) {
      setIsInAudioRoom(false);
      setAudioParticipants(prev => prev.filter(p => p !== (chatUserName || 'আপনি')));
    } else {
      if (audioParticipants.length >= 100) {
        alert('দুঃখিত! এই অডিও রুমটিতে বর্তমানে সর্বোচ্চ ১০০ জন বন্ধু পূর্ণ রয়েছে।');
        return;
      }
      setIsInAudioRoom(true);
      setAudioParticipants(prev => [...prev, chatUserName || 'আপনি']);
    }
  };

  const count2014 = members.filter(m => m.batch === '2014').length;
  const count2016 = members.filter(m => m.batch === '2016').length;

  const filteredMembers = members.filter(m => {
    const matchesBatch = batchFilter === 'all' || m.batch === batchFilter;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.phone.includes(searchQuery);
    return matchesBatch && matchesSearch;
  });

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', backgroundColor: '#F8FAF9', color: '#1e293b', paddingBottom: '90px', margin: 0 }}>
      
      {/* ১. টপ ব্যানার */}
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

      {/* ২. মূল বডি */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        
        {/* ক. ড্যাশবোর্ড ট্যাব */}
        {activeTab === 'home' && (
          <div>
            {/* লাইভ সদস্য কাউন্টার */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এসএসসি ২০১৪</span>
                <h3 style={{ fontSize: '26px', margin: '4px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>{count2014} জন</h3>
                <span style={{ fontSize: '10px', color: '#64748b' }}>সরাসরি নিবন্ধিত</span>
              </div>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এইচএসসি ২০১৬</span>
                <h3 style={{ fontSize: '26px', margin: '4px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>{count2016} জন</h3>
                <span style={{ fontSize: '10px', color: '#64748b' }}>সরাসরি নিবন্ধিত</span>
              </div>
            </div>

            {/* ইভেন্ট বিবরণী কার্ড */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0D5C3A', fontWeight: 'bold' }}>📅 পুনর্মিলনীর সময় ও ভেন্যু</h3>
                <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>নির্ধারিত</span>
              </div>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#334155' }}>📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ</p>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#15803d', fontWeight: 'bold' }}>⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭</p>
              <p style={{ fontSize: '12px', margin: '6px 0', color: '#64748b' }}>আয়োজক কমিটি: এসএসসি ও এইচএসসি ২০১৪ ব্যাচ পুনর্মিলনী সংসদ</p>
              
              <button 
                onClick={() => setActiveTab('register')}
                style={{ width: '100%', marginTop: '12px', background: '#0D5C3A', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
              >
                📝 এখনই নিজের নাম নিবন্ধন করুন
              </button>
            </div>

            {/* ১০০ জনের অডিও রুমের কুইক ব্যানার */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', padding: '16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#fef08a' }}>🎙️ ১০০ জনের লাইভ অডিও রুম</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>বর্তমান আড্ডায় আছেন: {audioParticipants.length}/১০০ জন</p>
              </div>
              <button 
                onClick={() => setActiveTab('audio')}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                রুম খুলুন
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
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* ব্যাচ ফিল্টার */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setBatchFilter('all')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === 'all' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === 'all' ? 'white' : '#475569', cursor: 'pointer' }}>সব ব্যাচ ({members.length})</button>
              <button onClick={() => setBatchFilter('2014')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === '2014' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === '2014' ? 'white' : '#475569', cursor: 'pointer' }}>এসএসসি ২০১৪ ({count2014})</button>
              <button onClick={() => setBatchFilter('2016')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === '2016' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === '2016' ? 'white' : '#475569', cursor: 'pointer' }}>এইচএসসি ২০১৬ ({count2016})</button>
            </div>

            {/* সহপাঠী কার্ড */}
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
                    style={{ background: '#dcfce7', color: '#15803d', textDecoration: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    📞 কল
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* গ. সত্যিকারে মানুষের জন্য রেজিস্ট্রেশন ফরম */}
        {activeTab === 'register' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#0D5C3A', fontSize: '18px' }}>📝 পুনর্মিলনী ২০২৭ নিবন্ধন ফরম</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>সতর্কতা: একজন ব্যক্তি একটি মোবাইল নম্বর দিয়ে একবারই রেজিস্ট্রেশন করতে পারবেন।</p>

            {regError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', lineHeight: '1.4' }}>
                {regError}
              </div>
            )}

            {regSuccess ? (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#15803d' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>🎉 অভিনন্দন! নিবন্ধন সফল হয়েছে</h3>
                <p style={{ margin: 0, fontSize: '13px' }}>আপনার নাম ও তথ্য সফলভাবে পুনর্মিলনী ২০২৭-এর ডিরেক্টরিতে যুক্ত হয়েছে।</p>
                <button onClick={() => { setRegSuccess(false); setActiveTab('directory'); }} style={{ marginTop: '14px', background: '#0D5C3A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  সহপাঠী তালিকায় দেখুন
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>আপনার পূর্ণ নাম (বাংলা বা ইংরেজি): *</label>
                  <input required type="text" placeholder="উদাঃ মোঃ রাসেল মিয়া" value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>সক্রিয় মোবাইল নম্বর: *</label>
                  <input required type="tel" placeholder="017XXXXXXXX" value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>আপনার ব্যাচ সিলেক্ট করুন: *</label>
                  <select value={regForm.batch} onChange={e => setRegForm({...regForm, batch: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="2014">এসএসসি ব্যাচ ২০১৪</option>
                    <option value="2016">এইচএসসি ব্যাচ ২০১৬</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>বর্তমান বাসস্থান বা কর্মস্থল এলাকা:</label>
                  <input type="text" placeholder="উদাঃ সান্দিকোনা / কেন্দুয়া / ঢাকা" value={regForm.area} onChange={e => setRegForm({...regForm, area: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>টি-শার্ট সাইজ (পুনর্মিলনী জার্সির জন্য): *</label>
                  <select value={regForm.tshirt} onChange={e => setRegForm({...regForm, tshirt: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="M">Medium (M - ৩৮)</option>
                    <option value="L">Large (L - ৪০)</option>
                    <option value="XL">Extra Large (XL - ৪২)</option>
                    <option value="XXL">Double XL (XXL - ৪৪)</option>
                  </select>
                </div>
                <button type="submit" style={{ background: '#0D5C3A', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', marginTop: '6px', cursor: 'pointer' }}>
                  নিবন্ধন নিশ্চিত করুন
                </button>
              </form>
            )}
          </div>
        )}

        {/* ঘ. লাইভ চ্যাটরুম (জয়েন ও নোটিফিকেশন সহ) */}
        {activeTab === 'chat' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', height: '68vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0D5C3A' }}>💬 ব্যাচ আড্ডা লাইভ রুম</span>
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>সদস্য যুক্ত আছেন</span>
            </div>

            {!isJoinedChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px' }}>আড্ডায় প্রবেশ করুন</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>গ্রুপ চ্যাটে কথা বলার জন্য প্রথমে আপনার নাম লিখে জয়েন বাটনে চাপ দিন।</p>
                <form onSubmit={handleJoinChat} style={{ width: '100%', maxWidth: '300px' }}>
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
                  {messages.map(m => (
                    m.isSystem ? (
                      <div key={m.id} style={{ alignSelf: 'center', background: '#fef3c7', color: '#854d0e', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', border: '1px solid #fde68a' }}>
                        {m.text}
                      </div>
                    ) : (
                      <div key={m.id} style={{ alignSelf: m.sender === chatUserName ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>{m.sender}</span>
                        <div style={{ background: m.sender === chatUserName ? '#0D5C3A' : '#f1f5f9', color: m.sender === chatUserName ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: '14px', fontSize: '13px' }}>
                          {m.text}
                        </div>
                        <span style={{ fontSize: '9px', color: '#cbd5e1', float: 'right', marginTop: '2px' }}>{m.time}</span>
                      </div>
                    )
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

        {/* ঙ. ১০০ জনের লাইভ অডিও কল রুম */}
        {activeTab === 'audio' && (
          <div style={{ background: '#0f172a', color: 'white', borderRadius: '20px', padding: '20px', minHeight: '65vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: '#38bdf8' }}>🎙️ ব্যাচ লাইভ অডিও সম্মেলন</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>ধারণক্ষমতা: সর্বোচ্চ ১০০ জন এক সাথে</span>
                </div>
                <span style={{ background: '#dc2626', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>LIVE</span>
              </div>

              {/* অংশগ্রহণকারীদের গ্রিড */}
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                  বর্তমানে লাইভ রুমে যুক্ত আছেন ({audioParticipants.length}/১০০ জন):
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '35vh', overflowY: 'auto' }}>
                  {audioParticipants.map((p, idx) => (
                    <div key={idx} style={{ background: '#1e293b', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', border: p.includes('হোস্ট') ? '1px solid #38bdf8' : '1px solid #334155' }}>
                      <span style={{ fontSize: '18px' }}>👤</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p}</div>
                        <span style={{ fontSize: '10px', color: '#10b981' }}>● সংযুক্ত</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* অডিও কন্ট্রোল বার */}
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '16px', textAlign: 'center', marginTop: '16px' }}>
              {!isInAudioRoom ? (
                <button 
                  onClick={toggleAudioRoom}
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '25px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', width: '100%' }}
                >
                  📞 অডিও রুমে জয়েন করুন
                </button>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    style={{ background: isMuted ? '#dc2626' : '#334155', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {isMuted ? '🔇 আনমিউট' : '🎙️ মিউট'}
                  </button>
                  <button 
                    onClick={() => setIsHandRaised(!isHandRaised)} 
                    style={{ background: isHandRaised ? '#f59e0b' : '#334155', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ✋ {isHandRaised ? 'হাত নামান' : 'হাত তুলুন'}
                  </button>
                  <button 
                    onClick={toggleAudioRoom} 
                    style={{ background: '#e11d48', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🚪 লিভ নিন
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* চ. মালিক / অ্যাডমিন প্যানেল (শুধুমাত্র স্মার্ট রাসেল খানের জন্য) */}
        {activeTab === 'admin' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0D5C3A', fontSize: '18px' }}>👑 মালিকানা কন্ট্রোল প্যানেল</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>সম্মানিত ক্রিয়েটর ও আয়োজক: স্মার্ট রাসেল খান</p>

            {!isAdminAuthenticated ? (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', margin: '0 0 10px 0', fontWeight: 'bold' }}>সকল তথ্য দেখার জন্য আপনার ৫ ডিজিটের সিক্রেট কোড দিন:</p>
                <input
                  type="password"
                  placeholder="সিক্রেট কোড (ডিফল্ট: 74798)"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  style={{ width: '80%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', marginBottom: '10px' }}
                />
                <br />
                <button
                  onClick={() => {
                    if (adminPinInput === ADMIN_SECRET_PIN) {
                      setIsAdminAuthenticated(true);
                    } else {
                      alert('ভুল সিক্রেট কোড!');
                    }
                  }}
                  style={{ background: '#0D5C3A', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>সকল নিবন্ধিত সহপাঠীর তালিকা ({members.length} জন)</h4>
                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8," + 
                        "Name,Phone,Batch,T-Shirt,Area\n" + 
                        members.map(e => `"${e.name}","${e.phone}","${e.batch}","${e.tshirt}","${e.area}"`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Reunion_2027_Members.csv");
                      document.body.appendChild(link);
                      link.click();
                    }}
                    style={{ background: '#15803d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    📥 এক্সেল (CSV) ডাউনলোড
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
                  {members.map((m, idx) => (
                    <div key={m.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{idx + 1}. {m.name} ({m.batch === '2014' ? 'এসএসসি ২০১৪' : 'এইচএসসি ২০১৬'})</strong>
                        <span style={{ color: '#0D5C3A', fontWeight: 'bold' }}>জার্সি: {m.tshirt}</span>
                      </div>
                      <div style={{ color: '#475569', marginTop: '4px' }}>
                        মোবাইল: <a href={`tel:${m.phone}`} style={{ color: '#0284c7', fontWeight: 'bold' }}>{m.phone}</a> | এলাকা: {m.area}
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                        <a href={`tel:${m.phone}`} style={{ textDecoration: 'none', background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>📞 কল</a>
                        <a href={`https://wa.me/88${m.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#25D366', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>💬 হোয়াটসঅ্যাপ</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ৩. অ্যাপ ক্রিয়েটর ও হটলাইন হেল্পলাইন কার্ড (প্রতি পেজের নিচে থাকবে) */}
      <footer style={{ maxWidth: '600px', margin: '16px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>
            📱 অ্যাপটি তৈরি করেছেন: স্মার্ট রাসেল খান
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

      {/* ৪. বটম ন্যাভিগেশন বার */}
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
        <button onClick={() => setActiveTab('admin')} style={{ border: 'none', background: 'none', color: activeTab === 'admin' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'admin' ? 'bold' : 'normal', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>👑</span>
          <span>অ্যাডমিন</span>
        </button>
      </nav>

    </div>
  );
}
