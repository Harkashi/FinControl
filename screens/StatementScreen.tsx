
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, CartesianGrid, BarChart, Bar, XAxis } from 'recharts';
import BottomNav from '../components/BottomNav';
import { db } from '../services/database';
import { Transaction, Category, Wallet, PaymentMethod } from '../types';
import { useTheme } from '../components/ThemeHandler';

type FilterType = 'all' | 'month' | 'income' | 'expense' | 'future';
type ChartType = 'balance' | 'flow';

// Custom Tooltip Component for better visuals
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b]/95 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-2xl animate-[fade-in_0.2s] min-w-[120px]">
        <p className="text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-wider border-b border-slate-700/50 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 mb-1 last:mb-0">
                <span className="text-[10px] font-bold text-slate-300 capitalize">{entry.name === 'amount' ? 'Saldo' : entry.name === 'income' ? 'Entrada' : 'Saída'}</span>
                <span className="text-white font-bold text-xs" style={{ color: entry.color }}>
                    {entry.name === 'expense' ? '- ' : ''}R$ {Math.abs(entry.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
            </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatementScreen: React.FC = () => {
  const navigate = useNavigate();
  const { privacyMode } = useTheme();
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  // Rich Data for Export
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  
  // User Plan State
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | 'ultra'>('free');
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all'); 
  const [chartType, setChartType] = useState<ChartType>('balance');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [txs, wals, cats, mets, profile] = await Promise.all([
        db.getTransactions(),
        db.getWallets(),
        db.getCategories(),
        db.getPaymentMethods(),
        db.getUserProfile()
      ]);

      setTransactions(txs);
      setWallets(wals);
      setCategories(cats);
      setMethods(mets);
      
      if (profile) setUserPlan(profile.plan);
      
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
    // Helper to get local date string YYYY-MM-DD safely
    const getSafeDateStr = (dateObj: Date) => {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
    };
    
    const todayStr = getSafeDateStr(now);
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

    // Calculate Balance (Only up to today)
    const historyTxs = txs.filter(t => t.date <= todayStr);
    const totalBalance = historyTxs.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
    setBalance(totalBalance);

    // Generate Chart Data (Last 30 days)
    const days = 30;
    const chartPoints = [];
    let runningBalance = totalBalance;
    
    // Reverse logic for Balance reconstruction
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getSafeDateStr(d);
        
        // Find changes for this specific date
        const dayTxs = historyTxs.filter(t => t.date.startsWith(dateStr));
        const dayIncome = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const dayExpense = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const dayChange = dayIncome - dayExpense;

        chartPoints.unshift({
            date: `${d.getDate()}/${d.getMonth()+1}`,
            fullDate: dateStr,
            amount: runningBalance,
            income: dayIncome,
            expense: dayExpense
        });

        runningBalance -= dayChange;
    }
    setChartData(chartPoints);
  };

  const formatCurrency = (val: number) => {
      if (privacyMode) return '••••••';
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // --- EXPORT LOGIC ---
  const handleExportClick = () => {
      if (userPlan === 'free') {
          if(window.confirm('A exportação de extratos detalhados é um recurso exclusivo dos planos Pro e Ultra. Deseja conhecer os planos?')) {
              navigate('/profile/plan');
          }
          return;
      }
      setShowExportOptions(true);
  };

  const getEnrichedData = () => {
      const catMap = new Map(categories.map(c => [c.id, c.name]));
      const walletMap = new Map(wallets.map(w => [w.id, w.name]));
      const methodMap = new Map(methods.map(m => [m.id, m.name]));

      return filteredTransactions.map(t => {
        const d = new Date(t.date);
        const adjustedDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        return {
            ...t,
            dateFormatted: adjustedDate.toLocaleDateString('pt-BR'),
            categoryName: catMap.get(t.categoryId || '') || 'Sem Categoria',
            walletName: walletMap.get(t.walletId || '') || 'Conta Padrão',
            methodName: methodMap.get(t.paymentMethodId || '') || 'Outros'
        };
      });
  };

  const exportExcel = () => {
      const data = getEnrichedData();
      const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Conta', 'Método'];
      const rows = data.map(t => [
          t.dateFormatted,
          `"${t.title.replace(/"/g, '""')}"`,
          t.amount.toFixed(2).replace('.', ','),
          t.type === 'income' ? 'Receita' : 'Despesa',
          `"${t.categoryName}"`,
          `"${t.walletName}"`,
          `"${t.methodName}"`
      ]);
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extrato_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      setShowExportOptions(false);
  };

  const exportPDF = () => {
    const data = getEnrichedData();
    const totalIncome = data.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : 0), 0);
    const totalExpense = data.reduce((acc, t) => acc + (t.type === 'expense' ? t.amount : 0), 0);
    const totalBalance = totalIncome - totalExpense;

    const printWindow = window.open('', '', 'height=800,width=900');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <title>Extrato - FinControl</title>
            <meta charset="utf-8">
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; display: flex; justify-content: space-between; }
              .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
              .summary { display: flex; gap: 10px; margin-bottom: 20px; }
              .card { flex: 1; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
              .card h3 { margin: 0 0 5px; font-size: 10px; text-transform: uppercase; color: #64748b; }
              .card p { margin: 0; font-weight: bold; font-size: 16px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th { text-align: left; padding: 8px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; }
              td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
              .text-right { text-align: right; }
              .income { color: #16a34a; font-weight: bold; }
              .expense { color: #dc2626; font-weight: bold; }
              .badge { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 10px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="header">
              <div><h1>FinControl</h1><p>Extrato de Transações</p></div>
              <div style="text-align: right;"><p>${new Date().toLocaleDateString('pt-BR')}</p></div>
            </div>
            <div class="summary">
               <div class="card"><h3>Entradas</h3><p class="income">R$ ${totalIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
               <div class="card"><h3>Saídas</h3><p class="expense">R$ ${totalExpense.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
               <div class="card"><h3>Resultado</h3><p>R$ ${totalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
            </div>
            <table>
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th class="text-right">Valor</th></tr></thead>
              <tbody>
                ${data.map(t => `
                  <tr>
                    <td>${t.dateFormatted}</td>
                    <td><b>${t.title}</b><br/><span style="color:#64748b;font-size:10px">${t.subtitle || ''}</span></td>
                    <td><span class="badge">${t.categoryName}</span></td>
                    <td>${t.walletName}</td>
                    <td class="text-right ${t.type === 'income' ? 'income' : 'expense'}">
                      ${t.type === 'expense' ? '-' : '+'} R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    setShowExportOptions(false);
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
         <button 
            onClick={handleExportClick}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${userPlan === 'free' ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
         >
            <span className="material-symbols-outlined">{userPlan === 'free' ? 'lock' : 'download'}</span>
         </button>
      </header>

      {/* Balance Card & Chart */}
      <div className="px-4 mb-6">
         <div className="bg-[#192233] rounded-2xl p-6 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden ring-1 ring-white/5">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Atual</p>
                        <h2 className="text-3xl font-extrabold">{formatCurrency(balance)}</h2>
                    </div>
                    {/* Toggle Button */}
                    <div className="flex bg-[#232f48] p-1 rounded-lg">
                        <button 
                            onClick={() => setChartType('balance')} 
                            className={`p-1.5 rounded-md transition-colors ${chartType === 'balance' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title="Ver Saldo"
                        >
                            <span className="material-symbols-outlined text-[18px]">show_chart</span>
                        </button>
                        <button 
                            onClick={() => setChartType('flow')} 
                            className={`p-1.5 rounded-md transition-colors ${chartType === 'flow' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            title="Ver Entradas vs Saídas"
                        >
                            <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                        </button>
                    </div>
                </div>
                
                {/* Chart Area */}
                <div className="h-40 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'balance' ? (
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#ffffff10" strokeDasharray="3 3" />
                                {/* Dynamic Y-Axis Domain to show variations clearly */}
                                <YAxis domain={['dataMin - 100', 'auto']} hide />
                                <Tooltip 
                                    content={<CustomChartTooltip />}
                                    cursor={{ stroke: '#ffffff30', strokeWidth: 1 }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorBalance)" 
                                    animationDuration={800}
                                />
                            </AreaChart>
                        ) : (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="#ffffff10" strokeDasharray="3 3" />
                                <YAxis hide />
                                <Tooltip 
                                    content={<CustomChartTooltip />}
                                    cursor={{ fill: '#ffffff10' }}
                                />
                                <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={12} stackId="a" />
                                <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={12} stackId="b" />
                            </BarChart>
                        )}
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
                            <div className="text-xs font-bold text-slate-400 mt-2 mb-1 uppercase tracking-wider sticky top-[72px] bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm py-2 z-10 flex items-center gap-2">
                                {formatDate(t.date)}
                                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                            </div>
                        )}
                        <div 
                           onClick={() => navigate('/add', { state: { ...t, isEditing: true } })}
                           className="flex items-center justify-between p-4 bg-white dark:bg-[#192233] rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm active:scale-[0.99] transition-transform group hover:border-primary/20"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.bgClass} ${t.colorClass} group-hover:scale-110 transition-transform`}>
                                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{t.title}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <span className="max-w-[100px] truncate">{walletName}</span>
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

      {/* Export Options Modal */}
      {showExportOptions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setShowExportOptions(false)}>
           <div className="w-full max-w-sm bg-white dark:bg-[#192233] rounded-t-2xl sm:rounded-2xl p-4 animate-[slide-up_0.3s]" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold dark:text-white mb-4 px-2">Baixar Extrato</h3>
              <p className="text-xs text-slate-500 mb-4 px-2">O arquivo incluirá apenas as transações filtradas atualmente na tela.</p>
              <div className="flex flex-col gap-2">
                 <button onClick={exportExcel} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-green-50 dark:hover:bg-green-900/20 group transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                      <span className="material-symbols-outlined">table_view</span>
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-slate-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400">Excel (CSV)</p>
                       <p className="text-xs text-slate-500">Para planilhas e análise de dados</p>
                    </div>
                 </button>
                 <button onClick={exportPDF} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 group transition-colors">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </div>
                    <div className="text-left">
                       <p className="font-bold text-slate-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400">PDF (Impressão)</p>
                       <p className="text-xs text-slate-500">Visual, pronto para imprimir</p>
                    </div>
                 </button>
              </div>
              <button onClick={() => setShowExportOptions(false)} className="w-full mt-4 py-3 font-bold text-slate-500 dark:text-slate-400">Cancelar</button>
           </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default StatementScreen;
