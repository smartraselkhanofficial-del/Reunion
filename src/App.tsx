import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { AlumniDirectory } from './components/AlumniDirectory';
import { ChatRoom } from './components/ChatRoom';
import { AdminVerificationPanel } from './components/AdminVerificationPanel';
import { Home, Users, MessageSquare, Shield, Globe } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'chat' | 'admin'>('dashboard');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  // ডেমো ইউজার স্টেট (লগইন থাকলে Supabase থেকে আসবে)
  const [userProfile, setUserProfile] = useState({
    id: 'usr_test_123',
    full_name_bn: 'আব্দুল করিম',
    role: 'super_admin', // 'approved_member' অথবা 'super_admin'
    verification_status: 'approved',
    avatar_url: null
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-sans">
      {/* টপ ন্যাভবার */}
      <nav className="bg-[#0D5C3A] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <span className="font-bold text-lg tracking-wide">পুনর্মিলনী ২০২৭</span>
        <button 
          onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
          className="flex items-center gap-1 text-xs bg-emerald-800/80 px-2.5 py-1.5 rounded-lg border border-emerald-600"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
        </button>
      </nav>

      {/* মূল কনটেন্ট ভিউয়ার */}
      <main className="max-w-6xl mx-auto">
        {activeTab === 'dashboard' && <Dashboard lang={lang} userProfile={userProfile} />}
        {activeTab === 'directory' && <AlumniDirectory />}
        {activeTab === 'chat' && (
          <div className="p-4">
            <ChatRoom groupId="group-reunion-all" currentUserId={userProfile.id} />
          </div>
        )}
        {activeTab === 'admin' && <AdminVerificationPanel />}
      </main>

      {/* মোবাইল বটম ন্যাভিগেশন বার */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around py-2.5 z-50 shadow-lg">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-[#0D5C3A] font-bold' : 'text-slate-500'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">ড্যাশবোর্ড</span>
        </button>
        <button 
          onClick={() => setActiveTab('directory')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'directory' ? 'text-[#0D5C3A] font-bold' : 'text-slate-500'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px]">ডিরেক্টরি</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-[#0D5C3A] font-bold' : 'text-slate-500'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[11px]">মেসেজ</span>
        </button>
        {userProfile.role === 'super_admin' && (
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-[#0D5C3A] font-bold' : 'text-slate-500'}`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[11px]">অ্যাডমিন</span>
          </button>
        )}
      </div>
    </div>
  );
}
