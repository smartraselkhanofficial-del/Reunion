import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";\nimport { getStorage } from "firebase/storage";

// ১. আপনার বিদ্যমান ফায়ারবেস প্রোডাকশন কনফিগারেশন
export const firebaseConfig = {
  apiKey: "AIzaSyBuY0Ns2bX1RlSK8673LnSQWnNpMcEJhRw",
  authDomain: "reunion-2027-4cedf.firebaseapp.com",
  projectId: "reunion-2027-4cedf",
  storageBucket: "reunion-2027-4cedf.firebasestorage.app",
  messagingSenderId: "221061203254",
  appId: "1:221061203254:web:834a0b5f60ced9429adf97"
};

// ২. Firebase App Initialization (Singleton Pattern)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// ৩. Database এবং Auth ইন্সট্যান্স তৈরি
export const db = getFirestore(app);\nexport const storage = getStorage(app);
export const auth = getAuth(app);

// ৪. Persistent Session Promise
// এই Promise-টি Export করা হলো। App.tsx-এ Auth Listener বা Login কল করার আগে 
// অবশ্যই 'await authPersistenceReady' ব্যবহার করে এর নিশ্চয়তা নিতে হবে।
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);
