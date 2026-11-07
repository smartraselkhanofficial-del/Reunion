import React from 'react';
import { UserProfile } from '../types';

type Props = { profile: UserProfile; onBack: () => void };

export default function PublicProfilePage({ profile, onBack }: Props) {
  const name = profile.fullName || profile.name || 'বন্ধু';
  const showPhone = profile.privacySettings?.showPhone === true;
  const showDob = profile.privacySettings?.showDob === true;
  const rows = [
    ['পেশা', profile.profession],
    ['বর্তমান ঠিকানা', profile.currentLocation],
    ['স্থায়ী ঠিকানা', profile.permanentAddress || profile.village],
    ['প্রতিষ্ঠান', profile.schoolName || 'সান্দিকোনা স্কুল এন্ড কলেজ'],
    ['ব্যাচ', profile.batchYear || '২০১৪'],
    ['জন্মতারিখ', showDob ? profile.dateOfBirth : ''],
    ['মোবাইল', showPhone ? (profile.phoneNumber || profile.phone) : ''],
    ['WhatsApp', showPhone ? profile.whatsappNumber : ''],
  ].filter((item) => Boolean(item[1]));

  return (
    <section style={{ background:'#F5F3FF', borderRadius:16, padding:14, marginBottom:18 }}>
      <button type="button" onClick={onBack} style={{ border:0, borderRadius:9, padding:'9px 12px', background:'#EDE9FE', color:'#5B21B6', fontWeight:700, marginBottom:12 }}>← ফিরে যান</button>
      <div style={{ height:125, borderRadius:14, background:profile.coverImage ? 'center/cover url(' + profile.coverImage + ')' : 'linear-gradient(120deg,#4C1D95,#7C3AED,#312E81)', position:'relative', marginBottom:52 }}>
        <div style={{ position:'absolute', left:18, bottom:-42, width:88, height:88, borderRadius:'50%', border:'4px solid white', background:'#7C3AED', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', fontSize:30, fontWeight:800 }}>
          {profile.profileImage ? <img src={profile.profileImage} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : name.charAt(0)}
        </div>
      </div>
      <h2 style={{ color:'#4C1D95', margin:'0 0 4px 0' }}>{name}</h2>
      <p style={{ color:'#64748B', fontSize:13, margin:'0 0 12px 0' }}>এস এস সি ব্যাচ ২০১৪ কমিউনিটি</p>
      {profile.bio && <p style={{ background:'#fff', borderRadius:10, padding:12, color:'#334155', fontSize:13, whiteSpace:'pre-line' }}>{profile.bio}</p>}
      <div style={{ background:'#fff', borderRadius:12, padding:'4px 12px' }}>
        {rows.map(([label, value]) => <div key={label} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'10px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 }}><strong style={{color:'#64748B'}}>{label}</strong><span style={{color:'#1F2937', textAlign:'right'}}>{value}</span></div>)}
      </div>
      {profile.facebookUrl && <a href={profile.facebookUrl} target="_blank" rel="noreferrer" style={{ display:'block', marginTop:12, background:'#1877F2', color:'#fff', textAlign:'center', padding:11, borderRadius:10, textDecoration:'none', fontWeight:700 }}>Facebook প্রোফাইল দেখুন</a>}
    </section>
  );
}
