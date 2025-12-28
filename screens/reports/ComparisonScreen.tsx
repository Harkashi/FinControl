
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { db } from '../../services/database';
import { useTheme } from '../../components/ThemeHandler';

const ComparisonScreen: React.FC = () => {
  const navigate = useNavigate();
  const { privacyMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, [currentDate]);

  const checkAccessAndLoad = async () => {
    setLoading(true);
    const profile = await db.getUserProfile();
    
    if (profile && (profile.plan === 'pro' || profile.plan === 'ultra')) {
        setIsPremium(true);
        const report = await db.getDetailedComparison(currentDate.getMonth(), currentDate.getFullYear());
        setData(report);
    } else {
        setIsPremium(false);
    }
    setLoading(false);
  };

  const formatCurrency = (val: number) => privacyMode ? '••••••' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const currentMonthName = monthNames[currentDate.getMonth()];
  const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const prevMonthName = monthNames[prevDate.getMonth()];

  const handleMonthChange = (dir: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + (dir === 'next' ? 1 : -1));
      setCurrentDate(newDate);
  };

  if (loading) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      );
  }

  if (!isPremium) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined text-black dark:text-white">arrow_back</span></button>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center pb-20 animate-[fade-in_0.5s]">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-8 relative">
                    <span className="material-symbols-outlined text-white text-5xl">analytics</span>
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#1e2330] rounded-full p-2 shadow-sm">
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">lock</span>
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                    Comparativo Mensal
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed text-sm">
                    Entenda exatamente onde seus gastos aumentaram ou diminuíram em relação ao mês anterior.
                    <br/><br/>
                    <span className="font-bold text-blue-500">Exclusivo para planos Pro e Ultra.</span>
                </p>
                <button 
                    onClick={() => navigate('/profile/plan')}
                    className="w-full max-w-xs py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
                >
                    Desbloquear Agora
                </button>
            </main>
        </div>
      );
  }

  const chartData = [
      { name: prevMonthName.slice(0, 3), total: data?.prevTotal || 0 },
      { name: currentMonthName.slice(0, 3), total: data?.currentTotal || 0 }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
      <header className="flex items-center justify-between p-4 sticky top-0 z-20 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2 text-black dark:text-white">
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        
        {/* Navigation - Clean Transparent Style */}
        <div className="flex items-center gap-1">
            <button onClick={() => handleMonthChange('prev')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="text-xs font-extrabold text-black dark:text-white uppercase tracking-wide min-w-[140px] text-center select-none">
                {currentMonthName} vs {prevMonthName}
            </span>
            <button onClick={() => handleMonthChange('next')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
        </div>
        
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-12 overflow-y-auto no-scrollbar">
         
         {/* Summary Cards */}
         <div className="grid grid-cols-2 gap-3">
             <div className="bg-white dark:bg-[#192233] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                 <p className="text-xs text-slate-500 uppercase font-bold mb-1">{prevMonthName}</p>
                 <p className="text-lg font-extrabold text-slate-900 dark:text-white">{formatCurrency(data?.prevTotal || 0)}</p>
             </div>
             <div className="bg-white dark:bg-[#192233] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                 <div className={`absolute top-0 right-0 p-1.5 rounded-bl-xl text-[10px] font-bold text-white ${data?.diffValue > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                     {data?.diffValue > 0 ? '+' : ''}{data?.diffPct.toFixed(0)}%
                 </div>
                 <p className="text-xs text-slate-500 uppercase font-bold mb-1">{currentMonthName}</p>
                 <p className="text-lg font-extrabold text-slate-900 dark:text-white">{formatCurrency(data?.currentTotal || 0)}</p>
             </div>
         </div>

         {/* Chart */}
         <div className="bg-white dark:bg-[#192233] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-48">
             <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                     <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                        formatter={(val: number) => formatCurrency(val)}
                     />
                     <Bar dataKey="total" radius={[6, 6, 6, 6]} barSize={40}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 1 ? (data?.diffValue > 0 ? '#ef4444' : '#22c55e') : '#94a3b8'} />
                        ))}
                     </Bar>
                 </BarChart>
             </ResponsiveContainer>
         </div>

         {/* Detailed List */}
         <div>
             <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 px-1">Variação por Categoria</h3>
             <div className="space-y-3">
                 {data?.categories && data.categories.length > 0 ? (
                     data.categories.map((cat: any) => {
                         const isIncrease = cat.diff > 0;
                         const isNeutral = cat.diff === 0;
                         
                         return (
                             <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#192233] rounded-xl border border-slate-100 dark:border-slate-800">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.bgClass} ${cat.colorClass}`}>
                                         <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                                     </div>
                                     <div>
                                         <p className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</p>
                                         <p className="text-[10px] text-slate-400">
                                             {prevMonthName.slice(0,3)}: {formatCurrency(cat.previous)}
                                         </p>
                                     </div>
                                 </div>
                                 <div className="text-right">
                                     <p className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(cat.current)}</p>
                                     {!isNeutral && (
                                         <div className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                                             <span>{isIncrease ? '+' : ''}{formatCurrency(cat.diff)}</span>
                                             <span className="material-symbols-outlined text-[12px]">{isIncrease ? 'trending_up' : 'trending_down'}</span>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         );
                     })
                 ) : (
                     <div className="text-center py-10 opacity-50">
                         <span className="material-symbols-outlined text-4xl mb-2 text-slate-400">bar_chart</span>
                         <p className="text-sm text-slate-500">Sem dados suficientes para comparação neste período.</p>
                     </div>
                 )}
             </div>
         </div>

      </main>
    </div>
  );
};

export default ComparisonScreen;
