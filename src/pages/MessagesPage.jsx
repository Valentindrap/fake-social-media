import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, setDoc, getDoc } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft, Image as ImageIcon, X, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { compressImage } from '@/lib/imageUtils';

// Sub-component for individual chat items to handle live user data
const ChatListItem = ({ chat, currentUser, selectedChat, setSelectedChat }) => {
    const [otherUser, setOtherUser] = useState(chat.otherUser);

    useEffect(() => {
        const otherUserId = chat.participants.find(p => p !== currentUser.uid);
        if (!otherUserId) return;

        const unsub = onSnapshot(doc(db, 'users', otherUserId), (docSnap) => {
            if (docSnap.exists()) {
                setOtherUser(docSnap.data());
            }
        });
        return unsub;
    }, [chat.participants, currentUser.uid]);

    return (
        <div
            onClick={() => setSelectedChat({ ...chat, otherUser })} // Pass updated user data when selecting
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors ${selectedChat?.id === chat.id ? 'bg-secondary/50' : ''}`}
        >
            <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={otherUser?.avatarUrl} />
                <AvatarFallback>{otherUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{otherUser?.username}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    {chat.lastMessage?.senderId === currentUser?.uid && 'Tú: '}
                    {chat.lastMessage?.text || 'Nuevo chat'}
                </div>
            </div>
            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                {chat.updatedAt ? formatDistanceToNow(chat.updatedAt.toDate(), { locale: es, addSuffix: false }).replace('alrededor de ', '') : ''}
            </div>
        </div>
    );
};

export default function MessagesPage() {
    const { currentUser, userProfile } = useAuth();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('userId');

    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Live user data for current chat
    const [otherUserProfile, setOtherUserProfile] = useState(null);

    // Responsive state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                // Keep initial otherUser from chat doc as fallback/initial state
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

    // 3. Live User Profile Sync for Active Chat
    useEffect(() => {
        if (!selectedChat || !currentUser) {
            setOtherUserProfile(null);
            return;
        }

        const otherUserId = selectedChat.participants.find(p => p !== currentUser.uid);
        if (!otherUserId) return;

        // Set initial from chat data to avoid flicker
        setOtherUserProfile(selectedChat.otherUser);

        // Listen to the user document directly
        const unsub = onSnapshot(doc(db, 'users', otherUserId), (docSnap) => {
            if (docSnap.exists()) {
                setOtherUserProfile(docSnap.data());
            }
        });
        return unsub;
    }, [selectedChat?.id, currentUser]);


    // 4. Fetch Messages & Update Read Status
    useEffect(() => {
        if (!selectedChat || !currentUser) return;

        // Mark as read immediately when entering chat
        const markAsRead = async () => {
            const chatRef = doc(db, 'chats', selectedChat.id);
            await setDoc(chatRef, {
                lastRead: {
                    [currentUser.uid]: serverTimestamp()
                }
            }, { merge: true });
        };
        markAsRead();

        const q = query(
            collection(db, 'chats', selectedChat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);

            // Also mark as read if new messages arrive while open
            markAsRead();
        });

        return unsubscribe;
    }, [selectedChat, currentUser]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const compressed = await compressImage(file, 800, 0.7);
                setSelectedImage(compressed);
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedImage) || !currentUser || !selectedChat) return;

        setSending(true);
        const msgText = newMessage.trim();
        const msgImage = selectedImage;

        // Reset inputs immediately (optimistic UI)
        setNewMessage('');
        setSelectedImage(null);

        try {
            // Add message
            await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), {
                text: msgText,
                image: msgImage,
                senderId: currentUser.uid,
                createdAt: serverTimestamp()
            });

            // Update chat last message
            await setDoc(doc(db, 'chats', selectedChat.id), {
                lastMessage: {
                    text: msgImage ? '📷 Imagen' : msgText,
                    senderId: currentUser.uid,
                    createdAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    // Chat Content Component (Rendered either inline or in portal)
    const ChatContent = () => (
        <div className={`flex flex-col w-full h-full bg-background ${isMobile ? 'fixed inset-0 z-[99999]' : ''}`}>
            {/* Header */}
            <div className="h-[60px] border-b border-border flex items-center px-4 gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-2"
                    onClick={() => setSelectedChat(null)}
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <Link to={`/profile/${otherUserProfile?.username}`}>
                    <Avatar className="h-8 w-8 border border-border cursor-pointer">
                        <AvatarImage src={otherUserProfile?.avatarUrl} />
                        <AvatarFallback>{otherUserProfile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex flex-col leading-tight">
                    <span className="font-semibold">{otherUserProfile?.username || selectedChat?.otherUser?.username}</span>
                    {otherUserProfile?.isOnline && <span className="text-[10px] text-green-500">En línea</span>}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background flex flex-col">
                {messages.map((msg, index) => {
                    const isMe = msg.senderId === currentUser.uid;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                            <div className={`
                                max-w-[75%] px-4 py-2 text-[15px] shadow-sm
                                ${isMe
                                    ? 'bg-[#3797F0] text-white rounded-[22px] rounded-br-[4px]'
                                    : 'bg-[#EFEFEF] dark:bg-[#262626] text-black dark:text-white rounded-[22px] rounded-bl-[4px]'
                                }
                            `}>
                                {msg.type === 'post' && msg.post ? (
                                    <Link to={`/profile/${msg.post.username}`} className="block mb-2 -mx-2 -mt-2 bg-secondary/20 rounded-xl overflow-hidden active:opacity-90 transition-opacity">
                                        <div className="relative aspect-square">
                                            <img src={msg.post.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="p-2 flex items-center gap-2 bg-secondary/50">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={msg.post.userAvatar} />
                                                <AvatarFallback>{msg.post.username?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-bold truncate">Post de {msg.post.username}</span>
                                        </div>
                                    </Link>
                                ) : (
                                    <>
                                        {msg.image && (
                                            <div className="mb-2 -mx-2 -mt-2">
                                                <img
                                                    src={msg.image}
                                                    alt="adjunto"
                                                    className={`max-h-[200px] w-auto object-cover ${isMe ? 'rounded-t-[18px]' : 'rounded-t-[18px]'}`}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="flex items-end gap-2 flex-wrap">
                                    {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                                    {/* Read Receipt Indicator */}
                                    {isMe && (
                                        <div className={`text-[10px] ml-auto flex items-center ${isMe ? 'text-white/70' : 'text-muted-foreground'}`}>
                                            {(() => {
                                                const otherUserId = selectedChat.participants.find(p => p !== currentUser.uid);
                                                const otherLastRead = selectedChat.lastRead?.[otherUserId];
                                                const isRead = otherLastRead && msg.createdAt && otherLastRead.seconds >= msg.createdAt.seconds;

                                                return isRead ? (
                                                    <CheckCheck className="w-3.5 h-3.5" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5" />
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {selectedImage && (
                <div className="px-4 py-2 bg-background border-t border-border flex items-center gap-2 shrink-0">
                    <div className="relative h-16 w-16 bg-secondary rounded-lg overflow-hidden border border-border">
                        <img src={selectedImage} alt="Preview" className="h-full w-full object-cover" />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                    <span className="text-xs text-muted-foreground">Imagen seleccionada</span>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-border bg-background shrink-0">
                <div className="flex items-center gap-2 relative">
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="h-6 w-6" />
                        </Button>
                    </div>

                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Envía un mensaje..."
                        className="rounded-full pr-12 focus-visible:ring-papu-coral bg-secondary/50 border-none"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={(!newMessage.trim() && !selectedImage) || sending}
                        variant="ghost"
                        className="absolute right-1 text-papu-coral hover:text-papu-coral/80 hover:bg-transparent"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </form>
        </div>
    );

    return (
        // Wrapper: 100dvh on mobile to avoid browser bar issues, normal height on desktop
        <div className="h-[calc(100dvh-55px)] md:h-[calc(100vh-80px)] max-w-[935px] mx-auto bg-background md:border md:border-border md:rounded-xl md:my-5 overflow-hidden shadow-sm flex">

            {/* Left: Chat List - Always visible on desktop, hidden on mobile if chat is selected (managed via Portal) */}
            <div className={`w-full md:w-[350px] border-r border-border flex flex-col`}>
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
                            <ChatListItem
                                key={chat.id}
                                chat={chat}
                                currentUser={currentUser}
                                selectedChat={selectedChat}
                                setSelectedChat={setSelectedChat}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right: Chat Window (Desktop) */}
            <div className="hidden md:flex flex-1 flex-col w-full bg-background">
                {selectedChat ? (
                    <ChatContent />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-background/50">
                        <div className="w-24 h-24 rounded-full border-2 border-current flex items-center justify-center mb-4 opacity-10">
                            <Send className="h-10 w-10" />
                        </div>
                        <h2 className="text-xl font-light mb-2">Tus Mensajes</h2>
                        <p className="text-sm max-w-xs text-muted-foreground/80">
                            Envía fotos y mensajes privados a tus amigos.
                        </p>
                    </div>
                )}
            </div>

            {/* Mobile Chat Portal - Rendered at Body Level to cover EVERYTHING */}
            {isMobile && selectedChat && createPortal(
                <div className="fixed inset-0 z-[10000] bg-background animate-in slide-in-from-right duration-300">
                    <ChatContent />
                </div>,
                document.body
            )}
        </div>
    );
}
