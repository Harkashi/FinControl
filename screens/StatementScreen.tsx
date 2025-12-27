
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import BottomNav from '../components/BottomNav';
import { db } from '../services/database';
import { Transaction, Category, Wallet, PaymentMethod } from '../types';
import { useTheme } from '../components/ThemeHandler';

type FilterType = 'all' | 'month' | 'income' | 'expense' | 'future';

const StatementScreen: React.FC = () => {
  const navigate = useNavigate();
  const { privacyMode } = useTheme();
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all'); 

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [txs, wals] = await Promise.all([
        db.getTransactions(),
        db.getWallets(),
      ]);

      setTransactions(txs);
      setWallets(wals);
      
      applyFilters(txs, activeFilter);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      applyFilters(transactions, activeFilter);
    }
  }, [activeFilter, transactions]);

  const applyFilters = (txs: Transaction[], filter: FilterType) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filtered = [...txs];
    
    // Sort by date desc AND created_at desc for robust order
    filtered.sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date);
        if (dateDiff !== 0) return dateDiff;
        return (b.created_at || '').localeCompare(a.created_at || '');
    });

    if (filter === 'future') {
        filtered = filtered.filter(t => t.date > todayStr);
    } else {
        filtered = filtered.filter(t => t.date <= todayStr);

        if (filter === 'month') {
            filtered = filtered.filter(t => {
                const d = new Date(t.date);
                const adj = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                return adj.getMonth() === currentMonth && adj.getFullYear() === currentYear;
            });
        } else if (filter === 'income') {
            filtered = filtered.filter(t => t.type === 'income');
        } else if (filter === 'expense') {
            filtered = filtered.filter(t => t.type === 'expense');
        }
    }

    setFilteredTransactions(filtered);

    // Calculate Balance
    const historyTxs = txs.filter(t => t.date <= todayStr);
    const totalBalance = historyTxs.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    setBalance(totalBalance);

    // Generate Chart Data (Last 30 days balance history)
    const days = 30;
    const chartPoints = [];
    let runningBalance = totalBalance;
    
    // Reverse logic: start from today (totalBalance) and subtract today's changes to find yesterday's balance
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        
        chartPoints.unshift({
            date: `${d.getDate()}/${d.getMonth()+1}`,
            amount: runningBalance
        });

        // Find changes that happened on this specific date
        const dayTxs = historyTxs.filter(t => t.date === dateStr);
        const dayChange = dayTxs.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
        runningBalance -= dayChange;
    }
    setChartData(chartPoints);
  };

  const formatCurrency = (val: number) => {
      if (privacyMode) return '••••••';
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 pt-safe sticky top-0 bg-background-light dark:bg-background-dark z-20">
         <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors -ml-2">
               <span className="material-symbols-outlined dark:text-white">arrow_back</span>
            </button>
            <h1 className="text-lg font-bold dark:text-white">Extrato</h1>
         </div>
      </header>

      {/* Balance Card & Chart */}
      <div className="px-4 mb-6">
         <div className="bg-[#192233] rounded-2xl p-6 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Atual</p>
                <h2 className="text-3xl font-extrabold mb-4">{formatCurrency(balance)}</h2>
                
                <div className="h-32 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip 
                                contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                                itemStyle={{color: '#fff'}}
                                labelStyle={{display: 'none'}}
                                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
                            />
                            <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
         </div>
      </div>

      {/* Filters */}
      <div className="px-4 mb-4">
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {[
                { id: 'all', label: 'Tudo' },
                { id: 'month', label: 'Este Mês' },
                { id: 'income', label: 'Entradas' },
                { id: 'expense', label: 'Saídas' },
                { id: 'future', label: 'Futuro' }
            ].map(f => (
                <button 
                    key={f.id} 
                    onClick={() => setActiveFilter(f.id as FilterType)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                        activeFilter === f.id 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-white dark:bg-[#192233] text-slate-500 border-slate-200 dark:border-slate-800'
                    }`}
                >
                    {f.label}
                </button>
            ))}
         </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 px-4 flex flex-col gap-3">
         {loading ? (
             <div className="flex justify-center py-10">
                <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
             </div>
         ) : filteredTransactions.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 opacity-50">
                 <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                 <p className="text-sm">Nenhuma transação encontrada.</p>
             </div>
         ) : (
             filteredTransactions.map((t, index) => {
                 const showDateHeader = index === 0 || t.date !== filteredTransactions[index-1].date;
                 const walletName = wallets.find(w => w.id === t.walletId)?.name || 'Carteira';
                 
                 return (
                     <React.Fragment key={t.id}>
                        {showDateHeader && (
                            <div className="text-xs font-bold text-slate-400 mt-2 mb-1 uppercase tracking-wider sticky top-[72px] bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm py-2 z-10">
                                {formatDate(t.date)}
                            </div>
                        )}
                        <div 
                           onClick={() => navigate('/add', { state: { ...t, isEditing: true } })}
                           className="flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm active:scale-[0.99] transition-transform"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.bgClass} ${t.colorClass}`}>
                                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{t.title}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <span>{walletName}</span>
                                        {t.installmentNumber && (
                                            <span className="bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-[10px] font-bold">
                                                {t.installmentNumber}/{t.installmentTotal}
                                            </span>
                                        )}
                                        {t.isFixed && <span className="material-symbols-outlined text-[12px]">push_pin</span>}
                                    </div>
                                </div>
                            </div>
                            <span className={`font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                                {t.type === 'expense' ? '- ' : '+ '}
                                {formatCurrency(t.amount)}
                            </span>
                        </div>
                     </React.Fragment>
                 );
             })
         )}
      </div>

      <BottomNav />
    </div>
  );
};

export default StatementScreen;
