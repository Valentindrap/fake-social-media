import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, doc, updateDoc, arrayUnion } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

// VAPID Key provided by the user from Firebase Console
const VAPID_KEY = "BN6ZzPuDkSaqZhCBp833KLfi94dd2nfWFePuTjYBV-G-LU5xXW5G2ErV2HHU7u8tuwn40cVtXD8zc3i_9xH9gDA";

export default function NotificationManager() {
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!currentUser) return;

        const setupNotifications = async () => {
            try {
                // Register Service Worker
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        // In a real app, you'd use a real VAPID key here
                        try {
                            const token = await getToken(messaging, {
                                vapidKey: VAPID_KEY,
                                serviceWorkerRegistration: registration
                            });

                            if (token) {
                                console.log('FCM Token generated');
                                // Store token in user document (arrayUnion to support multiple devices)
                                const userRef = doc(db, 'users', currentUser.uid);
                                await updateDoc(userRef, {
                                    fcmTokens: arrayUnion(token)
                                });
                            }
                        } catch (tokenErr) {
                            console.warn('Could not get FCM token, might need a valid VAPID key:', tokenErr);
                        }
                    }
                }
            } catch (error) {
                console.error('Error setting up notifications:', error);
            }
        };

        setupNotifications();

        // Listen for foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);

            // Native notification if the tab is focused? 
            // Browsers usually don't show native notifications if the tab is visible unless forced.
            if (Notification.permission === 'granted') {
                new Notification(payload.notification.title, {
                    body: payload.notification.body,
                    icon: '/logo.png'
                });
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    return null;
}
