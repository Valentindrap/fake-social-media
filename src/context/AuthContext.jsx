import { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, db, doc, setDoc, getDoc, onSnapshot } from '@/lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (!user) {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (currentUser) {
            setLoading(true);
            const unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setUserProfile({ uid: currentUser.uid, ...docSnapshot.data() });
                }
                setLoading(false);
            });
            return () => unsubscribeProfile();
        }
    }, [currentUser]);

    const signup = async (email, password, username, displayName) => {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            username: username.toLowerCase(),
            displayName,
            bio: '',
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            followers: 0,
            following: 0,
            createdAt: new Date().toISOString(),
        });

        return user;
    };

    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        const { user } = await signInWithPopup(auth, googleProvider);

        // Check if user profile exists, if not create one
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            const username = user.email.split('@')[0].toLowerCase();
            await setDoc(doc(db, 'users', user.uid), {
                username,
                displayName: user.displayName || username,
                bio: '',
                avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                followers: 0,
                following: 0,
                createdAt: new Date().toISOString(),
            });
        }

        return user;
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        userProfile,
        signup,
        login,
        loginWithGoogle,
        logout,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
