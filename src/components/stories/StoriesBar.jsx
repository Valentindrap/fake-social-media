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
            if (!userProfile?.followingList || userProfile.followingList.length === 0) {
                setUsersWithStories([]);
                return;
            }

            try {
                // Firestore 'in' limit is 10. Split if needed, but for now take last 10 followed
                // In real app, you'd paginate or use a different strategy.
                const followingSlice = userProfile.followingList.slice(0, 10);

                // Use documentId() to query by document ID (which is the UID)
                const { documentId } = await import('firebase/firestore');
                const q = query(
                    collection(db, 'users'),
                    where(documentId(), 'in', followingSlice)
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
                        collection(db, 'users', userData.id, 'stories'),
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
        // Use user.id (document ID) not user.uid (which might be undefined in the doc data)
        const targetId = isMe ? currentUser.uid : (user.id || user.uid);

        try {
            const q = query(
                collection(db, 'users', targetId, 'stories'),
                orderBy('createdAt', 'desc'), // Newest first
                limit(10) // Limit to 10 latest
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const stories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // ...
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

    // ...

    {/* Other stories (Followed Users) */ }
    {
        usersWithStories.map((user, index) => (
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
                    <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
                        <div className="rounded-full border-2 border-background p-[2px] bg-background">
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
        ))
    }
                </div >
            </div >

        {/* Story Viewer Overlay */ }
    {
        viewingStory && (
            <StoryViewer
                stories={viewingStory.stories}
                initialIndex={viewingStory.currentIndex}
                user={viewingStory.user}
                onClose={closeViewer}
                isOwner={viewingStory.user.username === userProfile?.username}
                onDelete={(story) => handleDeleteStory(story)}
            />
        )
    }
        </>
    );
}
