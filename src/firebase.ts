import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBuY0Ns2bX1RlSK8673LnSQWnNpMcEJhRw",
  authDomain: "reunion-2027-4cedf.firebaseapp.com",
  projectId: "reunion-2027-4cedf",
  storageBucket: "reunion-2027-4cedf.firebasestorage.app",
  messagingSenderId: "221061203254",
  appId: "1:221061203254:web:834a0b5f60ced9429adf97"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = { /* আপনার বর্তমান কনফিগারেশন */ };

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// সেশন স্থায়ী করার নির্দেশ
setPersistence(auth, browserLocalPersistence);
