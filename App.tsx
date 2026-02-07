
import React, { useState, useCallback, useEffect } from 'react';
import { AnalysisResult, AppState } from './types';
import { analyzeContent } from './services/geminiService';
import Scanner from './components/Scanner';
import ResultView from './components/ResultView';
import VishingLab from './components/VishingLab';
import { ShieldIcon, HistoryIcon, InfoIcon, AlertIcon } from './components/Icons';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    history: [],
    isScanning: false,
    currentResult: null,
    isVishingLabActive: false
  });

  const [activeTab, setActiveTab] = useState<'scan' | 'vishing' | 'history' | 'about'>('scan');

  useEffect(() => {
    const saved = localStorage.getItem('phish_history');
    if (saved) {
      try {
        const parsedHistory: AnalysisResult[] = JSON.parse(saved);
        setState(prev => ({ ...prev, history: parsedHistory }));
      } catch (e) {
        console.error("Failed to parse local history");
      }
    }
  }, []);

  const handleScan = useCallback(async (content: string, type: 'URL' | 'EMAIL' | 'SMS') => {
    setState(prev => ({ ...prev, isScanning: true, currentResult: null }));
    
    try {
      const scanResult: AnalysisResult = await analyzeContent(content, type);
      
      setState(prev => {
        const updatedHistory = [scanResult, ...prev.history].slice(0, 50);
        localStorage.setItem('phish_history', JSON.stringify(updatedHistory));
        return {
          ...prev,
          isScanning: false,
          currentResult: scanResult,
          history: updatedHistory
        };
      });
      setActiveTab('scan');
    } catch (error: any) {
      setState(prev => ({ ...prev, isScanning: false }));
      
      let errorMessage = "An error occurred during content analysis.";
      if (error?.message?.includes('429') || error?.message?.includes('limit')) {
        errorMessage = "The Neural Engine is currently under heavy load. Please wait a moment and try your scan again.";
      } else if (error?.message?.includes('503')) {
        errorMessage = "Threat intelligence servers are temporarily busy. Please try again in a few seconds.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto py-4 md:h-20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <ShieldIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">PhishGuard AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Threat Intelligence Unit</p>
            </div>
          </div>

          <nav className="flex w-full md:w-auto overflow-x-auto pb-2 md:pb-0 gap-1 md:gap-2 no-scrollbar scroll-smooth whitespace-nowrap">
            {[
              { id: 'scan', label: 'Scan', icon: <ShieldIcon className="w-4 h-4" /> },
              { id: 'vishing', label: 'Vishing Lab', icon: <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" /> },
              { id: 'history', label: 'History', icon: <HistoryIcon className="w-4 h-4" /> },
              { id: 'about', label: 'Safety Academy', icon: <InfoIcon className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all shrink-0 ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-blue-400' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 w-full">
        {activeTab === 'scan' && (
          <div className="space-y-8 md:space-y-12">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Secure your digital <span className="text-blue-500">interactions.</span>
              </h2>
              <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
                Advanced neural analysis identifies zero-day phishing attempts, 
                social engineering markers, and malicious URLs in real-time.
              </p>
            </div>

            <Scanner onScan={handleScan} isScanning={state.isScanning} />

            {state.currentResult && (
              <div className="pt-4 md:pt-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-xl md:text-2xl font-bold">Analysis Report</h3>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, currentResult: null }))}
                    className="text-[10px] md:text-xs text-slate-500 hover:text-slate-300 underline"
                  >
                    Clear
                  </button>
                </div>
                <ResultView result={state.currentResult} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'vishing' && <VishingLab />}

        {activeTab === 'history' && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Analysis Log</h2>
                <p className="text-sm text-slate-400">Review your past forensic scans.</p>
              </div>
              <button 
                onClick={() => {
                  if(confirm("Clear all scan history?")) {
                    localStorage.removeItem('phish_history');
                    setState(prev => ({ ...prev, history: [] }));
                  }
                }}
                className="px-4 py-2 border border-slate-700 rounded-lg text-xs hover:bg-slate-900 transition-colors w-full sm:w-auto"
              >
                Clear History
              </button>
            </div>

            {state.history.length === 0 ? (
              <div className="text-center py-16 md:py-20 bg-slate-900/50 rounded-2xl md:rounded-3xl border border-dashed border-slate-800">
                <HistoryIcon className="w-10 h-10 md:w-12 md:h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">No scan history available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                {state.history.map((item: AnalysisResult) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between hover:border-slate-700 transition-all cursor-pointer group gap-4"
                    onClick={() => {
                      setState(prev => ({ ...prev, currentResult: item }));
                      setActiveTab('scan');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        item.isPhishing ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        <ShieldIcon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate text-sm md:text-base">{item.content}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] md:text-xs text-slate-500 mt-1 uppercase font-semibold">
                          <span className="text-blue-400">{item.type}</span>
                          <span>•</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={item.isPhishing ? 'text-rose-400' : 'text-emerald-400'}>
                            {item.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-blue-400 text-xs font-bold whitespace-nowrap self-end md:self-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      View Report →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-5xl mx-auto space-y-10 md:space-y-16 animate-in fade-in zoom-in duration-500 pb-20">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-3xl md:text-4xl font-black text-white">Digital Safety <span className="text-blue-500">Academy</span></h2>
              <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto px-2">
                Phishing evolved. Attacks are now hyper-personalized and AI-generated. 
                Use this guide to stay ahead of modern threat actors.
              </p>
            </div>

            <section className="space-y-6 md:space-y-8">
              <div className="flex items-center gap-4 px-2">
                <div className="w-1 h-6 md:h-8 bg-rose-500 rounded-full"></div>
                <h3 className="text-xl md:text-2xl font-bold">The Anatomy of a Phish</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[
                  { title: "Artificial Urgency", desc: "Threats of account closure or missing a one-time opportunity designed to stop you from thinking clearly.", icon: "⏰", color: "border-rose-500/30 bg-rose-500/5" },
                  { title: "Look-Alike Domains", desc: "Slight misspellings (e.g., g00gle.com) or unusual top-level domains (.tk) for trusted brands.", icon: "🔎", color: "border-blue-500/30 bg-blue-500/5" },
                  { title: "Generic Greetings", desc: "Emails starting with 'Dear Customer' rather than your specific name are major red flags.", icon: "👤", color: "border-amber-500/30 bg-amber-500/5" },
                  { title: "Suspicious Attachments", desc: "Unexpected PDFs or documents requiring you to 'Enable Macros' or 'Enable Content'.", icon: "📎", color: "border-emerald-500/30 bg-emerald-500/5" },
                  { title: "Requests for Secrets", desc: "Legitimate companies will NEVER ask for your password or PIN via email or SMS.", icon: "🤫", color: "border-purple-500/30 bg-purple-500/5" },
                  { title: "Unexpected Tones", desc: "If a friend suddenly sounds overly formal or makes an unusual request, their account might be compromised.", icon: "🎭", color: "border-slate-500/30 bg-slate-500/5" }
                ].map((item, i) => (
                  <div key={i} className={`p-6 md:p-8 border rounded-2xl md:rounded-[2rem] transition-all hover:scale-[1.01] ${item.color}`}>
                    <span className="text-3xl md:text-4xl mb-3 block">{item.icon}</span>
                    <h4 className="text-lg md:text-xl font-bold mb-2 md:mb-3">{item.title}</h4>
                    <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl md:rounded-[3rem] p-6 md:p-10 space-y-8 md:space-y-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none hidden md:block">
                <ShieldIcon className="w-64 h-64 text-blue-500" />
              </div>
              
              <div className="space-y-1 relative z-10">
                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">The Safety Playbook</h3>
                <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">Standard Operating Procedures</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-6 md:gap-y-8 relative z-10">
                {[
                  { num: "01", title: "MFA is Mandatory", text: "Use Multi-Factor Authentication (MFA) on every possible account. Preferably use an app like Authy." },
                  { num: "02", title: "Manual Entry Rule", text: "Never click links in alerts. Open a new tab and manually type the domain yourself." },
                  { num: "03", title: "Check the Sender", text: "Hover over the sender's name to see the actual underlying email address behind the display name." },
                  { num: "04", title: "Update Everything", text: "OS updates contain critical security patches. Never click 'Remind me tomorrow' for system updates." },
                  { num: "05", title: "Verify via Voice", text: "If you get a suspicious text from a friend asking for money, CALL them to confirm identity." },
                  { num: "06", title: "Password Managers", text: "They prevent phishing by refusing to autofill credentials on a domain that doesn't exactly match." }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 md:gap-6 group">
                    <span className="text-2xl md:text-3xl font-black text-slate-800 group-hover:text-blue-500/50 transition-colors shrink-0">{step.num}</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-100 text-sm md:text-base">{step.title}</h4>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-rose-950/20 border-2 border-dashed border-rose-500/30 p-6 md:p-10 rounded-2xl md:rounded-[3rem] flex flex-col lg:flex-row items-center gap-6 md:gap-10 text-center lg:text-left">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-rose-600 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(225,29,72,0.4)]">
                <AlertIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div className="space-y-4 w-full">
                <h3 className="text-xl md:text-2xl font-bold text-white">Emergency: I clicked a link. Now what?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-rose-950/40 rounded-xl text-[11px] md:text-xs text-rose-100 border border-rose-500/20">
                    <span className="font-bold block mb-1">1. DISCONNECT</span> Kill your internet connection immediately to stop exfiltration.
                  </div>
                  <div className="p-4 bg-rose-950/40 rounded-xl text-[11px] md:text-xs text-rose-100 border border-rose-500/20">
                    <span className="font-bold block mb-1">2. SCAN</span> Run a full malware scan with trusted software.
                  </div>
                  <div className="p-4 bg-rose-950/40 rounded-xl text-[11px] md:text-xs text-rose-100 border border-rose-500/20">
                    <span className="font-bold block mb-1">3. RESET</span> Change your passwords immediately from a DIFFERENT device.
                  </div>
                </div>
              </div>
            </section>

            <div className="text-center py-6">
              <p className="text-slate-500 text-xs italic">"Intelligence is the best firewall." — PhishGuard AI Systems</p>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center">
          <div className="text-slate-500 text-xs md:text-sm">
            © 2026 PhishGuard AI Systems. 
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-slate-500 hover:text-slate-300 text-xs md:text-sm">Security Policy</a>
            <a href="#" className="text-slate-500 hover:text-slate-300 text-xs md:text-sm">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
