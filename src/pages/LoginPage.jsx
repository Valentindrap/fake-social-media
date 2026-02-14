import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Chrome } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!username.trim() || !displayName.trim()) {
                    setError('Por favor completá todos los campos');
                    setLoading(false);
                    return;
                }
                await signup(email, password, username, displayName);
            }
            navigate('/');
        } catch (err) {
            setError(err.message || 'Error al autenticar');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError(err.message || 'Error con Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <img src="/logo.png" alt="Papu IG" className="h-24 w-auto drop-shadow-lg" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {isLogin ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
                    </p>
                </div>

                {/* Form */}
                <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {!isLogin && (
                            <>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Nombre de usuario"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Nombre completo"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10"
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                required
                            />
                        </div>

                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-sm text-destructive text-center"
                            >
                                {error}
                            </motion.p>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-papu-coral hover:bg-papu-coral/90 text-white font-semibold"
                            disabled={loading}
                        >
                            {loading ? 'Cargando...' : isLogin ? 'Iniciar sesión' : 'Registrarse'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/60"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-card px-2 text-muted-foreground">O</span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <Chrome className="h-4 w-4" />
                        Continuar con Google
                    </Button>

                    <div className="text-center text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-papu-coral hover:text-papu-coral/80 font-medium"
                        >
                            {isLogin ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Iniciá sesión'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
