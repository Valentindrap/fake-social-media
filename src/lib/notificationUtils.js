import { db, collection, addDoc, serverTimestamp, getDoc, doc } from './firebase';

export async function sendPushNotification(toUserId, title, body, data = {}) {
    try {
        const userSnap = await getDoc(doc(db, 'users', toUserId));
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const tokens = userData.fcmTokens || [];

        if (tokens.length === 0) return;

        await fetch('/api/send-push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokens,
                title,
                body,
                data
            }),
        });
    } catch (error) {
        console.error("Error sending push notification helper:", error);
    }
}

export async function createNotification(toUserId, type, fromUser, postId = null, postImage = null) {
    if (toUserId === fromUser.uid) return; // Don't notify yourself

    try {
        await addDoc(collection(db, 'users', toUserId, 'notifications'), {
            type, // 'like', 'comment', 'follow', 'vote'
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

        // Push Notification
        const titles = {
            like: '¡Nuevo me gusta!',
            comment: 'Nuevo comentario',
            follow: 'Nuevo seguidor',
            vote: 'Nuevo voto en tu encuesta'
        };
        const bodies = {
            like: `${fromUser.username} le dio me gusta a tu publicación`,
            comment: `${fromUser.username} comentó tu publicación`,
            follow: `${fromUser.username} comenzó a seguirte`,
            vote: `${fromUser.username} votó en tu encuesta`
        };

        await sendPushNotification(toUserId, titles[type] || 'Nueva notificación', bodies[type] || 'Tenés una nueva notificación');
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}
