import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      fontFamily: 'sans-serif',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#f4f6f8',
      minHeight: '100vh',
      color: '#333'
    }}>
      <header style={{
        backgroundColor: '#0D5C3A',
        color: '#fff',
        padding: '24px',
        borderRadius: '16px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>পুনর্মিলনী ২০২৭</h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#d1fae5' }}>
          এসএসসি ২০১৪ ও এইচএসসি ২০১৬ ব্যাচ
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#a7f3d0' }}>
          সান্দিকোনা স্কুল এন্ড কলেজ, কেন্দুয়া, নেত্রকোনা
        </p>
      </header>

      <main style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <h2>স্বাগতম! অ্যাপটি সফলভাবে ইনস্টল হয়েছে।</h2>
        <p style={{ color: '#666' }}>খুব শীঘ্রই এখানে সম্পূর্ণ ড্যাশবোর্ড ও ডিরেক্টরি লাইভ হবে।</p>
        
        <button 
          onClick={() => setCount(c => c + 1)}
          style={{
            backgroundColor: '#0D5C3A',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          ক্লিক টেস্ট: {count}
        </button>
      </main>
    </div>
  );
}
