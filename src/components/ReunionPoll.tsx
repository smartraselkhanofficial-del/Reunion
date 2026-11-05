import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase";
import { UserProfile } from "../types";

interface PollData {
  question: string;
  options: string[];
  votes: { [uid: string]: number };
}

interface ReunionPollProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  onOpenAuth: () => void;
}

export default function ReunionPoll({ currentUser, userProfile, onOpenAuth }: ReunionPollProps) {
  const [poll, setPoll] = useState<PollData | null>(null);

  useEffect(() => {
    // ফায়ারবেস থেকে লাইভ জরিপ ডেটা আনা
    const unsub = onSnapshot(doc(db, "settings", "active_poll"), (d) => {
      if (d.exists()) {
        setPoll(d.data() as PollData);
      } else {
        // ডিফল্ট জরিপ
        setPoll({
          question: "পুনর্মিলনী ২০২৭-এ আপনি কি সপরিবারে অংশগ্রহণ করবেন?",
          options: ["হ্যাঁ, অবশ্যই", "একা আসব", "এখনও নিশ্চিত নই"],
          votes: {}
        });
      }
    });

    return () => unsub();
  }, []);

  const handleVote = async (optionIndex: number) => {
    if (!currentUser || !userProfile) {
      alert("ভোট দেওয়ার জন্য প্রথমে লগইন করুন।");
      onOpenAuth();
      return;
    }
    if (!poll) return;

    try {
      const updatedVotes = { ...(poll.votes || {}), [currentUser.uid]: optionIndex };
      await setDoc(doc(db, "settings", "active_poll"), { ...poll, votes: updatedVotes }, { merge: true });
    } catch (e) {
      alert("ভোট গ্রহণ করা যায়নি।");
    }
  };

  if (!poll) return null;

  const totalVotes = Object.keys(poll.votes || {}).length;
  const userVote = currentUser ? poll.votes?.[currentUser.uid] : undefined;

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '14px',
      marginBottom: '14px',
      border: '1.5px solid #FEF08A',
      boxShadow: '0 3px 12px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', color: '#854D0E', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📊</span> পুনর্মিলনী মতামত জরিপ
        </h4>
        <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' }}>
          {totalVotes + " টি ভোট"}
        </span>
      </div>

      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#1E293B', fontWeight: '700' }}>
        {poll.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {poll.options.map((opt, idx) => {
          const optVotes = Object.values(poll.votes || {}).filter(v => v === idx).length;
          const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
          const isSelected = userVote === idx;

          return (
            <div
              key={idx}
              onClick={() => handleVote(idx)}
              style={{
                background: isSelected ? '#DCFCE7' : '#F8FAFC',
                border: isSelected ? '1.5px solid #16A34A' : '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '8px 10px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* লাইভ পারসেন্টেজ বার */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: percentage + "%",
                background: isSelected ? 'rgba(22, 163, 74, 0.15)' : 'rgba(203, 213, 225, 0.25)',
                zIndex: 0,
                transition: 'width 0.4s ease'
              }} />

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#0F172A', fontWeight: isSelected ? '800' : '600' }}>
                  {(isSelected ? "✓ " : "") + opt}
                </span>
                <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '700' }}>
                  {percentage + "% (" + optVotes + ")"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
