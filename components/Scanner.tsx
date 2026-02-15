
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
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        {/* Type Selector Tabs */}
        <div className="bg-slate-800/40 p-1 rounded-xl md:rounded-2xl flex gap-1 border border-slate-700/50 overflow-x-auto no-scrollbar">
          {(['URL', 'EMAIL', 'SMS'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 px-3 md:px-4 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${
                type === t 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {t === 'URL' ? 'Website URL' : t === 'EMAIL' ? 'Email Body' : 'Text Message'}
            </button>
          ))}
        </div>

        {/* Input Card */}
        <div className="relative group">
          {/* Gradient Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
          
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
            {/* Main Textarea Area */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'URL' 
                  ? 'Paste suspicious website link here...' 
                  : 'Paste suspicious message content here...'
              }
              rows={6}
              className="w-full bg-transparent p-4 md:p-6 text-sm md:text-base text-slate-100 focus:outline-none transition-all resize-none placeholder:text-slate-600 min-h-[160px] md:min-h-[200px]"
              disabled={isScanning}
            />

            {/* Action Bar - No longer absolute, prevents text overlap */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-3">
              {isScanning && (
                <div className="flex-1 flex items-center gap-2 text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                  <span className="text-[10px] uppercase font-black tracking-widest">Neural Scan in Progress</span>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isScanning || !content.trim()}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 md:px-10 py-3 md:py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                  isScanning 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:shadow-blue-500/20 active:scale-95'
                }`}
              >
                {isScanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analysing...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-4 h-4" />
                    Deep Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Informational Hint */}
        {isScanning && (
          <div className="p-3 md:p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3 animate-pulse">
            <AlertIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] md:text-sm font-medium text-blue-200">
                Gemini AI is examining linguistic markers, URL obfuscation, and social engineering patterns...
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Scanner;
