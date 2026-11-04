import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db } from "../firebase";
import { UserProfile } from "../types";

interface VoiceRoomProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  onClose: () => void;
}

interface Participant {
  uid: string;
  name: string;
  village: string;
  isMuted: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export default function VoiceRoom({ currentUser, userProfile, onClose }: VoiceRoomProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isSpeakingLocally, setIsSpeakingLocally] = useState(false);
  const [roomDuration, setRoomDuration] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<any>(null);

  // রুম কানেকশন ও মাইক্রোফোন ইনিশিয়ালাইজেশন
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    let cleanupStream: MediaStream | null = null;

    // ১. ডিভাইসের মাইক্রোফোন ধরা ও কথা বললে পালস ডিটেক্ট করা
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        cleanupStream = stream;

        // অডিও এনালাইজার দিয়ে কথা বলা শনাক্ত
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          const microphone = ctx.createMediaStreamSource(stream);
          microphone.connect(analyser);
          analyser.fftSize = 256;
          audioContextRef.current = ctx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkSpeaking = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            const speaking = avg > 25 && !isMuted;
            setIsSpeakingLocally(speaking);
            requestAnimationFrame(checkSpeaking);
          };
          checkSpeaking();
        } catch (e) {}

        // ২. ফায়ারবেসে পার্টিসিপেন্ট হিসেবে নিজেকে যুক্ত করা
        setDoc(doc(db, "voice_rooms", "ssc_2014_main", "participants", currentUser.uid), {
          uid: currentUser.uid,
          name: userProfile.name,
          village: userProfile.village || userProfile.area,
          isMuted: false,
          isHandRaised: false,
          joinedAt: Date.now()
        });
      })
      .catch(() => {
        alert("মাইক্রোফোন পারমিশন ছাড়া ভয়েস রুমে কথা বলা যাবে না।");
        onClose();
      });

    // ৩. রিয়েল-টাইম অন্যান্য পার্টিসিপেন্ট লিসেনার
    const unsub = onSnapshot(collection(db, "voice_rooms", "ssc_2014_main", "participants"), (snap) => {
      const list: Participant[] = [];
      snap.forEach(d => list.push(d.data() as Participant));
      setParticipants(list);
    });

    // ৪. রুম টাইমার
    timerRef.current = setInterval(() => setRoomDuration(d => d + 1), 1000);

    // রুম থেকে বের হওয়ার সময় ক্লিনিং
    return () => {
      unsub();
      if (timerRef.current) clearInterval(timerRef.current);
      if (cleanupStream) cleanupStream.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (currentUser) {
        deleteDoc(doc(db, "voice_rooms", "ssc_2014_main", "participants", currentUser.uid)).catch(() => {});
      }
    };
  }, [currentUser]);

  // মাইক মিউট / আনমিউট
  const toggleMute = () => {
    if (!currentUser || !localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);
    setDoc(doc(db, "voice_rooms", "ssc_2014_main", "participants", currentUser.uid), {
      isMuted: newMuted
    }, { merge: true });
  };

  // হাত তোলা
  const toggleHand = () => {
    if (!currentUser) return;
    const newHand = !isHandRaised;
    setIsHandRaised(newHand);
    setDoc(doc(db, "voice_rooms", "ssc_2014_main", "participants", currentUser.uid), {
      isHandRaised: newHand
    }, { merge: true });
  };

  // হোস্টের ক্ষমতা: সবাইকে মিউট করা
  const muteAllParticipants = async () => {
    if (userProfile?.role !== 'super_admin') return;
    if (!window.confirm("আপনি কি সবাইকে মিউট করতে চান?")) return;
    participants.forEach(p => {
      if (p.uid !== currentUser?.uid) {
        setDoc(doc(db, "voice_rooms", "ssc_2014_main", "participants", p.uid), {
          isMuted: true
        }, { merge: true });
      }
    });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return m + ":" + s;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0A2518',
      zIndex: 1000000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 16px',
      color: '#FFFFFF'
    }}>
      
      {/* হেডার */}
      <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 12px', borderRadius: '14px', fontWeight: '800' }}>
            ● লাইভ ভয়েস আড্ডা ({participants.length} জন)
          </span>
          <span style={{ fontSize: '12px', color: '#38BDF8', fontFamily: 'monospace' }}>
            ⏱ {formatTimer(roomDuration)}
          </span>
        </div>
        <h3 style={{ fontSize: '18px', margin: '10px 0 2px 0', fontWeight: '900', color: '#FEF08A' }}>
          এসএসসি ২০১৪ ব্যাচ মিলনমেলা
        </h3>
        <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
          সান্দিকোনা স্কুল এন্ড কলেজ
        </p>
      </div>

      {/* পার্টিসিপেন্টদের গ্রিড (স্পিকার টাইলস) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        alignContent: 'start'
      }}>
        {participants.map((p) => {
          const isMe = p.uid === currentUser?.uid;
          const isSpeaking = isMe ? isSpeakingLocally : false;

          return (
            <div key={p.uid} style={{
              background: '#06351F',
              borderRadius: '16px',
              padding: '12px 6px',
              textAlign: 'center',
              border: isSpeaking ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
              boxShadow: isSpeaking ? '0 0 16px rgba(16, 185, 129, 0.5)' : 'none',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}>
              {p.isHandRaised && (
                <span style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '14px' }}>
                  ✋
                </span>
              )}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: isSpeaking ? '#10B981' : '#116B3E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px auto',
                fontSize: '18px',
                fontWeight: '800'
              }}>
                {p.name.charAt(0)}
              </div>
              <h5 style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </h5>
              <span style={{ fontSize: '9px', color: '#A7F3D0', display: 'block' }}>
                {p.village || 'সহপাঠী'}
              </span>
              <span style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block' }}>
                {p.isMuted ? '🔇' : (isSpeaking ? '🔊' : '🎙️')}
              </span>
            </div>
          );
        })}
      </div>

      {/* অ্যাডমিন হোস্ট কন্ট্রোল */}
      {userProfile?.role === 'super_admin' && (
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <button
            onClick={muteAllParticipants}
            style={{ background: '#D97706', color: '#FFFFFF', border: 'none', padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
          >
            👑 সবাইকে মিউট করুন (Host Control)
          </button>
        </div>
      )}

      {/* নিচের কন্ট্রোল বার */}
      <div style={{
        background: '#061D13',
        padding: '12px 16px',
        borderRadius: '24px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* মিউট বাটন */}
        <button
          onClick={toggleMute}
          style={{
            background: isMuted ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>{isMuted ? '🔇' : '🎙️'}</span>
          <span>{isMuted ? 'আনমিউট' : 'মিউট'}</span>
        </button>

        {/* হাত তোলা বাটন */}
        <button
          onClick={toggleHand}
          style={{
            background: isHandRaised ? '#F59E0B' : '#1E3A2F',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 14px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          ✋ হাত তুলুন
        </button>

        {/* লিভ বাটন */}
        <button
          onClick={onClose}
          style={{
            background: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '16px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          🚪 লিভ
        </button>
      </div>

    </div>
  );
}
