import { GoogleGenAI, Modality, Type } from '@google/genai';
import React, { useRef, useState } from 'react';
import { AlertIcon, ShieldIcon } from './Icons';

// Audio Helpers
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
    setStatusMessage('THREAT NEUTRALIZED: Call Intercepted.');
    stopDetection();
  };

  const startDetection = async () => {
    try {
      // FIX: Changed process.env to import.meta.env for Vite/Netlify compatibility
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY is not defined in environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      setStatusMessage('Connecting to Neural Engine...');

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a Vishing Detection System. Monitor the audio. 
          Red Flags: 1. Requests for OTP/Password. 2. Impersonation of Bank/Gov. 3. High Urgency.
          If you detect a scam (90% confidence), call 'blockCall' tool immediately.`,
          tools: [{
            functionDeclarations: [{
              name: 'blockCall',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  reason: { type: Type.STRING, description: 'Reason for blocking' }
                },
                required: ['reason']
              },
              description: 'Terminates call if scam detected.'
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
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: createBlob(inputData) });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setStatusMessage('Real-time Monitoring Active');
            setIsActive(true);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text || "";
              setTranscription(prev => [...prev.slice(-9), text]);
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (msg.toolCall?.functionCalls) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'blockCall') {
                  blockCall();
                }
              }
            }
          },
          onerror: (e) => {
            console.error('Live Error:', e);
            setStatusMessage('Connection Error');
          },
          onclose: () => setStatusMessage('Standby'),
        }
      });

      sessionRef.current = await sessionPromise;
      setScamDetected(false);
    } catch (err) {
      console.error(err);
      alert('Connection failed. Please check your Microphone permissions and API key.');
    }
  };

  const stopDetection = () => {
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsActive(false);
    setIsIncomingCall(false);
    setStatusMessage('Standby');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
        {isActive && !scamDetected && (
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full animate-ping"></div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 animate-pulse' : 'bg-slate-800'}`}>
            <ShieldIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-2">Vishing Lab</h2>
            <p className="text-slate-400">Real-time voice deception monitoring.</p>
          </div>

          <div className="flex gap-4">
            {!isActive ? (
              <button onClick={startDetection} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold transition-all">
                Activate Protection
              </button>
            ) : (
              <button onClick={stopDetection} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-3 rounded-2xl font-bold transition-all border border-slate-700">
                Deactivate
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-full border border-slate-800">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-xs font-bold uppercase text-slate-400">{statusMessage}</span>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-slate-300 uppercase text-xs">Simulate</h3>
            <button 
              onClick={() => setIsIncomingCall(true)}
              disabled={isIncomingCall || scamDetected}
              className="w-full py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl"
            >
              Simulate Incoming Call
            </button>
            {isIncomingCall && (
              <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl animate-bounce text-center">
                <span className="text-sm font-bold text-blue-400 italic">CALL IN PROGRESS...</span>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col h-[250px]">
            <h3 className="font-bold text-slate-300 uppercase text-xs mb-4">Transcription Log</h3>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs text-slate-400 font-mono">
              {transcription.map((line, i) => (
                <div key={i} className="border-l border-blue-500/30 pl-2">{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {scamDetected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-rose-950 border-4 border-rose-600 p-10 rounded-[40px] max-w-lg text-center space-y-8 shadow-2xl">
            <AlertIcon className="w-16 h-16 text-white mx-auto animate-bounce" />
            <h2 className="text-4xl font-black text-white">SCAM DETECTED</h2>
            <div className="bg-rose-900/50 p-4 rounded-2xl border border-rose-600/30">
                <span className="text-2xl font-black text-white">CALL TERMINATED</span>
            </div>
            <button onClick={() => setScamDetected(false)} className="w-full py-4 bg-white text-rose-900 rounded-2xl font-black">
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VishingLab;