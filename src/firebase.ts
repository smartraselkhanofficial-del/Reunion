import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// ফায়ারবেস কনসোল থেকে পাওয়া আপনার কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyBuY0Ns2bX1RlSK8673LnSQWnNpMcEJhRw",
  authDomain: "reunion-2027-4cedf.firebaseapp.com",
  projectId: "reunion-2027-4cedf",
  storageBucket: "reunion-2027-4cedf.firebasestorage.app",
  messagingSenderId: "221061203254",
  appId: "1:221061203254:web:834a0b5f60ced9429adf97",
  measurementId: "G-Z5Z8FJGN4T"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Cloud Firestore (ডেটাবেজের জন্য)
export const db = getFirestore(app);
