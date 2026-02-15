import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { db, collection, query, where, onSnapshot, orderBy } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function FloatingBubbles() {
    const { currentUser } = useAuth();
    const [activeChats, setActiveChats] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) return;

        // Listen for chats where the user is a participant
        // For bubbles, we might want to show chats with unread messages
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter chats that should have a bubble
            // A simple logic: chats with unread messages or recent interaction
            // For now, let's show top 3 chats with unread messages
            const unreadChats = chats.filter(chat => {
                const lastRead = chat.lastRead?.[currentUser.uid] || { seconds: 0 };
                const lastMsg = chat.lastMessage?.createdAt || { seconds: 0 };
                return lastMsg.seconds > lastRead.seconds;
            }).slice(0, 3);

            setActiveChats(unreadChats);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (!currentUser || activeChats.length === 0) return null;

    return (
        <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {activeChats.map((chat, index) => {
                    const otherUserId = chat.participants.find(p => p !== currentUser.uid);
                    const details = chat.userDetails?.[otherUserId] || {};

                    return (
                        <motion.div
                            key={chat.id}
                            initial={{ scale: 0, x: 50, opacity: 0 }}
                            animate={{ scale: 1, x: 0, opacity: 1 }}
                            exit={{ scale: 0, x: 50, opacity: 0 }}
                            transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
                            className="pointer-events-auto relative group"
                        >
                            <button
                                onClick={() => navigate('/messages')}
                                className="relative rounded-full p-[3px] bg-gradient-to-tr from-papu-coral to-orange-500 shadow-lg hover:scale-110 transition-transform duration-300 active:scale-95"
                            >
                                <div className="rounded-full bg-background p-0.5">
                                    <Avatar className="w-12 h-12 border-2 border-background shadow-inner">
                                        <AvatarImage src={details.avatarUrl} />
                                        <AvatarFallback>{details.username?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </div>

                                {/* Unread Pulse */}
                                <div className="absolute top-0 right-0 w-4 h-4 bg-papu-coral rounded-full border-2 border-background animate-pulse flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                </div>
                            </button>

                            {/* Label on Hover */}
                            <div className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-background/80 backdrop-blur-md border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-bold shadow-xl pointer-events-none">
                                {details.username}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
