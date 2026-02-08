import { GoogleGenAI, Modality, Type } from '@google/genai';
import React, { useRef, useState } from 'react';
import { AlertIcon, ShieldIcon } from './Icons';

// Audio Helpers
// Fix: Added manual implementation of encode/decode as per guidelines.
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const VishingLab: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [scamDetected, setScamDetected] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState('Standby');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const blockCall = () => {
    setScamDetected(true);
    setIsIncomingCall(false);
    setStatusMessage('THREAT NEUTRALIZED: Call Intercepted and Terminated.');
    stopDetection();
  };

  const startDetection = async () => {
    try {
      // Guideline: Create instance right before API call.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a Vishing (Voice Phishing) Detection System. 
          Your job is to listen to the caller and identify if it is a scam.
          Signs of scam: 
          1. Asking for OTP/Password.
          2. Impersonating Government (IRS, Police) or Bank.
          3. Creating artificial urgency (account will be blocked in 5 mins).
          4. Asking for payment via Gift Cards.
          5. Robotic or suspicious tone.
          
          If you are 90% sure it's a scam, trigger the 'blockCall' function immediately. 
          Don't wait for a turn complete if you hear a clear red flag.`,
          tools: [{
            functionDeclarations: [{
              name: 'blockCall',
              parameters: {
                // Fix: Type.OBJECT must have properties.
                type: Type.OBJECT,
                properties: {
                  reason: {
                    type: Type.STRING,
                    description: 'The specific reason why the call is being blocked.'
                  }
                },
                required: ['reason']
              },
              description: 'Immediately terminates the call if a scam is detected.'
            }]
          }],
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Fix: Solely rely on sessionPromise.
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: createBlob(inputData) });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setStatusMessage('Real-time Monitoring Active');
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.inputTranscription) {
              const text:string = msg.serverContent.inputTranscription.text ||"";
              setTranscription(prev => [...prev.slice(-10), text]);
            }

            // Fix: Handle audio output playback for smooth gapless streaming.
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (msg.toolCall?.functionCalls) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'blockCall') {
                  blockCall();
                  // Fix: Send tool response back to the model.
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { 
                      id: fc.id, 
                      name: fc.name, 
                      response: { result: 'Call blocked successfully' } 
                    }
                  }));
                }
              }
            }
          },
          onerror: (e) => console.error('Live Error:', e),
          onclose: () => console.log('Live Closed'),
        }
      });

      sessionRef.current = await sessionPromise;
      setIsActive(true);
      setScamDetected(false);
    } catch (err) {
      console.error(err);
      alert('Could not access microphone or connect to AI. Please check permissions.');
    }
  };

  const stopDetection = () => {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    for (const source of sourcesRef.current.values()) {
      source.stop();
    }
    sourcesRef.current.clear();
    setIsActive(false);
    setIsIncomingCall(false);
    setStatusMessage('Standby');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden relative">
        {/* Background Animation */}
        {isActive && !scamDetected && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full animate-ping duration-[3000ms]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full animate-ping duration-[2000ms]"></div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 animate-pulse shadow-[0_0_30px_rgba(37,99,235,0.4)]' : 'bg-slate-800'}`}>
            <ShieldIcon className="w-10 h-10 text-white" />
          </div>

          <div>
            <h2 className="text-3xl font-black mb-2">Vishing Lab</h2>
            <p className="text-slate-400 max-w-md mx-auto italic">
              "Silently monitoring audio signals for deceptive voice tactics. Active protection against phone scammers."
            </p>
          </div>

          <div className="flex gap-4">
            {!isActive ? (
              <button
                onClick={startDetection}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold shadow-xl transition-all"
              >
                Activate Protection
              </button>
            ) : (
              <button
                onClick={stopDetection}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-3 rounded-2xl font-bold transition-all border border-slate-700"
              >
                Deactivate
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-full border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{statusMessage}</span>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px]">
          {/* Simulation Controls */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-slate-300 uppercase text-xs tracking-widest mb-4">Simulation Environment</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsIncomingCall(true)}
                disabled={isIncomingCall || scamDetected}
                className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Simulate Incoming Call
              </button>
              <p className="text-[10px] text-slate-500 text-center">
                Click above to simulate an incoming call. Try talking like a scammer (e.g. "I am from IRS, give me your OTP") to test detection.
              </p>
            </div>
            
            {isIncomingCall && (
              <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl animate-bounce">
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-400">INCOMING CALL...</span>
                    <button onClick={() => setIsIncomingCall(false)} className="text-[10px] text-slate-500 underline">End Sim</button>
                 </div>
                 <p className="text-xs text-slate-400 mt-2">The AI is currently analyzing your voice for vishing patterns.</p>
              </div>
            )}
          </div>

          {/* Real-time Transcription Log */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col">
            <h3 className="font-bold text-slate-300 uppercase text-xs tracking-widest mb-4">Neural Transcription Log</h3>
            <div className="flex-1 overflow-y-auto space-y-2 mono text-xs text-slate-400">
              {transcription.length === 0 ? (
                <p className="opacity-30 italic">No audio detected yet...</p>
              ) : (
                transcription.map((line, i) => (
                  <div key={i} className="animate-in slide-in-from-left-2 fade-in">
                    <span className="text-blue-500/50">[{new Date().toLocaleTimeString([], {hour12: false})}]</span> {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Red Alert Modal */}
      {scamDetected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-rose-950 border-4 border-rose-600 p-10 rounded-[40px] max-w-lg w-full text-center space-y-8 shadow-[0_0_100px_rgba(225,29,72,0.4)] animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-rose-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <AlertIcon className="w-16 h-16 text-white" />
            </div>
            <div className="space-y-4">
              <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic">Scam Detected</h2>
              <p className="text-rose-200 text-lg">
                PhishGuard AI intercepted a high-risk voice pattern associated with <strong>Credential Harvesting</strong>.
              </p>
              <div className="bg-rose-900/50 p-4 rounded-2xl border border-rose-600/30">
                <span className="text-sm font-bold uppercase tracking-widest text-rose-300 block mb-1">System Action</span>
                <span className="text-2xl font-black text-white">CALL TERMINATED</span>
              </div>
            </div>
            <button 
              onClick={() => setScamDetected(false)}
              className="w-full py-4 bg-white text-rose-900 rounded-2xl font-black text-xl hover:bg-rose-100 transition-all shadow-xl"
            >
              DISMISS ALERT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VishingLab;