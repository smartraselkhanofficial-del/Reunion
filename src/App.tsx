import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'register' | 'chat'>('home');
  const [batchFilter, setBatchFilter] = useState<'all' | '2014' | '2016'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ডামি সহপাঠী তালিকা (ডাটাবেস কানেক্ট হলে লাইভ আসবে)
  const classmates = [
    { id: 1, name: 'মোঃ রাসেল মিয়া', batch: '2014', role: 'এসএসসি ২০১৪', area: 'কেন্দুয়া, নেত্রকোনা', phone: '০১৭XXXXXXXX', profession: 'ব্যবসায়ী' },
    { id: 2, name: 'তানভীর আহমেদ', batch: '2016', role: 'এইচএসসি ২০১৬', area: 'ময়মনসিংহ সদর', phone: '০১৮XXXXXXXX', profession: 'ইঞ্জিনিয়ার' },
    { id: 3, name: 'আরিফুল হাসান', batch: '2014', role: 'এসএসসি ২০১৪', area: 'উত্তরা, ঢাকা', phone: '০১৯XXXXXXXX', profession: 'ব্যাংকার' },
    { id: 4, name: 'সুজন চৌধুরী', batch: '2016', role: 'এইচএসসি ২০১৬', area: 'সান্দিকোনা, কেন্দুয়া', phone: '০১৬XXXXXXXX', profession: 'শিক্ষক' }
  ];

  // মেসেজ স্টেট
  const [messages, setMessages] = useState([
    { id: 1, sender: 'রাসেল (২০১৪)', text: 'সবাই কেমন আছো? ২০২৭ এর প্রস্তুতি কেমন চলছে?', time: '১০:৩০ AM' },
    { id: 2, sender: 'তানভীর (২০১৬)', text: 'ইনশাআল্লাহ আমরা ২০১৬ ব্যাচ সর্বোচ্চ উপস্থিত থাকব!', time: '১০:৩২ AM' }
  ]);
  const [newMsg, setNewMsg] = useState('');

  // রেজিষ্ট্রেশন ফর্ম স্টেট
  const [regSuccess, setRegSuccess] = useState(false);
  const [regData, setRegData] = useState({ name: '', phone: '', batch: '2014', tshirt: 'L' });

  const filteredMembers = classmates.filter(m => {
    const matchesBatch = batchFilter === 'all' || m.batch === batchFilter;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.area.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBatch && matchesSearch;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: 'আমি', text: newMsg, time: 'এখন' }]);
    setNewMsg('');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (regData.name && regData.phone) {
      setRegSuccess(true);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', backgroundColor: '#F8FAF9', color: '#1e293b', paddingBottom: '75px', margin: 0 }}>
      
      {/* ১. টপ ব্যানার ও হেডার */}
      <header style={{ background: 'linear-gradient(135deg, #0D5C3A 0%, #15803d 100%)', color: 'white', padding: '20px 16px', boxShadow: '0 4px 12px rgba(13,92,58,0.2)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', background: 'rgba(212,175,55,0.25)', color: '#fef08a', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(212,175,55,0.4)', fontWeight: 'bold' }}>
            সান্দিকোনা স্কুল এন্ড কলেজ
          </span>
          <h1 style={{ fontSize: '22px', margin: '8px 0 2px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>পুনর্মিলনী ২০২৭</h1>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.95 }}>এসএসসি ব্যাচ ২০১৪ ও এইচএসসি ব্যাচ ২০১৬</p>
          <p style={{ fontSize: '11px', margin: '3px 0 0 0', opacity: 0.8 }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা</p>
        </div>
      </header>

      {/* ২. মূল বডি ভিউয়ার */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>
        
        {/* ক. হোম / ড্যাশবোর্ড ট্যাব */}
        {activeTab === 'home' && (
          <div>
            {/* কাউন্টার কার্ড */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এসএসসি ব্যাচ ২০১৪</span>
                <h3 style={{ fontSize: '24px', margin: '6px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>১২০+ জন</h3>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>নিবন্ধিত বন্ধু</span>
              </div>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #dcfce7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>এইচএসসি ব্যাচ ২০১৬</span>
                <h3 style={{ fontSize: '24px', margin: '6px 0 0 0', color: '#0D5C3A', fontWeight: '800' }}>৯৫+ জন</h3>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>নিবন্ধিত বন্ধু</span>
              </div>
            </div>

            {/* পুনর্মিলনী ইভেন্ট কার্ড */}
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0D5C3A', fontWeight: 'bold' }}>📅 ইভেন্ট বিবরণী</h3>
                <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>আসন্ন</span>
              </div>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#475569' }}>📍 <strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ</p>
              <p style={{ fontSize: '13px', margin: '6px 0', color: '#475569' }}>⏰ <strong>তারিখ:</strong> শীতকালীন পুনর্মিলনী ২০২৭</p>
              <button 
                onClick={() => setActiveTab('register')}
                style={{ width: '100%', marginTop: '12px', background: '#0D5C3A', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
              >
                এখনই রেজিস্ট্রেশন করুন
              </button>
            </div>

            {/* জরুরি নোটিশ */}
            <div style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '16px', borderRadius: '16px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#854d0e', fontSize: '14px' }}>📢 বিশেষ ঘোষণা</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#713f12', lineHeight: '1.5' }}>
                সকল সহপাঠীদের রেজিস্ট্রেশন ফরম পূরণ করার অনুরোধ জানানো হচ্ছে। খুব শীঘ্রই ব্যাচ ভিত্তিক জার্সি এবং উপহার সামগ্রী বণ্টন করা হবে।
              </p>
            </div>
          </div>
        )}

        {/* খ. সহপাঠী ডিরেক্টরি ট্যাব */}
        {activeTab === 'directory' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="🔍 সহপাঠীর নাম বা জেলা দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* ব্যাচ ফিল্টার বাটন */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setBatchFilter('all')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === 'all' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === 'all' ? 'white' : '#475569', cursor: 'pointer' }}>সব ব্যাচ</button>
              <button onClick={() => setBatchFilter('2014')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === '2014' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === '2014' ? 'white' : '#475569', cursor: 'pointer' }}>এসএসসি ২০১৪</button>
              <button onClick={() => setBatchFilter('2016')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', background: batchFilter === '2016' ? '#0D5C3A' : '#e2e8f0', color: batchFilter === '2016' ? 'white' : '#475569', cursor: 'pointer' }}>এইচএসসি ২০১৬</button>
            </div>

            {/* বন্ধুদের কার্ড লিস্ট */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMembers.map((m) => (
                <div key={m.id} style={{ background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0f172a' }}>{m.name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#15803d', fontWeight: 'bold' }}>{m.role} • <span style={{ color: '#64748b', fontWeight: 'normal' }}>{m.profession}</span></p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>📍 {m.area}</p>
                  </div>
                  <button 
                    onClick={() => alert(`${m.name}-এর নম্বর: ${m.phone}`)}
                    style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    যোগাযোগ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* গ. পুনর্মিলনী রেজিস্ট্রেশন ট্যাব */}
        {activeTab === 'register' && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#0D5C3A', fontSize: '18px' }}>📝 পুনর্মিলনী নিবন্ধন ফরম</h3>
            {regSuccess ? (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '16px', borderRadius: '12px', textAlign: 'center', color: '#15803d' }}>
                <h4 style={{ margin: '0 0 4px 0' }}>✅ রেজিস্ট্রেশন সফল হয়েছে!</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>ধন্যবাদ {regData.name}, আপনার তথ্য সংরক্ষিত হয়েছে।</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>আপনার পুরো নাম:</label>
                  <input required type="text" placeholder="নাম লিখুন" value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>মোবাইল নম্বর:</label>
                  <input required type="tel" placeholder="০১৭XXXXXXXX" value={regData.phone} onChange={e => setRegData({...regData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>ব্যাচ নির্বাচন করুন:</label>
                  <select value={regData.batch} onChange={e => setRegData({...regData, batch: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="2014">এসএসসি ব্যাচ ২০১৪</option>
                    <option value="2016">এইচএসসি ব্যাচ ২০১৬</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>টি-শার্ট সাইজ:</label>
                  <select value={regData.tshirt} onChange={e => setRegData({...regData, tshirt: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '4px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <button type="submit" style={{ background: '#0D5C3A', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', marginTop: '8px', cursor: 'pointer' }}>
                  জমা দিন
                </button>
              </form>
            )}
          </div>
        )}

        {/* ঘ. আড্ডা ও গ্রুপ চ্যাট ট্যাব */}
        {activeTab === 'chat' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', height: '65vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold', fontSize: '14px', color: '#0D5C3A' }}>
              💬 ব্যাচ আড্ডা (লাইভ রুম)
            </div>
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map(m => (
                <div key={m.id} style={{ alignSelf: m.sender === 'আমি' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>{m.sender}</span>
                  <div style={{ background: m.sender === 'আমি' ? '#0D5C3A' : '#f1f5f9', color: m.sender === 'আমি' ? '#fff' : '#1e293b', padding: '10px 14px', borderRadius: '14px', fontSize: '13px' }}>
                    {m.text}
                  </div>
                  <span style={{ fontSize: '9px', color: '#cbd5e1', float: 'right', marginTop: '2px' }}>{m.time}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="মেসেজ লিখুন..."
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <button type="submit" style={{ marginLeft: '8px', background: '#0D5C3A', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                পাঠান
              </button>
            </form>
          </div>
        )}

      </main>

      {/* ৩. বটম ন্যাভিগেশন বার (Bottom Tabs) */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 1000, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'home' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>🏠</span>
          <span>হোম</span>
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'directory' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>👥</span>
          <span>সহপাঠী</span>
        </button>
        <button onClick={() => setActiveTab('register')} style={{ border: 'none', background: 'none', color: activeTab === 'register' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'register' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>📝</span>
          <span>নিবন্ধন</span>
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ border: 'none', background: 'none', color: activeTab === 'chat' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'chat' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span>💬</span>
          <span>আড্ডা</span>
        </button>
      </nav>

    </div>
  );
}
