import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import MobileNav from '@/components/layout/MobileNav';

export default function Layout() {
    return (
        <div className="min-h-screen bg-background pb-[70px] md:pb-0">
            <Navbar />
            <main className="max-w-[935px] mx-auto pt-[60px] min-h-[calc(100vh-60px)]">
                <Outlet />
            </main>
            <MobileNav />
        </div>
    );
}
