import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageCircle, Bookmark, Trash2, MoreHorizontal, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDoc, setDoc, where, limit, getDocs } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { createNotification } from '@/lib/notificationUtils';
import { Link } from 'react-router-dom';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { motion, AnimatePresence } from 'framer-motion';

export default function PostModal({ post, user, currentUser, onClose, onPostDeleted }) {
    const { userProfile } = useAuth(); // We have currentUser from props but need userProfile for comments/notifs
    const { isFollowing, toggleFollow } = useFollow(post.userId);

    // State
    const [liked, setLiked] = useState(post.likedBy?.includes(currentUser?.uid) || false);
    const [likesCount, setLikesCount] = useState(post.likes || 0);
    const [comments, setComments] = useState([]);
    const [comment, setComment] = useState('');
    const [saved, setSaved] = useState(false);

    // Share State
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [showMobileComments, setShowMobileComments] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sharing, setSharing] = useState(false);

    const [authorProfile, setAuthorProfile] = useState(null);
    const commentInputRef = useRef(null);

    // Fetch live author data for verified status
    useEffect(() => {
        if (!post.userId) return;
        const unsubscribe = onSnapshot(doc(db, 'users', post.userId), (doc) => {
            if (doc.exists()) {
                setAuthorProfile(doc.data());
            }
        });
        return unsubscribe;
    }, [post.userId]);

    // Sync state with post prop changes (for real-time updates from parent)
    useEffect(() => {
        setLikesCount(post.likes || 0);
        setLiked(post.likedBy?.includes(currentUser?.uid) || false);
    }, [post.likes, post.likedBy, currentUser?.uid]);

    // Initial check for Saved status
    useEffect(() => {
        if (currentUser) {
            const checkSaved = async () => {
                const docSnap = await getDoc(doc(db, 'users', currentUser.uid, 'saved', post.id));
                if (docSnap.exists()) setSaved(true);
            };
            checkSaved();
        }
    }, [currentUser, post.id]);

    // Real-time comments listener
    useEffect(() => {
        const q = query(
            collection(db, `posts/${post.id}/comments`),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [post.id]);

    // Handlers
    const handleLike = async () => {
        if (!currentUser) return;
        const postRef = doc(db, 'posts', post.id);
        try {
            if (liked) {
                await updateDoc(postRef, { likedBy: arrayRemove(currentUser.uid) });
                setLiked(false);
                setLikesCount(prev => prev - 1);
            } else {
                await updateDoc(postRef, { likedBy: arrayUnion(currentUser.uid) });
                setLiked(true);
                setLikesCount(prev => prev + 1);

                await createNotification(
                    post.userId,
                    'like',
                    { uid: currentUser.uid, username: userProfile?.username || 'Usuario', avatarUrl: userProfile?.avatarUrl },
                    post.id,
                    post.image
                );
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async () => {
        if (confirm('¿Estás seguro de borrar esta publicación?')) {
            try {
                await deleteDoc(doc(db, 'posts', post.id));
                onPostDeleted(post.id);
                onClose();
            } catch (e) {
                console.error("Error borrando:", e);
            }
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || !currentUser) return;

        try {
            await addDoc(collection(db, `posts/${post.id}/comments`), {
                text: comment,
                userId: currentUser.uid,
                username: userProfile?.username,
                isVerified: userProfile?.isVerified || false,
                createdAt: serverTimestamp()
            });

            await createNotification(
                post.userId,
                'comment',
                { uid: currentUser.uid, username: userProfile?.username || 'Usuario', avatarUrl: userProfile?.avatarUrl },
                post.id,
                post.image
            );

            setComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!currentUser) return;
        if (confirm('¿Borrar comentario?')) {
            try {
                await deleteDoc(doc(db, `posts/${post.id}/comments`, commentId));
            } catch (error) {
                console.error("Error deleting comment:", error);
            }
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        const savedRef = doc(db, 'users', currentUser.uid, 'saved', post.id);
        if (saved) {
            await deleteDoc(savedRef);
            setSaved(false);
        } else {
            await setDoc(savedRef, {
                ...post,
                savedAt: serverTimestamp()
            });
            setSaved(true);
        }
    };

    // Share Search Logic
    useEffect(() => {
        if (!showShareDialog) return;
        const searchUsers = async () => {
            if (searchTerm.trim().length === 0) {
                setSearchResults([]);
                return;
            }
            try {
                const termLower = searchTerm.toLowerCase();
                const termOriginal = searchTerm;
                const qUsername = query(collection(db, 'users'), where('username', '>=', termLower), where('username', '<=', termLower + '\\uf8ff'), limit(5));
                const qDisplay = query(collection(db, 'users'), where('displayName', '>=', termOriginal), where('displayName', '<=', termOriginal + '\\uf8ff'), limit(5));
                const [snapUsername, snapDisplay] = await Promise.all([getDocs(qUsername), getDocs(qDisplay)]);
                const results = new Map();
                snapUsername.docs.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
                snapDisplay.docs.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
                setSearchResults(Array.from(results.values()).filter(u => u.id !== currentUser.uid));
            } catch (e) { console.error(e); }
        };
        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, showShareDialog]);

    const handleShare = async (targetUser) => {
        if (!currentUser || sharing) return;
        setSharing(true);
        try {
            const chatId = [currentUser.uid, targetUser.id].sort().join('_');
            const chatRef = doc(db, 'chats', chatId);
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                await setDoc(chatRef, {
                    participants: [currentUser.uid, targetUser.id],
                    userDetails: {
                        [currentUser.uid]: { username: userProfile.username, avatarUrl: userProfile.avatarUrl },
                        [targetUser.id]: { username: targetUser.username, avatarUrl: targetUser.avatarUrl }
                    },
                    updatedAt: serverTimestamp()
                });
            }

            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: '',
                senderId: currentUser.uid,
                createdAt: serverTimestamp(),
                type: 'post',
                post: {
                    id: post.id,
                    image: post.image,
                    caption: post.caption || '',
                    username: user.username,
                    userAvatar: user.avatarUrl
                }
            });

            await setDoc(chatRef, {
                lastMessage: {
                    text: `Compartió una publicación`,
                    senderId: currentUser.uid,
                    createdAt: serverTimestamp()
                },
                updatedAt: serverTimestamp()
            }, { merge: true });

            setShowShareDialog(false);
            setSharing(false);
        } catch (error) {
            console.error("Error sharing post:", error);
            setSharing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>

            {/* Mobile Header (Fixed Top) - Only visible on mobile */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-md border-b border-border/10 flex items-center justify-between px-4 z-[99999]">
                <button onClick={onClose} className="text-foreground p-2 -ml-2">
                    <X className="h-6 w-6" />
                </button>
                <span className="font-bold text-sm">Publicación</span>
                <div className="w-6" /> {/* Spacer for centering */}
            </div>

            <div
                className="bg-background md:bg-background/95 md:dark:bg-black/90 md:backdrop-blur-xl w-full h-full md:w-full md:max-w-5xl md:h-[90vh] md:max-h-[90vh] md:rounded-[32px] overflow-hidden flex flex-col md:flex-row md:shadow-2xl md:shadow-black/50 md:border md:border-white/10 md:animate-in md:fade-in md:zoom-in-95 duration-300 relative pt-14 md:pt-0"
                onClick={e => e.stopPropagation()}
                style={{ boxShadow: window.innerWidth > 768 ? '0 0 50px -10px rgba(0,0,0,0.5), 0 0 20px -5px rgba(255,127,80,0.1)' : 'none' }}
            >

                {/* Left Side (Image) includes Mobile Layout Content */}
                <div className="w-full md:flex-1 bg-black/5 md:bg-black/50 flex flex-col md:justify-center relative overflow-y-auto md:overflow-hidden no-scrollbar">

                    {/* Mobile: User Header within scroll view */}
                    <div className="md:hidden flex items-center justify-between px-3 py-3 bg-background">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>{user.username[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-sm flex items-center gap-1">
                                {user.username}
                                {(authorProfile?.isVerified || user.isVerified) && <VerifiedBadge className="w-3.5 h-3.5" />}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Image Container */}
                    <div className="w-full bg-black flex items-center justify-center min-h-[300px] md:h-full">
                        <img src={post.image} className="w-full h-auto max-h-[85vh] md:max-h-full object-contain" />
                    </div>

                    {/* Mobile: Actions & Caption & Comments (Below Image) */}
                    <div className="md:hidden p-3 pb-20 space-y-3 bg-background min-h-[50vh]">

                        {/* Actions Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike}>
                                    <Heart className={`h-6 w-6 ${liked ? 'fill-red-500 text-red-500' : 'text-foreground hover:text-muted-foreground'}`} strokeWidth={1.5} />
                                </button>
                                <button onClick={() => document.getElementById('mobile-comment-input')?.focus()}>
                                    <MessageCircle className="h-6 w-6 text-foreground hover:text-muted-foreground" strokeWidth={1.5} />
                                </button>
                                <button onClick={() => setShowShareDialog(true)}>
                                    <Send className="h-6 w-6 text-foreground hover:text-muted-foreground" strokeWidth={1.5} />
                                </button>
                            </div>
                            <button onClick={handleSave}>
                                <Bookmark className={`h-6 w-6 ${saved ? 'fill-yellow-500 text-yellow-500' : 'text-foreground hover:text-muted-foreground'}`} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Likes */}
                        <div className="font-bold text-sm">{likesCount} Me gusta</div>

                        {/* Caption */}
                        <div className="text-sm">
                            <span className="font-bold mr-2">{user.username}</span>
                            <span className="">{post.caption}</span>
                        </div>

                        {/* Date */}
                        <div className="text-[10px] text-muted-foreground uppercase">
                            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                        </div>

                        {/* Comments Preview / List */}
                        <div className="pt-2 space-y-3 border-t border-border/30 mt-2">
                            {comments.map((c) => (
                                <div key={c.id} className="flex gap-2 text-sm">
                                    <span className="font-bold">{c.username}</span>
                                    <span className="opacity-90">{c.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop Details Side (Hidden on Mobile) */}
                <div className="hidden md:flex flex-1 md:w-[420px] md:flex-none flex-col border-l border-white/5 bg-transparent min-h-0">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between backdrop-blur-md bg-white/5 dark:bg-black/20">
                        <div className="flex items-center gap-3">
                            <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-600">
                                <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{user.username[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="font-bold text-sm tracking-wide flex items-center gap-1">
                                {user.username}
                                {(authorProfile?.isVerified || user.isVerified) && <VerifiedBadge className="w-4 h-4 ml-0.5" />}
                            </span>
                        </div>
                        {currentUser?.uid === post.userId ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="hover:bg-white/10">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-white/10">
                                    <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => alert("pinche papu impostor eres un pancho")}>
                                        Reportar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer" onClick={toggleFollow}>
                                        {isFollowing ? 'Dejar de seguir' : 'Seguir'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Comments Area */}
                    <div className="flex-1 p-5 overflow-y-auto text-sm space-y-5 scrollbar-hide">
                        {/* Caption */}
                        <div className="flex gap-4">
                            <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>{user.username[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="leading-snug">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <span className="font-bold">{user.username}</span>
                                        {(authorProfile?.isVerified || user.isVerified) && <VerifiedBadge className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="opacity-90 leading-relaxed">{post.caption}</span>
                                </div>
                                <div className="text-xs text-muted-foreground font-medium">
                                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Ahora'}
                                </div>
                            </div>
                        </div>
                        {/* Comments List */}
                        {comments.map((c) => (
                            <div key={c.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Link to={`/profile/${c.username}`}>
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                                        {c.username[0].toUpperCase()}
                                    </div>
                                </Link>
                                <div className="flex-1 group/comment">
                                    <div className="flex items-start justify-between">
                                        <div className="text-[13px] leading-snug">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="font-bold">{c.username}</span>
                                                {c.isVerified && <VerifiedBadge className="w-3 h-3" />}
                                            </div>
                                            <span className="opacity-80">{c.text}</span>
                                        </div>
                                        {(currentUser?.uid === post.userId || currentUser?.uid === c.userId) && (
                                            <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions Footer */}
                    <div className="p-4 border-t border-white/5 bg-white/5 dark:bg-black/20 backdrop-blur-md">
                        <div className="flex items-center gap-5 mb-3">
                            <button onClick={handleLike} className="hover:scale-110 active:scale-95 transition-all duration-200">
                                <Heart className={`h-7 w-7 ${liked ? 'fill-red-500 text-red-500 drop-shadow-md' : 'hover:text-white/80'}`} strokeWidth={1.5} />
                            </button>
                            <button onClick={() => commentInputRef.current?.focus()} className="hover:scale-110 active:scale-95 transition-all duration-200">
                                <MessageCircle className="h-7 w-7 hover:text-blue-400" strokeWidth={1.5} />
                            </button>
                            <button onClick={() => setShowShareDialog(true)} className="hover:scale-110 active:scale-95 transition-all duration-200">
                                <Send className="h-7 w-7 hover:text-green-400" strokeWidth={1.5} />
                            </button>
                            <div className="flex-1"></div>
                            <button onClick={handleSave} className="hover:scale-110 active:scale-95 transition-all duration-200">
                                <Bookmark className={`h-7 w-7 ${saved ? 'fill-yellow-500 text-yellow-500' : 'hover:text-yellow-400'}`} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div className="font-bold text-sm mb-1 px-1">{likesCount} Me gusta</div>
                        <div className="text-[10px] text-muted-foreground uppercase mb-4 px-1 font-medium tracking-wider">
                            {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                        </div>
                        <form onSubmit={handleComment} className="flex items-center gap-3 relative">
                            <input
                                ref={commentInputRef}
                                type="text"
                                placeholder="Añade un comentario..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 py-2 border-b border-white/10 focus:border-white/30 transition-all"
                            />
                            {comment.trim() && (
                                <button type="submit" className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors">
                                    Publicar
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Mobile Comment Input (Fixed Bottom) */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-background border-t border-border/20 z-[99999]">
                    <form onSubmit={handleComment} className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                            <AvatarImage src={userProfile?.avatarUrl} />
                            <AvatarFallback>{userProfile?.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <input
                            id="mobile-comment-input"
                            type="text"
                            placeholder="Añade un comentario..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="flex-1 bg-secondary/50 rounded-full px-4 py-2 text-sm outline-none border border-transparent focus:border-border"
                        />
                        {comment.trim() && (
                            <button type="submit" className="text-blue-500 font-bold text-sm">
                                Publicar
                            </button>
                        )}
                    </form>
                </div>

            </div>

            {/* Share Search Dialog */}
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="sm:max-w-md z-[100000]">
                    <DialogHeader>
                        <DialogTitle>Compartir</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <Input
                            placeholder="Buscar usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                            {searchResults.length > 0 ? (
                                searchResults.map(u => (
                                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={u.avatarUrl} />
                                                <AvatarFallback>{u.username[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{u.username}</span>
                                        </div>
                                        <Button size="sm" onClick={() => handleShare(u)} disabled={sharing}>
                                            Enviar
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-8">
                                    Escribe para buscar...
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

        </div>,
        document.body
    );
}
