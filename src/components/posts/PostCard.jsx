import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Bookmark, MoreHorizontal, Heart } from 'lucide-react';
import LikeButton from './LikeButton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { db, doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, setDoc, getDoc } from '@/lib/firebase';
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

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-card border border-border/60 rounded-xl overflow-hidden mb-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-3">
                <div className="flex items-center gap-3">
                    <Link to={`/profile/${post.user.username}`}>
                        <div className="story-ring p-[2px]">
                            <div className="story-ring-inner p-[1.5px]">
                                <Avatar className="w-8 h-8 border border-border">
                                    <AvatarImage src={postUser?.avatarUrl || post.user.avatar} />
                                    <AvatarFallback>{post.user.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    </Link>
                    <div className="flex flex-col">
                        <Link to={`/profile/${post.user.username}`} className="text-[13px] font-semibold leading-tight hover:underline">
                            {post.user.username}
                        </Link>
                        <span className="text-[11px] text-muted-foreground leading-tight">
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
                        <DropdownMenuItem className="cursor-pointer text-destructive">
                            Reportar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={toggleFollow}>
                            {isFollowing ? 'Dejar de seguir' : 'Seguir'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            Copiar enlace
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Image */}
            <div
                className="relative aspect-square bg-secondary cursor-pointer overflow-hidden"
                onClick={handleDoubleTap}
            >
                <motion.img
                    src={post.image}
                    alt={post.caption}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={imageLoaded ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    onLoad={() => setImageLoaded(true)}
                />

                {/* Floating heart on double tap */}
                <AnimatePresence>
                    {showFloatingHeart && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
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
            </div>

            {/* Actions */}
            <div className="px-3.5 pt-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LikeButton liked={liked} onToggle={handleLike} />
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <MessageCircle className="h-[22px] w-[22px] hover:text-muted-foreground transition-colors" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Send className="h-[20px] w-[20px] hover:text-muted-foreground transition-colors" />
                        </motion.button>
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
                            <motion.p
                                key={c.id}
                                className="text-[13px] leading-relaxed"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Link to={`/profile/${c.username}`} className="font-semibold mr-1.5 hover:underline">
                                    {c.username}
                                </Link>
                                {c.text}
                            </motion.p>
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
