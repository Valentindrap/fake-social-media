import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { createNotification } from '@/lib/notificationUtils';

export function useFollow(targetUserId) {
    const { currentUser, userProfile } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userProfile?.followingList && targetUserId) {
            setIsFollowing(userProfile.followingList.includes(targetUserId));
        }
    }, [userProfile, targetUserId]);

    const toggleFollow = async () => {
        if (!currentUser || !targetUserId || loading) return;

        setLoading(true);
        const prevFollowing = isFollowing;
        // Optimistic update
        setIsFollowing(!prevFollowing);

        try {
            const userRef = doc(db, 'users', targetUserId);
            const currentUserRef = doc(db, 'users', currentUser.uid);

            if (prevFollowing) {
                // Unfollow
                await updateDoc(userRef, {
                    followers: increment(-1),
                    followersList: arrayRemove(currentUser.uid)
                });
                await updateDoc(currentUserRef, {
                    following: increment(-1),
                    followingList: arrayRemove(targetUserId)
                });
            } else {
                // Follow
                await updateDoc(userRef, {
                    followers: increment(1),
                    followersList: arrayUnion(currentUser.uid)
                });
                await updateDoc(currentUserRef, {
                    following: increment(1),
                    followingList: arrayUnion(targetUserId)
                });

                // Notification
                await createNotification(
                    targetUserId,
                    'follow',
                    { uid: currentUser.uid, username: userProfile.username, avatarUrl: userProfile.avatarUrl }
                );
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
            setIsFollowing(prevFollowing); // Revert
        } finally {
            setLoading(false);
        }
    };

    return { isFollowing, toggleFollow, loading };
}
