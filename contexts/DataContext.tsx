
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../services/database';
import { Transaction, Category, Wallet, PaymentMethod, FinancialGoal, DashboardMetrics, MonthlyInsight, BudgetReport } from '../types';
import { googleDriveService } from '../services/googleDriveService';

interface DataContextType {
  // Data
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  methods: PaymentMethod[];
  goals: FinancialGoal[];
  
  // Derived Data (Metrics)
  dashboardMetrics: DashboardMetrics | null;
  monthlyInsights: MonthlyInsight | null;
  
  // Status
  loading: boolean;
  refreshing: boolean;
  
  // Actions
  refreshData: () => Promise<void>;
  addTransaction: (tx: any) => Promise<{ success: boolean; alerts?: string[] }>;
  updateCategory: (cat: Category) => Promise<boolean>;
  updateWallet: (wallet: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<boolean>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- DATA FETCHING ---
  const loadAllData = useCallback(async () => {
    try {
      if (!db.isAuthenticated()) {
          console.warn("User not authenticated during data load");
          return;
      }

      const [txs, cats, wals, mets, gls] = await Promise.all([
        db.getTransactions().catch(e => { console.error("Error fetching transactions", e); return []; }),
        db.getCategories().catch(e => { console.error("Error fetching categories", e); return []; }),
        db.getWallets().catch(e => { console.error("Error fetching wallets", e); return []; }),
        db.getPaymentMethods().catch(e => { console.error("Error fetching methods", e); return []; }),
        db.getGoals().catch(e => { console.error("Error fetching goals", e); return []; })
      ]);
      
      setTransactions(txs);
      setCategories(cats);
      setWallets(wals);
      setMethods(mets);
      setGoals(gls);
    } catch (error) {
      console.error("Critical Data Load Error:", error);
    }
  }, []);

  const init = async () => {
    setLoading(true);
    await loadAllData();
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  useEffect(() => {
    // Only fetch if authenticated, otherwise stop loading immediately
    if (db.isAuthenticated()) {
        init().catch(() => setLoading(false));
    } else {
        setLoading(false);
    }
  }, []);

  // --- AUTOMATIC BACKUP TRIGGER ---
  const triggerAutoBackup = async () => {
      // 1. Check if enabled
      const isEnabled = localStorage.getItem('fincontrol_auto_backup') === 'true';
      if (!isEnabled) return;

      // 2. Check if token valid
      if (!googleDriveService.isAuthenticated()) return;

      // 3. Upload silently
      try {
          const json = await db.createFullBackup();
          const filename = `FinControl_AutoBackup_${new Date().toISOString().split('T')[0]}.json`;
          console.log("Triggering auto-backup...");
          await googleDriveService.uploadFile(json, filename);
      } catch (e) {
          console.warn("Auto backup failed silently", e);
      }
  };

  // --- ACTIONS WITH OPTIMISTIC UPDATES ---

  const addTransaction = async (txData: any) => {
    const result = await db.addTransaction(txData);
    if (result.success) {
        await loadAllData(); // Ensure state is updated before resolving
        // Trigger Backup after state update
        triggerAutoBackup();
    }
    return result;
  };

  const updateCategory = async (cat: Category) => {
    setCategories(prev => {
        const index = prev.findIndex(c => c.id === cat.id);
        if (index >= 0) {
            const newCats = [...prev];
            newCats[index] = cat;
            return newCats;
        }
        return [...prev, cat];
    });

    const result = await db.saveCategory(cat);
    if (!result.success) {
        await loadAllData(); 
        return false;
    }
    if (!cat.id) await loadAllData();
    triggerAutoBackup();
    return true;
  };

  const updateWallet = async (wallet: Partial<Wallet>) => {
      setWallets(prev => {
          if (wallet.id) return prev.map(w => w.id === wallet.id ? { ...w, ...wallet } : w);
          return prev; 
      });
      await db.saveWallet(wallet);
      await loadAllData();
      triggerAutoBackup();
  };

  const deleteWallet = async (id: string) => {
      const originalWallets = [...wallets];
      setWallets(prev => prev.filter(w => w.id !== id)); 
      
      const { success } = await db.deleteWallet(id);
      if (!success) {
          setWallets(originalWallets); 
          return false;
      }
      triggerAutoBackup();
      return true;
  };

  // --- DERIVED METRICS (MEMOIZED) ---
  const dashboardMetrics = useMemo(() => {
    if (loading && transactions.length === 0) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    let balance = 0, income = 0, expense = 0;
    let lastMonthIncome = 0, lastMonthExpense = 0;
    let yearIncome = 0, yearExpense = 0;
    
    const categoryExpenses: Record<string, number> = {};
    const expenseFrequency: Record<string, {count: number, amount: number, categoryId: string}> = {};

    // Get Today in YYYY-MM-DD local
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const adjustedDate = new Date(tDate.getTime() + tDate.getTimezoneOffset() * 60000);
        
        // Use string comparison for exact date match or prior
        if (t.date <= todayStr) {
            if (t.type === 'income') balance += t.amount; else balance -= t.amount;
        }

        if (adjustedDate.getMonth() === currentMonth && adjustedDate.getFullYear() === currentYear) {
            if (t.type === 'income') income += t.amount;
            else {
                expense += t.amount;
                if (t.categoryId) categoryExpenses[t.categoryId] = (categoryExpenses[t.categoryId] || 0) + t.amount;
            }
        }

        if (adjustedDate.getMonth() === lastMonthDate.getMonth() && adjustedDate.getFullYear() === lastMonthDate.getFullYear()) {
            if (t.type === 'income') lastMonthIncome += t.amount; else lastMonthExpense += t.amount;
        }

        if (adjustedDate.getFullYear() === currentYear) {
            if (t.type === 'income') yearIncome += t.amount;
            else {
                yearExpense += t.amount;
                const key = t.title.toLowerCase().trim();
                if (!expenseFrequency[key]) expenseFrequency[key] = { count: 0, amount: t.amount, categoryId: t.categoryId || '' };
                expenseFrequency[key].count++;
            }
        }
    });

    const monthVariationIncome = lastMonthIncome === 0 ? 0 : ((income - lastMonthIncome) / lastMonthIncome) * 100;
    const monthVariationExpense = lastMonthExpense === 0 ? 0 : ((expense - lastMonthExpense) / lastMonthExpense) * 100;
    
    let financialHealth: DashboardMetrics['financialHealth'] = 'stable';
    const ratio = expense > 0 ? income / expense : 2;
    if (ratio >= 1.2) financialHealth = 'excellent';
    else if (ratio >= 1.05) financialHealth = 'good';
    else if (ratio >= 0.9) financialHealth = 'stable';
    else financialHealth = 'critical';

    const topExpenses = Object.entries(expenseFrequency)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 3)
        .map(([title, data]) => ({ 
            title: title.charAt(0).toUpperCase() + title.slice(1), 
            count: data.count, 
            categoryId: data.categoryId, 
            amount: data.amount 
        }));

    const lastTransaction = transactions.find(t => t.date <= todayStr) || null;

    return {
        balance, income, expense,
        monthVariationIncome, monthVariationExpense,
        projectedBalance: balance * 1.05,
        financialHealth,
        yearlySavings: yearIncome - yearExpense,
        lastTransaction,
        topExpenses
    };
  }, [transactions, loading]);

  const monthlyInsights = useMemo(() => {
      if (!dashboardMetrics) return null;
      
      const now = new Date();
      const currentMonthTxs = transactions.filter(t => {
          const d = new Date(t.date);
          const adj = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
          return t.type === 'expense' && adj.getMonth() === now.getMonth() && adj.getFullYear() === now.getFullYear();
      });
      
      const biggestExpense = currentMonthTxs.length > 0 ? currentMonthTxs.reduce((prev, current) => (prev.amount > current.amount) ? prev : current) : null;

      const catTotals: Record<string, number> = {};
      currentMonthTxs.forEach(t => {
          if(t.categoryId) catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
      });
      
      let topCatEntry = Object.entries(catTotals).sort(([,a], [,b]) => b - a)[0];
      let topCategory = null;
      if (topCatEntry) {
          const cat = categories.find(c => c.id === topCatEntry[0]);
          if (cat) topCategory = { name: cat.name, total: topCatEntry[1], color: cat.colorClass };
      }

      return {
          savings: dashboardMetrics.income - dashboardMetrics.expense,
          biggestExpense,
          topCategory
      };
  }, [dashboardMetrics, transactions, categories]);

  return (
    <DataContext.Provider value={{
      transactions, categories, wallets, methods, goals,
      dashboardMetrics, monthlyInsights,
      loading, refreshing,
      refreshData, addTransaction, updateCategory, updateWallet, deleteWallet
    }}>
      {children}
    </DataContext.Provider>
  );
};
