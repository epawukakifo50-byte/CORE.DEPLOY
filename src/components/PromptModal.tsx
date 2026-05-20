import { useState, useEffect, useRef } from 'react';

interface PromptModalProps {
  title: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ title, defaultValue = '', onConfirm, onCancel }: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 diagonal-cut shadow-2xl p-6">
        <h3 className="text-emerald-500 font-bold font-mono uppercase tracking-widest mb-4 text-xs">{title}</h3>
        <input 
          ref={inputRef}
          type="text" 
          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 p-3 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors mb-6"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="System_Name_Only"
          onKeyDown={e => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="flex space-x-2">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 font-mono text-xs uppercase diagonal-cut bg-transparent border border-zinc-800 text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300 transition-colors"
          >
            [CANCEL]
          </button>
          <button 
            onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
            className="flex-1 py-3 font-mono text-xs uppercase diagonal-cut bg-zinc-800 border border-transparent hover:bg-zinc-700 text-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            [CONSTRUCT]
          </button>
        </div>
      </div>
    </div>
  );
}
