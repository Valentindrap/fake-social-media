import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Bookmark, Ghost, Grid, Heart, MoreHorizontal, Plus, Settings, Share2, Sparkles, Trash2, User, Users, X, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';
import StoryViewer from '@/components/stories/StoryViewer';
import { collection, query, where, getDocs, db, doc, getDoc, orderBy, limit, deleteDoc } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { formatCompactNumber } from '@/lib/formatUtils';
import PostModal from '@/components/posts/PostModal';

export default function ProfilePage() {
    const { username } = useParams();
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [highlights, setHighlights] = useState([]);
    const [showCreateHighlight, setShowCreateHighlight] = useState(false);
    const [viewingHighlight, setViewingHighlight] = useState(null);
    const [activeStory, setActiveStory] = useState(null);
    const [viewingStory, setViewingStory] = useState(null);
    const [showStatBooster, setShowStatBooster] = useState(false);
    const [clickCount, setClickCount] = useState(0);

    const { isFollowing, toggleFollow } = useFollow(profile?.id);

    const isOwnProfile = currentUser && userProfile?.username === username;

    const [activeTab, setActiveTab] = useState('posts');

    useEffect(() => {
        async function fetchProfileAndPosts() {
            setLoading(true);
            setHighlights([]); // Reset highlights to avoid showing previous user's data
            try {
                // 1. Fetch Profile Data
                if (!profile || profile.username !== username) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username', '==', username));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const userDoc = querySnapshot.docs[0];
                        const userData = { id: userDoc.id, ...userDoc.data() };
                        setProfile(userData);
                    } else {
                        setProfile(null);
                        setLoading(false);
                        return;
                    }
                }

                if (!profile && !username) return;

                let useId = profile?.id;
                if (!useId) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username', '==', username));
                    const snap = await getDocs(q);
                    if (!snap.empty) useId = snap.docs[0].id;
                }

                if (!useId) return;

                // 2. Fetch Content based on Tab
                let fetchedPosts = [];
                if (activeTab === 'posts') {
                    const postsQ = query(collection(db, 'posts'), where('userId', '==', useId));
                    const snap = await getDocs(postsQ);
                    fetchedPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } else if (activeTab === 'saved' && isOwnProfile) {
                    const savedQ = query(collection(db, 'users', currentUser.uid, 'saved'), orderBy('savedAt', 'desc'));
                    const snap = await getDocs(savedQ);
                    fetchedPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } else if (activeTab === 'tagged') {
                    const taggedQ = query(collection(db, 'posts'), where('taggedUsers', 'array-contains', useId));
                    const snap = await getDocs(taggedQ);
                    fetchedPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }

                // Sort posts by date (client side)
                fetchedPosts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setPosts(fetchedPosts);

                // 3. Fetch Highlights
                if (useId) {
                    const hlQ = query(collection(db, 'users', useId, 'highlights'), orderBy('createdAt', 'desc'));
                    const hlSnap = await getDocs(hlQ);
                    setHighlights(hlSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                }

            } catch (error) {
                console.error("Error fetching profile content:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfileAndPosts();
    }, [username, activeTab, currentUser, isOwnProfile]);

    // Check for active story on profile load
    useEffect(() => {
        const checkActiveStory = async () => {
            if (!profile?.id) return;
            const q = query(
                collection(db, 'users', profile.id, 'stories'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const data = snap.docs[0].data();
                const now = new Date();
                const createdAt = data.createdAt?.toDate() || new Date(0);
                if (now - createdAt < 24 * 60 * 60 * 1000) {
                    setActiveStory({ id: snap.docs[0].id, ...data });
                }
            }
        };
        checkActiveStory();
    }, [profile]);

    const handleBoostTrigger = () => {
        if (currentUser?.email !== 'valentindrap01@gmail.com') return;
        setClickCount(prev => prev + 1);
        if (clickCount + 1 >= 5) {
            setShowStatBooster(true);
            setClickCount(0);
        }
    };

    const handleFollow = async () => {
        await toggleFollow();
        setProfile(prev => ({
            ...prev,
            followers: (prev.followers || 0) + (isFollowing ? -1 : 1)
        }));
    };

    const handleMessage = () => {
        if (!profile) return;
        navigate(`/messages?userId=${profile.id}`);
    };

    const handleAvatarClick = async () => {
        if (!activeStory || !profile) return;

        try {
            const q = query(
                collection(db, 'users', profile.id, 'stories'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const snap = await getDocs(q);
            const stories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const now = new Date();
            const validStories = stories.filter(s => {
                const created = s.createdAt?.toDate() || new Date(0);
                return now - created < 24 * 60 * 60 * 1000;
            });

            if (validStories.length > 0) {
                setViewingStory({
                    user: profile,
                    stories: validStories,
                    currentIndex: 0
                });
            }
        } catch (e) {
            console.error("Error opening profile story:", e);
        }
    };

    // Need to define `import('firebase/firestore').then(...)` alternative or standard import?
    // Using standard imports from logic above, `deleteDoc` is not imported yet.
    // Wait, the original file was using dynamic import for deleteDoc in some places?
    // Let's check imports. `deleteDoc` is NOT in the top imports in the file view I saw.
    // I will add `deleteDoc` and `limit` to the top import.

    // Actually, let's fix the imports in this writing.

    if (loading) return (
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-papu-coral"></div>
        </div>
    );

    if (!profile) return <div className="text-center p-8">Usuario no encontrado</div>;

    return (
        <div className="max-w-[935px] mx-auto px-4 py-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12">
                <div
                    className="mx-auto md:mx-0 w-[77px] h-[77px] md:w-[150px] md:h-[150px] flex-shrink-0 cursor-pointer"
                    onClick={handleAvatarClick}
                >
                    <div className={`w-full h-full rounded-full p-[3px] ${activeStory ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : ''}`}>
                        <div className="w-full h-full rounded-full border-2 border-background overflow-hidden relative">
                            <Avatar className="w-full h-full">
                                <AvatarImage src={profile.avatarUrl} className="object-cover" />
                                <AvatarFallback>{profile.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>

                <section className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                        <div className="flex items-center gap-1.5 justify-center md:justify-start">
                            <h2 className="text-xl md:text-2xl font-light flex items-center gap-2 flex-wrap">
                                <span className="truncate">{profile.username}</span>
                                {profile.godTitle && (
                                    <span className="bg-gradient-to-r from-papu-coral to-papu-violet text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-papu-coral/20 uppercase tracking-tighter">
                                        {profile.godTitle}
                                    </span>
                                )}
                                {profile.isVerified && <VerifiedBadge className="w-5 h-5" />}
                            </h2>
                        </div>
                        {isOwnProfile ? (
                            <div className="flex gap-2 justify-center md:justify-start">
                                <Link to="/edit-profile">
                                    <Button variant="secondary" size="sm" className="font-semibold h-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">Editar perfil</Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-2 justify-center md:justify-start">
                                <Button
                                    className={`font-semibold h-8 px-6 transition-all ${isFollowing
                                        ? 'bg-zinc-200 dark:bg-zinc-800 text-foreground hover:bg-zinc-300 dark:hover:bg-zinc-700'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        }`}
                                    onClick={handleFollow}
                                >
                                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="font-semibold h-8 px-6 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                                    onClick={handleMessage}
                                >
                                    Enviar mensaje
                                </Button>
                                <Button variant="secondary" size="icon" className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center md:justify-start gap-8 mb-4 text-sm md:text-base">
                        <span><span className="font-semibold">{formatCompactNumber(posts.length)}</span> publicaciones</span>
                        <span onClick={handleBoostTrigger} className={currentUser?.email === 'valentindrap01@gmail.com' ? "cursor-help" : ""}>
                            <span className="font-semibold">{formatCompactNumber(profile.followers || 0)}</span> seguidores
                        </span>
                        <span><span className="font-semibold">{formatCompactNumber(profile.following || 0)}</span> seguidos</span>
                    </div>

                    <div className="text-sm hidden md:block">
                        <span className="font-semibold block">{profile.displayName}</span>
                        <p className="whitespace-pre-wrap">{profile.bio}</p>
                    </div>

                    <div className="text-sm md:hidden px-2 mb-4">
                        <span className="font-semibold block">{profile.displayName}</span>
                        <p className="whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                </section>
            </header>

            {/* Highlights Section */}
            <div className="mb-12 px-4 md:px-0 scroll-container overflow-x-auto pb-4">
                <div className="flex gap-4 md:gap-8 min-w-max">
                    {/* Create Highlight Button (Owner Only) */}
                    {isOwnProfile && (
                        <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setShowCreateHighlight(true)}>
                            <div className="w-[60px] h-[60px] md:w-[77px] md:h-[77px] rounded-full border border-border flex items-center justify-center bg-secondary/50 group-hover:bg-secondary transition-colors">
                                <Plus className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                            </div>
                            <span className="text-xs font-semibold">Nueva</span>
                        </div>
                    )}

                    {/* Highlights List */}
                    {highlights.map((highlight) => (
                        <div
                            key={highlight.id}
                            className="flex flex-col items-center gap-2 cursor-pointer group relative"
                            onClick={() => setViewingHighlight(highlight)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (isOwnProfile) {
                                    if (confirm(`¿Borrar historia destacada "${highlight.title}"?`)) {
                                        import('firebase/firestore').then(({ deleteDoc, doc }) => deleteDoc(doc(db, 'users', currentUser.uid, 'highlights', highlight.id)));
                                        setHighlights(prev => prev.filter(h => h.id !== highlight.id));
                                    }
                                }
                            }}
                        >
                            <div className="w-[60px] h-[60px] md:w-[77px] md:h-[77px] rounded-full border border-border p-[2px] bg-background relative">
                                <div className="w-full h-full rounded-full overflow-hidden bg-secondary relative">
                                    <img src={highlight.coverImage} className="w-full h-full object-cover" />
                                </div>
                                {isOwnProfile && (
                                    <button
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`¿Borrar historia destacada "${highlight.title}"?`)) {
                                                deleteDoc(doc(db, 'users', currentUser.uid, 'highlights', highlight.id));
                                                setHighlights(prev => prev.filter(h => h.id !== highlight.id));
                                            }
                                        }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <span className="text-xs font-semibold truncate max-w-[70px] text-center">{highlight.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-border flex justify-center gap-12 text-xs font-semibold tracking-widest text-muted-foreground mb-4">
                <button
                    onClick={() => setActiveTab('posts')}
                    className={`flex items-center gap-1.5 h-[52px] border-t-2 -mt-[1px] transition-colors ${activeTab === 'posts' ? 'border-foreground text-foreground' : 'border-transparent hover:text-foreground'}`}
                >
                    <Grid className="h-3 w-3" /> PUBLICACIONES
                </button>
                {isOwnProfile && (
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex items-center gap-1.5 h-[52px] border-t-2 -mt-[1px] transition-colors ${activeTab === 'saved' ? 'border-foreground text-foreground' : 'border-transparent hover:text-foreground'}`}
                    >
                        <Bookmark className="h-3 w-3" /> GUARDADO
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('tagged')}
                    className={`flex items-center gap-1.5 h-[52px] border-t-2 -mt-[1px] transition-colors ${activeTab === 'tagged' ? 'border-foreground text-foreground' : 'border-transparent hover:text-foreground'}`}
                >
                    <Users className="h-3 w-3" /> ETIQUETAS
                </button>
            </div>

            {/* Grid */}
            {posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 md:gap-7">
                    {posts.map((post) => (
                        <div
                            key={post.id}
                            className="relative aspect-square group cursor-pointer bg-secondary"
                            onClick={() => setSelectedPost(post)}
                        >
                            <img src={post.image} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-6 text-white font-bold">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">❤ {post.likes}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center text-muted-foreground">
                    <div className="border-2 border-dashed border-border rounded-xl p-8 max-w-sm mx-auto">
                        <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                            <Grid className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">Aún no hay publicaciones</h3>
                        <p className="text-xs">Cuando compartas fotos, aparecerán en tu perfil.</p>
                    </div>
                </div>
            )}

            {selectedPost && (
                <PostModal
                    post={selectedPost}
                    user={profile}
                    currentUser={currentUser}
                    onClose={() => setSelectedPost(null)}
                    onPostDeleted={(postId) => setPosts(prev => prev.filter(p => p.id !== postId))}
                />
            )}

            {/* Create Highlight Dialog - Simplified for MVP */}
            {showCreateHighlight && (
                <CreateHighlightDialog
                    currentUser={currentUser}
                    onClose={() => setShowCreateHighlight(false)}
                    onCreated={() => {
                        const fetchH = async () => {
                            const hlQ = query(collection(db, 'users', currentUser.uid, 'highlights'), orderBy('createdAt', 'desc'));
                            const hlSnap = await getDocs(hlQ);
                            setHighlights(hlSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                        };
                        fetchH();
                        setShowCreateHighlight(false);
                    }}
                />
            )}

            {/* Highlight Viewer */}
            {viewingHighlight && (
                <StoryViewer
                    stories={viewingHighlight.stories}
                    user={profile}
                    onClose={() => setViewingHighlight(null)}
                    isOwner={isOwnProfile}
                />
            )}

            {/* Active Story Viewer (from Avatar) */}
            {viewingStory && (
                <StoryViewer
                    stories={viewingStory.stories}
                    user={profile}
                    onClose={() => setViewingStory(null)}
                    isOwner={isOwnProfile}
                    onDelete={async (story) => {
                        if (!isOwnProfile) return;
                        try {
                            await import('firebase/firestore').then(({ deleteDoc, doc }) => deleteDoc(doc(db, 'users', currentUser.uid, 'stories', story.id)));
                            setViewingStory(null);
                            setActiveStory(null);
                        } catch (e) {
                            console.error("Error deleting story from profile:", e);
                        }
                    }}
                />
            )}

            {/* Stat Booster Modal */}
            {showStatBooster && (
                <StatBooster
                    profile={profile}
                    onClose={() => setShowStatBooster(false)}
                    onUpdate={(updatedData) => setProfile(prev => ({ ...prev, ...updatedData }))}
                />
            )}

            {/* Global Chaos Mode (Confetti) */}
            {profile.chaosActive && <ConfettiRain />}
        </div>
    );
}

function ConfettiRain() {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (particles.length < 50) {
                setParticles(prev => [...prev, {
                    id: Math.random(),
                    x: Math.random() * 100,
                    size: Math.random() * 10 + 5,
                    color: ['#ff7f50', '#a855f7', '#3b82f6', '#fbbf24', '#ef4444'][Math.floor(Math.random() * 5)],
                    delay: Math.random() * 2
                }]);
            }
        }, 200);

        return () => clearInterval(interval);
    }, [particles.length]);

    const content = (
        <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
            <AnimatePresence>
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
                        animate={{
                            y: '110vh',
                            rotate: 360,
                            x: `${p.x + (Math.random() * 10 - 5)}vw`
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: Math.random() * 3 + 2, ease: "linear" }}
                        style={{
                            position: 'absolute',
                            width: p.size,
                            height: p.size,
                            backgroundColor: p.color,
                            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        }}
                        onAnimationComplete={() => {
                            setParticles(prev => prev.filter(party => party.id !== p.id));
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );

    return createPortal(content, document.body);
}

function StatBooster({ profile, onClose, onUpdate }) {
    const [followers, setFollowers] = useState(profile.followers || 0);
    const [following, setFollowing] = useState(profile.following || 0);
    const [displayName, setDisplayName] = useState(profile.displayName || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
    const [godTitle, setGodTitle] = useState(profile.godTitle || '');
    const [chaosActive, setChaosActive] = useState(profile.chaosActive || false);
    const [glitching, setGlitching] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { updateDoc, doc } = await import('firebase/firestore');
            const updatedData = {
                followers: Number(followers),
                following: Number(following),
                displayName: displayName,
                bio: bio,
                avatarUrl: avatarUrl,
                isVerified: isVerified,
                godTitle: godTitle,
                chaosActive: chaosActive
            };
            await updateDoc(doc(db, 'users', profile.id), updatedData);
            onUpdate(updatedData);
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error al actualizar stats");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-background w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/20">
                    <div>
                        <h3 className="font-black text-2xl italic tracking-tighter text-papu-coral">MODO DIOS ⚡</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Hacker Control Panel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-wider flex justify-between">
                                <span>Seguidores</span>
                                <span className="text-papu-coral">({formatCompactNumber(followers)})</span>
                            </label>
                            <Input
                                type="number"
                                value={followers}
                                onChange={(e) => setFollowers(e.target.value)}
                                className="bg-secondary/40 border-none h-14 text-xl font-black rounded-2xl focus-visible:ring-2 focus-visible:ring-papu-coral"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-wider flex justify-between">
                                <span>Seguidos</span>
                                <span className="text-papu-coral">({formatCompactNumber(following)})</span>
                            </label>
                            <Input
                                type="number"
                                value={following}
                                onChange={(e) => setFollowing(e.target.value)}
                                className="bg-secondary/40 border-none h-14 text-xl font-black rounded-2xl focus-visible:ring-2 focus-visible:ring-papu-coral"
                            />
                        </div>
                    </div>

                    <div className="space-y-5 pt-2 border-t border-border/50">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-wider">Display Name</label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Nombre visible..."
                                className="bg-secondary/40 border-none h-14 font-bold rounded-2xl focus-visible:ring-2 focus-visible:ring-papu-coral text-lg"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-wider">Bio (Multi-line)</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full bg-secondary/40 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-papu-coral focus:outline-none min-h-[100px] resize-none"
                                placeholder="Tu biografía de leyenda..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-wider">Avatar Direct URL</label>
                            <Input
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://i.imgur.com/..."
                                className="bg-secondary/40 border-none h-14 text-xs font-mono rounded-2xl focus-visible:ring-2 focus-visible:ring-papu-coral"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-blue-500/10 rounded-[24px] border border-blue-500/20 group hover:bg-blue-500/15 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-500 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                                <BadgeCheck className="w-6 h-6 text-white fill-white" strokeWidth={3} />
                            </div>
                            <div>
                                <span className="font-black text-base block leading-none tracking-tight">VERIFICADO</span>
                                <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1 block">Status Oficial</span>
                            </div>
                        </div>
                        <div
                            onClick={() => setIsVerified(!isVerified)}
                            className={`w-14 h-8 rounded-full p-1.5 cursor-pointer transition-all duration-300 shadow-inner ${isVerified ? 'bg-blue-500' : 'bg-zinc-700'}`}
                        >
                            <motion.div
                                animate={{ x: isVerified ? 24 : 0 }}
                                className="w-5 h-5 bg-white rounded-full shadow-md"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase ml-1 tracking-wider flex justify-between">
                            <span>Título Divino</span>
                            <span className="text-papu-violet italic">(Ejem: ADMIN, LEYENDA)</span>
                        </label>
                        <Input
                            value={godTitle}
                            onChange={(e) => setGodTitle(e.target.value)}
                            placeholder="Ej: LEYENDA"
                            className="bg-secondary/40 border-none h-14 font-black rounded-2xl focus-visible:ring-2 focus-visible:ring-papu-violet text-center uppercase tracking-tighter"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div
                            onClick={() => setChaosActive(!chaosActive)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 ${chaosActive ? 'bg-papu-violet/20 border-papu-violet' : 'bg-secondary/20 border-transparent hover:border-secondary-foreground/20'}`}
                        >
                            <Sparkles className={`w-8 h-8 ${chaosActive ? 'text-papu-violet fill-papu-violet animate-pulse' : 'text-muted-foreground'}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Modo Caos</span>
                        </div>
                        <div
                            onClick={() => {
                                setGlitching(true);
                                setTimeout(() => setGlitching(false), 2000);
                            }}
                            className="p-4 rounded-2xl bg-red-500/10 border-2 border-transparent hover:border-red-500/40 transition-all cursor-pointer flex flex-col items-center gap-2 group"
                        >
                            <Ghost className="w-8 h-8 text-red-500 group-hover:animate-bounce" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Auto-Destrucción</span>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {glitching && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[200] bg-white pointer-events-none"
                        >
                            <motion.div
                                animate={{
                                    opacity: [0, 1, 0, 0.8, 0],
                                    x: [0, 10, -10, 5, 0],
                                    filter: ['invert(0)', 'invert(1)', 'invert(0)']
                                }}
                                transition={{ duration: 0.2, repeat: 10 }}
                                className="w-full h-full bg-black flex items-center justify-center"
                            >
                                <span className="text-white font-mono text-4xl animate-pulse">SYSTEM ERROR: 404_GOD_NOT_FOUND</span>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="p-6 bg-secondary/5 border-t border-border">
                    <Button
                        className="w-full h-16 font-black text-xl italic bg-papu-coral hover:bg-papu-coral/90 rounded-2xl shadow-xl shadow-papu-coral/20 transition-all active:scale-[0.97]"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'MODIFICANDO EL SISTEMA...' : 'GUARDAR CAMBIOS GOD ⚡'}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

// Sub-component for Creating Highlight
function CreateHighlightDialog({ currentUser, onClose, onCreated }) {
    const [step, setStep] = useState(1);
    const [stories, setStories] = useState([]);
    const [selectedStories, setSelectedStories] = useState([]);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAllStories = async () => {
            const q = query(
                collection(db, 'users', currentUser.uid, 'stories'),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchAllStories();
    }, [currentUser]);

    const handleCreate = async () => {
        if (!title.trim() || selectedStories.length === 0) return;
        setLoading(true);
        try {
            const coverImage = selectedStories[0].image;
            await import('firebase/firestore').then(async ({ addDoc, collection, serverTimestamp }) => {
                await addDoc(collection(db, 'users', currentUser.uid, 'highlights'), {
                    title,
                    coverImage,
                    stories: selectedStories,
                    createdAt: serverTimestamp()
                });
            });
            onCreated();
        } catch (e) {
            console.error("Error creating highlight:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-background w-full max-w-md rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold">{step === 1 ? 'Seleccionar historias' : 'Nombre y portada'}</h3>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {step === 1 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {stories.map(story => (
                                <div
                                    key={story.id}
                                    className={`relative aspect-[9/16] cursor-pointer rounded-lg overflow-hidden border-2 ${selectedStories.find(s => s.id === story.id) ? 'border-blue-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    onClick={() => {
                                        if (selectedStories.find(s => s.id === story.id)) {
                                            setSelectedStories(prev => prev.filter(s => s.id !== story.id));
                                        } else {
                                            setSelectedStories(prev => [...prev, story]);
                                        }
                                    }}
                                >
                                    <img src={story.image} className="w-full h-full object-cover" />
                                    {selectedStories.find(s => s.id === story.id) && (
                                        <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-1">
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <div className="w-24 h-24 rounded-full border-2 border-border overflow-hidden p-1">
                                <div className="w-full h-full rounded-full bg-secondary">
                                    {selectedStories.length > 0 && <img src={selectedStories[0].image} className="w-full h-full object-cover" />}
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Destacada"
                                className="bg-transparent border-b border-border p-2 text-center focus:outline-none focus:border-foreground"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border">
                    {step === 1 ? (
                        <Button className="w-full" disabled={selectedStories.length === 0} onClick={() => setStep(2)}>Siguiente</Button>
                    ) : (
                        <Button className="w-full" disabled={!title.trim() || loading} onClick={handleCreate}>
                            {loading ? 'Creando...' : 'Listo'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
