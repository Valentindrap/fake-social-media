import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className="text-4xl font-bold mb-4">Esta página no está disponible.</h1>
            <p className="text-muted-foreground mb-8">
                Es posible que el enlace que seleccionaste esté dañado o que se haya eliminado la página.
            </p>
            <Link to="/">
                <Button>Volver a Inicio</Button>
            </Link>
        </div>
    );
}
