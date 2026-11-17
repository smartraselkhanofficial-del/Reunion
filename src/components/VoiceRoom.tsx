import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Room, RoomEvent, Track, RemoteParticipant } from 'livekit-client';
import { db } from '../firebase';
import { UserProfile } from '../types';

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
  joinedAt: number;
}

const ROOM_ID = 'ssc_2014_main';
const TOKEN_SERVICE_URL = 'https://ssc-batch-2014-voice-token.nurejannattv24.workers.dev';

export default function VoiceRoom({ currentUser, userProfile, onClose }: VoiceRoomProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [roomDuration, setRoomDuration] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'voice_rooms', ROOM_ID, 'participants'),
      (snapshot) => setParticipants(snapshot.docs.map((item) => item.data() as Participant)),
      (err) => setError('সদস্য তালিকা লোড হয়নি: ' + err.message)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const timer = window.setInterval(() => setRoomDuration((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isConnected]);

  const removeAudioElements = useCallback(() => {
    audioElementsRef.current.forEach((element) => {
      element.pause();
      element.srcObject = null;
      element.remove();
    });
    audioElementsRef.current = [];
  }, []);

  const leaveRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try { await room.disconnect(); } catch (e) { /* ignore disconnect cleanup errors */ }
    }
    removeAudioElements();
    if (currentUser) {
      await deleteDoc(doc(db, 'voice_rooms', ROOM_ID, 'participants', currentUser.uid)).catch(() => {});
    }
    setIsConnected(false);
    setIsMuted(false);
  }, [currentUser, removeAudioElements]);

  useEffect(() => () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) void room.disconnect();
    removeAudioElements();
    if (currentUser) {
      void deleteDoc(doc(db, 'voice_rooms', ROOM_ID, 'participants', currentUser.uid)).catch(() => {});
    }
  }, [currentUser, removeAudioElements]);

  const joinRoom = async () => {
    if (!currentUser || !userProfile || isJoining || isConnected) return;
    setIsJoining(true);
    setError('');
    let room: Room | null = null;

    try {
      const firebaseToken = await currentUser.getIdToken();
      const response = await fetch(TOKEN_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + firebaseToken
        },
        body: JSON.stringify({ room: ROOM_ID })
      });
      const payload = await response.json();
      if (!response.ok || !payload.token || !payload.serverUrl) {
        throw new Error(payload.error || 'ভয়েস রুমের নিরাপদ টোকেন পাওয়া যায়নি।');
      }

      room = new Room({ adaptiveStream: true, dynacast: true });
      room.on(RoomEvent.TrackSubscribed, (track, _publication, _participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audio = track.attach() as HTMLAudioElement;
          audio.autoplay = true;
          audio.setAttribute('playsinline', 'true');
          document.body.appendChild(audio);
          audioElementsRef.current.push(audio);
          void audio.play().catch(() => setError('অন্যদের কথা শুনতে ফোনের অডিও চালু করুন।'));
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => {
          element.remove();
          audioElementsRef.current = audioElementsRef.current.filter((item) => item !== element);
        });
      });
      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsMuted(false);
        removeAudioElements();
      });

      await room.connect(payload.serverUrl, payload.token);
      roomRef.current = room;
      await room.localParticipant.setMicrophoneEnabled(true);

      await setDoc(doc(db, 'voice_rooms', ROOM_ID, 'participants', currentUser.uid), {
        uid: currentUser.uid,
        name: userProfile.fullName || userProfile.name || 'ব্যাচের বন্ধু',
        village: userProfile.village || userProfile.area || '',
        isMuted: false,
        isHandRaised: false,
        joinedAt: Date.now()
      });
      setIsConnected(true);
    } catch (err) {
      if (room) await room.disconnect().catch(() => {});
      roomRef.current = null;
      removeAudioElements();
      const message = err instanceof Error ? err.message : 'সংযোগ করা যায়নি।';
      setError(message + ' আবার চেষ্টা করুন।');
    } finally {
      setIsJoining(false);
    }
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !isMuted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextMuted);
      setIsMuted(nextMuted);
      if (currentUser) {
        await setDoc(doc(db, 'voice_rooms', ROOM_ID, 'participants', currentUser.uid), { isMuted: nextMuted }, { merge: true });
      }
    } catch (err) {
      setError('মাইক্রোফোন পরিবর্তন করা যায়নি। ফোনের পারমিশন পরীক্ষা করুন।');
    }
  };

  const toggleHand = async () => {
    if (!currentUser) return;
    const next = !isHandRaised;
    setIsHandRaised(next);
    await setDoc(doc(db, 'voice_rooms', ROOM_ID, 'participants', currentUser.uid), { isHandRaised: next }, { merge: true }).catch(() => setError('হাত তোলার তথ্য পাঠানো যায়নি।'));
  };

  const formatTimer = (seconds: number) =>
    Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0');

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0A2518', zIndex: 1000000, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', color: '#FFFFFF' }}>
      <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#10B981', background: 'rgba(16,185,129,0.2)', padding: '4px 12px', borderRadius: 14, fontWeight: 800 }}>
            ● {isConnected ? 'লাইভ ভয়েস আড্ডা' : 'ভয়েস রুম'} ({participants.length} জন)
          </span>
          <span style={{ fontSize: 12, color: '#38BDF8', fontFamily: 'monospace' }}>⏱ {formatTimer(roomDuration)}</span>
        </div>
        <h3 style={{ fontSize: 18, margin: '10px 0 2px', fontWeight: 900, color: '#FEF08A' }}>এসএসসি ২০১৪ ব্যাচ মিলনমেলা</h3>
        <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>সান্দিকোনা স্কুল এন্ড কলেজ</p>
      </div>

      {error && <div role="alert" style={{ background: '#7F1D1D', color: '#FEE2E2', borderRadius: 10, padding: 10, fontSize: 12, marginTop: 12 }}>{error}</div>}

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 4px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignContent: 'start' }}>
        {participants.map((person) => (
          <div key={person.uid} style={{ background: '#06351F', borderRadius: 16, padding: '12px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            {person.isHandRaised && <span style={{ display: 'block', fontSize: 16 }}>✋</span>}
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#116B3E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 18, fontWeight: 800 }}>
              {(person.name || 'ব').charAt(0)}
            </div>
            <h5 style={{ margin: '0 0 2px', fontSize: 12, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</h5>
            <span style={{ fontSize: 9, color: '#A7F3D0' }}>{person.village || 'সহপাঠী'}</span>
            <span style={{ display: 'block', fontSize: 10, marginTop: 4 }}>{person.isMuted ? '🔇' : '🎙️'}</span>
          </div>
        ))}
        {participants.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#A7F3D0', fontSize: 13 }}>এখনো কেউ ভয়েস রুমে যোগ দেননি।</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
        {!isConnected ? (
          <button onClick={joinRoom} disabled={isJoining} style={{ background: '#10B981', color: '#fff', border: 0, padding: '12px 22px', borderRadius: 16, fontWeight: 800, opacity: isJoining ? 0.65 : 1 }}>
            {isJoining ? 'সংযোগ হচ্ছে…' : '🎙️ রুমে যোগ দিন'}
          </button>
        ) : (
          <>
            <button onClick={toggleMute} style={{ background: isMuted ? '#EF4444' : '#10B981', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 800 }}>
              {isMuted ? '🔇 আনমিউট' : '🎙️ মিউট'}
            </button>
            <button onClick={toggleHand} style={{ background: isHandRaised ? '#F59E0B' : '#1E3A2F', color: '#fff', border: 0, padding: '10px 14px', borderRadius: 16, fontSize: 13, fontWeight: 800 }}>
              ✋ {isHandRaised ? 'হাত নামান' : 'হাত তুলুন'}
            </button>
          </>
        )}
        <button onClick={async () => { await leaveRoom(); onClose(); }} style={{ background: '#DC2626', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 16, fontSize: 13, fontWeight: 800 }}>🚪 লিভ</button>
      </div>
    </div>
  );
}
