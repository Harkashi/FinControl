
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { db } from '../../services/database';
import { BehaviorAnalysis } from '../../types';
import { useTheme } from '../../components/ThemeHandler';

const BehaviorScreen: React.FC = () => {
  const navigate = useNavigate();
  const { privacyMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BehaviorAnalysis | null>(null);
  const [isUltra, setIsUltra] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    setLoading(true);
    const profile = await db.getUserProfile();
    
    if (profile && profile.plan === 'ultra') {
        setIsUltra(true);
        const report = await db.getBehaviorAnalysis();
        setData(report);
    } else {
        setIsUltra(false);
    }
    setLoading(false);
  };

  const formatCurrency = (val: number) => privacyMode ? '••••••' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Custom Colors
  const BAR_COLORS = ['#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#8b5cf6', '#ef4444']; // Weekdays blue, Sat purple, Sun red (example)

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
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 mb-8 relative">
                    <span className="material-symbols-outlined text-white text-5xl">psychology</span>
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#1e2330] rounded-full p-2 shadow-sm">
                        <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px]">lock</span>
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                    Análise de Comportamento
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed text-sm">
                    A Inteligência Artificial analisa seus hábitos de consumo: dias da semana mais caros, ticket médio e padrões ocultos.
                    <br/><br/>
                    <span className="font-bold text-green-500">Exclusivo para o Plano Ultra.</span>
                </p>
                <button 
                    onClick={() => navigate('/profile/plan')}
                    className="w-full max-w-xs py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/25 active:scale-[0.98] transition-all hover:bg-green-500"
                >
                    Ser Ultra
                </button>
            </main>
        </div>
      );
  }

  // Se não tiver dados suficientes
  if (!data) {
      return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2"><span className="material-symbols-outlined dark:text-white">arrow_back</span></button>
                <h1 className="text-lg font-bold dark:text-white ml-2">Comportamento</h1>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                <span className="material-symbols-outlined text-5xl mb-4">data_exploration</span>
                <p className="max-w-xs">Ainda não temos dados suficientes dos últimos 6 meses para gerar uma análise comportamental precisa.</p>
            </div>
        </div>
      );
  }

  // Data preparation for Pie Chart (Purchase Size)
  const pieData = [
      { name: 'Pequenas', value: data.purchaseSize.small.total, color: '#3b82f6' },
      { name: 'Médias', value: data.purchaseSize.medium.total, color: '#8b5cf6' },
      { name: 'Grandes', value: data.purchaseSize.large.total, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col font-display">
      <header className="flex items-center justify-between p-4 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2 text-black dark:text-white">
            <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Análise Ultra</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-12 overflow-y-auto no-scrollbar">
         
         {/* Top Insights Cards */}
         <div className="grid grid-cols-2 gap-3">
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg text-white">
                 <div className="flex items-center gap-2 mb-2 opacity-80">
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    <span className="text-xs font-bold uppercase">Dia de Pico</span>
                 </div>
                 <p className="text-xl font-extrabold capitalize">{data.busiestDay.day}</p>
                 <p className="text-[10px] opacity-80 mt-1">
                    Você gasta mais neste dia
                 </p>
             </div>
             
             <div className="bg-white dark:bg-[#192233] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <span className="material-symbols-outlined text-[18px]">receipt</span>
                    <span className="text-xs font-bold uppercase">Ticket Médio</span>
                 </div>
                 <p className="text-xl font-extrabold text-slate-900 dark:text-white">{formatCurrency(data.averageTicket)}</p>
                 <p className="text-[10px] text-slate-400 mt-1">Por transação</p>
             </div>
         </div>

         {/* Chart: Week Day Pattern */}
         <div className="bg-white dark:bg-[#192233] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-end mb-4">
                 <h3 className="text-sm font-bold text-slate-900 dark:text-white">Padrão Semanal</h3>
                 <span className="text-[10px] text-slate-400 font-bold uppercase">Últimos 6 meses</span>
             </div>
             
             <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.weekDayStats}>
                         <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                         <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                            formatter={(val: number) => formatCurrency(val)}
                         />
                         <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
                            {data.weekDayStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fullDay === data.busiestDay.day ? '#ec4899' : '#3b82f6'} fillOpacity={entry.fullDay === data.busiestDay.day ? 1 : 0.6} />
                            ))}
                         </Bar>
                     </BarChart>
                 </ResponsiveContainer>
             </div>
             <p className="text-xs text-slate-500 mt-2 text-center italic">
                {data.busiestDay.amount > 0 ? `Seu volume de gastos é concentrado nas ${data.busiestDay.day}s.` : ''}
             </p>
         </div>

         {/* Chart: Purchase Size Distribution */}
         <div className="bg-white dark:bg-[#192233] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
             <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Tamanho das Compras</h3>
             
             <div className="flex items-center">
                 <div className="h-40 w-1/2 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="material-symbols-outlined text-slate-400">pie_chart</span>
                    </div>
                 </div>
                 
                 <div className="w-1/2 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Pequenas</p>
                            <p className="text-xs font-bold dark:text-white">{data.purchaseSize.small.count} compras</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Médias</p>
                            <p className="text-xs font-bold dark:text-white">{data.purchaseSize.medium.count} compras</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Grandes</p>
                            <p className="text-xs font-bold dark:text-white">{data.purchaseSize.large.count} compras</p>
                        </div>
                    </div>
                 </div>
             </div>
         </div>

         {/* Top Merchant */}
         <div className="bg-white dark:bg-[#192233] p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
             <div>
                 <p className="text-xs font-bold text-slate-500 uppercase mb-1">Local Mais Frequente</p>
                 <p className="text-lg font-bold dark:text-white truncate max-w-[200px]">{data.topMerchant}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                 <span className="material-symbols-outlined">store</span>
             </div>
         </div>

      </main>
    </div>
  );
};

export default BehaviorScreen;
