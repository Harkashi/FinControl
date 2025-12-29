
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import BottomNav from '../components/BottomNav';
import BannerAd from '../components/BannerAd'; // Import Ad Component
import { db } from '../services/database';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/ThemeHandler';

// --- COMPONENTS ---

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-slate-200 dark:bg-white/5 animate-pulse rounded-lg ${className}`}></div>
);

const InsightCard: React.FC<{ icon: string; title: string; value: string; colorClass: string; isLoading: boolean }> = ({ icon, title, value, colorClass, isLoading }) => (
  <div className="bg-[#192233] rounded-xl p-2.5 border border-white/5 shadow-sm w-full flex flex-col justify-between h-28 sm:h-auto">
    {isLoading ? (
       <div className="flex flex-col gap-2">
         <Skeleton className="w-8 h-8 rounded-full" />
         <Skeleton className="w-full h-3" />
         <Skeleton className="w-3/4 h-4" />
       </div>
    ) : (
      <>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass} bg-opacity-10 mb-2`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-0.5 truncate" title={title}>{title}</p>
          <p className="text-white font-bold text-xs sm:text-sm truncate" title={value}>{value}</p>
        </div>
      </>
    )}
  </div>
);

const ShortcutModal: React.FC<{ isOpen: boolean; onClose: () => void; shortcuts: any[]; onSelect: (s: any) => void }> = ({ isOpen, onClose, shortcuts, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s]" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white dark:bg-[#1e2330] rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-6 animate-[slide-up_0.3s] shadow-2xl border-t border-white/10" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
               <span className="material-symbols-outlined text-yellow-500">bolt</span>
               Atalhos Inteligentes
            </h3>
            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:opacity-80 transition-opacity">
               <span className="material-symbols-outlined text-[20px] dark:text-white">close</span>
            </button>
         </div>
         
         <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Baseado nos seus gastos mais frequentes:</p>
         
         <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
            {shortcuts.map((s, idx) => (
              <button 
                key={idx} 
                onClick={() => onSelect(s)} 
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-[#111620] rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors group active:scale-[0.98]"
              >
                 <div className="flex flex-col items-start min-w-0 flex-1 mr-4">
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors text-left w-full truncate">
                       {s.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 w-full truncate text-left">
                       Média: ~R$ {s.amount.toFixed(0)}
                    </p>
                 </div>
                 <span className="material-symbols-outlined text-slate-400 group-hover:text-primary shrink-0">arrow_forward_ios</span>
              </button>
            ))}
            
            {shortcuts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-[#111620] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">history</span>
                <p className="text-sm text-slate-500 italic">Use o app por alguns dias para<br/>receber sugestões personalizadas.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#192233] border border-white/10 p-2 rounded-lg shadow-xl z-50">
        <p className="text-white text-xs font-bold mb-1">{label}</p>
        <p className="text-xs font-medium" style={{ color: payload[0].color }}>
          R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

// --- MAIN COMPONENT ---

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4140/4140048.png";

const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { privacyMode, chartStyle } = useTheme();
  // USE CONTEXT
  const { dashboardMetrics: metrics, monthlyInsights: insights, transactions, loading, refreshing, refreshData } = useData();
  
  const [userName, setUserName] = useState('Usuário');
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'ultra'>('free'); // State for Plan
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  
  // Force data refresh on mount to avoid stale or zeroed state from initial Context load
  useEffect(() => {
    refreshData();
  }, []);

  // Show loading skeleton if initial load OR if refreshing while empty (avoids flashing skeleton on pull-to-refresh if data exists)
  const isLoading = loading || (refreshing && (!transactions || transactions.length === 0));

  // Helpers
  const formatValue = (val: number, minimumFractionDigits = 2) => {
    if (privacyMode) return '••••••';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits })}`;
  };
  
  const timeAgo = (dateStr: string) => {
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff/60)}min`;
    if (diff < 86400) return `há ${Math.floor(diff/3600)}h`;
    return `há ${Math.floor(diff/86400)}d`;
  };

  // Compute Chart Data Locally from Transactions in Context
  const monthlyChartData = useMemo(() => {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => { return { name: (i + 1).toString(), income: 0, expense: 0 }; });
      
      transactions.forEach(t => {
          const tDate = new Date(t.date);
          const adjustedDate = new Date(tDate.getTime() + tDate.getTimezoneOffset() * 60000);
          if (adjustedDate.getMonth() === now.getMonth() && adjustedDate.getFullYear() === now.getFullYear()) {
              const dayIndex = adjustedDate.getDate() - 1;
              if (daysArray[dayIndex]) {
                  if (t.type === 'income') daysArray[dayIndex].income += t.amount;
                  else daysArray[dayIndex].expense += t.amount;
              }
          }
      });
      return daysArray;
  }, [transactions]);

  // Recent transactions (Top 3 relevant) - FIXED SORTING
  const recentTransactions = useMemo(() => {
      const now = new Date();
      // Use local YYYY-MM-DD
      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      
      return [...transactions]
        .filter(t => t.date <= todayStr)
        .sort((a, b) => {
            // Sort by Date Descending
            const dateDiff = b.date.localeCompare(a.date);
            if (dateDiff !== 0) return dateDiff;
            // Tie-break: Sort by CreatedAt Descending
            return (b.created_at || '').localeCompare(a.created_at || '');
        })
        .slice(0, 3);
  }, [transactions]);

  useEffect(() => {
    const fetchUser = async () => {
        const user = db.getCurrentUser();
        if (user) setUserName(user.name.split(' ')[0]);
        const savedAvatar = localStorage.getItem('fincontrol_user_avatar');
        if (savedAvatar) setAvatarUrl(savedAvatar);
        
        // Fetch Profile for Plan
        const profile = await db.getUserProfile();
        if (profile) setUserPlan(profile.plan);
    };
    fetchUser();
  }, []);

  const isMinimal = chartStyle === 'minimal';
  const isPremium = userPlan === 'pro' || userPlan === 'ultra';

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white overflow-hidden h-screen flex flex-col selection:bg-primary/30">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)] relative">
        
        {/* Header */}
        <div className="flex items-center p-4 pt-safe mt-2 pb-2 justify-between bg-background-dark sticky top-0 z-20 shadow-sm shadow-black/5">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="shrink-0 bg-center bg-no-repeat bg-cover rounded-full w-10 h-10 ring-2 ring-primary/20 cursor-pointer active:scale-95 transition-transform"
              onClick={() => navigate('/profile')}
              style={{backgroundImage: `url("${avatarUrl}")`}}
            >
               <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#101622] rounded-full"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-text-secondary text-xs font-medium truncate">
                 {metrics?.yearlySavings && metrics.yearlySavings > 0 
                   ? `Economia: ${privacyMode ? '••••' : `+${metrics.yearlySavings.toLocaleString('pt-BR', { notation: 'compact' })}`}` 
                   : 'Bem-vindo de volta,'}
              </span>
              <h2 className="text-white text-lg font-bold leading-tight truncate">{userName}</h2>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={refreshData}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#192233] text-white hover:bg-[#232f48] transition-colors active:scale-95"
            >
                <span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            </button>
            <button 
                onClick={() => navigate('/profile')} 
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#192233] text-white hover:bg-[#232f48] transition-colors active:scale-95"
            >
                <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>

        {/* --- PREMIUM BALANCE CARD --- */}
        <div className="px-4 py-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#0f46b5] p-5 sm:p-6 shadow-lg shadow-primary/20">
            {/* Decoration */}
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-1">
                <p className="text-blue-100 text-sm font-medium opacity-90">Saldo Total</p>
                {/* Financial Health Indicator */}
                {!isLoading && metrics && (
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-white/20 ${
                      metrics.financialHealth === 'excellent' ? 'bg-green-400/20 text-green-100' : 
                      metrics.financialHealth === 'good' ? 'bg-blue-400/20 text-blue-100' :
                      metrics.financialHealth === 'stable' ? 'bg-yellow-400/20 text-yellow-100' : 'bg-red-400/20 text-red-100'
                  }`}>
                    {metrics.financialHealth === 'excellent' ? 'Excelente' : 
                     metrics.financialHealth === 'good' ? 'Saudável' : 
                     metrics.financialHealth === 'stable' ? 'Estável' : 'Atenção'}
                  </div>
                )}
              </div>
              
              {isLoading ? (
                <Skeleton className="h-10 w-40 mb-6 bg-white/10" />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                  {formatValue(metrics?.balance || 0)}
                </h1>
              )}

              {/* Forecast Line */}
              <div className="mb-5 flex items-center gap-2 text-xs text-blue-200/80 font-medium overflow-hidden">
                 <span className="material-symbols-outlined text-[14px] shrink-0">trending_flat</span>
                 <span className="truncate">Projeção: {formatValue(metrics?.projectedBalance || 0, 0)}</span>
              </div>
              
              {/* Stats Row */}
              <div className="flex gap-2 sm:gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0 bg-[#0a3899]/40 rounded-lg p-2 sm:p-3 backdrop-blur-md border border-white/5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-blue-100/80 text-[10px] sm:text-xs font-medium">
                        <div className="bg-green-500/20 p-0.5 rounded-full"><span className="material-symbols-outlined text-[10px] sm:text-[12px] text-green-300 rotate-180 block">arrow_outward</span></div>
                        Receitas
                    </div>
                    {isPremium ? (
                        metrics?.monthVariationIncome !== 0 && (
                            <span className={`text-[9px] font-bold ${metrics?.monthVariationIncome! > 0 ? 'text-green-300' : 'text-red-300'}`}>
                               {metrics?.monthVariationIncome! > 0 ? '+' : ''}{metrics?.monthVariationIncome?.toFixed(0)}%
                            </span>
                        )
                    ) : (
                        <span className="material-symbols-outlined text-[12px] text-white/30" onClick={() => navigate('/profile/plan')}>lock</span>
                    )}
                  </div>
                  {isLoading ? <Skeleton className="h-5 w-20 bg-white/10" /> : (
                      <p className="text-white font-bold tracking-tight text-xs sm:text-sm truncate">
                        {privacyMode ? '••••' : `+ ${formatValue(metrics?.income || 0, 0)}`}
                      </p>
                  )}
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0 bg-[#0a3899]/40 rounded-lg p-2 sm:p-3 backdrop-blur-md border border-white/5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-blue-100/80 text-[10px] sm:text-xs font-medium">
                        <div className="bg-red-500/20 p-0.5 rounded-full"><span className="material-symbols-outlined text-[10px] sm:text-[12px] text-red-300 block">arrow_outward</span></div>
                        Despesas
                    </div>
                    {isPremium ? (
                        metrics?.monthVariationExpense !== 0 && (
                            <span className={`text-[9px] font-bold ${metrics?.monthVariationExpense! < 0 ? 'text-green-300' : 'text-red-300'}`}>
                               {metrics?.monthVariationExpense! > 0 ? '+' : ''}{metrics?.monthVariationExpense?.toFixed(0)}%
                            </span>
                        )
                    ) : (
                        <span className="material-symbols-outlined text-[12px] text-white/30" onClick={() => navigate('/profile/plan')}>lock</span>
                    )}
                  </div>
                  {isLoading ? <Skeleton className="h-5 w-20 bg-white/10" /> : (
                      <p className="text-white font-bold tracking-tight text-xs sm:text-sm truncate">
                        {privacyMode ? '••••' : `- ${formatValue(metrics?.expense || 0, 0)}`}
                      </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ACTIONS & SHORTCUTS --- */}
        <div className="pb-6 pt-2 px-4 space-y-4">
          <div className="grid grid-cols-4 gap-1 md:gap-4">
            <button onClick={() => navigate('/add', { state: { type: 'income' } })} className="flex flex-col items-center gap-1.5 group min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#192233] flex items-center justify-center group-active:scale-95 transition-transform border border-white/5 shadow-md">
                <span className="material-symbols-outlined text-green-400 text-[24px]">arrow_downward</span>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-text-secondary truncate w-full text-center">Receita</span>
            </button>
            <button onClick={() => navigate('/add', { state: { type: 'expense' } })} className="flex flex-col items-center gap-1.5 group min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#192233] flex items-center justify-center group-active:scale-95 transition-transform border border-white/5 shadow-md">
                <span className="material-symbols-outlined text-red-400 text-[24px]">arrow_upward</span>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-text-secondary truncate w-full text-center">Despesa</span>
            </button>
            <button onClick={() => setIsShortcutOpen(true)} className="flex flex-col items-center gap-1.5 group min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#192233] flex items-center justify-center group-active:scale-95 transition-transform border border-white/5 shadow-md">
                <span className="material-symbols-outlined text-yellow-400 text-[24px]">bolt</span>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-text-secondary truncate w-full text-center">Atalhos</span>
            </button>
             <button onClick={() => navigate('/statement')} className="flex flex-col items-center gap-1.5 group min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#192233] flex items-center justify-center group-active:scale-95 transition-transform border border-white/5 shadow-md">
                <span className="material-symbols-outlined text-purple-400 text-[24px]">receipt_long</span>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-text-secondary truncate w-full text-center">Extrato</span>
            </button>
          </div>

          {/* Last Transaction Widget */}
          {!isLoading && recentTransactions.length > 0 ? (
             <div className="flex items-center justify-between p-3 rounded-xl bg-[#192233]/50 border border-white/5 animate-[fade-in_0.5s]">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                   <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${recentTransactions[0].type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      <span className="material-symbols-outlined text-[16px]">{recentTransactions[0].icon || 'payments'}</span>
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white leading-tight truncate">Última: {recentTransactions[0].title}</span>
                      <span className="text-[10px] text-text-secondary truncate">{timeAgo(recentTransactions[0].created_at || recentTransactions[0].date)}</span>
                   </div>
                </div>
                <span className="text-xs font-bold text-white whitespace-nowrap ml-2">{formatValue(recentTransactions[0].amount)}</span>
             </div>
          ) : !isLoading && (
             <div className="text-center py-2 text-xs text-text-secondary">Nenhuma transação recente</div>
          )}
        </div>

        {/* --- ADVERTISEMENT (ONLY FREE) --- */}
        {!isLoading && <BannerAd freePlan={userPlan === 'free'} />}

        {/* --- CHART & INSIGHTS --- */}
        <div className="px-4 pb-2">
           <div className="flex justify-between items-end mb-4">
              <div>
                  <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Visão Geral</h3>
                  {isPremium ? (
                      <button onClick={() => navigate('/reports/comparison')} className="text-xs text-text-secondary mt-1 hover:text-white transition-colors flex items-center gap-1 group">
                          {metrics?.monthVariationExpense! > 0 
                            ? `Gastos subiram ${metrics?.monthVariationExpense?.toFixed(0)}% este mês` 
                            : 'Você está gastando menos que mês passado!'}
                          <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                      </button>
                  ) : (
                      <button onClick={() => navigate('/profile/plan')} className="flex items-center gap-1 text-xs text-yellow-500 mt-1 font-bold hover:underline">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          Comparativo mensal indisponível
                      </button>
                  )}
              </div>
              <button onClick={() => navigate('/statement')} className="text-primary text-xs font-bold bg-primary/10 px-3 py-1 rounded-full">Relatório</button>
           </div>
           
           {/* Chart Container */}
           <div className="bg-[#192233] rounded-xl p-4 border border-white/5 shadow-sm mb-4">
                 <div className="w-full h-40 min-w-0 relative">
                    {!isLoading && !privacyMode ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                         <BarChart data={monthlyChartData}>
                            {!isMinimal && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />}
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#92a4c9', fontSize: 10}} 
                              dy={10}
                              hide={isMinimal}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
                            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} stackId="a" />
                            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} stackId="b" />
                         </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-lg">
                         {isLoading ? <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> : <span className="material-symbols-outlined text-slate-500">visibility_off</span>}
                      </div>
                    )}
                 </div>
           </div>

           {/* Insights Mini Cards (Grid Layout for Mobile Responsiveness) */}
           <div className="grid grid-cols-3 gap-2 pb-2">
              <InsightCard 
                 isLoading={isLoading}
                 icon="savings" 
                 title="Economia" 
                 value={formatValue(insights?.savings || 0)} 
                 colorClass="text-green-400 bg-green-400" 
              />
              <InsightCard 
                 isLoading={isLoading}
                 icon="local_fire_department" 
                 title="Maior Gasto" 
                 value={formatValue(insights?.biggestExpense?.amount || 0)} 
                 colorClass="text-red-400 bg-red-400" 
              />
              <InsightCard 
                 isLoading={isLoading}
                 icon="category" 
                 title="Top Categoria" 
                 value={insights?.topCategory?.name || '-'} 
                 colorClass="text-purple-400 bg-purple-400" 
              />
           </div>
        </div>

        {/* --- RECENT LIST --- */}
        <div className="pb-24">
          <div className="flex items-center justify-between px-4 pb-4 mt-2">
             <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Recentes</h3>
          </div>
          <div className="flex flex-col gap-[1px]">
             {!isLoading && recentTransactions.length > 0 ? recentTransactions.map((t, index) => (
               <div key={t.id} className={`flex items-center justify-between px-4 py-4 bg-[#192233] mx-4 hover:bg-[#202b40] transition-colors cursor-pointer group ${index === 0 ? 'rounded-t-xl' : ''} ${index === recentTransactions.length -1 ? 'rounded-b-xl' : ''}`}>
                 <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0">
                   <div className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center transition-colors ${t.bgClass} ${t.colorClass}`}>
                     <span className="material-symbols-outlined text-[22px]">{t.icon}</span>
                   </div>
                   <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                     <p className="text-white text-sm font-bold truncate">{t.title}</p>
                     <p className="text-text-secondary text-xs truncate">{t.subtitle}</p>
                   </div>
                 </div>
                 <div className="flex flex-col items-end gap-0.5 ml-2 shrink-0">
                    <p className={`text-sm font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}
                      {formatValue(t.amount)}
                    </p>
                    <p className="text-[9px] text-text-secondary">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                 </div>
               </div>
             )) : (
               !isLoading && <div className="px-4 py-8 text-center text-text-secondary text-sm">Nenhuma transação recente.</div>
             )}
          </div>
          <div className="h-6"></div>
        </div>

      </div>

      {/* Shortcuts Modal - Moved outside the scroll container to prevent clipping and Z-index issues */}
      <ShortcutModal 
          isOpen={isShortcutOpen} 
          onClose={() => setIsShortcutOpen(false)} 
          shortcuts={metrics?.topExpenses || []}
          onSelect={(s) => {
            setIsShortcutOpen(false);
            navigate('/add', { state: { description: s.title, categoryId: s.categoryId, type: 'expense' } });
          }}
      />
      
      <BottomNav />
    </div>
  );
};

export default DashboardScreen;
