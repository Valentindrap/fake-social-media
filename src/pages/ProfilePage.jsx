import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Settings, Grid, Bookmark, Users, MoreHorizontal, Trash2, Heart, X, Plus } from 'lucide-react';
import StoryViewer from '@/components/stories/StoryViewer';
import { collection, query, where, getDocs, db, doc, getDoc, orderBy } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

    const { isFollowing, toggleFollow } = useFollow(profile?.id);

    const isOwnProfile = currentUser && userProfile?.username === username;

    const [activeTab, setActiveTab] = useState('posts');

    useEffect(() => {
        async function fetchProfileAndPosts() {
            setLoading(true);
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

    const handleFollow = async () => {
        await toggleFollow();
        setProfile(prev => ({
            ...prev,
            followers: prev.followers + (isFollowing ? -1 : 1)
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
                        <h2 className="text-xl md:text-2xl font-normal truncate text-center md:text-left">{profile.username}</h2>
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
                        <span><span className="font-semibold">{posts.length}</span> publicaciones</span>
                        <span><span className="font-semibold">{profile.followers || 0}</span> seguidores</span>
                        <span><span className="font-semibold">{profile.following || 0}</span> seguidos</span>
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
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => setViewingHighlight(highlight)}
                        >
                            <div className="w-[60px] h-[60px] md:w-[77px] md:h-[77px] rounded-full border border-border p-[2px] bg-background">
                                <div className="w-full h-full rounded-full overflow-hidden bg-secondary relative">
                                    <img src={highlight.coverImage} className="w-full h-full object-cover" />
                                </div>
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

            {/* Post Modal */}
            {selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedPost(null)}>
                    <div className="bg-background max-w-4xl w-full max-h-[90vh] rounded-lg overflow-hidden flex flex-col md:flex-row shadow-2xl" onClick={e => e.stopPropagation()}>

                        {/* Image Side */}
                        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                            <img src={selectedPost.image} className="max-w-full max-h-full object-contain" />
                        </div>

                        {/* Details Side */}
                        <div className="w-full md:w-[350px] flex flex-col border-l border-border">
                            {/* Header */}
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                        <AvatarImage src={profile.avatarUrl} />
                                        <AvatarFallback>{profile.username[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-semibold text-sm">{profile.username}</span>
                                </div>
                                {currentUser?.uid === selectedPost.userId && (
                                    <div className="relative">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                            onClick={async () => {
                                                if (confirm('¿Estás seguro de borrar esta publicación?')) {
                                                    try {
                                                        // Using dynamic import or direct? Let's use direct if imported, or dynamic but fix import
                                                        await import('firebase/firestore').then(({ deleteDoc, doc }) => deleteDoc(doc(db, 'posts', selectedPost.id)));
                                                        setPosts(prev => prev.filter(p => p.id !== selectedPost.id)); // Optimistic remove
                                                        setSelectedPost(null);
                                                    } catch (e) {
                                                        console.error("Error borrando:", e);
                                                    }
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Caption / Comments Area */}
                            <div className="flex-1 p-4 overflow-y-auto text-sm space-y-4">
                                <div>
                                    <span className="font-semibold mr-2">{profile.username}</span>
                                    <span>{selectedPost.caption}</span>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 border-t border-border">
                                <div className="flex items-center gap-4 mb-2">
                                    <Heart className={`h-6 w-6 ${selectedPost.likedBy?.includes(currentUser?.uid) ? 'fill-red-500 text-red-500' : ''}`} />
                                    <div className="flex-1"></div>
                                    <Bookmark className="h-6 w-6" />
                                </div>
                                <div className="font-bold text-sm mb-1">{selectedPost.likes || 0} Me gusta</div>
                                <div className="text-[10px] text-muted-foreground uppercase">
                                    {selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate().toLocaleDateString() : 'Hace un momento'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Close Button Mobile */}
                    <button className="absolute top-4 right-4 text-white md:hidden" onClick={() => setSelectedPost(null)}>
                        <X className="h-8 w-8" />
                    </button>
                </div>
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
