import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db, collection, query, where, limit, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, deleteDoc, getDoc } from '@/lib/firebase';
import { Link } from 'react-router-dom';
import { compressImage } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
    const { currentUser, userProfile } = useAuth();
    const [usersWithStories, setUsersWithStories] = useState([]);
    const [myStory, setMyStory] = useState(null);
    const [viewingStory, setViewingStory] = useState(null); // { user, stories: [], currentIndex: 0 }
    const [uploading, setUploading] = useState(false);
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    // Fetch followed users with stories
    useEffect(() => {
        async function fetchStories() {
            if (!userProfile?.following || userProfile.following.length === 0) {
                setUsersWithStories([]);
                return;
            }

            try {
                // Firestore 'in' limit is 10. Split if needed, but for now take last 10 followed
                // In real app, you'd paginate or use a different strategy.
                const followingSlice = userProfile.following.slice(0, 10);

                const q = query(
                    collection(db, 'users'),
                    where('uid', 'in', followingSlice)
                );

                const snapshot = await getDocs(q);
                // In a full implementation, we would check if they actually have active stories
                // For this MVP, we'll assume if they are in the list, we check their 'hasStory' flag if we added it,
                // or just fetch their subcollection to verify? fetching subcollection is safer but slower.
                // Let's rely on a 'hasStory' field we will start maintaining. 
                // Since old users don't have it, we might miss them. 
                // Workaround: For this demo, fetch subcollection for these few users (parallel).

                const validUsers = [];
                await Promise.all(snapshot.docs.map(async (userDoc) => {
                    const userData = { id: userDoc.id, ...userDoc.data() };
                    // Check for stories in last 24h
                    const storiesQ = query(
                        collection(db, 'users', userData.uid, 'stories'),
                        orderBy('createdAt', 'desc'),
                        limit(1)
                    );
                    const storiesSnap = await getDocs(storiesQ);
                    if (!storiesSnap.empty) {
                        const lastStory = storiesSnap.docs[0].data();
                        const now = new Date();
                        const createdAt = lastStory.createdAt?.toDate() || new Date(0);
                        // Check expiry (24h)
                        if (now - createdAt < 24 * 60 * 60 * 1000) {
                            validUsers.push(userData);
                        } else {
                            // Expired story
                        }
                    }
                }));

                setUsersWithStories(validUsers);

            } catch (error) {
                console.error("Error fetching stories:", error);
            }
        }

        if (userProfile) {
            fetchStories();
            checkMyStory();
        }
    }, [userProfile]); // Re-run if following list changes matches updates

    const checkMyStory = async () => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'stories'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const data = snap.docs[0].data();
            const now = new Date();
            const createdAt = data.createdAt?.toDate() || new Date(0);
            if (now - createdAt < 24 * 60 * 60 * 1000) {
                setMyStory({ id: snap.docs[0].id, ...data });
            }
        }
    };

    const handleUploadClick = () => {
        if (myStory) {
            // View my story
            openStoryViewer(userProfile, true);
        } else {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !currentUser) return;

        setUploading(true);
        try {
            const compressed = await compressImage(file);
            await addDoc(collection(db, 'users', currentUser.uid, 'stories'), {
                image: compressed,
                createdAt: serverTimestamp(),
                type: 'image'
            });
            await updateDoc(doc(db, 'users', currentUser.uid), {
                hasStory: true,
                lastStoryAt: serverTimestamp()
            });
            await checkMyStory();
        } catch (error) {
            console.error("Error uploading story:", error);
        } finally {
            setUploading(false);
        }
    };

    const openStoryViewer = async (user, isMe = false) => {
        // Fetch stories for this user
        try {
            const q = query(
                collection(db, 'users', isMe ? currentUser.uid : user.uid, 'stories'),
                orderBy('createdAt', 'desc'), // Newest first
                limit(10) // Limit to 10 latest
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const stories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log("Opening story viewer. Stories found:", stories.length);
                if (stories.length > 0) {
                    console.log("First story image length:", stories[0].image?.length);
                }
                setViewingStory({
                    user: isMe ? userProfile : user,
                    stories: stories,
                    currentIndex: 0
                });
            }
        } catch (error) {
            console.error("Error opening story:", error);
        }
    };

    const closeViewer = () => setViewingStory(null);

    const nextStory = () => {
        if (viewingStory.currentIndex < viewingStory.stories.length - 1) {
            setViewingStory(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
        } else {
            closeViewer();
        }
    };

    const prevStory = () => {
        if (viewingStory.currentIndex > 0) {
            setViewingStory(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
        }
    };

    const handleDeleteStory = async (storyToDelete) => {
        if (!storyToDelete || !currentUser) return;

        // If coming from child component, storyToDelete is passed.
        // Fallback for safety (though component should drive this)
        const storyId = storyToDelete.id;

        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'stories', storyId));

            // If it was the only story, close viewer. 
            // If multiple, Viewer handles local state or we could update viewingStory here.
            // For simplicity, let's close viewer to force refresh or maybe just let viewer handle UI?
            // "StoryViewer" doesn't remove it from UI locally yet, it just calls onDelete.
            // Let's close for now to be safe and simple.
            closeViewer();

            setMyStory(null);
            checkMyStory();
            setUsersWithStories(prev => {
                // Remove user if no stories? Complex. Just refresh.
                // We'll leave it, checkMyStory updates "My Story" circle.
                return prev;
            });
        } catch (error) {
            console.error("Error deleting story:", error);
        }
    };

    const scroll = (direction) => {
        if (scrollRef.current) {
            const amount = direction === 'left' ? -200 : 200;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return (
        <>
            <div className="relative group">
                {/* Scroll buttons */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-background/90 shadow-md border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-background/90 shadow-md border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-background"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto hide-scrollbar smooth-scroll py-4 px-4"
                >
                    {/* Your story */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={handleUploadClick}>
                        <div className={`relative p-[2px] rounded-full ${myStory ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'border-2 border-border'}`}>
                            <div className="w-[58px] h-[58px] rounded-full overflow-hidden border-2 border-background">
                                <img
                                    src={userProfile?.avatarUrl || "https://github.com/shadcn.png"}
                                    alt="Tu historia"
                                    className={`w-full h-full object-cover ${uploading ? 'opacity-50' : ''}`}
                                />
                            </div>
                            {!myStory && !uploading && (
                                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-papu-coral text-white flex items-center justify-center border-2 border-background">
                                    <Plus className="h-3 w-3" strokeWidth={3} />
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                                </div>
                            )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium w-[66px] text-center truncate">
                            {uploading ? 'Subiendo...' : 'Tu historia'}
                        </span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Other stories (Followed Users) */}
                    {usersWithStories.map((user, index) => (
                        <div
                            key={user.id}
                            onClick={() => openStoryViewer(user)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group/story"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.05 * (index + 1) }}
                            >
                                <div className="story-ring">
                                    <div className="story-ring-inner">
                                        <div className="w-[56px] h-[56px] rounded-full overflow-hidden">
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.username}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                            <span className="text-[11px] text-muted-foreground font-medium w-[66px] text-center truncate group-hover/story:text-foreground transition-colors">
                                {user.username}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Story Viewer Overlay */}
            {viewingStory && (
                <StoryViewer
                    stories={viewingStory.stories}
                    initialIndex={viewingStory.currentIndex}
                    user={viewingStory.user}
                    onClose={closeViewer}
                    isOwner={viewingStory.user.username === userProfile?.username}
                    onDelete={(story) => handleDeleteStory(story)}
                />
            )}
        </>
    );
}
