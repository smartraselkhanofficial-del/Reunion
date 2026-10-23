import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'info'>('home');
  const [selectedBatch, setSelectedBatch] = useState<'all' | '2014' | '2016'>('all');

  const members = [
    { name: 'মোঃ রাসেল মিয়া', batch: 'এসএসসি ২০১৪', area: 'কেন্দুয়া, নেত্রকোনা', status: 'ভেরিফাইড' },
    { name: 'শামীম আহমেদ', batch: 'এইচএসসি ২০১৬', area: 'ময়মনসিংহ', status: 'ভেরিফাইড' },
    { name: 'আরিফুল ইসলাম', batch: 'এসএসসি ২০১৪', area: 'ঢাকা', status: 'ভেরিফাইড' }
  ];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', backgroundColor: '#F0FDF4', color: '#1e293b', paddingBottom: '70px', margin: 0 }}>
      {/* টপ ব্যানার */}
      <header style={{ background: 'linear-gradient(135deg, #0D5C3A 0%, #15803d 100%)', color: 'white', padding: '24px 16px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' }}>
          সান্দিকোনা স্কুল এন্ড কলেজ
        </span>
        <h1 style={{ fontSize: '22px', margin: '8px 0 4px 0', fontWeight: 'bold' }}>পুনর্মিলনী ২০২৭</h1>
        <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>এসএসসি ব্যাচ ২০১৪ ও এইচএসসি ব্যাচ ২০১৬</p>
        <p style={{ fontSize: '11px', margin: '4px 0 0 0', opacity: 0.8 }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা</p>
      </header>

      {/* বডি কনটেন্ট */}
      <main style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        {activeTab === 'home' && (
          <div>
            {/* কাউন্টার কার্ডসমূহ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#15803d' }}>এসএসসি ২০১৪</span>
                <h3 style={{ fontSize: '20px', margin: '4px 0', color: '#0D5C3A' }}>নিবন্ধিত</h3>
              </div>
              <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#15803d' }}>এইচএসসি ২০১৬</span>
                <h3 style={{ fontSize: '20px', margin: '4px 0', color: '#0D5C3A' }}>নিবন্ধিত</h3>
              </div>
            </div>

            {/* স্বাগতম বক্স */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0D5C3A' }}>🎉 পুনর্মিলনী অ্যাপে স্বাগতম</h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 }}>
                সান্দিকোনা স্কুল এন্ড কলেজের ২০১৪ ও ২০১৬ ব্যাচের বন্ধুদের একত্রিত করার অফিসিয়াল মোবাইল অ্যাপ।
              </p>
            </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#0D5C3A', marginBottom: '12px' }}>সহপাঠী তালিকা</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {members.map((m, i) => (
                <div key={i} style={{ background: 'white', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{m.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{m.batch} • {m.area}</div>
                  <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '6px' }}>{m.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '16px', color: '#0D5C3A', margin: '0 0 8px 0' }}>ভেন্যু ও যোগাযোগ</h3>
            <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0' }}>🏫 সান্দিকোনা স্কুল এন্ড কলেজ প্রাঙ্গণ</p>
            <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0' }}>📍 কেন্দুয়া, নেত্রকোনা</p>
            <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0' }}>📅 বছর: ২০২৭</p>
          </div>
        )}
      </main>

      {/* মোবাইল বটম বার */}
      <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', padding: '12px 0', zIndex: 100 }}>
        <button onClick={() => setActiveTab('home')} style={{ border: 'none', background: 'none', color: activeTab === 'home' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'home' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer' }}>
          হোম
        </button>
        <button onClick={() => setActiveTab('directory')} style={{ border: 'none', background: 'none', color: activeTab === 'directory' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'directory' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer' }}>
          সহপাঠী
        </button>
        <button onClick={() => setActiveTab('info')} style={{ border: 'none', background: 'none', color: activeTab === 'info' ? '#0D5C3A' : '#94a3b8', fontWeight: activeTab === 'info' ? 'bold' : 'normal', fontSize: '12px', cursor: 'pointer' }}>
          তথ্য
        </button>
      </footer>
    </div>
  );
}
