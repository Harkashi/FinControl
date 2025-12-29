
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { db } from '../../services/database';
import { FinancialScore } from '../../types';

const ScoreScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState<FinancialScore | null>(null);
  const [isUltra, setIsUltra] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    setLoading(true);
    const profile = await db.getUserProfile();
    
    if (profile && profile.plan === 'ultra') {
        setIsUltra(true);
        const data = await db.getAdvancedFinancialScore();
        setScoreData(data);
    } else {
        setIsUltra(false);
    }
    setLoading(false);
  };

  // Helper para cor do score
  const getScoreColor = (score: number) => {
      if (score >= 800) return '#10b981'; // Green
      if (score >= 600) return '#3b82f6'; // Blue
      if (score >= 400) return '#f59e0b'; // Yellow
      return '#ef4444'; // Red
  };

  const getScoreLabel = (score: number) => {
      if (score >= 800) return 'Excelente';
      if (score >= 600) return 'Muito Bom';
      if (score >= 400) return 'Atenção';
      return 'Crítico';
  };

  if (loading) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      );
  }

  if (!isUltra) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined text-black dark:text-white">arrow_back</span></button>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-20 animate-[fade-in_0.5s]">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-cyan-500/40 mb-8 relative">
                    <span className="material-symbols-outlined text-white text-5xl">speed</span>
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#1e2330] rounded-full p-2 shadow-sm">
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">lock</span>
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                    Score Financeiro
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed text-sm">
                    Um algoritmo avançado que analisa 4 pilares da sua saúde financeira e gera uma nota de 0 a 1000.
                    <br/><br/>
                    <span className="font-bold text-cyan-500">Exclusivo para o Plano Ultra.</span>
                </p>
                <button 
                    onClick={() => navigate('/profile/plan')}
                    className="w-full max-w-xs py-4 bg-cyan-600 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all hover:bg-cyan-500"
                >
                    Ser Ultra
                </button>
            </main>
        </div>
      );
  }

  const score = scoreData?.score || 0;
  const scoreColor = getScoreColor(score);
  
  // Data for Gauge
  const gaugeData = [
      { name: 'Score', value: score, color: scoreColor },
      { name: 'Remaining', value: 1000 - score, color: '#e2e8f0' } // #e2e8f0 is slate-200
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
      <header className="flex items-center justify-between p-4 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2 text-black dark:text-white">
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Score Ultra</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-12 overflow-y-auto no-scrollbar">
         
         {/* GAUGE CHART */}
         <div className="bg-white dark:bg-[#192233] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center relative overflow-hidden">
             {/* Gradient Background Effect */}
             <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-slate-50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none"></div>
             
             <div className="relative w-64 h-32 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                         <Pie
                             data={gaugeData}
                             cx="50%"
                             cy="100%"
                             startAngle={180}
                             endAngle={0}
                             innerRadius={80}
                             outerRadius={110}
                             paddingAngle={0}
                             cornerRadius={10}
                             dataKey="value"
                             stroke="none"
                         >
                             <Cell key="score" fill={scoreColor} />
                             <Cell key="rest" fill={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'} />
                         </Pie>
                     </PieChart>
                 </ResponsiveContainer>
                 {/* Needle/Text */}
                 <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                     <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{score}</span>
                     <span className="text-sm font-bold uppercase tracking-widest mt-1" style={{color: scoreColor}}>
                         {getScoreLabel(score)}
                     </span>
                 </div>
             </div>
             
             <p className="text-center text-xs text-slate-400 mt-6 max-w-xs">
                 Baseado na sua poupança, gastos fixos e disciplina orçamentária dos últimos 30 dias.
             </p>
         </div>

         {/* FACTORS LIST */}
         <div>
             <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 px-1">Fatores de Impacto</h3>
             <div className="flex flex-col gap-3">
                 {scoreData?.factors.map((factor, idx) => (
                     <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl border border-slate-100 dark:border-slate-800">
                         <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                 factor.impact === 'positive' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                                 factor.impact === 'negative' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                                 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                             }`}>
                                 <span className="material-symbols-outlined text-[18px]">
                                     {factor.impact === 'positive' ? 'trending_up' : factor.impact === 'negative' ? 'trending_down' : 'remove'}
                                 </span>
                             </div>
                             <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{factor.label}</span>
                         </div>
                         <span className={`text-xs font-extrabold px-2 py-1 rounded ${
                             factor.impact === 'positive' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                             factor.impact === 'negative' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                             'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                         }`}>
                             {factor.value}
                         </span>
                     </div>
                 ))}
             </div>
         </div>

         {/* TIP CARD */}
         {score < 1000 && (
             <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl shadow-lg text-white">
                 <div className="flex items-start gap-3">
                     <span className="material-symbols-outlined text-yellow-300">lightbulb</span>
                     <div>
                         <h4 className="font-bold text-sm mb-1">Como aumentar seu Score?</h4>
                         <p className="text-xs text-blue-100 leading-relaxed">
                             Tente manter seus custos fixos abaixo de 50% da renda e poupar pelo menos 20% do que ganha todos os meses.
                         </p>
                     </div>
                 </div>
             </div>
         )}

      </main>
    </div>
  );
};

export default ScoreScreen;
