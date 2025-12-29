
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { db } from '../services/database';
import { Category, Wallet, PaymentMethod, SmartRule } from '../types';

interface TransactionDraft {
  type?: 'income' | 'expense' | 'transfer';
  amount?: string | number;
  description?: string;
  categoryId?: string;
  date?: string;
  walletId?: string;
  destinationWalletId?: string;
  methodId?: string;
  createdCategoryId?: string;
}

const INSTALLMENT_TYPES = [
  { id: 'card', label: 'Cartão', icon: 'credit_card' },
  { id: 'car', label: 'Automóvel', icon: 'directions_car' },
  { id: 'house', label: 'Casa', icon: 'home' },
  { id: 'loan', label: 'Empréstimo', icon: 'account_balance' }
];

const AddTransactionScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TransactionDraft | null;
  
  // Use Context Data
  const { categories, wallets, methods, addTransaction } = useData();
  
  // Core State
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(() => state?.type || 'income');
  
  // FIX: Ensure amount is initialized as string to avoid .replace crash
  const [amount, setAmount] = useState<string>(() => {
    if (state?.amount !== undefined && state?.amount !== null) {
      // If it's a number (from edit mode), format it to "1.234,56"
      if (typeof state.amount === 'number') {
        return state.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return String(state.amount);
    }
    return '';
  });

  const [description, setDescription] = useState(() => state?.description || '');
  const [date, setDate] = useState(() => state?.date || new Date().toISOString().split('T')[0]);
  
  // V2 Features State
  const [installments, setInstallments] = useState(1);
  const [isFixed, setIsFixed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [installmentType, setInstallmentType] = useState('card');
  
  // Juros & Financiamento State
  const [hasInterest, setHasInterest] = useState(false);
  const [totalWithInterest, setTotalWithInterest] = useState('');
  
  // Financiamento Inteligente
  const [isSmartCalc, setIsSmartCalc] = useState(false);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState(''); // %
  const [calculatedInstallment, setCalculatedInstallment] = useState(0);

  // Selections
  const [categoryId, setCategoryId] = useState(() => state?.categoryId || '');
  const [walletId, setWalletId] = useState(() => state?.walletId || ''); 
  const [destinationWalletId, setDestinationWalletId] = useState(() => state?.destinationWalletId || '');
  const [methodId, setMethodId] = useState(() => state?.methodId || '');
  
  // Smart Rules State
  const [smartRules, setSmartRules] = useState<SmartRule[]>([]);
  
  // UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Initial Logic
  useEffect(() => {
      if (wallets.length > 0 && !walletId) {
          const defaultWallet = wallets.find(w => w.is_default) || wallets[0];
          setWalletId(defaultWallet.id);
      }
      if (methods.length > 0 && !methodId) {
         const defaultMethod = methods.find(m => m.name.toLowerCase().includes('débito')) || methods[0];
         setMethodId(defaultMethod.id);
      }
      if (state?.createdCategoryId) {
         setCategoryId(state.createdCategoryId);
         const createdCat = categories.find(c => c.id === state.createdCategoryId);
         if (createdCat && createdCat.type !== 'both') setType(createdCat.type as any);
      }
      if (state?.type === 'transfer' && !description) setDescription('Transferência');
      
      // Load Smart Rules ONLY if Premium
      const checkPremiumAndLoadRules = async () => {
          const profile = await db.getUserProfile();
          if (profile && (profile.plan === 'pro' || profile.plan === 'ultra')) {
              const rules = await db.getSmartRules();
              setSmartRules(rules);
          }
      };
      checkPremiumAndLoadRules();
  }, [wallets, methods, categories]);

  // Real-time Smart Categorization
  useEffect(() => {
      if (!description || smartRules.length === 0) return;
      
      const lowerDesc = description.toLowerCase();
      // Find matching rule
      const match = smartRules.find(r => lowerDesc.includes(r.keyword.toLowerCase()));
      
      if (match) {
          // Update category if found and different
          if (categoryId !== match.category_id) {
              setCategoryId(match.category_id);
          }
      }
  }, [description, smartRules]);

  // Effect para recalcular parcelas
  useEffect(() => {
    if (isSmartCalc && hasInterest && monthlyInterestRate && amount && installments > 0) {
        const amountStr = String(amount);
        const principal = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        const rateStr = String(monthlyInterestRate);
        const rate = parseFloat(rateStr.replace(',', '.')) / 100;
        
        if (!isNaN(principal) && !isNaN(rate) && principal > 0) {
            // Tabela Price: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
            const pmt = principal * ( (rate * Math.pow(1+rate, installments)) / (Math.pow(1+rate, installments) - 1) );
            
            const total = pmt * installments;
            
            setCalculatedInstallment(pmt);
            setTotalWithInterest(total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
    }
  }, [amount, monthlyInterestRate, installments, isSmartCalc, hasInterest]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value === "") { setAmount(""); return; }
    const numericValue = parseFloat(value) / 100;
    setAmount(numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleTotalInterestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSmartCalc) return; 
    let value = e.target.value.replace(/\D/g, "");
    if (value === "") { setTotalWithInterest(""); return; }
    const numericValue = parseFloat(value) / 100;
    setTotalWithInterest(numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const showNotification = (message: string) => {
      if ("Notification" in window && Notification.permission === "granted") {
          new Notification("FinControl Alerta", { body: message, icon: '/vite.svg' });
      } else {
          // Toast or simple alert logic handled by calling code if needed
      }
  };

  const handleSave = async () => {
    if (!amount || !description || !walletId) { setSaveError('Preencha valor, descrição e conta.'); return; }
    if (type !== 'transfer' && !categoryId) { setSaveError('Selecione uma categoria.'); return; }
    
    setIsSubmitting(true);
    setSaveError('');

    let cleanAmount = 0;
    let financingData = undefined;

    // Helper safely converting string amount to float
    const parseAmount = (val: string | number) => {
       if (typeof val === 'number') return val;
       if (typeof val !== 'string') return 0;
       return parseFloat(val.replace(/\./g, '').replace(',', '.'));
    };

    if (isSmartCalc && hasInterest && calculatedInstallment > 0) {
        cleanAmount = calculatedInstallment;
        financingData = {
            interestRate: parseFloat(String(monthlyInterestRate).replace(',', '.')),
            loanAmount: parseAmount(amount),
            totalInterest: (calculatedInstallment * installments) - parseAmount(amount)
        };
    } else if (hasInterest && totalWithInterest) {
        cleanAmount = parseAmount(totalWithInterest);
    } else {
        cleanAmount = parseAmount(amount);
    }
    
    let customIcon = undefined;
    if (installments > 1 && !isFixed) {
        if (installmentType === 'car') customIcon = 'directions_car';
        else if (installmentType === 'house') customIcon = 'home';
        else if (installmentType === 'loan') customIcon = 'account_balance';
    }

    try {
        let result;
        if (type === 'transfer') {
            const walletDestName = wallets.find(w => w.id === destinationWalletId)?.name || 'Conta';
            const walletOriginName = wallets.find(w => w.id === walletId)?.name || 'Conta';
            
            // Add via Context
            await addTransaction({
                title: description, subtitle: `Para: ${walletDestName}`, amount: cleanAmount, type: 'expense',
                date, categoryId: '', walletId: walletId, paymentMethodId: methodId,
                isFixed: false, installments: 1
            });
            result = await addTransaction({
                title: description, subtitle: `De: ${walletOriginName}`, amount: cleanAmount, type: 'income',
                date, categoryId: '', walletId: destinationWalletId, paymentMethodId: methodId,
                isFixed: false, installments: 1
            });
        } else {
            const walletOriginName = wallets.find(w => w.id === walletId)?.name || 'Conta';
            result = await addTransaction({
                title: description,
                subtitle: isFixed ? 'Conta Fixa Mensal' : installments > 1 ? `Parcelado em ${installments}x` : walletOriginName,
                amount: cleanAmount,
                type: type as 'income' | 'expense',
                date, categoryId, walletId, paymentMethodId: methodId,
                isFixed, installments,
                icon: customIcon,
                financingDetails: financingData
            });
        }

        if (result && result.alerts && result.alerts.length > 0) result.alerts.forEach(msg => showNotification(msg));
        if (navigator.vibrate) navigator.vibrate(50);
        navigate('/dashboard');
    } catch (error) {
        console.error(error);
        setIsSubmitting(false);
        setSaveError('Erro ao salvar. Tente novamente.');
    }
  };

  const handleCreateCategory = () => navigate('/categories', { state: { openCreateModal: true, contextType: type, returnToTransaction: true, draft: { type, amount, description, categoryId, date, walletId, destinationWalletId, methodId } } });
  const handleManageWallets = () => navigate('/wallets', { state: { returnTo: '/add', draft: { type, amount, description, categoryId, date, walletId, destinationWalletId, methodId } } });
  const handleManageMethods = () => navigate('/methods', { state: { returnTo: '/add', draft: { type, amount, description, categoryId, date, walletId, destinationWalletId, methodId } } });

  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both');

  // Safer Calc for display
  const getDisplayTotal = () => {
      try {
        if (hasInterest && totalWithInterest && !isSmartCalc) {
            return parseFloat(totalWithInterest.replace(/\./g, '').replace(',', '.'));
        }
        return parseFloat(String(amount).replace(/\./g, '').replace(',', '.') || '0');
      } catch (e) { return 0; }
  };
  const finalTotalManual = getDisplayTotal();
  const installmentValueManual = installments > 0 ? finalTotalManual / installments : 0;

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col mx-auto bg-background-light dark:bg-background-dark">
      <header className="flex items-center px-4 py-4 pt-6 justify-between sticky top-0 z-10 bg-background-light dark:bg-background-dark">
        <button onClick={() => navigate('/dashboard')} className="flex w-16 text-primary/80 hover:text-primary transition-colors font-medium">Cancelar</button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold">{type === 'transfer' ? 'Transferência' : 'Nova Transação'}</h2>
        <div className="w-16"></div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 pb-6 gap-6 overflow-y-auto no-scrollbar">
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium p-3 rounded-xl flex items-center gap-2 animate-[fade-in_0.3s]">
             <span className="material-symbols-outlined text-[20px]">error</span>
             {saveError}
          </div>
        )}

        <div className="flex h-12 w-full rounded-xl bg-slate-200 dark:bg-[#232f48] p-1 relative">
          <div className={`absolute top-1 bottom-1 w-[calc(33.3%-2px)] bg-white dark:bg-[#1A2231] rounded-lg shadow-sm transition-all duration-300 ease-out`} style={{ left: type === 'income' ? '4px' : type === 'expense' ? 'calc(33.3% + 2px)' : 'calc(66.6%)' }}></div>
          <button onClick={() => setType('income')} className={`flex-1 flex items-center justify-center gap-1 z-10 font-bold text-xs sm:text-sm transition-colors ${type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">arrow_downward</span> Receita</button>
          <button onClick={() => setType('expense')} className={`flex-1 flex items-center justify-center gap-1 z-10 font-bold text-xs sm:text-sm transition-colors ${type === 'expense' ? 'text-red-500 dark:text-red-400' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">arrow_upward</span> Despesa</button>
          <button onClick={() => setType('transfer')} className={`flex-1 flex items-center justify-center gap-1 z-10 font-bold text-xs sm:text-sm transition-colors ${type === 'transfer' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">sync_alt</span> Transf.</button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Valor {hasInterest && isSmartCalc ? 'Financiado' : hasInterest ? 'Original' : 'Total'}</span>
          <div className="flex items-center gap-1">
            <span className={`text-3xl font-bold ${type === 'income' ? 'text-green-500' : type === 'transfer' ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>R$</span>
            <input autoFocus type="text" inputMode="numeric" placeholder="0,00" value={amount} onChange={handleAmountChange} className={`bg-transparent border-none text-center p-0 text-5xl font-extrabold focus:ring-0 w-full max-w-[280px] ${type === 'income' ? 'text-green-500 placeholder:text-green-500/30' : type === 'transfer' ? 'text-blue-500 placeholder:text-blue-500/30' : 'text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700'}`} />
          </div>
          
          {installments > 1 && amount && (
             <span className="text-xs text-primary font-bold mt-2 bg-primary/10 px-2 py-1 rounded animate-[fade-in_0.3s]">
                {installments}x de R$ {(isSmartCalc ? calculatedInstallment : installmentValueManual).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
             </span>
          )}
        </div>

        <div className="flex flex-col gap-4 bg-white dark:bg-[#1A2231] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-transparent">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">description</span></div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 font-bold block mb-1">Descrição</label>
              <input type="text" placeholder={type === 'transfer' ? "Ex: Transf. Poupança" : "Ex: Supermercado"} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-300 focus:ring-0" />
            </div>
          </div>

          {type !== 'transfer' && (
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">category</span></div>
                <div className="flex-1">
                <label className="text-xs text-slate-400 font-bold block mb-1">Categoria</label>
                <select value={categoryId} onChange={(e) => e.target.value === 'NEW' ? handleCreateCategory() : setCategoryId(e.target.value)} className="w-full bg-transparent border-none p-0 pr-8 text-base font-medium text-slate-900 dark:text-white focus:ring-0 cursor-pointer">
                    <option value="" disabled className="dark:bg-[#1A2231]">Selecione</option>
                    <option value="NEW" className="font-bold text-primary dark:bg-[#1A2231]">+ Criar nova</option>
                    {filteredCategories.map(cat => <option key={cat.id} value={cat.id} className="dark:bg-[#1A2231]">{cat.name}</option>)}
                </select>
                </div>
            </div>
          )}

          <div className={`flex items-center gap-4 ${type !== 'transfer' ? 'border-b border-slate-100 dark:border-slate-800/50 pb-4' : ''}`}>
             <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">calendar_today</span></div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 font-bold block mb-1">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-none p-0 text-base font-medium text-slate-900 dark:text-white focus:ring-0" />
            </div>
          </div>

          {type === 'transfer' ? (
             <div className="flex flex-col gap-4 pt-2">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">output</span></div>
                    <div className="flex-1">
                        <label className="text-xs text-slate-400 font-bold block mb-1">De (Sai de)</label>
                        <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full bg-transparent border-none p-0 pr-8 text-base font-medium text-slate-900 dark:text-white focus:ring-0 cursor-pointer">
                            {wallets.filter(w => w.type !== 'cash').map(w => <option key={w.id} value={w.id} className="dark:bg-[#1A2231]">{w.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">input</span></div>
                    <div className="flex-1">
                        <label className="text-xs text-slate-400 font-bold block mb-1">Para (Entra em)</label>
                        <select value={destinationWalletId} onChange={(e) => setDestinationWalletId(e.target.value)} className="w-full bg-transparent border-none p-0 pr-8 text-base font-medium text-slate-900 dark:text-white focus:ring-0 cursor-pointer">
                            <option value="" disabled className="dark:bg-[#1A2231]">Selecione</option>
                            {wallets.filter(w => w.id !== walletId && w.type !== 'cash').map(w => <option key={w.id} value={w.id} className="dark:bg-[#1A2231]">{w.name}</option>)}
                        </select>
                    </div>
                </div>
             </div>
          ) : (
            <>
                <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">account_balance_wallet</span></div>
                    <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400 font-bold">Conta / Carteira</label>
                        <button onClick={handleManageWallets} className="text-[10px] text-primary font-bold uppercase hover:underline">Gerenciar</button>
                    </div>
                    <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full bg-transparent border-none p-0 pr-8 text-base font-medium text-slate-900 dark:text-white focus:ring-0 cursor-pointer">
                        {wallets.map(w => <option key={w.id} value={w.id} className="dark:bg-[#1A2231]">{w.name}</option>)}
                    </select>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#232f48] flex items-center justify-center text-slate-500"><span className="material-symbols-outlined">payments</span></div>
                    <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-400 font-bold">Método</label>
                        <button onClick={handleManageMethods} className="text-[10px] text-primary font-bold uppercase hover:underline">Gerenciar</button>
                    </div>
                    <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className="w-full bg-transparent border-none p-0 pr-8 text-base font-medium text-slate-900 dark:text-white focus:ring-0 cursor-pointer">
                        {methods.map(m => <option key={m.id} value={m.id} className="dark:bg-[#1A2231]">{m.name}</option>)}
                    </select>
                    </div>
                </div>
            </>
          )}
        </div>

        {/* --- Advanced Options --- */}
        {type === 'expense' && (
            <div className="bg-white dark:bg-[#1A2231] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-transparent">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full text-sm font-bold text-slate-500 hover:text-primary transition-colors">
                    <span className="flex items-center gap-2"><span className="material-symbols-outlined">tune</span> Opções Avançadas</span>
                    <span className="material-symbols-outlined">{showAdvanced ? 'expand_less' : 'expand_more'}</span>
                </button>
                
                {showAdvanced && (
                    <div className="mt-4 flex flex-col gap-4 animate-[fade-in_0.3s]">
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232f48]">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold dark:text-white">Conta Fixa Mensal</span>
                                <span className="text-[10px] text-slate-400">Repetir todo mês</span>
                            </div>
                            <button 
                                onClick={() => { setIsFixed(!isFixed); if(!isFixed) { setInstallments(1); setHasInterest(false); setIsSmartCalc(false); } }} 
                                className={`w-11 h-6 rounded-full relative transition-colors ${isFixed ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isFixed ? 'translate-x-5' : ''}`}></div>
                            </button>
                        </div>

                        {!isFixed && (
                            <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Tipo de Parcelamento</label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {INSTALLMENT_TYPES.map(t => (
                                            <button 
                                                key={t.id} 
                                                onClick={() => {
                                                    setInstallmentType(t.id);
                                                    if(t.id !== 'card') { setIsSmartCalc(true); setHasInterest(true); } else { setIsSmartCalc(false); setHasInterest(false); }
                                                }}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${installmentType === t.id ? 'bg-primary text-white border-primary' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Quantidade de Parcelas</label>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 relative">
                                        <div className="flex-1">
                                            <input type="number" min="1" max="420" value={installments} onChange={e => { const val = parseInt(e.target.value); setInstallments(isNaN(val) || val < 1 ? 1 : val); }} className="w-full bg-transparent border-none text-center font-bold text-lg dark:text-white p-2 focus:ring-0" />
                                        </div>
                                        <div className="flex gap-1 pr-1">
                                            {[12, 24, 48, 60].map(n => <button key={n} onClick={() => setInstallments(n)} className="w-8 h-8 rounded-lg bg-white dark:bg-[#1A2231] text-xs font-bold text-slate-500 shadow-sm hover:text-primary">{n}</button>)}
                                        </div>
                                    </div>
                                </div>

                                {isSmartCalc && (
                                    <div className="animate-[fade-in_0.3s] p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="material-symbols-outlined text-blue-500">calculate</span>
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase">Calculadora Inteligente</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Taxa Juros (% a.m.)</label>
                                                <input type="text" inputMode="decimal" placeholder="Ex: 1,5" value={monthlyInterestRate} onChange={e => setMonthlyInterestRate(e.target.value)} className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border-none text-center font-bold dark:text-white shadow-sm focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor Parcela</label>
                                                <div className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-center font-bold text-slate-600 dark:text-slate-300">
                                                    R$ {calculatedInstallment.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isSmartCalc ? 'Valor Total Final (Calculado)' : 'Tem Juros?'}</label>
                                        {!isSmartCalc && (
                                            <button onClick={() => setHasInterest(!hasInterest)} className={`w-9 h-5 rounded-full relative transition-colors ${hasInterest ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${hasInterest ? 'translate-x-4' : ''}`}></div>
                                            </button>
                                        )}
                                    </div>
                                    {hasInterest && (
                                        <div className="animate-[fade-in_0.3s]">
                                            <div className={`flex items-center gap-2 rounded-xl p-3 border-2 ${isSmartCalc ? 'bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-blue-900/30' : 'bg-slate-100 dark:bg-slate-800 border-primary/20'}`}>
                                                <span className="text-xs font-bold text-slate-500 uppercase">Valor Final:</span>
                                                <div className="flex-1 flex items-center gap-1">
                                                    <span className="text-sm font-bold text-primary">R$</span>
                                                    <input type="text" inputMode="numeric" placeholder="0,00" value={totalWithInterest} onChange={handleTotalInterestChange} readOnly={isSmartCalc} className={`w-full bg-transparent border-none p-0 text-lg font-bold text-slate-900 dark:text-white focus:ring-0 ${isSmartCalc ? 'opacity-80' : ''}`} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        <button 
          onClick={handleSave} 
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl shadow-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-auto ${type === 'income' ? 'bg-green-600 shadow-green-600/30' : type === 'transfer' ? 'bg-blue-600 shadow-blue-600/30' : 'bg-red-500 shadow-red-500/30'}`}
        >
          {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><span className="material-symbols-outlined">check</span> Confirmar</>}
        </button>
      </main>
    </div>
  );
};

export default AddTransactionScreen;
