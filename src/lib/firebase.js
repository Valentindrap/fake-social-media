import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    increment,
    serverTimestamp,
    onSnapshot,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyA_uTuynTU1v_FjQkpaU76upIPM0A5WCAc",
    authDomain: "papuig-b9aca.firebaseapp.com",
    projectId: "papuig-b9aca",
    storageBucket: "papuig-b9aca.firebasestorage.app",
    messagingSenderId: "239378910369",
    appId: "1:239378910369:web:61218319e66451450c74e0",
    measurementId: "G-GPT1DTMFP3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Re-export Firestore utilities
export {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    increment,
    serverTimestamp,
    onSnapshot,
    arrayUnion,
    arrayRemove,
};

export default app;
