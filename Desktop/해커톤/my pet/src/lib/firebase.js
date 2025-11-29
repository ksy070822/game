// Firebase 설정 및 초기화
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAMubJk9qXmaz_V3uHiCGs0hRe6FSu9ji4",
  authDomain: "ai-factory-c6d58.firebaseapp.com",
  projectId: "ai-factory-c6d58",
  storageBucket: "ai-factory-c6d58.firebasestorage.app",
  messagingSenderId: "213197152130",
  appId: "1:213197152130:web:7c19f9c3c88bea7cc1399b",
  measurementId: "G-4D82WS9H7K"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 export
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
