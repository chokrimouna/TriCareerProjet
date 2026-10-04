import React from 'react';

interface EmojiRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

const emojiScale = [
  { emoji: '😰', label: 'Très mauvais', value: 1, color: '#7F1D1D' },
  { emoji: '😟', label: 'Mauvais', value: 2, color: '#991B1B' },
  { emoji: '😕', label: 'Insuffisant', value: 3, color: '#DC2626' },
  { emoji: '😐', label: 'Moyen', value: 5, color: '#EA580C' },
  { emoji: '🙂', label: 'Correct', value: 6, color: '#D97706' },
  { emoji: '😊', label: 'Bien', value: 7, color: '#CA8A04' },
  { emoji: '😃', label: 'Très bien', value: 8, color: '#65A30D' },
  { emoji: '🤩', label: 'Excellent', value: 9, color: '#16A34A' },
  { emoji: '⭐', label: 'Exceptionnel', value: 10, color: '#059669' },
];

export const EmojiRating: React.FC<EmojiRatingProps> = ({ value, onChange, readonly = false }) => {
  const getActiveEmoji = () => {
    return emojiScale.reduce((prev, curr) => {
      return (Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev);
    });
  };

  const activeEmoji = getActiveEmoji();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-secondary/20 p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{activeEmoji.emoji}</span>
          <div>
            <p className="font-bold text-sm" style={{ color: activeEmoji.color }}>{activeEmoji.label}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Score: {value}/10</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center px-1">
        {emojiScale.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(item.value)}
            className={`w-12 h-12 flex items-center justify-center text-2xl transition-all duration-200 ${
              value === item.value 
                ? 'rounded-full border-[3px] shadow-lg scale-125' 
                : 'rounded-full opacity-60 hover:opacity-100 hover:scale-110'
            } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            style={value === item.value ? { borderColor: item.color, backgroundColor: item.color + '15' } : {}}
            title={item.label}
          >
            {item.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
