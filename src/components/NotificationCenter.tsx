import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  type: 'admin' | 'member';
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (type: string) => void;
}

export default function NotificationCenter({ isOpen, onClose, onItemClick }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    // অ্যাডমিন নোটিশ আনা
    const qAdmin = query(collection(db, "admin_broadcasts"), orderBy("timestamp", "desc"), limit(15));
    const unsub = onSnapshot(qAdmin, (snap) => {
      const list: NotificationItem[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "📢 অ্যাডমিন বার্তা",
          body: data.body || "",
          timestamp: data.timestamp || Date.now(),
          type: 'admin'
        });
      });
      setNotifications(list);
    });

    return () => unsub();
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      zIndex: 999999,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div style={{
        width: '85%',
        maxWidth: '340px',
        backgroundColor: '#FFFFFF',
        height: '100%',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideLeft 0.25s ease-out'
      }}>
        {/* হেডার */}
        <div style={{
          background: '#0A4D2E',
          color: '#FFFFFF',
          padding: '16px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔔</span>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>নোটিফিকেশন হাব</h4>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#FEF08A', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* নোটিফিকেশন তালিকা */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94A3B8', fontSize: '12px' }}>
              কোনো নতুন নোটিফিকেশন নেই।
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => { onItemClick(n.type); onClose(); }}
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '12px',
                  border: '1px solid #E2E8F0',
                  borderLeft: '4px solid #D97706',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h5 style={{ margin: 0, fontSize: '12px', color: '#0F172A', fontWeight: '800' }}>
                    {n.title}
                  </h5>
                  <span style={{ fontSize: '9px', color: '#94A3B8' }}>
                    {new Date(n.timestamp).toLocaleDateString('bn-BD')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                  {n.body}
                </p>
              </div>
            ))
          )}
        </div>

        {/* ফুটার */}
        <div style={{ padding: '12px', borderTop: '1px solid #E2E8F0', textAlign: 'center', background: '#F8FAFC' }}>
          <span style={{ fontSize: '10px', color: '#64748B' }}>পুনর্মিলনী ২০২৭ অফিশিয়াল অ্যালার্ট</span>
        </div>
      </div>
    </div>
  );
}
