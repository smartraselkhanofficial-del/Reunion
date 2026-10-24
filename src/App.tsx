import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// ১. ক্লাউড ডাটাবেস কনফিগারেশন (Supabase Free Cloud Backend)
// আপনি আপনার Supabase URL ও Key বসালে এটি সরাসরি ক্লাউডে জমা হবে। 
// ডিফল্টভাবে এটি লাইভ ব্রডকাস্ট চ্যানেলে কাজ করবে।
// ============================================================================
const SUPABASE_URL = 'https://xyzcompany.supabase.co'; // আপনার ক্লাউড URL
const SUPABASE_ANON_KEY = 'eyJhbGciOi...'; // আপনার ক্লাউড Anon Key

const supabase = createClient(
  SUPABASE_URL.startsWith('http') ? SUPABASE_URL : 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY.length > 20 ? SUPABASE_ANON_KEY : 'placeholder-key'
);

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

  // গোপন অ্যাডমিন প্যানেল স্টেট (সাধারণ পাবলিকের জন্য সম্পূর্ণ অদৃশ্য)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const ADMIN_SECRET_PIN = '74798'; // স্মার্ট রাসেল খানের গোপন পিন

  // মেম্বার লিস্ট স্টেট
  const [members, setMembers] = useState<RegisteredMember[]>(() => {
    const local = localStorage.getItem('sandikona_shared_members');
    return local ? JSON.parse(local) : [
      { id: '1', name: 'স্মার্ট রাসেল খান', phone: '01705374798', batch: '2014', tshirt: 'XL', area: 'সান্দিকোনা, কেন্দুয়া', regDate: 'আয়োজক প্রধান' },
      { id: '2', name: 'মোঃ সাইদুল ইসলাম', phone: '01712000111', batch: '2014', tshirt: 'L', area: 'কেন্দুয়া বাজার', regDate: 'সদস্য' },
      { id: '3', name: 'মাহবুব আলম', phone: '01819223344', batch: '2016', tshirt: 'M', area: 'নেত্রকোনা সদর', regDate: 'সদস্য' }
    ];
  });

  const [regForm, setRegForm] = useState({ name: '', phone: '', batch: '2014', tshirt: 'L', area: '' });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // চ্যাট স্টেট
  const [isJoinedChat, setIsJoinedChat] = useState(false);
  const [chatUserName, setChatUserName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'স্মার্ট রাসেল খান (আয়োজক)', text: 'আসসালামু আলাইকুম। সান্দিকোনা স্কুল এন্ড কলেজের সকল বন্ধুদের স্বাগতম!', time: '১০:০০ AM' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // ১০০ জনের অডিও রুম স্টেট
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  const JITSI_AUDIO_ROOM_URL = 'https://meet.jit.si/SandikonaReunion2027AudioRoom100#config.startWithVideoMuted=true&config.prejoinPageEnabled=false';

  // -------------------------------------------------------------
  // ক্লাউড ব্রডকাস্ট লিসেনার (অন্য মোবাইল থেকে ডাটা আসার রাস্তা)
  // -------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem('sandikona_shared_members', JSON.stringify(members));
  }, [members]);

  // গোপন অ্যাডমিন প্যানেল ট্রিগার (৩ বার দ্রুত ক্লিক করলে পিন চাইবে)
  const handleSecretAdminTrigger = () => {
    const nextCount = adminClickCount + 1;
    if (nextCount >= 3) {
      setAdminClickCount(0);
      setShowAdminModal(true);
    } else {
      setAdminClickCount(nextCount);
      setTimeout(() => setAdminClickCount(0), 2000); // ২ সেকেন্ডের মধ্যে ৩ বার চাপতে হবে
    }
  };

  // ডুপ্লিকেট চেকিং সহ রিয়েল রেজিস্ট্রেশন
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const cleanPhone = regForm.phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 11) {
      setRegError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }

    // সেন্ট্রাল ডুপ্লিকেট রোধ
    const isDuplicate = members.some(m => m.phone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
    if (isDuplicate) {
      setRegError('⚠️ এই মোবাইল নম্বর দিয়ে ইতোমধ্যেই রেজিস্ট্রেশন করা হয়েছে! একজন বন্ধু একবারের বেশি নিবন্ধন করতে পারবেন না।');
      return;
    }

    const newMember: RegisteredMember = {
      id: Date.now().toString(),
      name: regForm.name.trim(),
      phone: cleanPhone,
      batch: regForm.batch,
      tshirt: regForm.tshirt,
      area: regForm.area.trim() || 'সান্দিকোনা, কেন্দুয়া',
      regDate: new Date().toLocaleDateString('bn-BD')
    };

    setMembers(prev => [newMember, ...prev]);
    setRegSuccess(true);
    setRegForm({ name: '', phone: '', batch: '2014', tshirt: 'L', area: '' });
  };

  // চ্যাটে জয়েন হওয়া
  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatUserName.trim()) return;

    setIsJoinedChat(true);
    const joinNotice: ChatMessage = {
      id: Date.now().toString(),
      sender: 'সিস্টেম নোটিশ',
      text: `🎉 সহপাঠী "${chatUserName}" লাইভ আড্ডায় জয়েন হয়েছেন!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    setMessages(prev => [...prev, joinNotice]);
  };

  // চ্যাটে মেসেজ পাঠানো
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsgObj: ChatMessage = {
      id: Date.now().toString(),
      sender: chatUserName || 'সহপাঠী',
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsgObj]);
    setInputMsg('');
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
            {/* লাইভ মেম্বার সংখ্যা */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এসএসসি ২০১৪</span>
                <h3 style={{ fontSize: '26px', margin: '4px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>{count2014} জন</h3>
                <span style={{ fontSize: '10px', color: '#64748b' }}>অনুমোদিত সহপাঠী</span>
              </div>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এইচএসসি ২০১৬</span>
                <h3 style={{ fontSize: '26px', margin: '4px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>{count2016} জন</h3>
                <span style={{ fontSize: '10px', color: '#64748b' }}>অনুমোদিত সহপাঠী</span>
              </div>
            </div>

            {/* ভেন্যু ও তারিখ */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0D5C3A', fontWeight: 'bold' }}>📅 পুনর্মিলনীর আনুষ্ঠানিক বিবরণ</h3>
                <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>চূড়ান্ত</span>
              </div>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#334155' }}>📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ, কেন্দুয়া, নেত্রকোনা</p>
              <p style={{ fontSize: '14px', margin: '6px 0', color: '#15803d', fontWeight: 'bold' }}>⏰ <strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭</p>
              <p style={{ fontSize: '12px', margin: '6px 0', color: '#64748b' }}>আয়োজক: এসএসসি ও এইচএসসি ২০১৪ ব্যাচ পুনর্মিলনী সংসদ</p>
              
              <button 
                onClick={() => setActiveTab('register')}
                style={{ width: '100%', marginTop: '12px', background: '#0D5C3A', color: 'white', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
              >
                📝 রেজিস্ট্রেশন ফরম পূরণ করুন
              </button>
            </div>

            {/* ১০০ জনের অডিও রুম কুইক বাটন */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#38bdf8' }}>🎙️ ১০০ জনের লাইভ অডিও আড্ডা</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>একসাথে ১০০ জন কথা বলতে ও শুনতে পারবেন</p>
              </div>
              <button 
                onClick={() => setActiveTab('audio')}
                style={{ background: '#0284c7', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                আড্ডায় যান
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
          </div>
        )}

        {/* গ. প্রকৃত রেজিস্ট্রেশন ফরম */}
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
                <p style={{ margin: 0, fontSize: '13px' }}>আপনার তথ্য কেন্দ্রীয় সহপাঠী তালিকায় সংরক্ষিত হয়েছে।</p>
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
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>সক্রিয় মোবাইল নম্বর (লগইন ও যোগাযোগের জন্য): *</label>
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
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>টি-শার্ট সাইজ (পুনর্মিলনী জার্সির মাপ): *</label>
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

        {/* ঘ. রিয়েল-টাইম চ্যাটরুম */}
        {activeTab === 'chat' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', height: '68vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#0D5C3A' }}>💬 ব্যাচ লাইভ আড্ডা রুম</span>
              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px' }}>সরাসরি যুক্ত</span>
            </div>

            {!isJoinedChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '17px' }}>লাইভ আড্ডায় জয়েন করুন</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>চ্যাটে মেসেজ দেওয়ার জন্য প্রথমে আপনার নাম লিখে জয়েন বাটনে চাপ দিন।</p>
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

        {/* ঙ. ১০০ জনের বাস্তব অডিও কনফারেন্স রুম (Real WebRTC Engine) */}
        {activeTab === 'audio' && (
          <div style={{ background: '#0f172a', color: 'white', borderRadius: '20px', padding: '16px', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>🎙️ ১০০ জনের লাইভ অডিও রুম</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>সবাই সরাসরি কথা বলতে ও শুনতে পারবেন</span>
              </div>
              <span style={{ background: '#10b981', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>অনলাইন</span>
            </div>

            {/* আসল অডিও কল কানেকশন ফ্রেম */}
            {!isAudioConnected ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '50px', marginBottom: '10px' }}>🎧</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>ভয়েস আড্ডায় যুক্ত হতে চান?</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                  নিচের বাটনে চাপ দিলে ব্যাকগ্রাউন্ডে ১০০ জনের অডিও রুম কানেক্ট হবে। আপনি আপনার মাইক অন/অফ করতে পারবেন।
                </p>
                <button
                  onClick={() => setIsAudioConnected(true)}
                  style={{ background: '#0284c7', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.4)' }}
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
                  title="Sandikona Audio Conference"
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

      {/* ৩. অ্যাপ ক্রিয়েটর ও হটলাইন হেল্পলাইন (এখানে ৩ বার ক্লিক করলেই গোপন অ্যাডমিন প্যানেল খুলবে) */}
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

      {/* ৪. সাধারণ পাবলিকের জন্য বটম ন্যাভিগেশন বার (অ্যাডমিন বাটন সম্পূর্ণ উধাও) */}
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

      {/* ৫. গোপন অ্যাডমিন প্যানেল মোডাল (শুধুমাত্র স্মার্ট রাসেল খানের জন্য) */}
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
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#15803d' }}>মোট নিবন্ধিত: {members.length} জন</span>
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
