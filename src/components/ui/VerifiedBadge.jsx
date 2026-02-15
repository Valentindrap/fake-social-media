import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ className = "w-4 h-4" }) {
    return (
        <BadgeCheck
            className={`${className} text-blue-500 fill-blue-500 stroke-background shrink-0`}
        />
    );
}
