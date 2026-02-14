import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db, collection, query, limit, getDocs } from '@/lib/firebase';
import { Link } from 'react-router-dom';

export default function StoriesBar() {
    const { currentUser, userProfile } = useAuth();
    const [users, setUsers] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        async function fetchUsers() {
            try {
                const q = query(collection(db, 'users'), limit(15));
                const querySnapshot = await getDocs(q);
                const fetchedUsers = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => u.username !== userProfile?.username); // Filter out current user
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching stories users:", error);
            }
        }

        if (userProfile) {
            fetchUsers();
        }
    }, [userProfile]);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const amount = direction === 'left' ? -200 : 200;
            scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return (
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
                <Link to={`/profile/${userProfile?.username}`} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
                    <div className="relative">
                        <div className="w-[62px] h-[62px] rounded-full overflow-hidden border-2 border-border">
                            <img
                                src={userProfile?.avatarUrl || "https://github.com/shadcn.png"}
                                alt="Tu historia"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-papu-coral text-white flex items-center justify-center border-2 border-background">
                            <Plus className="h-3 w-3" strokeWidth={3} />
                        </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium w-[66px] text-center truncate">
                        Tu historia
                    </span>
                </Link>

                {/* Other stories (Real Users) */}
                {users.map((user, index) => (
                    <Link
                        to={`/profile/${user.username}`}
                        key={user.id}
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
                    </Link>
                ))}
            </div>
        </div>
    );
}
