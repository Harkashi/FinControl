
import React, { useEffect, useState, useMemo } from 'react';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../components/ThemeHandler';
import { db } from '../services/database';
import { BudgetReport, Category, FinancialGoal, Transaction } from '../types';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  { id: 'blue', text: 'text-blue-500', bg: 'bg-blue-500/20', ring: 'ring-blue-500' },
  { id: 'purple', text: 'text-purple-500', bg: 'bg-purple-500/20', ring: 'ring-purple-500' },
  { id: 'green', text: 'text-green-500', bg: 'bg-green-500/20', ring: 'ring-green-500' },
  { id: 'pink', text: 'text-pink-500', bg: 'bg-pink-500/20', ring: 'ring-pink-500' },
  { id: 'yellow', text: 'text-yellow-500', bg: 'bg-yellow-500/20', ring: 'ring-yellow-500' },
  { id: 'cyan', text: 'text-cyan-500', bg: 'bg-cyan-500/20', ring: 'ring-cyan-500' }
];

const ICONS = ['savings', 'flight', 'directions_car', 'home', 'school', 'smartphone', 'laptop_mac', 'sports_esports', 'checkroom', 'rocket_launch', 'diamond', 'emergency'];

// Helper para formatar moeda enquanto digita (Ex: 1000 -> 10,00)
const currencyMask = (value: string) => {
  let v = value.replace(/\D/g, '');
  v = (parseInt(v) / 100).toFixed(2) + '';
  v = v.replace('.', ',');
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return v === 'NaN' ? '' : v;
};

const parseCurrency = (value: string) => {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

const BudgetsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { privacyMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'variable' | 'committed' | 'goals'>('variable');
  
  // Settings Menu State
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Edit Budget Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Goals Logic
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'edit'>('details');
  const [selectedGoal, setSelectedGoal] = useState<Partial<FinancialGoal>>({});
  
  // Modals Logic
  const [installmentsModalOpen, setInstallmentsModalOpen] = useState(false);
  const [fixedCostsModalOpen, setFixedCostsModalOpen] = useState(false);
  const [expandedInstallmentId, setExpandedInstallmentId] = useState<string | null>(null); // To toggle financing details
  
  // Goal Form States
  const [goalName, setGoalName] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalIcon, setGoalIcon] = useState('savings');
  const [goalColor, setGoalColor] = useState('text-blue-500');
  
  // Deposit State
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  useEffect(() => { loadData(); }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await db.getBudgetsReport(currentDate.getMonth(), currentDate.getFullYear());
      setReport(data);
    } catch (error) {
      console.error("Error loading budgets", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleSaveBudget = async () => {
    if (!editingCategory) return;
    setIsSavingBudget(true);
    
    const limit = parseCurrency(newLimit);
    const { success, error } = await db.updateCategoryBudget(editingCategory.id, limit);
    
    setIsSavingBudget(false);
    
    if (success) {
        setEditingCategory(null);
        await loadData();
    } else {
        alert("Erro ao salvar orçamento. Tente novamente.");
        console.error(error);
    }
  };

  // --- SETTINGS MENU ACTIONS ---
  const handleManageCategories = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSettingsMenuOpen(false);
      navigate('/categories');
  };

  const handleResetBudgetsClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSettingsMenuOpen(false);
      setShowResetModal(true);
  };

  const performReset = async () => {
      setIsResetting(true);
      const result = await db.resetAllCategoryBudgets();
      
      // Delay closing modal slightly to ensure state settles
      setTimeout(async () => {
          setIsResetting(false);
          setShowResetModal(false);
          if (result.success) {
              await loadData();
              alert("Orçamentos redefinidos com sucesso.");
          } else {
              alert(typeof result.error === 'string' ? result.error : "Erro ao redefinir orçamentos.");
          }
      }, 300);
  };

  // --- GOAL ACTIONS ---
  const handleOpenGoalModal = (goal?: FinancialGoal) => {
    if (goal) {
      setSelectedGoal(goal);
      setGoalName(goal.name);
      setGoalTargetStr(goal.targetAmount.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'));
      setGoalCurrentStr(goal.currentAmount.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'));
      setGoalDeadline(goal.deadline || '');
      setGoalIcon(goal.icon);
      setGoalColor(goal.colorClass);
      setViewMode('details');
    } else {
      setSelectedGoal({});
      setGoalName('');
      setGoalTargetStr('');
      setGoalCurrentStr('');
      setGoalDeadline('');
      setGoalIcon('savings');
      setGoalColor('text-blue-500');
      setViewMode('edit');
    }
    setDepositAmountStr('');
    setGoalModalOpen(true);
  };

  const handleDeposit = async () => {
      if (!selectedGoal.id || !depositAmountStr) return;
      const amountToAdd = parseCurrency(depositAmountStr);
      const newTotal = (selectedGoal.currentAmount || 0) + amountToAdd;
      
      setIsSubmittingGoal(true);
      await db.saveGoal({ ...selectedGoal, currentAmount: newTotal });
      
      setSelectedGoal(prev => ({ ...prev, currentAmount: newTotal }));
      setDepositAmountStr('');
      setIsSubmittingGoal(false);
      loadData();
  };

  const handleSaveGoal = async () => {
    if (!goalName || !goalTargetStr) return;
    setIsSubmittingGoal(true);
    
    const target = parseCurrency(goalTargetStr);
    const current = parseCurrency(goalCurrentStr);

    await db.saveGoal({
        id: selectedGoal.id,
        name: goalName,
        targetAmount: target,
        currentAmount: current,
        deadline: goalDeadline,
        icon: goalIcon,
        colorClass: goalColor
    });
    
    setIsSubmittingGoal(false);
    setGoalModalOpen(false);
    loadData();
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal.id) return;
    if (confirm('Tem certeza que deseja excluir esta meta?')) {
        await db.deleteGoal(selectedGoal.id);
        setGoalModalOpen(false);
        loadData();
    }
  };

  const goalInsights = useMemo(() => {
      if (!selectedGoal.targetAmount) return null;
      
      const target = selectedGoal.targetAmount || 0;
      const current = selectedGoal.currentAmount || 0;
      const remaining = Math.max(0, target - current);
      const percentage = Math.min(100, (current / target) * 100);
      
      let monthsLeft = 0;
      let monthlyNeeded = 0;

      if (selectedGoal.deadline) {
          const today = new Date();
          const deadline = new Date(selectedGoal.deadline);
          monthsLeft = (deadline.getFullYear() - today.getFullYear()) * 12 + (deadline.getMonth() - today.getMonth());
          if (monthsLeft <= 0) monthsLeft = 0;
          
          if (monthsLeft > 0 && remaining > 0) {
              monthlyNeeded = remaining / monthsLeft;
          } else if (remaining > 0) {
              monthlyNeeded = remaining; 
          }
      }

      return { remaining, percentage, monthsLeft, monthlyNeeded };
  }, [selectedGoal]);


  const formatCurrency = (val: number) => privacyMode ? '••••••' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // --- VISUAL COMPONENTS ---
  const PaceIndicator = ({ pace }: { pace: BudgetReport['pace'] }) => {
      const config = {
          'slow': { color: 'bg-green-500', text: 'ECONOMIA', icon: 'thumb_up' },
          'on-track': { color: 'bg-blue-600', text: 'NO RITMO', icon: 'check' },
          'fast': { color: 'bg-yellow-500', text: 'ACELERADO', icon: 'speed' },
          'critical': { color: 'bg-red-500', text: 'CRÍTICO', icon: 'warning' },
      }[pace];

      return (
          <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-1.5 rounded-full border border-slate-700 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${config.color}`}></span>
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">{config.text}</span>
          </div>
      );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden antialiased pb-24 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background-light dark:bg-background-dark pt-safe">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors -ml-2">
               <span className="material-symbols-outlined dark:text-white">arrow_back</span>
            </button>
            <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planejamento</span>
               <div className="flex items-center gap-2 mt-0.5">
                  <button type="button" onClick={() => handleMonthChange('prev')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                  <span className="font-extrabold text-lg capitalize">{monthName}</span>
                  <button type="button" onClick={() => handleMonthChange('next')} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
               </div>
            </div>
          </div>
          <button type="button" onClick={() => setSettingsMenuOpen(true)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#192233] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#232f48] transition-colors">
             <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 gap-6 overflow-y-auto no-scrollbar">
        {loading ? (
             <div className="flex justify-center py-20"><div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>
        ) : (
        <>
            {/* HERO CARD */}
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 dark:bg-black p-6 shadow-xl shadow-slate-900/10 dark:shadow-none text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col gap-4">
                    {/* Condição para Orçamento Zerado vs Normal */}
                    {report?.totalBudget === 0 ? (
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">GASTO TOTAL</p>
                                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-700">SEM LIMITE</span>
                            </div>
                            <h1 className="text-4xl font-extrabold tracking-tight">{formatCurrency(report?.totalSpent || 0)}</h1>
                            <p className="text-xs text-orange-400 mt-3 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Defina orçamentos para ver seu saldo livre.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">SALDO LIVRE REAL</p>
                                    <h1 className="text-4xl font-extrabold tracking-tight">{formatCurrency(report?.remaining || 0)}</h1>
                                </div>
                                {report && <PaceIndicator pace={report.pace} />}
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-4 bg-white/10 rounded-full mt-2 w-full">
                                <div className="absolute h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, report?.budgetConsumedPct || 0)}%` }}></div>
                                <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 opacity-70" style={{ left: `${report?.daysPassedPct}%` }} title="Hoje"></div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <span>Gasto: {formatCurrency(report?.totalSpent || 0)}</span>
                                <span>Limite: {formatCurrency(report?.totalBudget || 0)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white dark:bg-[#192233] p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setActiveTab('variable')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'variable' ? 'bg-slate-900 dark:bg-primary text-white shadow' : 'text-slate-500'}`}>Variável</button>
                <button type="button" onClick={() => setActiveTab('committed')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'committed' ? 'bg-slate-900 dark:bg-primary text-white shadow' : 'text-slate-500'}`}>Compromissos</button>
                <button type="button" onClick={() => setActiveTab('goals')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'goals' ? 'bg-slate-900 dark:bg-primary text-white shadow' : 'text-slate-500'}`}>Metas</button>
            </div>

            {/* CONTENT */}
            <div className="flex flex-col gap-3">
                {/* 1. Variable */}
                {activeTab === 'variable' && (
                    <>
                        <h3 className="text-sm font-bold text-slate-500 uppercase px-2 flex justify-between">
                            <span>Gastos Controláveis</span>
                            <span className="text-slate-900 dark:text-white">{formatCurrency(report?.variableSpent || 0)}</span>
                        </h3>
                        {report?.categories.map(cat => {
                            const budget = cat.budget || 0;
                            const spent = cat.spent || 0;
                            const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                            const isOver = budget > 0 && spent > budget;
                            const remaining = Math.max(0, budget - spent);

                            return (
                                <div key={cat.id} onClick={() => { setEditingCategory(cat); setNewLimit(budget > 0 ? budget.toFixed(2).replace('.', ',') : ''); }} className={`flex flex-col gap-2 p-4 bg-white dark:bg-[#1e2330] rounded-2xl border ${isOver ? 'border-red-500/50 bg-red-50 dark:bg-red-900/10' : 'border-transparent'} shadow-sm active:scale-[0.98] transition-transform`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cat.bgClass} ${cat.colorClass}`}>
                                                <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{cat.name}</p>
                                                {/* Category Limit Text - Updated Dynamic Display */}
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                    {budget > 0 
                                                        ? `LIMITE: ${formatCurrency(budget)}` 
                                                        : 'SEM LIMITE DEFINIDO'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${isOver ? 'text-red-500' : 'dark:text-white'}`}>{formatCurrency(spent)}</p>
                                            {budget > 0 ? (
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {remaining > 0 ? `Restam ${formatCurrency(remaining)}` : 'Esgotado'}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 font-medium">{Math.round(percent)}%</p>
                                            )}
                                        </div>
                                    </div>
                                    {budget > 0 && (
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : percent > 90 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </>
                )}

                {/* 2. Committed */}
                {activeTab === 'committed' && (
                    <div className="space-y-4">
                        {/* FIXED COSTS CARD - CLICKABLE */}
                        <div 
                            onClick={() => setFixedCostsModalOpen(true)}
                            className="p-5 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div>
                                <p className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    Contas Fixas <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </p>
                                <h2 className="text-2xl font-extrabold text-purple-700 dark:text-purple-300">{formatCurrency(report?.fixedCosts || 0)}</h2>
                            </div>
                            <span className="material-symbols-outlined text-purple-500 text-4xl opacity-50">calendar_today</span>
                        </div>
                        
                        {/* INSTALLMENTS CARD - CLICKABLE */}
                        <div 
                            onClick={() => setInstallmentsModalOpen(true)}
                            className="p-5 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                        >
                            <div>
                                <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    Parcelamentos <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </p>
                                <h2 className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{formatCurrency(report?.committedInstallments || 0)}</h2>
                            </div>
                            <span className="material-symbols-outlined text-blue-500 text-4xl opacity-50">credit_card</span>
                        </div>
                        <p className="text-center text-xs text-slate-400 px-4">Estes valores são deduzidos automaticamente do seu saldo livre.</p>
                    </div>
                )}

                {/* 3. Goals */}
                {activeTab === 'goals' && (
                    <div className="space-y-4">
                        {(!report?.goals || report.goals.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-60">
                                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">flag</span>
                                <p className="text-sm font-bold text-slate-500">Nenhuma meta ativa</p>
                                <button type="button" onClick={() => handleOpenGoalModal()} className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">+ Nova Meta</button>
                            </div>
                        ) : (
                            <>
                                <button type="button" onClick={() => handleOpenGoalModal()} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">+ Nova Meta</button>
                                {report.goals.map(goal => {
                                    const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                                    return (
                                        <div key={goal.id} onClick={() => handleOpenGoalModal(goal)} className="bg-white dark:bg-[#1e2330] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-transparent active:scale-[0.98] transition-transform">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${goal.colorClass} bg-opacity-20 bg-gray-100`}>
                                                        <span className={`material-symbols-outlined text-[24px] ${goal.colorClass}`}>{goal.icon}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold dark:text-white">{goal.name}</h4>
                                                        <p className="text-[10px] text-slate-400">{goal.deadline ? `Até ${new Date(goal.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-extrabold text-primary">{formatCurrency(goal.currentAmount)}</p>
                                                    <p className="text-[10px] text-slate-400">de {formatCurrency(goal.targetAmount)}</p>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${percent >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                            <div className="flex justify-end mt-1"><span className="text-[10px] font-bold text-slate-400">{percent.toFixed(0)}%</span></div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
        )}
      </main>

      {/* Settings Modal (Gear Icon) */}
      {settingsMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setSettingsMenuOpen(false)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold dark:text-white">Configurações</h3>
                    <button type="button" onClick={() => setSettingsMenuOpen(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
                </div>
                
                <div className="flex flex-col gap-3">
                    <button type="button" onClick={handleManageCategories} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-[#111620] rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2231] transition-colors text-left">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined text-[20px]">category</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold dark:text-white">Gerenciar Categorias</p>
                            <p className="text-xs text-slate-500">Crie ou edite categorias de gastos</p>
                        </div>
                    </button>

                    <button type="button" onClick={handleResetBudgetsClick} className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
                            <span className="material-symbols-outlined text-[20px]">local_fire_department</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">Redefinir Orçamentos</p>
                            <p className="text-xs text-red-400/80">Zerar todos os limites definidos</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Budgets - Reimplemented */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowResetModal(false)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out] border border-red-500/10" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                        <span className="material-symbols-outlined text-4xl">local_fire_department</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold dark:text-white mb-1">Redefinir Orçamentos?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Isso irá <span className="font-bold text-red-500">ZERAR</span> todas as metas de orçamento de todas as categorias.
                        </p>
                        <p className="text-xs text-slate-400 mt-2">Suas transações e histórico não serão afetados.</p>
                    </div>
                    
                    <div className="flex gap-3 w-full mt-2">
                        <button 
                            type="button"
                            onClick={() => setShowResetModal(false)}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={performReset}
                            disabled={isResetting}
                            className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isResetting ? 'Processando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => setEditingCategory(null)}>
            <div className="bg-[#192233] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-[scale-in_0.2s_ease-out] border border-slate-800" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-6">Definir Orçamento</h3>
                
                <div className="mb-8">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">VALOR MENSAL</label>
                    <div className="flex items-baseline gap-1 border-b border-slate-700 pb-2">
                        <span className="text-2xl font-bold text-slate-400">R$</span>
                        <input 
                            autoFocus 
                            type="text"
                            inputMode="numeric"
                            value={newLimit} 
                            onChange={e => setNewLimit(currencyMask(e.target.value))} 
                            className="w-full bg-transparent border-none text-4xl font-bold text-white focus:ring-0 p-0 placeholder-slate-700" 
                            placeholder="0,00" 
                        />
                    </div>
                </div>
                
                <button 
                    type="button"
                    onClick={handleSaveBudget} 
                    disabled={isSavingBudget}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center"
                >
                    {isSavingBudget ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Orçamento'}
                </button>
            </div>
        </div>
      )}

      {/* --- INSTALLMENTS LIST MODAL --- */}
      {installmentsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4" onClick={() => { setInstallmentsModalOpen(false); setExpandedInstallmentId(null); }}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-[slide-up_0.3s] sm:animate-[scale-in_0.2s_ease-out] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold dark:text-white">Compromissos Parcelados</h3>
                    <button type="button" onClick={() => setInstallmentsModalOpen(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
                </div>
                <div className="overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
                    {report?.activeInstallmentsList && report.activeInstallmentsList.length > 0 ? (
                        report.activeInstallmentsList.map(item => {
                            const isExpanded = expandedInstallmentId === item.id;
                            const hasFinancing = !!item.financingDetails;
                            let remainingBalance = 0;
                            if (item.installmentTotal && item.installmentNumber) {
                                const remainingMonths = item.installmentTotal - item.installmentNumber;
                                remainingBalance = remainingMonths * item.amount;
                            }

                            return (
                            <div 
                                key={item.id} 
                                onClick={() => setExpandedInstallmentId(isExpanded ? null : item.id)}
                                className={`flex flex-col p-3 bg-slate-50 dark:bg-[#111620] rounded-xl border ${isExpanded ? 'border-primary/50 bg-primary/5' : 'border-slate-100 dark:border-slate-800'} transition-all cursor-pointer`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.bgClass} ${item.colorClass}`}>
                                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm dark:text-white">{item.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-slate-500 font-medium bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full inline-block">
                                                    {item.installmentNumber}/{item.installmentTotal}
                                                </p>
                                                {!isExpanded && <span className="text-[10px] text-blue-500 font-bold flex items-center"><span className="material-symbols-outlined text-[12px]">expand_more</span></span>}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                                </div>

                                {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-[fade-in_0.3s]">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {hasFinancing ? (
                                                <>
                                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg">
                                                        <span className="block text-slate-400 text-[10px]">Valor Original</span>
                                                        <strong className="dark:text-white">{formatCurrency(item.financingDetails!.loanAmount)}</strong>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg">
                                                        <span className="block text-slate-400 text-[10px]">Taxa de Juros</span>
                                                        <strong className="dark:text-white">{item.financingDetails!.interestRate}% a.m.</strong>
                                                    </div>
                                                </>
                                            ) : (
                                                 <div className="col-span-2 bg-white dark:bg-slate-800 p-2 rounded-lg">
                                                    <span className="block text-slate-400 text-[10px]">Tipo</span>
                                                    <strong className="dark:text-white">Parcelamento Simples</strong>
                                                 </div>
                                            )}
                                            
                                            <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                                                <span className="text-blue-600 dark:text-blue-300 font-bold">Saldo Restante (Estimado)</span>
                                                <strong className="text-blue-700 dark:text-white text-sm">{formatCurrency(remainingBalance)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )})
                    ) : (
                        <div className="py-10 text-center text-slate-500">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">event_busy</span>
                            <p>Nenhum parcelamento ativo neste mês.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- FIXED COSTS LIST MODAL --- */}
      {fixedCostsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4" onClick={() => setFixedCostsModalOpen(false)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-[slide-up_0.3s] sm:animate-[scale-in_0.2s_ease-out] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold dark:text-white">Contas Fixas</h3>
                    <button type="button" onClick={() => setFixedCostsModalOpen(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
                </div>
                <div className="overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
                    {report?.fixedCostsList && report.fixedCostsList.length > 0 ? (
                        report.fixedCostsList.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#111620] rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.bgClass} ${item.colorClass}`}>
                                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">{item.title}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Recorrente Mensal</p>
                                    </div>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</span>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center text-slate-500">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">calendar_today</span>
                            <p>Nenhuma conta fixa neste mês.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- SUPER GOAL MODAL --- */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4" onClick={() => setGoalModalOpen(false)}>
            <div className="bg-white dark:bg-[#1e2330] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-[slide-up_0.3s] sm:animate-[scale-in_0.2s_ease-out] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold dark:text-white">
                        {viewMode === 'details' && selectedGoal.id ? 'Detalhes da Meta' : selectedGoal.id ? 'Editar Meta' : 'Nova Meta'}
                    </h3>
                    <div className="flex gap-2">
                        {selectedGoal.id && viewMode === 'details' && (
                            <button type="button" onClick={() => setViewMode('edit')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                        )}
                        {viewMode === 'edit' && selectedGoal.id && (
                            <button type="button" onClick={() => setViewMode('details')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                        )}
                        <button type="button" onClick={() => setGoalModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="overflow-y-auto p-6 no-scrollbar">
                    
                    {/* VIEW MODE: DETAILS & DEPOSIT */}
                    {viewMode === 'details' ? (
                        <div className="flex flex-col gap-6">
                            {/* Hero Status */}
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${selectedGoal.colorClass} bg-opacity-10 mb-4 ring-4 ring-offset-4 ring-offset-white dark:ring-offset-[#1e2330] ${selectedGoal.colorClass?.replace('text-', 'ring-').replace('dark:text-', '') || 'ring-blue-500'}`}>
                                    <span className="material-symbols-outlined text-4xl">{selectedGoal.icon}</span>
                                </div>
                                <h2 className="text-2xl font-extrabold dark:text-white mb-1">{selectedGoal.name}</h2>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {goalInsights?.percentage.toFixed(1)}% concluído
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${goalInsights?.percentage! >= 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${goalInsights?.percentage}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                    <span>{formatCurrency(selectedGoal.currentAmount || 0)}</span>
                                    <span>{formatCurrency(selectedGoal.targetAmount || 0)}</span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-[#111620] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Faltam</p>
                                    <p className="text-lg font-bold dark:text-white">
                                        {formatCurrency(goalInsights?.remaining || 0)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-[#111620] p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Prazo</p>
                                    <p className="text-lg font-bold dark:text-white">
                                        {goalInsights?.monthsLeft === 0 ? 'Este mês' : `${goalInsights?.monthsLeft} meses`}
                                    </p>
                                </div>
                                {goalInsights?.monthlyNeeded! > 0 && (
                                    <div className="col-span-2 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-blue-500 mb-0.5">Sugestão Mensal</p>
                                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                                Guarde <span className="font-extrabold">{formatCurrency(goalInsights?.monthlyNeeded || 0)}</span> por mês
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Deposit Action */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Adicionar Valor (Depósito)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0,00"
                                            value={depositAmountStr}
                                            onChange={e => setDepositAmountStr(currencyMask(e.target.value))}
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-green-500 rounded-xl font-bold dark:text-white outline-none transition-colors"
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleDeposit}
                                        disabled={!depositAmountStr || isSubmittingGoal}
                                        className="px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
                                    >
                                        {isSubmittingGoal ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">add</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* VIEW MODE: EDIT FORM */
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nome da Meta</label>
                                <input type="text" placeholder="Ex: Viagem Disney" value={goalName} onChange={e => setGoalName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold dark:text-white focus:ring-2 focus:ring-primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Valor Alvo (R$)</label>
                                    <input type="text" inputMode="numeric" placeholder="0,00" value={goalTargetStr} onChange={e => setGoalTargetStr(currencyMask(e.target.value))} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold dark:text-white focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Já Guardado (R$)</label>
                                    <input type="text" inputMode="numeric" placeholder="0,00" value={goalCurrentStr} onChange={e => setGoalCurrentStr(currencyMask(e.target.value))} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold text-green-500 focus:ring-2 focus:ring-green-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Data Limite (Opcional)</label>
                                <input type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold dark:text-white focus:ring-2 focus:ring-primary" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Ícone</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                    {ICONS.map(icon => (
                                        <button type="button" key={icon} onClick={() => setGoalIcon(icon)} className={`p-2 rounded-lg shrink-0 transition-colors ${goalIcon === icon ? 'bg-primary text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cor</label>
                                <div className="flex gap-3">
                                    {COLORS.map(c => (
                                        <button type="button" key={c.id} onClick={() => setGoalColor(c.text)} className={`w-8 h-8 rounded-full transition-transform ${c.bg} ${goalColor === c.text ? `ring-2 ring-offset-2 dark:ring-offset-[#1e2330] scale-110 ${c.ring}` : ''}`}></button>
                                    ))}
                                </div>
                            </div>

                            <button type="button" onClick={handleSaveGoal} disabled={isSubmittingGoal || !goalName || !goalTargetStr} className="w-full py-4 mt-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 disabled:opacity-50 active:scale-[0.98] transition-transform">
                                {isSubmittingGoal ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                            
                            {selectedGoal.id && (
                                <button type="button" onClick={handleDeleteGoal} className="w-full py-3 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                                    Excluir Meta
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default BudgetsScreen;
