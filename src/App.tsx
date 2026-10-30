import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// ==========================================
// 🔥 আপনার আসল ফায়ারবেস প্রজেক্ট কনফিগারেশন
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBuY0Ns2bX1RlSK8673LnSQWnNpMcEJhRw",
  authDomain: "reunion-2027-4cedf.firebaseapp.com",
  projectId: "reunion-2027-4cedf",
  storageBucket: "reunion-2027-4cedf.firebasestorage.app",
  messagingSenderId: "221061203254",
  appId: "1:221061203254:web:834a0b5f60ced9429adf97"
};

// ফায়ারবেস ইনিশিয়ালাইজেশন
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

interface Member {
  id: string;
  name: string;
  phone: string;
  batch: string;
  tshirt: string;
  area: string;
  createdAt?: any;
}

interface ChatMsg {
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

  // ডেটাবেস স্টেট
  const [members, setMembers] = useState<Member[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // গোপন অ্যাডমিন প্যানেল স্টেট (স্মার্ট রাসেল খান)
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const ADMIN_PIN = '74798';

  // ফর্ম স্টেট
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState('2014');
  const [tshirt, setTshirt] = useState('L');
  const [area, setArea] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // চ্যাট ও অডিও রুম
  const [chatUser, setChatUser] = useState('');
  const [isJoinedChat, setIsJoinedChat] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [isAudioLive, setIsAudioLive] = useState(false);

  // -------------------------------------------------------------
  // ১. ফায়ারবেস ক্লাউড থেকে রিয়েল-টাইম ডেটা সিঙ্ক
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      const qMembers = query(collection(db, "members"));
      const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
        const list: Member[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Member);
        });
        setMembers(list);
        setIsLoading(false);
      }, (err) => {
        console.error("Firestore Error:", err);
        setIsLoading(false);
      });

      const qChat = query(collection(db, "messages"));
      const unsubscribeChat = onSnapshot(qChat, (snapshot) => {
        const msgs: ChatMsg[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as ChatMsg);
        });
        setChatMessages(msgs);
      });

      return () => {
        unsubscribeMembers();
        unsubscribeChat();
      };
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  }, []);

  // গোপন অ্যাডমিন প্যানেল ট্রিগার (৩ বার টাচ করলে আসবে)
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

  // -------------------------------------------------------------
  // ২. ডুপ্লিকেট রোধ করে ফায়ারবেসে মেম্বার সেভ
  // -------------------------------------------------------------
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

    // সেন্ট্রাল ডুপ্লিকেট চেক
    const exists = members.some(m => m.phone.replace(/[^\d]/g, '').slice(-11) === cleanPhone.slice(-11));
    if (exists) {
      setRegError('⚠️ এই নম্বর দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে! একজন একবারের বেশি নিবন্ধন করতে পারবেন না।');
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "members"), {
        name: name.trim(),
        phone: cleanPhone,
        batch,
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

  // -------------------------------------------------------------
  // ৩. চ্যাটে রিয়েল-টাইম মেসেজ পাঠানো
  // -------------------------------------------------------------
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;

    try {
      await addDoc(collection(db, "messages"), {
        sender: chatUser || 'সহপাঠী',
        text: msgInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setMsgInput('');
    } catch (err) {
      console.error(err);
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
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#F3F6F4',
      minHeight: '100vh',
      color: '#1A2E22',
      paddingBottom: '90px',
      margin: 0,
      WebkitFontSmoothing: 'antialiased'
    }}>
      
      {/* ১. প্রিমিয়াম হেডার ব্যানার */}
      <header style={{
        background: 'linear-gradient(135deg, #0A4D2E 0%, #137547 50%, #083E24 100%)',
        color: '#FFFFFF',
        padding: '24px 16px 20px 16px',
        textAlign: 'center',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 8px 24px rgba(10, 77, 46, 0.25)',
        position: 'relative'
      }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <span style={{
            fontSize: '11px',
            backgroundColor: 'rgba(212, 175, 55, 0.2)',
            color: '#FDE68A',
            padding: '5px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            fontWeight: '600',
            letterSpacing: '0.5px',
            display: 'inline-block'
          }}>
            সান্দিকোনা স্কুল এন্ড কলেজ
          </span>
          <h1 style={{ fontSize: '24px', margin: '10px 0 2px 0', fontWeight: '800', letterSpacing: '-0.3px' }}>
            পুনর্মিলনী ২০২৭
          </h1>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9 }}>
            এসএসসি ব্যাচ ২০১৪ ও এইচএসসি ব্যাচ ২০১৬
          </p>
          <div style={{
            marginTop: '8px',
            display: 'inline-block',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#E2E8F0'
          }}>
            🤝 আয়োজনে: এসএসসি ও এইচএসসি ২০১৪ ব্যাচ
          </div>
        </div>
      </header>

      {/* ২. মূল বডি কনটেন্ট */}
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>

        {/* ক. ড্যাশবোর্ড ট্যাব */}
        {activeTab === 'home' && (
          <div>
            {/* লাইভ কাউন্টার কার্ডসমূহ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '18px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '12px', color: '#137547', fontWeight: '700' }}>এসএসসি ২০১৪</span>
                <h3 style={{ fontSize: '26px', margin: '6px 0 2px 0', color: '#0A4D2E', fontWeight: '800' }}>
                  {isLoading ? '...' : `${count2014} জন`}
                </h3>
                <span style={{ fontSize: '10px', color: '#64748B' }}>সরাসরি নিবন্ধিত</span>
              </div>

              <div style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '18px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '12px', color: '#137547', fontWeight: '700' }}>এইচএসসি ২০১৬</span>
                <h3 style={{ fontSize: '26px', margin: '6px 0 2px 0', color: '#0A4D2E', fontWeight: '800' }}>
                  {isLoading ? '...' : `${count2016} জন`}
                </h3>
                <span style={{ fontSize: '10px', color: '#64748B' }}>সরাসরি নিবন্ধিত</span>
              </div>
            </div>

            {/* ইভেন্ট বিবরণী কার্ড */}
            <div style={{
              background: '#FFFFFF',
              padding: '20px',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              marginBottom: '16px'
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
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(10, 77, 46, 0.2)'
                }}
              >
                📝 এখনই নিজের নাম নিবন্ধন করুন
              </button>
            </div>

            {/* ১০০ জনের অডিও ব্যানার */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              padding: '16px 20px',
              borderRadius: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.2)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#38BDF8' }}>🎙️ ১০০ জনের লাইভ অডিও রুম</h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>সহপাঠীরা সরাসরি কথা বলুন</p>
              </div>
              <button
                onClick={() => setActiveTab('audio')}
                style={{
                  background: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                প্রবেশ করুন
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

            {/* ফিল্টার বাটন */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button onClick={() => setBatchFilter('all')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '700', background: batchFilter === 'all' ? '#0A4D2E' : '#E2E8F0', color: batchFilter === 'all' ? '#FFFFFF' : '#475569', cursor: 'pointer' }}>সব ব্যাচ ({members.length})</button>
              <button onClick={() => setBatchFilter('2014')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '700', background: batchFilter === '2014' ? '#0A4D2E' : '#E2E8F0', color: batchFilter === '2014' ? '#FFFFFF' : '#475569', cursor: 'pointer' }}>এসএসসি ২০১৪ ({count2014})</button>
              <button onClick={() => setBatchFilter('2016')} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '700', background: batchFilter === '2016' ? '#0A4D2E' : '#E2E8F0', color: batchFilter === '2016' ? '#FFFFFF' : '#475569', cursor: 'pointer' }}>এইচএসসি ২০১৬ ({count2016})</button>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>লোড হচ্ছে...</div>
            ) : filteredMembers.length === 0 ? (
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
                        {m.batch === '2014' ? 'এসএসসি ২০১৪' : 'এইচএসসি ২০১৬'} • <span style={{ color: '#64748B', fontWeight: '400' }}>{m.area}</span>
                      </p>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>জার্সি: <strong>{m.tshirt}</strong></span>
                    </div>
                    <a
                      href={`tel:${m.phone}`}
                      style={{
                        background: '#DCFCE7',
                        color: '#137547',
                        textDecoration: 'none',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}
                    >
                      📞 কল
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* গ. সত্যিকারে মানুষের জন্য রেজিস্ট্রেশন ফরম */}
        {activeTab === 'register' && (
          <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0A4D2E', fontSize: '18px', fontWeight: '700' }}>📝 পুনর্মিলনী ২০২৭ নিবন্ধন ফরম</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>সতর্কতা: একজন ব্যক্তি একটি মোবাইল নম্বর দিয়ে একবারই নিবন্ধন করতে পারবেন।</p>

            {regError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '14px', lineHeight: '1.4' }}>
                {regError}
              </div>
            )}

            {regSuccess ? (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', padding: '20px', borderRadius: '16px', textAlign: 'center', color: '#137547' }}>
                <h3 style={{ margin: '0 0 6px 0' }}>🎉 অভিনন্দন! নিবন্ধন সফল হয়েছে</h3>
                <p style={{ margin: 0, fontSize: '13px' }}>আপনার তথ্য কেন্দ্রীয় ফায়ারবেস ডেটাবেসে সংরক্ষিত হয়েছে।</p>
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
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>আপনার ব্যাচ নির্বাচন করুন: *</label>
                  <select value={batch} onChange={e => setBatch(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', background: '#FFFFFF', outline: 'none' }}>
                    <option value="2014">এসএসসি ব্যাচ ২০১৪</option>
                    <option value="2016">এইচএসসি ব্যাচ ২০১৬</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>বর্তমান বাসস্থান বা কর্মস্থল:</label>
                  <input type="text" placeholder="উদাঃ সান্দিকোনা / কেন্দুয়া / ঢাকা" value={area} onChange={e => setArea(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>টি-শার্ট সাইজ (জার্সির জন্য): *</label>
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

        {/* ঘ. রিয়েল চ্যাটরুম */}
        {activeTab === 'chat' && (
          <div style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', height: '68vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '14px', color: '#0A4D2E' }}>💬 লাইভ আড্ডা রুম</span>
              <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#137547', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>ফায়ারবেস লাইভ</span>
            </div>

            {!isJoinedChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>আড্ডায় প্রবেশ করুন</h4>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>চ্যাটে যুক্ত হতে আপনার নাম লিখে জয়েন চাপুন।</p>
                <form onSubmit={(e) => { e.preventDefault(); if (chatUser.trim()) setIsJoinedChat(true); }} style={{ width: '100%', maxWidth: '280px' }}>
                  <input
                    required
                    type="text"
                    placeholder="আপনার নাম লিখুন..."
                    value={chatUser}
                    onChange={(e) => setChatUser(e.target.value)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '10px', textAlign: 'center', outline: 'none' }}
                  />
                  <button type="submit" style={{ width: '100%', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    👉 চ্যাটে জয়েন করুন
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatMessages.map((m) => (
                    <div key={m.id} style={{ alignSelf: m.sender === chatUser ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '2px' }}>{m.sender}</span>
                      <div style={{ background: m.sender === chatUser ? '#0A4D2E' : '#F1F5F9', color: m.sender === chatUser ? '#FFFFFF' : '#1E293B', padding: '10px 14px', borderRadius: '14px', fontSize: '13px' }}>
                        {m.text}
                      </div>
                      <span style={{ fontSize: '9px', color: '#CBD5E1', float: 'right', marginTop: '2px' }}>{m.time}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendChat} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <input
                    type="text"
                    placeholder="মেসেজ লিখুন..."
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                  <button type="submit" style={{ marginLeft: '8px', background: '#0A4D2E', color: '#FFFFFF', border: 'none', padding: '0 16px', borderRadius: '20px', fontWeight: '700', cursor: 'pointer' }}>
                    পাঠান
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* ঙ. ১০০ জনের লাইভ অডিও কনফারেন্স */}
        {activeTab === 'audio' && (
          <div style={{ background: '#0F172A', color: '#FFFFFF', borderRadius: '20px', padding: '16px', minHeight: '68vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#38BDF8' }}>🎙️ ১০০ জনের লাইভ অডিও রুম</h3>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>সবাই সরাসরি কথা বলতে ও শুনতে পারবেন</span>
              </div>
              <span style={{ background: '#10B981', color: '#FFFFFF', fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>অনলাইন</span>
            </div>

            {!isAudioLive ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎧</div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>ভয়েস আড্ডায় যুক্ত হতে চান?</h4>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                  নিচের বাটনে চাপ দিলে লাইভ অডিও রুম চালু হবে এবং ১০০ জন সহপাঠী একসাথে কথা বলতে পারবেন।
                </p>
                <button
                  onClick={() => setIsAudioLive(true)}
                  style={{ background: '#0284C7', color: '#FFFFFF', border: 'none', padding: '14px 28px', borderRadius: '30px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.4)' }}
                >
                  🟢 অডিও রুমে প্রবেশ করুন
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
                <iframe
                  src="https://meet.jit.si/SandikonaReunion2027Audio100#config.startWithVideoMuted=true&config.prejoinPageEnabled=false"
                  allow="microphone; camera; autoplay; display-capture"
                  style={{ width: '100%', height: '52vh', border: 'none', borderRadius: '12px', backgroundColor: '#000000' }}
                  title="Audio Room"
                />
                <button
                  onClick={() => setIsAudioLive(false)}
                  style={{ marginTop: '10px', background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  🚪 অডিও রুম থেকে বের হন
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ৩. অ্যাপ ক্রিয়েটর ফুটার (লুকানো অ্যাডমিন: ৩ বার টাচ করুন) */}
      <footer style={{ maxWidth: '520px', margin: '16px auto', padding: '0 16px' }}>
        <div 
          onClick={handleAdminTrigger}
          style={{ background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer', userSelect: 'none' }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#137547', fontWeight: '700' }}>
            📱 অ্যাপটি তৈরি করেছেন: স্মার্ট রাসেল খান (লুকানো অ্যাডমিন)
          </p>
          <p style={{ margin: '2px 0', fontSize: '12px', color: '#334155' }}>
            সরাসরি যোগাযোগ: <a href="tel:01705374798" style={{ color: '#0A4D2E', fontWeight: '700', textDecoration: 'none' }}>01705374798</a>
          </p>
          <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', padding: '6px 12px', borderRadius: '20px', border: '1px solid #86EFAC' }}>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700' }}>হটলাইন ও সার্বিক সহযোগিতা:</span>
            <a href="https://wa.me/8801951695069" style={{ fontSize: '11px', color: '#137547', textDecoration: 'none', fontWeight: '700' }}>
              WhatsApp 01951695069
            </a>
            <span style={{ fontSize: '11px', color: '#64748B' }}>বা</span>
            <a href="tel:01951695069" style={{ fontSize: '11px', color: '#0A4D2E', textDecoration: 'none', fontWeight: '700' }}>কল</a>
          </div>
        </div>
      </footer>

      {/* ৪. প্রিমিয়াম বটম ন্যাভিগেশন বার */}
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
        <button onClick={() => setActiveTab('audio')} style={{ border: 'none', background: 'none', color: activeTab === 'audio' ? '#0A4D2E' : '#94A3B8', fontWeight: activeTab === 'audio' ? '800' : '500', fontSize: '11px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>🎙️</span>
          <span>অডিও</span>
        </button>
      </nav>

      {/* ৫. গোপন অ্যাডমিন ড্যাশবোর্ড মোডাল */}
      {showAdmin && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#0A4D2E', fontSize: '17px', fontWeight: '700' }}>👑 গোপন অ্যাডমিন ড্যাশবোর্ড</h3>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#137547' }}>মোট নিবন্ধিত: {members.length} জন</span>
                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,নাম,মোবাইল,ব্যাচ,জার্সি সাইজ,ঠিকানা\n" + 
                        members.map(e => `"${e.name}","${e.phone}","${e.batch}","${e.tshirt}","${e.area}"`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "Sandikona_Reunion_2027_Members.csv");
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
                        <strong>{idx + 1}. {m.name} ({m.batch === '2014' ? 'এসএসসি ১৪' : 'এইচএসসি ১৬'})</strong>
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
