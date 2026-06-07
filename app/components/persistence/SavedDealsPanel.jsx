'use client';
import { useState } from 'react';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export const SavedDealsPanel = ({ deals, onSave, onLoad, onDelete }) => {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  };

  return (
    <div className="space-y-4">
      {/* Save row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this deal…"
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          type="button"
          aria-label="Save"
          onClick={handleSave}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors',
            'bg-indigo-600 text-white hover:bg-indigo-700',
          )}
        >
          <Save size={12} />
          Save
        </button>
      </div>

      {/* Saved deals list */}
      {deals.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No saved deals yet.</p>
      ) : (
        <ul className="space-y-2">
          {deals.map((deal) => (
            <li key={deal.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{deal.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{deal.mode}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Load ${deal.name}`}
                  onClick={() => onLoad(deal.id)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <FolderOpen size={13} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${deal.name}`}
                  onClick={() => onDelete(deal.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
