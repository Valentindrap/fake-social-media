import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function PollOption({
    option,
    totalVotes,
    isSelected,
    hasVoted,
    onVote,
    disabled
}) {
    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

    return (
        <button
            onClick={() => !disabled && !hasVoted && onVote(option.id)}
            disabled={disabled || hasVoted}
            className={`
                w-full text-left rounded-xl p-3 transition-all relative overflow-hidden
                ${hasVoted
                    ? 'cursor-default'
                    : disabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:scale-[1.02]'
                }
                ${isSelected
                    ? 'border-2 border-papu-coral bg-papu-coral/10'
                    : 'border-2 border-border bg-secondary/50'
                }
            `}
        >
            {/* Progress Bar Background */}
            {hasVoted && (
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-0 bg-papu-coral/20"
                />
            )}

            {/* Content */}
            <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isSelected && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-papu-coral flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                        </div>
                    )}
                    <span className={`font-medium truncate ${isSelected ? 'text-papu-coral' : ''}`}>
                        {option.text}
                    </span>
                </div>

                {hasVoted && (
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-foreground/70">
                            {percentage}%
                        </span>
                        {option.votes > 0 && (
                            <span className="text-xs text-muted-foreground">
                                ({option.votes})
                            </span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}
