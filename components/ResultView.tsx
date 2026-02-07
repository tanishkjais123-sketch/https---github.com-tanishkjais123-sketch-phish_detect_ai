
import React from 'react';
import { AnalysisResult, RiskLevel } from '../types';
import { ShieldIcon, AlertIcon, InfoIcon } from './Icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip} from 'recharts';

interface ResultViewProps {
  result: AnalysisResult;
}

const getRiskColor = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.SAFE: return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case RiskLevel.LOW: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case RiskLevel.MEDIUM: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case RiskLevel.HIGH: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    case RiskLevel.CRITICAL: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  }
};

const ResultView: React.FC<ResultViewProps> = ({ result }) => {
  const chartData = [
    { name: 'Risk', value: result.riskScore },
    { name: 'Safety', value: 100 - result.riskScore }
  ];

  const COLORS = [
    result.riskScore > 70 ? '#f43f5e' : result.riskScore > 40 ? '#fbbf24' : '#10b981',
    '#1e293b'
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`p-6 rounded-2xl border ${getRiskColor(result.riskLevel)}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2">
              {result.isPhishing ? <AlertIcon /> : <ShieldIcon />}
              {result.isPhishing ? 'Phishing Detected' : 'Content Appears Safe'}
            </h3>
            <p className="opacity-80">Category: {result.category}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black block">{result.riskScore}%</span>
            <span className="text-xs uppercase tracking-widest font-bold">Risk Score</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <InfoIcon className="w-5 h-5 text-blue-400" />
              Expert Analysis
            </h4>
            <p className="text-slate-300 leading-relaxed mb-4">
              {result.explanation}
            </p>
            <div className="space-y-2">
              <h5 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Suspicious Markers:</h5>
              <div className="flex flex-wrap gap-2">
                {result.suspiciousElements.map((el, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-full text-xs text-slate-300">
                    {el}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <h4 className="text-lg font-semibold mb-4 text-emerald-400">Safety Recommendation</h4>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 italic">
              "{result.safetyAdvice}"
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 h-[300px]">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Threat Landscape</h4>
            <ResponsiveContainer width="100%" aspect={2}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((_entry,index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-2">
              <p className="text-2xl font-bold">{result.riskLevel}</p>
              <p className="text-xs text-slate-500 uppercase">Assessed Severity</p>
            </div>
          </section>

          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Technical Metadata</h4>
            <div className="space-y-3 text-xs mono text-slate-400 overflow-hidden">
              <p className="break-all"><span className="text-slate-500">TYPE:</span> {result.type}</p>
              <p className="break-all"><span className="text-slate-500">ID:</span> {result.id}</p>
              <p className="break-all"><span className="text-slate-500">TIMESTAMP:</span> {new Date(result.timestamp).toISOString()}</p>
              <div className="mt-4 border-t border-slate-700 pt-4">
                <span className="text-slate-500 block mb-1">RAW DEEP DIVE:</span>
                <p className="italic">{result.technicalDetails.substring(0, 100)}...</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ResultView;
