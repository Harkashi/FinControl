import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../services/database';
import { Transaction, Category, Wallet, PaymentMethod, FinancialGoal, DashboardMetrics, MonthlyInsight, BudgetReport } from '../types';

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
      const [txs, cats, wals, mets, gls] = await Promise.all([
        db.getTransactions(),
        db.getCategories(),
        db.getWallets(),
        db.getPaymentMethods(),
        db.getGoals()
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
    if (db.isAuthenticated()) {
        init();
    }
  }, []);

  // --- ACTIONS WITH OPTIMISTIC UPDATES ---

  const addTransaction = async (txData: any) => {
    // 1. Optimistic UI: We assume success and update local state immediately (if simple)
    // Note: Since addTransaction in DB handles installments logic (complex), 
    // we'll rely on the DB return for the full update, but trigger a silent background refresh.
    
    // Call DB
    const result = await db.addTransaction(txData);
    
    if (result.success) {
        // Background Refresh to get the new ID and any generated installments
        loadAllData(); 
    }
    return result;
  };

  const updateCategory = async (cat: Category) => {
    // Optimistic
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
        // Revert on failure (implied: would need previous state, simplified here)
        console.error("Failed to save category");
        await loadAllData(); // Force sync
        return false;
    }
    // Sync to ensure IDs are correct if new
    if (!cat.id) await loadAllData();
    return true;
  };

  const updateWallet = async (wallet: Partial<Wallet>) => {
      // Optimistic
      setWallets(prev => {
          if (wallet.id) return prev.map(w => w.id === wallet.id ? { ...w, ...wallet } : w);
          return prev; // Can't optimistically add without ID easily
      });
      await db.saveWallet(wallet);
      await loadAllData();
  };

  const deleteWallet = async (id: string) => {
      const originalWallets = [...wallets];
      setWallets(prev => prev.filter(w => w.id !== id)); // Immediate remove
      
      const { success } = await db.deleteWallet(id);
      if (!success) {
          setWallets(originalWallets); // Revert
          return false;
      }
      return true;
  };

  // --- DERIVED METRICS (MEMOIZED) ---
  // Replaces the heavy "getDashboardMetrics" DB call by calculating client-side from the loaded transactions
  const dashboardMetrics = useMemo(() => {
    if (loading || transactions.length === 0) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    let balance = 0, income = 0, expense = 0;
    let lastMonthIncome = 0, lastMonthExpense = 0;
    let yearIncome = 0, yearExpense = 0;
    
    // Frequency Maps
    const categoryExpenses: Record<string, number> = {};
    const expenseFrequency: Record<string, {count: number, amount: number, categoryId: string}> = {};

    // Single Pass Loop for Performance
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        // Fix timezone offset for accurate daily bucketing
        const adjustedDate = new Date(tDate.getTime() + tDate.getTimezoneOffset() * 60000);
        
        // 1. Total Balance (History Only)
        if (t.date <= now.toISOString().split('T')[0]) {
            if (t.type === 'income') balance += t.amount; else balance -= t.amount;
        }

        // 2. Current Month Stats
        if (adjustedDate.getMonth() === currentMonth && adjustedDate.getFullYear() === currentYear) {
            if (t.type === 'income') income += t.amount;
            else {
                expense += t.amount;
                if (t.categoryId) categoryExpenses[t.categoryId] = (categoryExpenses[t.categoryId] || 0) + t.amount;
            }
        }

        // 3. Last Month Stats
        if (adjustedDate.getMonth() === lastMonthDate.getMonth() && adjustedDate.getFullYear() === lastMonthDate.getFullYear()) {
            if (t.type === 'income') lastMonthIncome += t.amount; else lastMonthExpense += t.amount;
        }

        // 4. Yearly Stats & Freq
        if (adjustedDate.getFullYear() === currentYear) {
            if (t.type === 'income') yearIncome += t.amount;
            else {
                yearExpense += t.amount;
                // Frequency
                const key = t.title.toLowerCase().trim();
                if (!expenseFrequency[key]) expenseFrequency[key] = { count: 0, amount: t.amount, categoryId: t.categoryId || '' };
                expenseFrequency[key].count++;
            }
        }
    });

    const monthVariationIncome = lastMonthIncome === 0 ? 0 : ((income - lastMonthIncome) / lastMonthIncome) * 100;
    const monthVariationExpense = lastMonthExpense === 0 ? 0 : ((expense - lastMonthExpense) / lastMonthExpense) * 100;
    
    // Health logic
    let financialHealth: DashboardMetrics['financialHealth'] = 'stable';
    const ratio = expense > 0 ? income / expense : 2;
    if (ratio >= 1.2) financialHealth = 'excellent';
    else if (ratio >= 1.05) financialHealth = 'good';
    else if (ratio >= 0.9) financialHealth = 'stable';
    else financialHealth = 'critical';

    // Top Expenses
    const topExpenses = Object.entries(expenseFrequency)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 3)
        .map(([title, data]) => ({ 
            title: title.charAt(0).toUpperCase() + title.slice(1), 
            count: data.count, 
            categoryId: data.categoryId, 
            amount: data.amount 
        }));

    // Find Last Transaction (History)
    const lastTransaction = transactions.find(t => t.date <= now.toISOString().split('T')[0]) || null;

    return {
        balance, income, expense,
        monthVariationIncome, monthVariationExpense,
        projectedBalance: balance * 1.05, // Simple projection
        financialHealth,
        yearlySavings: yearIncome - yearExpense,
        lastTransaction,
        topExpenses
    };
  }, [transactions, loading]);

  const monthlyInsights = useMemo(() => {
      if (!dashboardMetrics) return null;
      
      // Find biggest expense in current month
      const now = new Date();
      const currentMonthTxs = transactions.filter(t => {
          const d = new Date(t.date);
          const adj = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
          return t.type === 'expense' && adj.getMonth() === now.getMonth() && adj.getFullYear() === now.getFullYear();
      });
      
      const biggestExpense = currentMonthTxs.length > 0 ? currentMonthTxs.reduce((prev, current) => (prev.amount > current.amount) ? prev : current) : null;

      // Find top category
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
