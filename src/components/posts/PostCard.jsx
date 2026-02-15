import { useState, useRef, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Bookmark, MoreHorizontal, Heart, User, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import LikeButton from './LikeButton';
import PollOption from './PollOption';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { db, doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, getDoc, deleteDoc, where, limit, getDocs } from '@/lib/firebase';
import { useFollow } from '@/hooks/useFollow';
import { createNotification } from '@/lib/notificationUtils';

export default function PostCard({ post }) {
    const { currentUser, userProfile } = useAuth();
    const { isFollowing, toggleFollow } = useFollow(post.userId);
    const [postUser, setPostUser] = useState(null);

    // Fetch live user data (avatar/username)
    useEffect(() => {
        if (!post.userId) return;
        const unsubscribe = onSnapshot(doc(db, 'users', post.userId), (doc) => {
            if (doc.exists()) {
                setPostUser(doc.data());
            }
        });
        return unsubscribe;
    }, [post.userId]);

    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [saved, setSaved] = useState(false);
    const [showFloatingHeart, setShowFloatingHeart] = useState(false);
    const [comment, setComment] = useState('');
    const [comments, setComments] = useState([]);
    const [showAllComments, setShowAllComments] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showTags, setShowTags] = useState(false);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sharing, setSharing] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const carouselRef = useRef(null);
    const videoRefs = useRef({});
    const lastTap = useRef(0);

    // Parse timestamp
    const timeAgo = post.createdAt?.seconds
        ? new Date(post.createdAt.seconds * 1000).toLocaleDateString()
        : 'Justo ahora';

    useEffect(() => {
        if (currentUser && post.likedBy) {
            setLiked(post.likedBy.includes(currentUser.uid));
            setLikeCount(post.likedBy.length);
        } else {
            setLikeCount(post.likes || 0);
        }

        // Check if saved
        if (currentUser) {
            const checkSaved = async () => {
                const docSnap = await getDoc(doc(db, 'users', currentUser.uid, 'saved', post.id));
                if (docSnap.exists()) setSaved(true);
            };
            checkSaved();
        }
    }, [currentUser, post]);

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


    const handleLike = async () => {
        if (!currentUser) return;

        const postRef = doc(db, 'posts', post.id);
        try {
            if (liked) {
                await updateDoc(postRef, {
                    likedBy: arrayRemove(currentUser.uid)
                });
                setLiked(false);
                setLikeCount(prev => prev - 1);
            } else {
                await updateDoc(postRef, {
                    likedBy: arrayUnion(currentUser.uid)
                });
                setLiked(true);
                setLikeCount(prev => prev + 1);

                // Create notification
                await createNotification(
                    post.userId,
                    'like',
                    { uid: currentUser.uid, username: userProfile.username || 'Usuario', avatarUrl: userProfile.avatarUrl },
                    post.id,
                    post.image
                );
            }
        } catch (error) {
            console.error("Error updating like:", error);
        }
    };

    const handleDoubleTap = async () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            if (!liked) {
                await handleLike();
            }
            setShowFloatingHeart(true);
            setTimeout(() => setShowFloatingHeart(false), 1000);
        }
        lastTap.current = now;
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!comment.trim() || !currentUser) return;

        try {
            await addDoc(collection(db, `posts/${post.id}/comments`), {
                text: comment,
                userId: currentUser.uid,
                username: userProfile.username,
                createdAt: serverTimestamp()
            });

            // Create notification
            await createNotification(
                post.userId,
                'comment',
                { uid: currentUser.uid, username: userProfile.username || 'Usuario', avatarUrl: userProfile.avatarUrl },
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

    const handleShare = async (targetUser) => {
        if (!currentUser || sharing) return;
        setSharing(true);
        try {
            // Logic to get or create chat similar to MessagesPage
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

            // Send Post Message
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: '',
                senderId: currentUser.uid,
                createdAt: serverTimestamp(),
                type: 'post',
                post: {
                    id: post.id,
                    image: post.image,
                    caption: post.caption || '',
                    username: post.user.username,
                    userAvatar: post.user.avatar
                }
            });

            // Update chat last message
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
            // Optional: Show toast success
        } catch (error) {
            console.error("Error sharing post:", error);
            setSharing(false);
        }
    };

    const handleVote = async (optionId) => {
        if (!currentUser || !post.poll) return;

        const postRef = doc(db, 'posts', post.id);
        const currentVote = post.poll.voters?.[currentUser.uid];

        // If clicking the same option they already voted for, do nothing
        if (currentVote === optionId) return;

        try {
            const updatedPoll = { ...post.poll };
            if (!updatedPoll.voters) updatedPoll.voters = {};

            // If changing vote, decrement old option
            if (currentVote) {
                const oldOptIndex = updatedPoll.options.findIndex(o => o.id === currentVote);
                if (oldOptIndex !== -1) {
                    updatedPoll.options[oldOptIndex].votes = Math.max(0, (updatedPoll.options[oldOptIndex].votes || 0) - 1);
                }
            }

            // Increment new option
            const newOptIndex = updatedPoll.options.findIndex(o => o.id === optionId);
            if (newOptIndex !== -1) {
                updatedPoll.options[newOptIndex].votes = (updatedPoll.options[newOptIndex].votes || 0) + 1;
            }

            // Update voter record
            updatedPoll.voters[currentUser.uid] = optionId;

            await updateDoc(postRef, {
                poll: updatedPoll
            });

            // Create notification for post owner (optional but nice)
            if (post.userId !== currentUser.uid) {
                await createNotification(
                    post.userId,
                    currentUser.uid,
                    'vote',
                    post.id,
                    post.image || null
                );
            }
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    const handleScroll = () => {
        if (carouselRef.current) {
            const index = Math.round(carouselRef.current.scrollLeft / carouselRef.current.offsetWidth);
            setCurrentMediaIndex(index);
        }
    };

    const scrollCarousel = (direction) => {
        if (carouselRef.current) {
            const width = carouselRef.current.offsetWidth;
            const newScrollLeft = carouselRef.current.scrollLeft + (direction === 'next' ? width : -width);
            carouselRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }
    };

    // Intersection observer for videos
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        video.play().catch(() => { }); // Autoplay if possible
                    } else {
                        video.pause();
                    }
                });
            },
            { threshold: 0.6 }
        );

        Object.values(videoRefs.current).forEach((video) => {
            if (video) observer.observe(video);
        });

        return () => observer.disconnect();
    }, [post.media]);

    // Search Users for Share
    useEffect(() => {
        if (!showShareDialog) return;
        const searchUsers = async () => {
            if (searchTerm.trim().length === 0) {
                setSearchResults([]);
                return;
            }
            try {
                const termLower = searchTerm.toLowerCase();
                const termOriginal = searchTerm; // For displayName matching if capitalized

                // Query by username (lowercase)
                const qUsername = query(
                    collection(db, 'users'),
                    where('username', '>=', termLower),
                    where('username', '<=', termLower + '\\uf8ff'),
                    limit(5)
                );

                // Query by displayName (simple prefix match on original input)
                const qDisplay = query(
                    collection(db, 'users'),
                    where('displayName', '>=', termOriginal),
                    where('displayName', '<=', termOriginal + '\\uf8ff'),
                    limit(5)
                );

                const [snapUsername, snapDisplay] = await Promise.all([
                    getDocs(qUsername),
                    getDocs(qDisplay)
                ]);

                // Merge results
                const results = new Map();
                snapUsername.docs.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
                snapDisplay.docs.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));

                // Filter out self and array-fy
                setSearchResults(Array.from(results.values()).filter(u => u.id !== currentUser.uid));
            } catch (e) { console.error(e); }
        };
        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, showShareDialog]);

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="group relative bg-card/60 dark:bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden mb-6 shadow-sm hover:shadow-xl hover:shadow-papu-coral/5 transition-all duration-500"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link to={`/profile/${post.user.username}`}>
                        <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-papu-coral group-hover:scale-105 transition-transform duration-300">
                            <div className="p-[2px] rounded-full bg-background/80 backdrop-blur-sm">
                                <Avatar className="w-9 h-9 border border-background/50">
                                    <AvatarImage src={postUser?.avatarUrl || post.user.avatar} />
                                    <AvatarFallback>{post.user.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    </Link>
                    <div className="flex flex-col">
                        <Link to={`/profile/${post.user.username}`} className="text-sm font-bold leading-tight hover:text-papu-coral transition-colors">
                            {post.user.username}
                        </Link>
                        <span className="text-[11px] text-muted-foreground font-medium leading-tight">
                            {timeAgo}
                        </span>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => alert("pinche papu impostor eres un pancho")}>
                            Reportar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={toggleFollow}>
                            {isFollowing ? 'Dejar de seguir' : 'Seguir'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                            alert('¡Enlace copiado!');
                        }}>
                            Copiar enlace
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Carousel / Media */}
            {(post.media && post.media.length > 0) || post.image ? (
                <div className="relative aspect-square bg-secondary cursor-pointer overflow-hidden">
                    <div
                        ref={carouselRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full h-full"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onClick={handleDoubleTap}
                    >
                        {(post.media || [{ url: post.image, type: 'image' }]).map((item, idx) => (
                            <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative">
                                {item.type === 'video' || item.url?.startsWith('data:video') ? (
                                    <video
                                        ref={el => videoRefs.current[idx] = el}
                                        src={item.url}
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <motion.img
                                        src={item.url}
                                        className="w-full h-full object-cover"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Navigation Arrows */}
                    {post.media && post.media.length > 1 && (
                        <>
                            {currentMediaIndex > 0 && (
                                <button
                                    onClick={() => scrollCarousel('prev')}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            {currentMediaIndex < post.media.length - 1 && (
                                <button
                                    onClick={() => scrollCarousel('next')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all z-20"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                            {/* Indicators */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                {post.media.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentMediaIndex ? 'bg-white scale-125' : 'bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Floating heart on double tap */}
                    <AnimatePresence>
                        {showFloatingHeart && (
                            <motion.div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    initial={{ scale: 0, rotate: -15 }}
                                    animate={{ scale: [0, 1.4, 1.1], rotate: [0, 10, 0] }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                >
                                    <Heart className="h-24 w-24 text-white fill-white drop-shadow-lg" strokeWidth={0} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Tags Overlay Logic */}
                    {post.taggedUsers && post.taggedUsers.length > 0 && (
                        <div className="absolute bottom-4 left-4 z-30">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowTags(!showTags); }}
                                className="bg-black/60 p-1.5 rounded-full text-white/90 hover:bg-black/80 transition-colors"
                            >
                                <User className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <AnimatePresence>
                        {showTags && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/40 z-40 flex items-center justify-center pointer-events-none"
                            >
                                <div className="flex flex-wrap gap-2 justify-center p-8 pointer-events-auto">
                                    {post.taggedUsers.map(tag => (
                                        <Link
                                            to={`/profile/${tag.username}`}
                                            key={tag.uid}
                                            className="bg-white/90 text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg hover:bg-white hover:scale-105 transition-all flex items-center gap-1"
                                        >
                                            <User className="w-3 h-3" />
                                            {tag.username}
                                        </Link>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowTags(false)}
                                    className="absolute top-2 right-2 text-white/80 hover:text-white pointer-events-auto p-2"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : post.poll && (
                /* Header background for text-only poll posts */
                <div className="w-full h-32 bg-gradient-to-br from-papu-coral/5 to-orange-500/5 dark:from-papu-coral/10 dark:to-orange-500/10 flex items-center justify-center overflow-hidden relative">
                    <BarChart3 className="absolute -bottom-4 -right-4 h-32 w-32 text-papu-coral/10 rotate-12" />
                </div>
            )}

            {/* Poll Section */}
            {post.poll && (
                <div className={`px-5 py-5 ${post.image ? 'border-t border-border/10 bg-secondary/5 dark:bg-white/5' : ''}`}>
                    <h3 className="text-[17px] font-extrabold mb-5 tracking-tight leading-tight">
                        {post.poll.question}
                    </h3>
                    <div className="space-y-2.5">
                        {post.poll.options.map((option) => (
                            <PollOption
                                key={option.id}
                                option={option}
                                totalVotes={Object.keys(post.poll.voters || {}).length}
                                isSelected={post.poll.voters?.[currentUser?.uid] === option.id}
                                hasVoted={!!post.poll.voters?.[currentUser?.uid]}
                                onVote={handleVote}
                                disabled={post.poll.endsAt && new Date(post.poll.endsAt) < new Date()}
                            />
                        ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-papu-coral" />
                            <span>{Object.keys(post.poll.voters || {}).length} votos</span>
                        </div>
                        {post.poll.endsAt && (
                            <span className="opacity-70">
                                {new Date(post.poll.endsAt.seconds * 1000) < new Date()
                                    ? 'Finalizada'
                                    : `Termina el ${new Date(post.poll.endsAt.seconds * 1000).toLocaleDateString()}`}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-3.5 pt-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LikeButton liked={liked} onToggle={handleLike} />
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <MessageCircle className="h-[22px] w-[22px] hover:text-muted-foreground transition-colors" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowShareDialog(true)}>
                            <Send className="h-[20px] w-[20px] hover:text-muted-foreground transition-colors" />
                        </motion.button>

                        {/* Share Dialog */}
                        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                            <DialogContent className="sm:max-w-md">
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
                                            searchResults.map(user => (
                                                <div key={user.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={user.avatarUrl} />
                                                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm font-medium">{user.username}</span>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleShare(user)} disabled={sharing}>
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
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={async () => {
                            if (!currentUser) return;
                            const savedRef = doc(db, 'users', currentUser.uid, 'saved', post.id);
                            if (saved) {
                                await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(savedRef));
                                setSaved(false);
                            } else {
                                await setDoc(savedRef, {
                                    ...post,
                                    savedAt: serverTimestamp()
                                });
                                setSaved(true);
                            }
                        }}
                    >
                        <Bookmark
                            className={`h-[22px] w-[22px] transition-colors ${saved ? 'fill-foreground' : 'hover:text-muted-foreground'
                                }`}
                        />
                    </motion.button>
                </div>

                {/* Likes count */}
                <motion.p
                    className="text-[13px] font-semibold mt-2.5"
                    key={likeCount}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    {likeCount} Me gusta
                </motion.p>

                {/* Caption */}
                <p className="text-[13px] mt-1.5 leading-relaxed">
                    <Link to={`/profile/${post.user.username}`} className="font-semibold mr-1.5 hover:underline">
                        {post.user.username}
                    </Link>
                    {post.caption}
                </p>

                {/* Comments */}
                {comments.length > 2 && !showAllComments && (
                    <button
                        onClick={() => setShowAllComments(true)}
                        className="text-[13px] text-muted-foreground mt-1.5 hover:text-foreground transition-colors"
                    >
                        Ver los {comments.length} comentarios
                    </button>
                )}

                <div className="mt-1.5 space-y-1">
                    <AnimatePresence>
                        {(showAllComments ? comments : comments.slice(-2)).map((c) => (
                            <motion.div
                                key={c.id}
                                className="flex items-start justify-between group"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <p className="text-[13px] leading-relaxed">
                                    <Link to={`/profile/${c.username}`} className="font-semibold mr-1.5 hover:underline">
                                        {c.username}
                                    </Link>
                                    {c.text}
                                </p>
                                {(currentUser?.uid === post.userId || currentUser?.uid === c.userId) && (
                                    <button
                                        onClick={() => handleDeleteComment(c.id)}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all ml-2"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Comment input */}
                <form onSubmit={handleComment} className="flex items-center gap-2 py-3 border-t border-border/40 mt-3">
                    <input
                        type="text"
                        placeholder="Agrega un comentario..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-muted-foreground/60"
                    />
                    <AnimatePresence>
                        {comment.trim() && (
                            <motion.button
                                type="submit"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-[13px] font-semibold text-papu-coral hover:text-papu-coral/80 transition-colors"
                            >
                                Publicar
                            </motion.button>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </motion.article>
    );
}
