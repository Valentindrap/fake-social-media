import { db, collection, addDoc, serverTimestamp } from './firebase';

export async function createNotification(toUserId, type, fromUser, postId = null, postImage = null) {
    if (toUserId === fromUser.uid) return; // Don't notify yourself

    try {
        await addDoc(collection(db, 'users', toUserId, 'notifications'), {
            type, // 'like', 'comment', 'follow'
            fromUser: {
                uid: fromUser.uid,
                username: fromUser.username || 'Usuario',
                avatar: fromUser.avatarUrl || '',
            },
            postId,
            postImage,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}
