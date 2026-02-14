import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, setDoc, getDoc } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MessagesPage() {
    const { currentUser, userProfile } = useAuth();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('userId');

    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // 1. Fetch User's Chats
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                otherUser: doc.data().userDetails?.[doc.data().participants.find(p => p !== currentUser.uid)]
            }));
            // Sort by updatedAt desc
            chatList.sort((a, b) => {
                const dateA = a.updatedAt?.toDate() || new Date(0);
                const dateB = b.updatedAt?.toDate() || new Date(0);
                return dateB - dateA;
            });
            setChats(chatList);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    // 2. Handle Target User (from Profile "Message" button)
    useEffect(() => {
        async function checkOrCreateChat() {
            if (!currentUser || !targetUserId) return;

            // Check if chat already exists
            const existingChat = chats.find(c => c.participants.includes(targetUserId));
            if (existingChat) {
                setSelectedChat(existingChat);
                return;
            }

            // If not found in loaded chats, maybe it exists but not loaded (unlikely with small lists) or create new
            // For now, let's create a temporary chat object or create it in DB immediately
            // Better to create in DB so we can message immediately

            // Just setDoc with merge. If it exists, it updates (harmless). If not, creates.
            try {
                const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
                if (!targetUserDoc.exists()) return;
                const targetUserData = targetUserDoc.data();

                const chatId = [currentUser.uid, targetUserId].sort().join('_');
                const chatDocRef = doc(db, 'chats', chatId);

                const chatData = {
                    participants: [currentUser.uid, targetUserId],
                    userDetails: {
                        [currentUser.uid]: {
                            username: userProfile.username,
                            avatarUrl: userProfile.avatarUrl
                        },
                        [targetUserId]: {
                            username: targetUserData.username,
                            avatarUrl: targetUserData.avatarUrl
                        }
                    },
                    updatedAt: serverTimestamp()
                };

                await setDoc(chatDocRef, chatData, { merge: true });
                setSelectedChat({ id: chatId, ...chatData, otherUser: targetUserData });

            } catch (error) {
                console.error("Error creating chat:", error);
            }
        }

        if (targetUserId && !selectedChat) {
            checkOrCreateChat();
        }
    }, [targetUserId, currentUser, chats, userProfile]);

    // 3. Fetch Messages for Selected Chat
    useEffect(() => {
        if (!selectedChat) return;

        const q = query(
            collection(db, 'chats', selectedChat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            scrollToBottom();
        });

        return unsubscribe;
    }, [selectedChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !selectedChat) return;

        const msgText = newMessage.trim();
        setNewMessage(''); // optimistic clear

        try {
            // Add message
            await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), {
                text: msgText,
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });

            // Update chat last message
            await setDoc(doc(db, 'chats', selectedChat.id), {
                lastMessage: {
                    text: msgText,
                    senderId: currentUser.uid,
                    createdAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="flex h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] max-w-[935px] mx-auto bg-background md:border md:border-border md:rounded-xl md:my-5 overflow-hidden shadow-sm">
            {/* Left: Chat List */}
            <div className={`w-full md:w-[350px] border-r border-border flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border font-bold text-lg flex justify-between items-center h-[60px]">
                    <span>{userProfile?.username || 'Chats'}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-papu-coral"></div></div>
                    ) : chats.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            No tienes mensajes. Visitá un perfil para empezar a chatear.
                        </div>
                    ) : (
                        chats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors ${selectedChat?.id === chat.id ? 'bg-secondary/50' : ''}`}
                            >
                                <Avatar className="h-12 w-12 border border-border">
                                    <AvatarImage src={chat.otherUser?.avatarUrl} />
                                    <AvatarFallback>{chat.otherUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">{chat.otherUser?.username}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {chat.lastMessage?.senderId === currentUser?.uid ? 'Tú: ' : ''}
                                        {chat.lastMessage?.text || 'Nuevo chat'}
                                    </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {chat.updatedAt ? formatDistanceToNow(chat.updatedAt.toDate(), { locale: es, addSuffix: false }).replace('alrededor de ', '') : ''}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Chat Window */}
            <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="h-[60px] border-b border-border flex items-center px-4 gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setSelectedChat(null)}>
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={selectedChat.otherUser?.avatarUrl} />
                                <AvatarFallback>{selectedChat.otherUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{selectedChat.otherUser?.username}</span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === currentUser.uid;
                                const isSequential = index > 0 && messages[index - 1].senderId === msg.senderId;

                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                                        <div className={`
                                            max-w-[75%] px-4 py-2 text-[15px]
                                            ${isMe
                                                ? 'bg-[#3797F0] text-white rounded-[22px] rounded-br-[4px]'
                                                : 'bg-[#EFEFEF] dark:bg-[#262626] text-black dark:text-white rounded-[22px] rounded-bl-[4px]'
                                            }
                                        `}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-background">
                            <div className="flex items-center gap-2 relative">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Envía un mensaje..."
                                    className="rounded-full pr-12 focus-visible:ring-papu-coral"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!newMessage.trim()}
                                    variant="ghost"
                                    className="absolute right-1 text-papu-coral hover:text-papu-coral/80 hover:bg-transparent"
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <div className="w-24 h-24 rounded-full border-2 border-current flex items-center justify-center mb-4 opacity-20">
                            <Send className="h-10 w-10" />
                        </div>
                        <h2 className="text-xl font-light mb-2">Tus Mensajes</h2>
                        <p className="text-sm max-w-xs">
                            Envía fotos y mensajes privados a tus amigos o grupos.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
