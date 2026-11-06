import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebase";
import { UserProfile, PostItem } from "./types";
import ChatRoom from "./components/ChatRoom";

export default function App() {
  const [activeTab, setActiveTab] = useState('হোম');
  const [currentTime, setCurrentTime] = useState('');
  const [batchTime, setBatchTime] = useState({ y: 0, m: 0, d: 0, h: 0, min: 0, s: 0 });
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [announcement, setAnnouncement] = useState('স্বাগতম এস এস সি ব্যাচ ২০১৪ কমিউনিটিতে।');

  useEffect(() => {
    // লাইভ ঘড়ি
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('bn-BD'));
      // ২০১৪ থেকে কাউন্টডাউন
      const start = new Date('2014-05-17T00:00:00');
      const diff = now.getTime() - start.getTime();
      setBatchTime({
        y: Math.floor(diff / (1000 * 60 * 60 * 24 * 365)),
        m: Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)),
        d: Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        min: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000)
      });
    }, 1000);

    // ফায়ারবেস ডেটা সিঙ্ক
    const qPosts = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20));
    const unsub = onSnapshot(qPosts, (snap) => {
      const p: PostItem[] = [];
      snap.forEach(d => p.push({ id: d.id, ...d.data() } as PostItem));
      setPosts(p);
    });

    return () => { clearInterval(timer); unsub(); };
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#F0F2F5', minHeight: '100vh', paddingBottom: '70px' }}>
      
      {/* 1. HEADER */}
      <header style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)', color: '#fff', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>সান্দিকোনা স্কুল এন্ড কলেজ<br/><span style={{ fontSize: '10px' }}>এস এস সি ব্যাচ ২০১৪</span></div>
        <div style={{ textAlign: 'right', fontSize: '10px' }}>{currentTime}</div>
      </header>

      {/* 2. WELCOME BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #581C87 0%, #7C3AED 100%)', color: '#fff', padding: '20px', textAlign: 'center', borderRadius: '0 0 20px 20px', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</h2>
        <p style={{ fontSize: '12px', opacity: 0.8 }}>সান্দিকোনা, কেন্দুয়া, নেত্রকোনা।</p>
      </div>

      {/* 3. LIVE NOTICE */}
      <div style={{ background: '#fff', padding: '8px', overflow: 'hidden', borderBottom: '1px solid #ddd' }}>
        <marquee style={{ fontSize: '12px', color: '#333' }}>{announcement}</marquee>
      </div>

      {/* 4. FRIENDSHIP COUNTER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', padding: '10px' }}>
        {Object.entries(batchTime).map(([key, val]) => (
          <div key={key} style={{ background: '#312E81', color: '#fff', padding: '8px 2px', borderRadius: '8px', textAlign: 'center', fontSize: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{val}</span><br/>{key}
          </div>
        ))}
      </div>

      {/* 5. POST COMPOSER */}
      <div style={{ background: '#fff', padding: '12px', margin: '10px', borderRadius: '12px' }}>
        <textarea placeholder="কি লিখছেন?" style={{ width: '100%', border: 'none', outline: 'none' }} />
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button>🖼️</button><button>📹</button><button>📊</button>
          <button style={{ marginLeft: 'auto', background: '#7C3AED', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '5px' }}>পোস্ট</button>
        </div>
      </div>

      {/* 6. NEWS FEED */}
      <div style={{ padding: '0 10px' }}>
        {posts.map(p => (
          <div key={p.id} style={{ background: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '10px' }}>
            <h4 style={{ margin: '0 0 5px 0' }}>{p.authorName}</h4>
            <p style={{ fontSize: '13px' }}>{p.content}</p>
          </div>
        ))}
      </div>

      {/* 7. BOTTOM NAVIGATION (7 Tabs) */}
      <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #ddd' }}>
        {['হোম', 'বন্ধু', 'স্মৃতি', 'গৌরব', 'বিদ্যালয়', 'কমিউনিটি', 'যোগাযোগ'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ border: 'none', background: 'none', fontSize: '10px', fontWeight: activeTab === tab ? 'bold' : 'normal' }}>
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
