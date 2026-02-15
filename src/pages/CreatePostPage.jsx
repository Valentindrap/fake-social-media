import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, X, ArrowLeft, UserPlus, Search, User, BarChart3, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { compressImage } from '@/lib/imageUtils';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { query, where, getDocs } from '@/lib/firebase';

export default function CreatePostPage() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();

    const [mediaFiles, setMediaFiles] = useState([]); // Array of {url, type}
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    // Tagging State
    const [showTagging, setShowTagging] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Poll State
    const [showPoll, setShowPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollDuration, setPollDuration] = useState(null); // null = no limit, or hours

    const fileInputRef = useRef(null);

    // Search Users Effect
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Search Effect
    useEffect(() => {
        const searchUsers = async () => {
            if (searchTerm.trim().length > 0) {
                setSearching(true);
                try {
                    const q = query(
                        collection(db, 'users'),
                        where('username', '>=', searchTerm.toLowerCase()),
                        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff')
                    );
                    const snapshot = await getDocs(q);
                    const users = snapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(u => u.id !== currentUser?.uid && !taggedUsers.some(t => t.uid === u.id));
                    setSearchResults(users);
                } catch (err) {
                    console.error("Error searching:", err);
                } finally {
                    setSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        const timer = setTimeout(searchUsers, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, currentUser, taggedUsers]);

    const handleTagUser = (user) => {
        setTaggedUsers([...taggedUsers, { uid: user.id, username: user.username, x: 0.5, y: 0.5 }]);
        setSearchTerm('');
        setSearchResults([]);
        // setShowTagging(false); // Optional: close or keep open
    };

    const removeTag = (uid) => {
        setTaggedUsers(taggedUsers.filter(t => t.uid !== uid));
    };

    // I will add useEffect to the first chunk if I can, but I can't edit line 1 easily with multi-replace safely if I don't see it in my chunks above.
    // Actually, I can just replace the whole file content or use a standard replace for line 1.
    // Let me try to use `useEffect` and if it fails, I'll fix it.
    // better: use `React.useEffect` if React is default imported? No.
    // I will update line 1 in a separate chunk.

    const handleFiles = async (files) => {
        if (!files) return;
        const fileList = Array.from(files);

        if (mediaFiles.length + fileList.length > 6) {
            setError("Máximo 6 archivos por publicación");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const processedFiles = await Promise.all(fileList.map(async (file) => {
                if (file.type.startsWith('image/')) {
                    // Aggressive compression for carousels (max 600px, 0.5 quality)
                    const compressed = await compressImage(file, 600, 0.5);
                    return { url: compressed, type: 'image' };
                } else if (file.type.startsWith('video/')) {
                    // Convert video to base64
                    // WARNING: base64 videos are huge. This only works for tiny clips.
                    if (file.size > 2 * 1024 * 1024) { // 2MB limit for the raw file before base64
                        throw new Error("El video es muy pesado. Intentá con uno de menos de 2MB.");
                    }
                    const base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    return { url: base64, type: 'video' };
                }
                return null;
            }));

            const validFiles = processedFiles.filter(f => f !== null);
            setMediaFiles(prev => [...prev, ...validFiles]);
        } catch (err) {
            console.error("Error processing files:", err);
            setError(err.message || "Error al procesar los archivos");
        } finally {
            setLoading(false);
        }
    };

    const removeMedia = (index) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = e.dataTransfer?.files;
        await handleFiles(files);
    };

    // Poll Helper Functions
    const addPollOption = () => {
        if (pollOptions.length < 4) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const removePollOption = (index) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const updatePollOption = (index, value) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const handleSubmit = async () => {
        // Validate: need either media or poll
        if (mediaFiles.length === 0 && !showPoll) return;
        if (showPoll && (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)) {
            setError('La encuesta necesita una pregunta y al menos 2 opciones');
            return;
        }
        if (!currentUser) return;
        setLoading(true);
        setError('');

        try {
            // Ensure userProfile is loaded
            if (!userProfile) {
                throw new Error("Perfil de usuario no cargado. Intentá recargar la página.");
            }

            // Estimate total size
            const totalSize = JSON.stringify(mediaFiles).length;
            if (totalSize > 900000) { // Close to 1MB Firestore limit
                throw new Error("La publicación es demasiado pesada para Firestore. Intentá con menos fotos o videos más cortos.");
            }

            const postData = {
                userId: currentUser.uid,
                user: {
                    username: userProfile.username || 'usuario',
                    avatar: userProfile.avatarUrl || '',
                    isVerified: userProfile.isVerified || false,
                },
                // For backward compatibility we keep 'image' as the first media component
                image: mediaFiles.length > 0 ? mediaFiles[0].url : null,
                media: mediaFiles, // All media (carousel)
                caption: caption,
                likes: 0,
                comments: [],
                createdAt: serverTimestamp(),
                taggedUsers: taggedUsers.map(t => ({ uid: t.uid, username: t.username, x: 0.5, y: 0.5 }))
            };

            // Add poll data if poll is enabled
            if (showPoll && pollQuestion.trim()) {
                const validOptions = pollOptions.filter(o => o.trim());
                postData.poll = {
                    question: pollQuestion.trim(),
                    options: validOptions.map((text, index) => ({
                        id: `opt_${index}_${Date.now()}`,
                        text: text.trim(),
                        votes: 0
                    })),
                    voters: {},
                    duration: pollDuration,
                    endsAt: pollDuration ? new Date(Date.now() + pollDuration * 60 * 60 * 1000) : null
                };
            }

            await addDoc(collection(db, 'posts'), postData);
            navigate('/');
        } catch (error) {
            console.error("Error creating post:", error);
            setError("Error al crear la publicación: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-4 min-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">Nueva publicación</h1>
                <Button
                    onClick={handleSubmit}
                    disabled={(mediaFiles.length === 0 && !showPoll) || loading}
                    className="text-papu-coral hover:text-papu-coral/80 font-semibold"
                    variant="ghost"
                >
                    {loading ? 'Publicando...' : 'Compartir'}
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="flex-1 flex flex-col gap-6">
                {mediaFiles.length === 0 ? (
                    <motion.div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
              flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors min-h-[300px]
              ${dragActive ? 'border-papu-coral bg-papu-coral/5' : 'border-border hover:bg-secondary/20'}
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                        <div className="bg-secondary rounded-full p-4">
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium text-center px-4">
                            Arrastra o toca para seleccionar fotos y videos (hasta 6)
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {/* Selected Media Grid/Preview */}
                        <div className="grid grid-cols-2 gap-2">
                            {mediaFiles.map((file, index) => (
                                <div key={index} className="relative aspect-square bg-secondary rounded-xl overflow-hidden shadow-sm group">
                                    {file.type === 'image' ? (
                                        <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-black flex items-center justify-center relative">
                                            <video src={file.url} className="w-full h-full object-cover opacity-60" />
                                            <Play className="absolute h-8 w-8 text-white fill-white" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removeMedia(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                                        disabled={loading}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {mediaFiles.length < 6 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-border rounded-xl flex items-center justify-center hover:bg-secondary/20 transition-colors"
                                    disabled={loading}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleFiles(e.target.files)}
                                    />
                                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                                {userProfile?.avatarUrl && (
                                    <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <Textarea
                                placeholder="Escribí una descripción..."
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base"
                            />
                        </div>

                        {/* Tagging Section */}
                        <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <Button
                                    variant="ghost"
                                    className="p-0 h-auto font-semibold text-sm hover:bg-transparent"
                                    onClick={() => setShowTagging(!showTagging)}
                                >
                                    <div className="flex items-center gap-2">
                                        <UserPlus className="h-5 w-5" />
                                        <span>Etiquetar personas</span>
                                        {taggedUsers.length > 0 && (
                                            <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                                                {taggedUsers.length}
                                            </span>
                                        )}
                                    </div>
                                </Button>
                            </div>

                            <AnimatePresence>
                                {showTagging && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-secondary/30 rounded-xl p-3 mb-4">
                                            <div className="relative mb-3">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Buscar usuario..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-9 h-9 bg-background border-none"
                                                />
                                            </div>

                                            {/* Results */}
                                            {searching ? (
                                                <div className="flex justify-center py-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div></div>
                                            ) : searchResults.length > 0 ? (
                                                <div className="max-h-[150px] overflow-y-auto space-y-1">
                                                    {searchResults.map(user => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => handleTagUser(user)}
                                                            className="flex items-center gap-2 p-2 hover:bg-background rounded-lg cursor-pointer transition-colors"
                                                        >
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={user.avatarUrl} />
                                                                <AvatarFallback>{user.username[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm font-medium">{user.username}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : searchTerm && (
                                                <p className="text-xs text-center text-muted-foreground py-2">No se encontraron usuarios</p>
                                            )}

                                            {/* Selected Tags */}
                                            {taggedUsers.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                                                    {taggedUsers.map(tag => (
                                                        <div key={tag.uid} className="flex items-center gap-1 bg-background text-xs font-semibold px-2 py-1 rounded-md border border-border">
                                                            <span>@{tag.username}</span>
                                                            <button onClick={() => removeTag(tag.uid)} className="text-muted-foreground hover:text-destructive">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Poll Section */}
                        <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <Button
                                    variant="ghost"
                                    className="p-0 h-auto font-semibold text-sm hover:bg-transparent"
                                    onClick={() => setShowPoll(!showPoll)}
                                >
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        <span>Agregar encuesta</span>
                                    </div>
                                </Button>
                            </div>

                            <AnimatePresence>
                                {showPoll && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-3 pt-3">
                                            {/* Poll Question */}
                                            <Input
                                                placeholder="Pregunta de la encuesta..."
                                                value={pollQuestion}
                                                onChange={(e) => setPollQuestion(e.target.value)}
                                                className="font-medium"
                                            />

                                            {/* Poll Options */}
                                            <div className="space-y-2">
                                                {pollOptions.map((option, index) => (
                                                    <div key={index} className="flex gap-2">
                                                        <Input
                                                            placeholder={`Opción ${index + 1}`}
                                                            value={option}
                                                            onChange={(e) => updatePollOption(index, e.target.value)}
                                                            className="flex-1"
                                                        />
                                                        {pollOptions.length > 2 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removePollOption(index)}
                                                                className="shrink-0"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Option Button */}
                                            {pollOptions.length < 4 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addPollOption}
                                                    className="w-full"
                                                >
                                                    + Agregar opción
                                                </Button>
                                            )}

                                            {/* Duration Selector */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-muted-foreground">Duración:</span>
                                                <select
                                                    value={pollDuration || ''}
                                                    onChange={(e) => setPollDuration(e.target.value ? parseInt(e.target.value) : null)}
                                                    className="bg-secondary border border-border rounded-md px-2 py-1 text-sm"
                                                >
                                                    <option value="">Sin límite</option>
                                                    <option value="24">1 día</option>
                                                    <option value="72">3 días</option>
                                                    <option value="168">7 días</option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
