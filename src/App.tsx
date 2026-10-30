import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

interface RegisteredMember {
  id?: string;
  name: string;
  phone: string;
  batch: string;
  tshirt: string;
  area: string;
  regDate: string;
}

interface ChatMessage {
  id?: string;
  sender: string;
  text: string;
  time: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'directory' | 'register' | 'chat' | 'audio'>('home');
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Registration Form State
  const [regForm, setRegForm] = useState({
    name: '',
    phone: '',
    batch: '২০১৪',
    tshirt: 'L',
    area: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Chat Input State
  const [inputMsg, setInputMsg] = useState('');
  const [chatUserName, setChatUserName] = useState('');

  // Real-time Sync for Members and Chat from Firestore
  useEffect(() => {
    const unsubscribeMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RegisteredMember[];
      setMembers(membersList);
      setIsLoading(false);
    });

    const unsubscribeChat = onSnapshot(collection(db, 'chats'), (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(chatList);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeChat();
    };
  }, []);

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.phone) {
      alert('অনুগ্রহ করে নাম এবং মোবাইল নম্বর দিন।');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'members'), {
        name: regForm.name,
        phone: regForm.phone,
        batch: regForm.batch,
        tshirt: regForm.tshirt,
        area: regForm.area,
        regDate: new Date().toLocaleString()
      });
      setRegSuccess(true);
      setRegForm({ name: '', phone: '', batch: '২০১৪', tshirt: 'L', area: '' });
      setTimeout(() => setRegSuccess(false), 3000);
    } catch (error) {
      console.error('Error adding member: ', error);
      alert('রেজিস্ট্রেশন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const sender = chatUserName.trim() || 'অপরিচিত অতিথি';
    try {
      await addDoc(collection(db, 'chats'), {
        sender: sender,
        text: inputMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setInputMsg('');
    } catch (error) {
      console.error('Error sending message: ', error);
    }
  };

  // Count members by batch
  const ssc2014Count = members.filter(m => m.batch === '২০১৪' || m.batch === '2014').length;
  const hsc2016Count = members.filter(m => m.batch === '২০১৬' || m.batch === '2016').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-800">
      {/* Header / Banner */}
      <header className="bg-emerald-800 text-white p-4 text-center shadow-md">
        <h1 className="text-xl font-bold">সান্দিকোনা স্কুল এন্ড কলেজ</h1>
        <h2 className="text-lg font-semibold text-yellow-300">পুনর্মিলনী ২০২৭</h2>
        <p className="text-xs mt-1">এসএসসি ব্যাচ ২০১৪ ও এইচএসসি ব্যাচ ২০১৬</p>
      </header>

      {/* Main Content Based on Active Tab */}
      <main className="p-4 max-w-md mx-auto">
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow border border-gray-100 text-center">
                <h3 className="text-gray-500 text-sm">এসএসসি ২০১৪</h3>
                <p className="text-2xl font-bold text-emerald-700">{ssc2014Count} জন</p>
                <span className="text-xs text-gray-400">সরাসরি নিবন্ধিত</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow border border-gray-100 text-center">
                <h3 className="text-gray-500 text-sm">এইচএসসি ২০১৬</h3>
                <p className="text-2xl font-bold text-emerald-700">{hsc2016Count} জন</p>
                <span className="text-xs text-gray-400">সরাসরি নিবন্ধিত</span>
              </div>
            </div>

            {/* Event Info Card */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-red-600 font-semibold text-sm">📍 পুনর্মিলনীর সময় ও ভেন্যু</span>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">চূড়ান্ত</span>
              </div>
              <p className="text-sm"><strong>ভেন্যু:</strong> সান্দিকোনা স্কুল এন্ড কলেজ মাঠ প্রাঙ্গণ</p>
              <p className="text-sm"><strong>তারিখ:</strong> পবিত্র ঈদুল আজহা ২০২৭</p>
              <button 
                onClick={() => setActiveTab('register')}
                className="w-full mt-3 bg-emerald-700 text-white py-2.5 rounded-lg font-medium shadow hover:bg-emerald-800 transition"
              >
                📝 রেজিস্ট্রেশন ফরম পূরণ করুন
              </button>
            </div>

            {/* Audio Room Banner */}
            <div className="bg-gray-900 text-white p-4 rounded-xl shadow space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">🎙️ ১০০ জনের লাইভ অডিও আড্ডা</span>
                <button 
                  onClick={() => setActiveTab('audio')}
                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
                >
                  রুম খুলুন
                </button>
              </div>
              <p className="text-xs text-gray-300">একসাথে ১০০ জন সরাসরি কথা বলতে পারবেন</p>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="bg-white p-5 rounded-xl shadow space-y-4">
            <h3 className="text-lg font-bold text-emerald-800 text-center">রেজিস্ট্রেশন ফরম</h3>
            {regSuccess && (
              <div className="bg-green-100 text-green-700 p-3 rounded text-sm text-center">
                🎉 আপনার রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে!
              </div>
            )}
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">আপনার নাম</label>
                <input 
                  type="text" 
                  required
                  value={regForm.name}
                  onChange={e => setRegForm({...regForm, name: e.target.value})}
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-600"
                  placeholder="পূর্ণ নাম লিখুন"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">মোবাইল নম্বর</label>
                <input 
                  type="text" 
                  required
                  value={regForm.phone}
                  onChange={e => setRegForm({...regForm, phone: e.target.value})}
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-600"
                  placeholder="০১XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ব্যাচ</label>
                <select 
                  value={regForm.batch}
                  onChange={e => setRegForm({...regForm, batch: e.target.value})}
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                >
                  <option value="২০১৪">এসএসসি ব্যাচ ২০১৪</option>
                  <option value="২০১৬">এইচএসসি ব্যাচ ২০১৬</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">টি-শার্ট সাইজ</label>
                <select 
                  value={regForm.tshirt}
                  onChange={e => setRegForm({...regForm, tshirt: e.target.value})}
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                >
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">বর্তমান ঠিকানা/এিয়া</label>
                <input 
                  type="text" 
                  value={regForm.area}
                  onChange={e => setRegForm({...regForm, area: e.target.value})}
                  className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-600"
                  placeholder="যেমন: ঢাকা, নেত্রকোণা"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-emerald-700 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-800 transition"
              >
                {isSubmitting ? 'সাবমিট হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-emerald-800">সহপাঠী তালিকা ({members.length})</h3>
            {isLoading ? (
              <p className="text-center text-gray-500 py-6">লোড হচ্ছে...</p>
            ) : members.length === 0 ? (
              <p className="text-center text-gray-500 py-6">এখনো কোনো রেজিস্ট্রেশন পাওয়া যায়নি।</p>
            ) : (
              members.map((m, idx) => (
                <div key={m.id || idx} className="bg-white p-3 rounded-lg shadow border border-gray-100 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-sm">{m.name}</h4>
                    <p className="text-xs text-gray-500">ব্যাচ: {m.batch} | সাইজ: {m.tshirt}</p>
                    <p className="text-xs text-gray-400">{m.area}</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium">নিবন্ধিত</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow flex flex-col h-[75vh]">
            <div className="p-3 bg-emerald-800 text-white rounded-t-xl font-semibold text-sm">
              💬 লাইভ গ্রুপ চ্যাট
            </div>
            <div className="p-2 border-b bg-gray-50">
              <input 
                type="text" 
                placeholder="আপনার নাম লিখুন (মেসেজ পাঠানোর আগে)" 
                value={chatUserName}
                onChange={e => setChatUserName(e.target.value)}
                className="w-full border rounded p-1.5 text-xs bg-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-xs my-auto">কোনো মেসেজ নেই। প্রথম মেসেজটি পাঠান!</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={msg.id || idx} className="bg-white p-2.5 rounded-lg shadow-sm border border-gray-100 text-xs">
                    <div className="flex justify-between font-bold text-emerald-800 mb-1">
                      <span>{msg.sender}</span>
                      <span className="text-[10px] text-gray-400 font-normal">{msg.time}</span>
                    </div>
                    <p className="text-gray-700">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendMessage} className="p-2 border-t bg-white flex gap-2 rounded-b-xl">
              <input 
                type="text" 
                placeholder="কিছু লিখুন..." 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
              />
              <button type="submit" className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-800">
                পাঠান
              </button>
            </form>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="bg-white p-5 rounded-xl shadow text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              🎙️
            </div>
            <h3 className="text-lg font-bold text-gray-800">লাইভ অডিও আড্ডা রুম</h3>
            <p className="text-xs text-gray-500">
              একসাথে ১০০ জন সরাসরি কথা বলার ভয়েস রুম চালু করতে নিচের বাটনে ক্লিক করুন।
            </p>
            <a 
              href="https://meet.jit.si/SandikonaReunion2027Audio100" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium shadow hover:bg-blue-700 transition text-sm"
            >
              রুম ওপেন করুন (Join Room)
            </a>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 shadow-lg">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center text-xs ${activeTab === 'home' ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}
        >
          🏠 <span className="mt-0.5">হোম</span>
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`flex flex-col items-center text-xs ${activeTab === 'directory' ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}
        >
          👥 <span className="mt-0.5">সহপাঠী</span>
        </button>
        <button 
          onClick={() => setActiveTab('register')}
          className={`flex flex-col items-center text-xs ${activeTab === 'register' ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}
        >
          📝 <span className="mt-0.5">নিবন্ধন</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center text-xs ${activeTab === 'chat' ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}
        >
          💬 <span className="mt-0.5">আড্ডা</span>
        </button>
        <button 
          onClick={() => setActiveTab('audio')}
          className={`flex flex-col items-center text-xs ${activeTab === 'audio' ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}
        >
          🎙️ <span className="mt-0.5">অডিও</span>
        </button>
      </nav>
    </div>
  );
}
