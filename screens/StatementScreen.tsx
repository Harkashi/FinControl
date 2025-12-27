import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all'); // "all" now means "History (<= Today)"
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState('Cliente');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    setIsMounted(true);
    const loadData = async () => {
      setLoading(true);
      try {
        const [txs, bal, cats, wals, mets, user] = await Promise.all([
          db.getTransactions(),
          db.getBalance(),
          db.getCategories(),
          db.getWallets(),
          db.getPaymentMethods(),
          db.getCurrentUser()
        ]);
        
        setTransactions(txs);
        // Initial filter logic handled by useEffect on activeFilter
        setBalance(bal.total);
        setCategories(cats);
        setWallets(wals);
        setMethods(mets);
        if (user) {
           setUserName(user.name);
           setUserEmail(user.email);
        }

        processChartData(txs);
      } catch (error) {
        console.error("Statement Load Error", error);
      } finally {
         setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    filterData(activeFilter);
  }, [activeFilter, transactions]);

  const processChartData = (data: Transaction[]) => {
    if (data.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      // Sort Ascending for Balance Calculation
      const sorted = [...data]
        .filter(t => t.date <= todayStr) // Only chart history
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let currentBal = 0; 
      const chartPoints = sorted.map(t => {
        const val = t.type === 'income' ? t.amount : -t.amount;
        currentBal += val;
        return { 
          date: new Date(t.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}), 
          amount: Math.abs(val), 
          balance: currentBal 
        };
      });
      // Take last 30 points to show recent trend
      setChartData(chartPoints.slice(-30));
    } else {
      setChartData([{ date: '', amount: 0, balance: 0 }]);
    }
  };

  const filterData = (filter: FilterType) => {
    let filtered = [...transactions];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Basic logic: 'all', 'income', 'expense' show HISTORY only (<= Today)
    // 'future' shows FUTURE (> Today)
    // 'month' shows CURRENT MONTH (can include future if in same month)

    if (filter === 'future') {
        filtered = filtered.filter(t => t.date > todayStr);
    } else if (filter === 'month') {
        filtered = filtered.filter(t => {
          const tDate = new Date(t.date);
          const adjustedDate = new Date(tDate.getTime() + tDate.getTimezoneOffset() * 60000);
          return adjustedDate.getMonth() === now.getMonth() && adjustedDate.getFullYear() === now.getFullYear();
        });
    } else {
        // For All, Income, Expense -> Filter out future by default
        filtered = filtered.filter(t => t.date <= todayStr);
        
        if (filter === 'income') {
            filtered = filtered.filter(t => t.type === 'income');
        } else if (filter === 'expense') {
            filtered = filtered.filter(t => t.type === 'expense');
        }
    }
    
    // Ensure Descending Sort (Newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredTransactions(filtered);
  };

  const formatValue = (val: number) => {
    if (privacyMode) return '••••••';
    return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // --- PREMIUM PDF GENERATION LOGIC ---
  const handleDownloadPDF = () => {
    // 1. Prepare Data & Metrics
    const txs = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const incomeTotal = txs.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
    const expenseTotal = txs.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
    const periodBalance = incomeTotal - expenseTotal;
    
    // Find Max Values
    const maxIncomeTx = txs.filter(t => t.type === 'income').sort((a,b) => b.amount - a.amount)[0];
    const maxExpenseTx = txs.filter(t => t.type === 'expense').sort((a,b) => b.amount - a.amount)[0];

    // Group Transactions by Date
    const groupedTxs: Record<string, Transaction[]> = {};
    txs.forEach(t => {
       const dateKey = t.date; // YYYY-MM-DD
       if (!groupedTxs[dateKey]) groupedTxs[dateKey] = [];
       groupedTxs[dateKey].push(t);
    });

    // Top Categories Insights
    const categoryStats: Record<string, {amount: number, color: string, count: number}> = {};
    let totalExpenseCalc = 0;
    
    txs.filter(t => t.type === 'expense').forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const catName = cat?.name || 'Outros';
        const color = cat?.colorClass.replace('text-', '').replace('dark:text-', '').split('-')[0] || 'gray'; // rough color extraction
        
        // Map tailwind colors to hex for PDF
        const colorMap: any = { orange: '#ea580c', blue: '#2563eb', purple: '#9333ea', green: '#16a34a', red: '#dc2626', gray: '#64748b', emerald: '#059669', cyan: '#0891b2', pink: '#db2777' };
        const hexColor = colorMap[color] || '#64748b';

        if (!categoryStats[catName]) categoryStats[catName] = { amount: 0, color: hexColor, count: 0 };
        categoryStats[catName].amount += t.amount;
        categoryStats[catName].count += 1;
        totalExpenseCalc += t.amount;
    });

    const sortedCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b.amount - a.amount)
      .slice(0, 5); // Top 5

    // Helpers for Template
    const getWalletName = (id?: string) => wallets.find(w => w.id === id)?.name || 'Conta Padrão';
    const getMethodName = (id?: string) => methods.find(m => m.id === id)?.name || 'Outros';
    const getCatIcon = (id?: string) => categories.find(c => c.id === id)?.icon || 'payments';
    const getCatColor = (id?: string) => {
        const cat = categories.find(c => c.id === id);
        if(!cat) return '#64748b';
        const colorName = cat.colorClass.split('-')[1]; // e.g. text-blue-600 -> blue
        const colorMap: any = { orange: '#ea580c', blue: '#2563eb', purple: '#9333ea', green: '#16a34a', red: '#dc2626', gray: '#64748b', emerald: '#059669', cyan: '#0891b2', pink: '#db2777' };
        return colorMap[colorName] || '#64748b';
    };

    const formatDateFriendly = (dateStr: string) => {
        const d = new Date(dateStr);
        const userTimezoneOffset = d.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
        return adjustedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const reportTitle = activeFilter === 'month' ? 'Extrato Mensal' : activeFilter === 'income' ? 'Relatório de Entradas' : activeFilter === 'expense' ? 'Relatório de Saídas' : 'Extrato Completo';
    const dateRange = txs.length > 0 ? `${new Date(txs[txs.length-1].date).toLocaleDateString('pt-BR')} a ${new Date(txs[0].date).toLocaleDateString('pt-BR')}` : 'Período não definido';

    // 2. Build HTML Structure
    const printWindow = window.open('', '', 'height=800,width=900');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <title>FinControl - ${reportTitle}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { 
            font-family: 'Inter', sans-serif; 
            background: #fff; 
            color: #1e293b; 
            margin: 0;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          /* HEADER */
          .header-container { 
            display: flex; justify-content: space-between; align-items: flex-start;
            padding-bottom: 20px; border-bottom: 2px solid #f1f5f9; margin-bottom: 30px;
          }
          .brand-area { display: flex; align-items: center; gap: 12px; }
          .brand-icon { color: #2563eb; font-size: 36px; }
          .brand-name { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .brand-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 2px; }
          
          .meta-area { text-align: right; }
          .meta-title { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
          .user-name { font-size: 16px; font-weight: 700; color: #0f172a; }
          .user-email { font-size: 12px; color: #64748b; margin-bottom: 8px; }
          .period-badge { background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #475569; display: inline-block; }

          /* SUMMARY CARDS */
          .summary-section { 
            display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 35px;
          }
          .metric-card { 
            background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
          }
          .metric-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
          .metric-value { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .metric-footer { font-size: 10px; color: #94a3b8; margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px; }
          
          .text-green { color: #16a34a; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .bg-green-light { background-color: #f0fdf4; }
          .bg-red-light { background-color: #fef2f2; }
          
          /* TRANSACTIONS */
          .date-header { 
            font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;
            margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;
            display: flex; justify-content: space-between;
          }
          .tx-row { 
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 8px; border-bottom: 1px solid #f8fafc;
          }
          .tx-row:last-child { border-bottom: none; }
          
          .tx-left { display: flex; align-items: center; gap: 12px; flex: 1; }
          .tx-icon-box { 
            width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            background: #f8fafc; color: #64748b; flex-shrink: 0;
          }
          .tx-details { display: flex; flex-direction: column; }
          .tx-title { font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 2px; }
          .tx-meta { font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px; }
          .method-badge { background: #f1f5f9; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; }
          
          .tx-right { text-align: right; }
          .tx-amount { font-size: 14px; font-weight: 700; }
          
          /* INSIGHTS */
          .insights-container { margin-top: 40px; padding-top: 20px; border-top: 2px dashed #e2e8f0; page-break-inside: avoid; }
          .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; color: #0f172a; }
          
          .bars-container { display: flex; flex-direction: column; gap: 10px; }
          .bar-row { display: flex; align-items: center; gap: 12px; font-size: 11px; }
          .bar-label { width: 100px; text-align: right; font-weight: 600; color: #475569; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .bar-track { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 4px; }
          .bar-value { width: 80px; font-weight: 700; color: #0f172a; }

          /* FOOTER */
          .footer { 
            margin-top: 50px; text-align: center; font-size: 10px; color: #cbd5e1; 
            padding-top: 20px; border-top: 1px solid #f1f5f9;
          }
        </style>
      </head>
      <body>
        
        <!-- HEADER -->
        <div class="header-container">
           <div class="brand-area">
              <span class="material-symbols-outlined brand-icon">account_balance_wallet</span>
              <div>
                 <div class="brand-name">FinControl</div>
                 <div class="brand-sub">Relatório Financeiro</div>
              </div>
           </div>
           <div class="meta-area">
              <div class="meta-title">CLIENTE</div>
              <div class="user-name">${userName}</div>
              <div class="user-email">${userEmail}</div>
              <div class="period-badge">${dateRange}</div>
           </div>
        </div>

        <!-- SUMMARY -->
        <div class="summary-section">
           <div class="metric-card bg-green-light" style="border-color: #bbf7d0;">
              <div class="metric-label text-green">Total de Entradas</div>
              <div class="metric-value text-green">+ R$ ${incomeTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              <div class="metric-footer">Maior: R$ ${maxIncomeTx ? maxIncomeTx.amount.toLocaleString('pt-BR') : '0,00'}</div>
           </div>
           <div class="metric-card bg-red-light" style="border-color: #fecaca;">
              <div class="metric-label text-red">Total de Saídas</div>
              <div class="metric-value text-red">- R$ ${expenseTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              <div class="metric-footer">Maior: R$ ${maxExpenseTx ? maxExpenseTx.amount.toLocaleString('pt-BR') : '0,00'}</div>
           </div>
           <div class="metric-card">
              <div class="metric-label">Saldo do Período</div>
              <div class="metric-value ${periodBalance >= 0 ? 'text-blue' : 'text-red'}">
                ${periodBalance >= 0 ? '+' : ''} R$ ${periodBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </div>
              <div class="metric-footer">${txs.length} transações registradas</div>
           </div>
        </div>

        <!-- TRANSACTIONS -->
        <div>
           ${Object.keys(groupedTxs).map(dateKey => `
             <div style="break-inside: avoid;">
               <div class="date-header">
                  <span>${formatDateFriendly(dateKey)}</span>
                  <span style="font-weight: 500; font-size: 10px; opacity: 0.7">${groupedTxs[dateKey].length} itens</span>
               </div>
               
               <div>
                  ${groupedTxs[dateKey].map(t => {
                     const catColor = getCatColor(t.categoryId);
                     const isIncome = t.type === 'income';
                     return `
                     <div class="tx-row">
                        <div class="tx-left">
                           <div class="tx-icon-box" style="color: ${catColor}; background: ${catColor}15;">
                              <span class="material-symbols-outlined" style="font-size: 18px">${getCatIcon(t.categoryId)}</span>
                           </div>
                           <div class="tx-details">
                              <div class="tx-title">${t.title}</div>
                              <div class="tx-meta">
                                 <span style="color: ${catColor}; font-weight: 600;">${categories.find(c => c.id === t.categoryId)?.name || 'Geral'}</span>
                                 <span>•</span>
                                 <span>${getWalletName(t.walletId)}</span>
                                 <span class="method-badge">${getMethodName(t.paymentMethodId)}</span>
                              </div>
                           </div>
                        </div>
                        <div class="tx-right">
                           <div class="tx-amount ${isIncome ? 'text-green' : 'text-red'}">
                              ${isIncome ? '+' : '-'} R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                           </div>
                        </div>
                     </div>
                     `
                  }).join('')}
               </div>
             </div>
           `).join('')}
        </div>

        <!-- INSIGHTS (Only if there are expenses) -->
        ${sortedCategories.length > 0 ? `
        <div class="insights-container">
           <div class="section-title">Top 5 Categorias de Gasto</div>
           <div class="bars-container">
              ${sortedCategories.map(([name, data]) => {
                 const percent = totalExpenseCalc > 0 ? (data.amount / totalExpenseCalc) * 100 : 0;
                 return `
                 <div class="bar-row">
                    <div class="bar-label">${name}</div>
                    <div class="bar-track">
                       <div class="bar-fill" style="width: ${percent}%; background-color: ${data.color};"></div>
                    </div>
                    <div class="bar-value">R$ ${data.amount.toLocaleString('pt-BR', { notation: 'compact' })}</div>
                 </div>
                 `;
              }).join('')}
           </div>
        </div>
        ` : ''}

        <!-- FOOTER -->
        <div class="footer">
           <p>Este documento foi gerado automaticamente pelo aplicativo FinControl e serve apenas para controle pessoal.</p>
           <p>fincontrol.app • ${new Date().getFullYear()}</p>
        </div>

        <script>
           window.onload = function() {
             setTimeout(() => {
                window.print();
                // window.close(); // Optional: Close after print
             }, 800);
           }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display h-screen flex flex-col overflow-hidden text-slate-900 dark:text-white relative">
       {loading && (
          <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm z-30 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}

      {/* Top App Bar */}
      <div className="flex items-center px-4 pt-12 pb-4 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="flex w-10 h-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <span className="material-symbols-outlined" style={{fontSize: '24px'}}>arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">Extrato</h2>
        <button 
           onClick={handleDownloadPDF}
           disabled={loading || filteredTransactions.length === 0}
           className="flex w-10 h-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
           title="Baixar PDF Premium"
        >
          <span className="material-symbols-outlined" style={{fontSize: '24px'}}>download</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        {/* Summary Chart Section */}
        <div className="px-4 py-6">
          <div className="flex flex-col gap-2">
            <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Saldo Total (Hoje)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{formatValue(balance)}</p>
            </div>
            
            {/* Chart Visualization */}
            <div className="relative w-full h-32 mt-4 opacity-80 min-w-0">
              {isMounted && !privacyMode ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradientPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(var(--color-primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="rgb(var(--color-primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{backgroundColor: '#192233', border: 'none', borderRadius: '8px', fontSize: '12px'}} 
                      itemStyle={{color: '#fff'}}
                      labelStyle={{display: 'none'}}
                      formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Saldo']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="rgb(var(--color-primary))" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#gradientPrimary)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                   <div className="flex flex-col items-center gap-2 text-slate-400">
                     <span className="material-symbols-outlined">visibility_off</span>
                     <span className="text-xs font-bold uppercase">Gráfico Oculto</span>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Filters */}
        <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm py-2 border-y border-transparent dark:border-gray-800/50">
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-3 shadow-sm transition-all active:scale-95 ${activeFilter === 'all' ? 'bg-primary text-white shadow-primary/20' : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary'}`}
            >
              <p className="text-sm font-bold">Histórico</p>
              {activeFilter === 'all' && <span className="material-symbols-outlined text-[18px]">check</span>}
            </button>
            
            <button 
              onClick={() => setActiveFilter('future')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-3 shadow-sm transition-all active:scale-95 ${activeFilter === 'future' ? 'bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary'}`}
            >
              <p className="text-sm font-bold">Futuro</p>
              {activeFilter === 'future' && <span className="material-symbols-outlined text-[18px]">event_upcoming</span>}
            </button>

            <button 
              onClick={() => setActiveFilter('month')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-3 shadow-sm transition-all active:scale-95 ${activeFilter === 'month' ? 'bg-primary text-white shadow-primary/20' : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary'}`}
            >
              <p className="text-sm font-bold">Este Mês</p>
              {activeFilter === 'month' && <span className="material-symbols-outlined text-[18px]">check</span>}
            </button>

            <button 
              onClick={() => setActiveFilter('income')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-3 shadow-sm transition-all active:scale-95 ${activeFilter === 'income' ? 'bg-primary text-white shadow-primary/20' : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary'}`}
            >
              <p className="text-sm font-bold">Entradas</p>
              {activeFilter === 'income' && <span className="material-symbols-outlined text-[18px]">check</span>}
            </button>

            <button 
              onClick={() => setActiveFilter('expense')}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-3 shadow-sm transition-all active:scale-95 ${activeFilter === 'expense' ? 'bg-primary text-white shadow-primary/20' : 'bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-text-secondary'}`}
            >
              <p className="text-sm font-bold">Saídas</p>
              {activeFilter === 'expense' && <span className="material-symbols-outlined text-[18px]">check</span>}
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex flex-col gap-6 mt-4">
          {filteredTransactions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="px-4 flex justify-between items-end">
                <h3 className="text-text-secondary text-sm font-bold uppercase tracking-wide">
                  {activeFilter === 'all' ? 'Histórico Completo' : activeFilter === 'future' ? 'Lançamentos Futuros' : activeFilter === 'month' ? 'Este Mês' : activeFilter === 'income' ? 'Receitas' : 'Despesas'}
                </h3>
                <span className="text-xs text-text-secondary">{filteredTransactions.length} itens</span>
              </div>
              
              {filteredTransactions.map((t) => (
                <div key={t.id} className="mx-4 p-4 bg-white dark:bg-surface-dark rounded-xl flex items-center justify-between shadow-sm border border-gray-100 dark:border-gray-800/50">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center rounded-full w-12 h-12 shrink-0 ${t.bgClass} ${t.colorClass}`}>
                      <span className="material-symbols-outlined" style={{fontSize: '24px'}}>{t.icon}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-base font-bold leading-tight line-clamp-1">{t.title}</p>
                      <p className="text-text-secondary text-xs font-medium mt-0.5">{t.subtitle}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-base font-bold ${t.type === 'income' ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                      {t.type === 'expense' ? '- ' : '+ '}
                      {formatValue(t.amount)}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                       {new Date(t.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <span className="material-symbols-outlined text-4xl mb-2">filter_list_off</span>
                <p className="text-sm font-medium">Nenhum lançamento encontrado.</p>
                {activeFilter === 'all' && (
                    <p className="text-xs text-text-secondary mt-2">Verifique o filtro "Futuro" para agendamentos.</p>
                )}
             </div>
          )}
          <div className="h-8"></div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default StatementScreen;