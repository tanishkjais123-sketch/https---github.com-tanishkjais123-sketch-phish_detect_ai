
import React, { useState } from 'react';
import { SearchIcon, AlertIcon } from './Icons';

interface ScannerProps {
  onScan: (content: string, type: 'URL' | 'EMAIL' | 'SMS') => void;
  isScanning: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, isScanning }) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'URL' | 'EMAIL' | 'SMS'>('URL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onScan(content, type);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/40 p-1 rounded-2xl flex gap-1 border border-slate-700/50">
          {(['URL', 'EMAIL', 'SMS'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                type === t 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {t === 'URL' ? 'Website URL' : t === 'EMAIL' ? 'Email Body' : 'Text Message'}
            </button>
          ))}
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'URL' 
                  ? 'Paste suspicious website link here (e.g., https://verify-bank-update.net)...' 
                  : 'Paste suspicious message or email content here...'
              }
              rows={5}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none placeholder:text-slate-600"
              disabled={isScanning}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="submit"
                disabled={isScanning || !content.trim()}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
                  isScanning 
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:shadow-blue-500/20'
                }`}
              >
                {isScanning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing Risk...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-5 h-5" />
                    Deep Scan Content
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {isScanning && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-4 animate-pulse">
            <AlertIcon className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-200">
                Gemini AI is examining content structure, sentiment indicators, and technical headers...
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Scanner;
