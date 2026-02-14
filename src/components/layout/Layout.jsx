import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import MobileNav from '@/components/layout/MobileNav';

export default function Layout() {
    return (
        <div className="min-h-screen bg-background text-foreground pb-[80px] md:pb-0 relative selection:bg-papu-coral/30 selection:text-papu-coral">
            {/* Global Background Glow - 'Papu Aura' */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-papu-coral/5 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <Navbar />
            <main className="max-w-[935px] mx-auto pt-[70px] min-h-[calc(100vh-70px)] relative z-10 px-0 md:px-4">
                <Outlet />
            </main>
            <MobileNav />
        </div>
    );
}
