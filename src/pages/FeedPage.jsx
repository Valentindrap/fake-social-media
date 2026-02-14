import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import StoriesBar from '@/components/stories/StoriesBar';
import PostCard from '@/components/posts/PostCard';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

export default function FeedPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedType, setFeedType] = useState('global'); // 'following' or 'global'

    useEffect(() => {
        async function fetchPosts() {
            setLoading(true);
            try {
                // Fetch latest 50 posts globally
                const q = query(
                    collection(db, 'posts'),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );

                const querySnapshot = await getDocs(q);
                let fetchedPosts = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // If user follows people, try to filter
                if (userProfile?.followingList && userProfile.followingList.length > 0) {
                    const followingPosts = fetchedPosts.filter(post =>
                        userProfile.followingList.includes(post.userId) || post.userId === userProfile.uid
                    );

                    if (followingPosts.length > 0) {
                        setPosts(followingPosts);
                        setFeedType('following');
                    } else {
                        // User follows people but they haven't posted recently
                        // Fallback to global but maybe show a message
                        setPosts(fetchedPosts);
                        setFeedType('global_fallback');
                    }
                } else {
                    // User doesn't follow anyone -> Show global suggestios
                    setPosts(fetchedPosts);
                    setFeedType('global');
                }

            } catch (error) {
                console.error("Error fetching posts:", error);
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchPosts();
        }
    }, [userProfile, authLoading]);

    if (authLoading) return null;

    return (
        <div className="max-w-[470px] mx-auto md:py-8">
            {/* Stories */}
            <div className="bg-card border-b border-border/40 md:border md:border-border/60 md:rounded-xl md:mb-4">
                <StoriesBar />
            </div>

            {/* Feed State Banner */}
            {feedType !== 'following' && !loading && posts.length > 0 && (
                <div className="px-4 py-3 mb-2 bg-secondary/30 rounded-lg mx-2 md:mx-0 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold">Explorar</p>
                        <p className="text-xs text-muted-foreground">Publicaciones sugeridas para ti</p>
                    </div>
                    <Link to="/search">
                        <button className="text-xs bg-papu-coral text-white px-3 py-1.5 rounded-full font-semibold flex items-center gap-1">
                            <UserPlus className="h-3 w-3" /> Buscar amigos
                        </button>
                    </Link>
                </div>
            )}

            {/* Feed */}
            <div className="flex flex-col gap-3 md:gap-4 mt-2 md:mt-0 pb-8">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-papu-coral"></div>
                    </div>
                ) : posts.length > 0 ? (
                    posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No hay publicaciones recientes.</p>
                        <Link to="/search" className="text-papu-coral text-sm font-semibold hover:underline mt-2 inline-block">
                            Buscar personas para seguir
                        </Link>
                    </div>
                )}
            </div>

            {/* End of Feed */}
            {!loading && posts.length > 0 && (
                <div className="py-8 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-papu-coral border-t-transparent animate-spin mx-auto opacity-50"></div>
                </div>
            )}
        </div>
    );
}
