import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile } from '../types';

type Props = { userId: string; profile: UserProfile; onBack: () => void };

export default function ProfilePage({ userId, profile, onBack }: Props) {
  const [form, setForm] = useState({
    fullName: profile.fullName || profile.name || '',
    email: profile.email || '',
    phoneNumber: profile.phoneNumber || profile.phone || '',
    whatsappNumber: profile.whatsappNumber || '',
    schoolName: profile.schoolName || 'সান্দিকোনা স্কুল এন্ড কলেজ',
    batchYear: profile.batchYear || '২০১৪',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
    profession: profile.profession || '',
    currentLocation: profile.currentLocation || '',
    permanentAddress: profile.permanentAddress || profile.village || '',
    facebookUrl: profile.facebookUrl || '',
    bio: profile.bio || ''
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      fullName: profile.fullName || profile.name || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || profile.phone || '',
      whatsappNumber: profile.whatsappNumber || '',
      schoolName: profile.schoolName || 'সান্দিকোনা স্কুল এন্ড কলেজ',
      batchYear: profile.batchYear || '২০১৪',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      profession: profile.profession || '',
      currentLocation: profile.currentLocation || '',
      permanentAddress: profile.permanentAddress || profile.village || '',
      facebookUrl: profile.facebookUrl || '',
      bio: profile.bio || ''
    });
  }, [profile]);

  const change = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }));
  const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #DDD6FE', borderRadius: '10px', background: '#fff', fontSize: '14px', outlineColor: '#7C3AED' };
  const labelStyle: React.CSSProperties = { display: 'block', color: '#4C1D95', fontSize: '12px', fontWeight: 700, marginBottom: '5px' };

  const uploadImage = async (file: File, kind: 'profile' | 'cover') => {
    if (file.size > 5 * 1024 * 1024) throw new Error('ছবির আকার ৫ MB-এর কম হতে হবে।');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const imageRef = ref(storage, 'userProfiles/' + userId + '/' + kind + '_' + Date.now() + '_' + safeName);
    await uploadBytes(imageRef, file, { contentType: file.type });
    return await getDownloadURL(imageRef);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      let profileImage = profile.profileImage || '';
      let coverImage = profile.coverImage || '';
      if (photo) profileImage = await uploadImage(photo, 'profile');
      if (cover) coverImage = await uploadImage(cover, 'cover');
      const updated = {
        ...form,
        name: form.fullName,
        phone: form.phoneNumber,
        profileImage: profileImage || null,
        coverImage: coverImage || null,
        profileCompleted: Boolean(form.fullName.trim() && form.phoneNumber.trim()),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'users', userId), updated, { merge: true });
      setPhoto(null);
      setCover(null);
      setMessage('আপনার প্রোফাইল সফলভাবে সংরক্ষণ হয়েছে।');
    } catch (err: any) {
      setMessage(err?.code === 'storage/unauthorized'
        ? 'ছবি আপলোডের অনুমতি Firebase Storage-এ চালু নেই। Firebase Storage Rules ঠিক করতে হবে।'
        : (err?.message || 'সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ background: '#F5F3FF', borderRadius: '16px', padding: '14px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <button type="button" onClick={onBack} style={{ border: 0, borderRadius: '9px', padding: '9px 12px', background: '#EDE9FE', color: '#5B21B6', fontWeight: 700 }}>← ফিরে যান</button>
        <div><h2 style={{ margin: 0, color: '#4C1D95', fontSize: '19px' }}>আমার প্রোফাইল</h2><small style={{ color: '#7C3AED' }}>আপনার তথ্য সম্পাদনা করুন</small></div>
      </div>
      <div style={{ height: '112px', borderRadius: '14px', background: profile.coverImage ? 'center/cover url(' + profile.coverImage + ')' : 'linear-gradient(120deg,#4C1D95,#7C3AED,#312E81)', position: 'relative', marginBottom: '48px' }}>
        <div style={{ position: 'absolute', left: '16px', bottom: '-38px', width: '76px', height: '76px', borderRadius: '50%', border: '4px solid white', background: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '28px', fontWeight: 800 }}>
          {profile.profileImage ? <img src={profile.profileImage} alt="প্রোফাইল ছবি" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile.name || profile.fullName || 'স').charAt(0)}
        </div>
      </div>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={labelStyle}>প্রোফাইল ছবি<input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} style={{ ...fieldStyle, padding: '7px', marginTop: '5px', fontSize: '11px' }} /></label>
          <label style={labelStyle}>কভার ছবি<input type="file" accept="image/*" onChange={e => setCover(e.target.files?.[0] || null)} style={{ ...fieldStyle, padding: '7px', marginTop: '5px', fontSize: '11px' }} /></label>
        </div>
        <label><span style={labelStyle}>পূর্ণ নাম</span><input required value={form.fullName} onChange={e => change('fullName', e.target.value)} style={fieldStyle} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label><span style={labelStyle}>মোবাইল নম্বর</span><input value={form.phoneNumber} onChange={e => change('phoneNumber', e.target.value)} style={fieldStyle} /></label>
          <label><span style={labelStyle}>WhatsApp নম্বর</span><input value={form.whatsappNumber} onChange={e => change('whatsappNumber', e.target.value)} style={fieldStyle} /></label>
        </div>
        <label><span style={labelStyle}>ইমেইল</span><input type="email" value={form.email} onChange={e => change('email', e.target.value)} style={fieldStyle} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label><span style={labelStyle}>জন্মতারিখ</span><input type="date" value={form.dateOfBirth} onChange={e => change('dateOfBirth', e.target.value)} style={fieldStyle} /></label>
          <label><span style={labelStyle}>লিঙ্গ</span><select value={form.gender} onChange={e => change('gender', e.target.value)} style={fieldStyle}><option value="">নির্বাচন করুন</option><option>পুরুষ</option><option>নারী</option><option>অন্যান্য</option></select></label>
        </div>
        <label><span style={labelStyle}>পেশা</span><input value={form.profession} onChange={e => change('profession', e.target.value)} style={fieldStyle} /></label>
        <label><span style={labelStyle}>বর্তমান ঠিকানা</span><input value={form.currentLocation} onChange={e => change('currentLocation', e.target.value)} style={fieldStyle} /></label>
        <label><span style={labelStyle}>স্থায়ী ঠিকানা / গ্রাম</span><input value={form.permanentAddress} onChange={e => change('permanentAddress', e.target.value)} style={fieldStyle} /></label>
        <label><span style={labelStyle}>Facebook প্রোফাইল লিংক</span><input type="url" value={form.facebookUrl} onChange={e => change('facebookUrl', e.target.value)} style={fieldStyle} /></label>
        <label><span style={labelStyle}>নিজের সম্পর্কে</span><textarea value={form.bio} onChange={e => change('bio', e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} /></label>
        <div style={{ background: '#EDE9FE', padding: '10px', borderRadius: '10px', color: '#5B21B6', fontSize: '12px' }}>প্রতিষ্ঠান: {form.schoolName} • ব্যাচ: {form.batchYear}</div>
        {message && <div style={{ padding: '10px', borderRadius: '9px', background: message.includes('সফল') ? '#DCFCE7' : '#FEE2E2', color: message.includes('সফল') ? '#166534' : '#991B1B', fontSize: '12px' }}>{message}</div>}
        <button type="submit" disabled={saving} style={{ background: 'linear-gradient(135deg,#6D28D9,#4338CA)', color: '#fff', border: 0, borderRadius: '10px', padding: '13px', fontWeight: 800, fontSize: '14px' }}>{saving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সংরক্ষণ করুন'}</button>
      </form>
    </section>
  );
}
