import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ফায়ারবেস থেকে কপি করা আপনার কনফিগারেশন এখানে বসিয়ে দিন
const firebaseConfig = {
  // Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore (ডেটাবেজের জন্য)
export const db = getFirestore(app);
