import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, db } from '@/lib/firebase';
import { compressAvatar } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EditProfilePage() {
    const { userProfile, currentUser } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        bio: '',
        avatarUrl: ''
    });

    useEffect(() => {
        if (userProfile) {
            setFormData({
                displayName: userProfile.displayName || '',
                username: userProfile.username || '',
                bio: userProfile.bio || '',
                avatarUrl: userProfile.avatarUrl || ''
            });
        }
    }, [userProfile]);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressAvatar(file);
                setFormData(prev => ({ ...prev, avatarUrl: compressed }));
            } catch (error) {
                console.error("Error processing avatar:", error);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!currentUser) return;

            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                displayName: formData.displayName,
                username: formData.username,
                bio: formData.bio,
                avatarUrl: formData.avatarUrl
            });
            navigate(`/profile/${formData.username}`);
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-8">Editar perfil</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Avatar Section */}
                <div className="flex items-center gap-6 bg-secondary/30 p-4 rounded-xl">
                    <Avatar className="w-20 h-20 border-2 border-background">
                        <AvatarImage src={formData.avatarUrl} />
                        <AvatarFallback>{formData.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-lg">{userProfile?.username}</div>
                        <Label htmlFor="avatar-upload" className="text-papu-coral font-semibold text-sm cursor-pointer hover:text-papu-coral/80">
                            Cambiar foto de perfil
                        </Label>
                        <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Nombre</Label>
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Para ayudar a que las personas descubran tu cuenta, usa el nombre por el que te conocen.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Nombre de usuario</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Presentación</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            maxLength={150}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="resize-none h-24"
                        />
                        <div className="text-xs text-right text-muted-foreground">
                            {formData.bio.length} / 150
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-papu-coral hover:bg-papu-coral/90 text-white font-semibold">
                        {loading ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
