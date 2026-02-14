import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db, collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationsPage() {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'users', currentUser.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(notifs);
            setLoading(false);

            // Mark all as read (simplified approach)
            // In a real app, you might want to do this only when seen or clicked
            snapshot.docs.forEach(d => {
                if (!d.data().read) {
                    updateDoc(doc(db, 'users', currentUser.uid, 'notifications', d.id), { read: true });
                }
            });
        });

        return unsubscribe;
    }, [currentUser]);

    return (
        <div className="max-w-md mx-auto p-4 md:py-8 min-h-[80vh]">
            <h1 className="text-xl font-bold mb-6">Notificaciones</h1>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-papu-coral"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No tienes notificaciones aún.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notif, i) => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-center justify-between group cursor-pointer hover:bg-secondary/30 p-2 rounded-lg transition-colors ${!notif.read ? 'bg-secondary/10' : ''}`}
                        >
                            <Link to={`/profile/${notif.fromUser?.username || 'user'}`} className="flex items-center gap-3 flex-1">
                                <div className="relative">
                                    <img
                                        src={notif.fromUser?.avatarUrl || notif.fromUser?.avatar || "https://github.com/shadcn.png"}
                                        className="w-10 h-10 rounded-full object-cover border border-border"
                                    />
                                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                                        {notif.type === 'like' && <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />}
                                        {notif.type === 'follow' && <UserPlus className="w-3.5 h-3.5 text-papu-violet fill-papu-violet" />}
                                        {notif.type === 'comment' && <MessageCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <span className="font-semibold mr-1">{notif.fromUser?.username || 'Alguien'}</span>
                                    {notif.type === 'like' && 'le gustó tu foto.'}
                                    {notif.type === 'follow' && 'comenzó a seguirte.'}
                                    {notif.type === 'comment' && 'comentó tu publicación.'}
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: es }) : 'recién'}
                                    </span>
                                </div>
                            </Link>

                            {notif.postImage && (
                                <Link to={`/`} className="ml-2">
                                    <img src={notif.postImage} className="w-10 h-10 object-cover rounded" />
                                </Link>
                            )}
                            {notif.type === 'follow' && notif.fromUser?.username && (
                                <Link to={`/profile/${notif.fromUser.username}`}>
                                    <button className="bg-papu-coral text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-papu-coral/90">
                                        Ver perfil
                                    </button>
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
