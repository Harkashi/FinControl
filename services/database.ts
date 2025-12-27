import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Transaction, Category, User, UserProfile, NotificationSettings, SmartRule, UserStats, DashboardMetrics, MonthlyInsight, Wallet, PaymentMethod, BudgetReport, FinancialGoal } from '../types';

// --- CONFIGURAÇÃO DO SUPABASE ---
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  return '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://dpylbmgtgajjubnncyrh.supabase.co'; 
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_lFxqA6ONs4Oh8fMkx5cBlg_S2F2IDP2';

// Seeds omitidos para brevidade (mantidos iguais ao original)
const DEFAULT_CATEGORY_SEEDS = [
  { name: 'Alimentação', description: 'Restaurantes e mercado', icon: 'restaurant', color_class: 'text-orange-600 dark:text-orange-400', bg_class: 'bg-orange-100 dark:bg-orange-500/20', category_type: 'expense' },
  { name: 'Transporte', description: 'Uber, Combustível', icon: 'directions_bus', color_class: 'text-blue-600 dark:text-blue-400', bg_class: 'bg-blue-100 dark:bg-blue-500/20', category_type: 'expense' },
  { name: 'Lazer', description: 'Cinema, Streaming', icon: 'sports_esports', color_class: 'text-purple-600 dark:text-purple-400', bg_class: 'bg-purple-100 dark:bg-purple-500/20', category_type: 'expense' },
  { name: 'Moradia', description: 'Aluguel, Contas', icon: 'home', color_class: 'text-green-600 dark:text-green-400', bg_class: 'bg-green-100 dark:bg-green-500/20', category_type: 'expense' },
  { name: 'Salário', description: 'Renda mensal', icon: 'work', color_class: 'text-emerald-600 dark:text-emerald-400', bg_class: 'bg-emerald-100 dark:bg-emerald-500/20', category_type: 'income' },
  { name: 'Investimentos', description: 'Rendimentos', icon: 'trending_up', color_class: 'text-cyan-600 dark:text-cyan-400', bg_class: 'bg-cyan-100 dark:bg-cyan-500/20', category_type: 'both' },
];

const DEFAULT_WALLETS = [
  { name: 'Conta Principal', type: 'account', is_default: true, order: 0 },
  { name: 'Poupança', type: 'savings', is_default: false, order: 1 },
  { name: 'Dinheiro Físico', type: 'cash', is_default: false, order: 2 },
];

const DEFAULT_METHODS = [
  { name: 'Débito', order: 0 },
  { name: 'Crédito', order: 1 },
  { name: 'Pix', order: 2 },
  { name: 'Dinheiro', order: 3 },
  { name: 'Boleto', order: 4 },
];

export interface RichTransaction {
  date: string;
  dateFormatted: string;
  title: string;
  amount: number;
  type: 'Receita' | 'Despesa';
  categoryName: string;
  walletName: string;
  methodName: string;
  isInstallment: boolean; // Novo
  installmentInfo: string; // Novo ex: "2/10"
}

// Helper para UUID v4 (simplificado)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper para extrair metadados do subtítulo (Hack para persistência sem migration)
const SEPARATOR = '|||';
function parseSubtitle(rawSubtitle: string | null) {
    if (!rawSubtitle) return { text: '', meta: undefined };
    if (!rawSubtitle.includes(SEPARATOR)) return { text: rawSubtitle, meta: undefined };
    
    const parts = rawSubtitle.split(SEPARATOR);
    const text = parts[0].trim();
    let meta = undefined;
    try {
        meta = JSON.parse(parts[1]);
    } catch (e) {
        // Ignora erro de parse silenciosamente
    }
    return { text, meta };
}

class DatabaseService {
  public supabase: SupabaseClient;
  private currentUser: User | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.initAuth();
  }

  // --- AUTH METHODS (Mantidos) ---
  private async initAuth() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user) {
      this.currentUser = this.mapSupabaseUser(data.session.user);
    }
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser = session?.user ? this.mapSupabaseUser(session.user) : null;
    });
  }

  private mapSupabaseUser(sbUser: SupabaseUser): User {
    return {
      id: sbUser.id,
      name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Usuário',
      email: sbUser.email || '',
    };
  }

  async registerUser(name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> {
    const { data, error } = await this.supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return { success: false, message: error.message };
    if (data.user) {
      this.currentUser = this.mapSupabaseUser(data.user);
      await this.ensureProfileExists();
      return { success: true };
    }
    return { success: false, message: 'Erro desconhecido.' };
  }

  async loginUser(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, message: 'Credenciais inválidas.' };
    if (data.user) {
      this.currentUser = this.mapSupabaseUser(data.user);
      return { success: true };
    }
    return { success: false, message: 'Erro ao entrar.' };
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.currentUser = null;
  }
  
  isAuthenticated(): boolean { return !!this.currentUser; }
  getCurrentUser(): User | null { return this.currentUser; }

  async checkSession(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user) {
      this.currentUser = this.mapSupabaseUser(data.session.user);
      return true;
    }
    return false;
  }

  // --- SEEDING & PROFILE ---
  async ensureProfileExists(): Promise<void> {
    if (!this.currentUser) return;
    const { data } = await this.supabase.from('profiles').select('id').eq('id', this.currentUser.id).single();
    if (!data) {
      await this.supabase.from('profiles').insert({ id: this.currentUser.id, email: this.currentUser.email });
      await this.supabase.from('notification_settings').insert({ user_id: this.currentUser.id });
      await this.seedDefaultCategories();
    }
  }

  private async seedDefaultCategories() {
    if (!this.currentUser) return;
    const payload = DEFAULT_CATEGORY_SEEDS.map(c => ({ user_id: this.currentUser!.id, ...c }));
    await this.supabase.from('categories').insert(payload);
  }
  private async seedDefaultWallets() {
    if (!this.currentUser) return;
    const payload = DEFAULT_WALLETS.map(w => ({ user_id: this.currentUser!.id, ...w }));
    await this.supabase.from('wallets').insert(payload);
  }
  private async seedDefaultMethods() {
    if (!this.currentUser) return;
    const payload = DEFAULT_METHODS.map(m => ({ user_id: this.currentUser!.id, ...m }));
    await this.supabase.from('payment_methods').insert(payload);
  }

  // --- WALLETS & METHODS ---
  private sortItems(items: any[]): any[] {
    return items.sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      return 0;
    });
  }
  private sortWallets(wallets: any[]): Wallet[] {
    return wallets.sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return 0;
    });
  }

  async getWallets(): Promise<Wallet[]> {
    if (!this.currentUser) return [];
    const { data, error } = await this.supabase.from('wallets').select('*').eq('user_id', this.currentUser.id);
    if ((!data || data.length === 0) && !error) {
      await this.seedDefaultWallets();
      const { data: newData } = await this.supabase.from('wallets').select('*').eq('user_id', this.currentUser.id);
      return this.sortWallets(newData || []);
    }
    return this.sortWallets(data || []);
  }

  async saveWallet(wallet: Partial<Wallet>): Promise<void> {
     if (!this.currentUser) return;
     const payload: any = { ...wallet, user_id: this.currentUser.id };
     if (wallet.id) await this.supabase.from('wallets').update(payload).eq('id', wallet.id);
     else {
        const existing = await this.getWallets();
        const maxOrder = existing.length > 0 ? Math.max(...existing.map(w => w.order || 0)) : 0;
        const { error } = await this.supabase.from('wallets').insert({ ...payload, order: maxOrder + 1 });
        if (error && error.message && error.message.includes('order')) {
            const { order, ...safePayload } = payload;
            await this.supabase.from('wallets').insert({ ...safePayload, user_id: this.currentUser!.id });
        }
     }
  }

  async updateWalletsOrder(wallets: Wallet[]): Promise<void> {
     if (!this.currentUser) return;
     const updates = wallets.map((w, index) => ({ id: w.id, user_id: this.currentUser!.id, name: w.name, type: w.type, is_default: w.is_default, order: index }));
     await this.supabase.from('wallets').upsert(updates);
  }

  async deleteWallet(id: string): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    await this.supabase.from('transactions').update({ wallet_id: null }).eq('wallet_id', id);
    const { error } = await this.supabase.from('wallets').delete().eq('id', id);
    return error ? { success: false, error } : { success: true };
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    if (!this.currentUser) return [];
    const { data, error } = await this.supabase.from('payment_methods').select('*').eq('user_id', this.currentUser.id);
    if ((!data || data.length === 0) && !error) {
      await this.seedDefaultMethods();
      const { data: newData } = await this.supabase.from('payment_methods').select('*').eq('user_id', this.currentUser.id);
      return this.sortItems(newData || []);
    }
    return this.sortItems(data || []);
  }

  async savePaymentMethod(method: Partial<PaymentMethod>): Promise<void> {
     if (!this.currentUser) return;
     const payload: any = { ...method, user_id: this.currentUser.id };
     if (method.id) await this.supabase.from('payment_methods').update(payload).eq('id', method.id);
     else {
         const existing = await this.getPaymentMethods();
         const maxOrder = existing.length > 0 ? Math.max(...existing.map(m => m.order || 0)) : 0;
         const { error } = await this.supabase.from('payment_methods').insert({ ...payload, order: maxOrder + 1 });
         if (error && error.message && error.message.includes('order')) {
             const { order, ...safePayload } = payload;
             await this.supabase.from('payment_methods').insert(safePayload);
         }
     }
  }

  async updatePaymentMethodsOrder(methods: PaymentMethod[]): Promise<void> {
      if (!this.currentUser) return;
      const updates = methods.map((m, index) => ({ id: m.id, user_id: this.currentUser!.id, name: m.name, order: index }));
      await this.supabase.from('payment_methods').upsert(updates);
  }

  async deletePaymentMethod(id: string): Promise<void> {
    if (!this.currentUser) return;
    await this.supabase.from('transactions').update({ payment_method_id: null }).eq('payment_method_id', id);
    await this.supabase.from('payment_methods').delete().eq('id', id);
  }

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    if (!this.currentUser) return [];
    const { data, error } = await this.supabase.from('categories').select('*').eq('user_id', this.currentUser.id);
    if (!error && (!data || data.length === 0)) {
       await this.seedDefaultCategories();
       const { data: newData } = await this.supabase.from('categories').select('*').eq('user_id', this.currentUser.id);
       return (newData || []).map(this.mapCategoryFromDB);
    }
    return (data || []).map(this.mapCategoryFromDB);
  }

  private mapCategoryFromDB(c: any): Category {
    return {
      id: c.id,
      name: c.name,
      description: c.description || '',
      icon: c.icon,
      colorClass: c.color_class || c.colorClass || 'text-gray-600',
      bgClass: c.bg_class || c.bgClass || 'bg-gray-100',
      type: c.category_type || 'both',
      budget: c.budget_limit || 0 
    };
  }
  
  async updateCategoryBudget(categoryId: string, limit: number): Promise<void> {
      if (!this.currentUser) return;
      await this.supabase.from('categories').update({ budget_limit: limit }).eq('id', categoryId).eq('user_id', this.currentUser.id);
  }

  async resetAllCategoryBudgets(): Promise<void> {
      if (!this.currentUser) return;
      await this.supabase.from('categories').update({ budget_limit: 0 }).eq('user_id', this.currentUser.id);
  }

  async saveCategory(category: Category): Promise<{success: boolean, error?: any}> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    const payload = {
      user_id: this.currentUser.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color_class: category.colorClass,
      bg_class: category.bgClass,
      category_type: category.type
    };
    let error;
    if (category.id && category.id.length > 0) {
       const result = await this.supabase.from('categories').update(payload).eq('id', category.id);
       error = result.error;
    } else {
       const result = await this.supabase.from('categories').insert(payload);
       error = result.error;
    }
    return error ? { success: false, error } : { success: true };
  }
  
  async deleteCategory(id: string): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    const { error } = await this.supabase.from('categories').delete().eq('id', id);
    return error ? { success: false, error } : { success: true };
  }

  // --- GOALS (METAS) V2 ---
  async getGoals(): Promise<FinancialGoal[]> {
    if (!this.currentUser) return [];
    // Assuming table 'financial_goals' exists. If not, returns empty.
    const { data, error } = await this.supabase.from('financial_goals').select('*').eq('user_id', this.currentUser.id);
    if (error || !data) return [];
    
    return data.map((g: any) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      currentAmount: g.current_amount,
      deadline: g.deadline,
      icon: g.icon || 'savings',
      colorClass: g.color_class || 'text-blue-500'
    }));
  }

  async saveGoal(goal: Partial<FinancialGoal>): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    
    const payload: any = {
      user_id: this.currentUser.id,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount || 0,
      deadline: goal.deadline,
      icon: goal.icon,
      color_class: goal.colorClass
    };

    if (goal.id) {
       const { error } = await this.supabase.from('financial_goals').update(payload).eq('id', goal.id);
       return error ? { success: false, error } : { success: true };
    } else {
       const { error } = await this.supabase.from('financial_goals').insert(payload);
       return error ? { success: false, error } : { success: true };
    }
  }

  async deleteGoal(id: string): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    const { error } = await this.supabase.from('financial_goals').delete().eq('id', id);
    return error ? { success: false, error } : { success: true };
  }

  // --- BUDGET REPORT V2 (INTELLIGENT HUB) ---
  async getBudgetsReport(month: number, year: number): Promise<BudgetReport> {
    if (!this.currentUser) throw new Error("Not authenticated");
    const categories = await this.getCategories();
    const goals = await this.getGoals(); // Fetch goals

    // FIX: Using YYYY-MM-DD strings for date range to match DB text column accurately
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('id, title, subtitle, amount, category_id, type, is_fixed, installment_number, installment_total, icon, color_class, bg_class') 
      .eq('user_id', this.currentUser.id)
      .eq('type', 'expense') 
      .gte('date', startStr) // >= YYYY-MM-01
      .lte('date', endStr);  // <= YYYY-MM-DD

    let totalBudget = 0;
    let totalSpent = 0;
    
    // New Metrics
    let fixedCosts = 0;
    let committedInstallments = 0;
    let variableSpent = 0;
    
    // List for UI
    const activeInstallmentsList: Transaction[] = [];
    const fixedCostsList: Transaction[] = [];

    let alertCategory: Category | null = null;
    let highestRiskRatio = 0;

    // Process transactions locally to sort into buckets
    (transactions || []).forEach((t: any) => {
        // Parse metadata from subtitle if available (Financing Features)
        const { text: cleanSubtitle, meta: financingData } = parseSubtitle(t.subtitle);

        const txObj: Transaction = {
            id: t.id || uuidv4(),
            title: t.title,
            subtitle: cleanSubtitle || '',
            amount: t.amount,
            type: 'expense',
            icon: t.icon,
            colorClass: t.color_class,
            bgClass: t.bg_class,
            date: '', // Not needed for this view
            userId: this.currentUser!.id,
            installmentNumber: t.installment_number,
            installmentTotal: t.installment_total,
            isFixed: t.is_fixed,
            financingDetails: financingData
        };

        if (t.is_fixed) {
            fixedCosts += t.amount;
            fixedCostsList.push(txObj);
        } else if (t.installment_number) {
            committedInstallments += t.amount;
            txObj.subtitle = `${t.installment_number}/${t.installment_total}`;
            activeInstallmentsList.push(txObj);
        } else {
            variableSpent += t.amount;
        }
    });

    const processedCategories = categories
      .filter(c => c.type === 'expense' || c.type === 'both') 
      .map(cat => {
        const catBudget = cat.budget || 0;
        
        // Filter Transactions for this category
        const catTxs = (transactions || []).filter((t: any) => t.category_id === cat.id);
        const catSpent = catTxs.reduce((sum: number, t: any) => sum + t.amount, 0);

        totalBudget += catBudget;
        totalSpent += catSpent;

        // Risk Logic
        if (catBudget > 0) {
           const ratio = catSpent / catBudget;
           if (ratio > highestRiskRatio && ratio >= 0.9) {
              highestRiskRatio = ratio;
              alertCategory = { ...cat, spent: catSpent, budget: catBudget };
           }
        }

        return { ...cat, spent: catSpent, budget: catBudget };
      })
      .sort((a, b) => {
         const ratioA = a.budget ? a.spent! / a.budget : 0;
         const ratioB = b.budget ? b.spent! / b.budget : 0;
         return ratioB - ratioA;
      });

    // --- PACE CALCULATION ---
    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let daysPassed = 0;
    
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())) {
        daysPassed = daysInMonth; // Past month
    } else if (year === now.getFullYear() && month === now.getMonth()) {
        daysPassed = now.getDate(); // Current month
    } else {
        daysPassed = 0; // Future month
    }

    const daysPassedPct = (daysPassed / daysInMonth) * 100;
    const budgetConsumedPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const remaining = Math.max(0, totalBudget - totalSpent);

    let pace: 'slow' | 'on-track' | 'fast' | 'critical' = 'on-track';
    
    if (totalBudget > 0) {
        if (budgetConsumedPct > 95) pace = 'critical';
        else if (budgetConsumedPct > daysPassedPct + 15) pace = 'fast'; // Gastou 15% a mais do que o tempo passou
        else if (budgetConsumedPct < daysPassedPct - 10) pace = 'slow'; // Economizando
        else pace = 'on-track';
    }

    return { 
        totalBudget, 
        totalSpent, 
        remaining, 
        fixedCosts,
        committedInstallments,
        variableSpent,
        activeInstallmentsList,
        fixedCostsList,
        pace,
        daysPassedPct,
        budgetConsumedPct,
        categories: processedCategories, 
        alertCategory,
        goals
    };
  }

  // --- TRANSACTIONS V2 (BATCH INSERT & ALERTS) ---
  
  async getTransactions(): Promise<Transaction[]> {
    if (!this.currentUser) return [];
    const { data } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }); 
    
    return (data || []).map((t: any) => {
      // Decode subtitle if hidden meta exists
      const { text, meta } = parseSubtitle(t.subtitle);
      
      return {
        id: t.id,
        title: t.title,
        subtitle: text, // Only show clean text
        amount: t.amount,
        type: t.type,
        icon: t.icon,
        colorClass: t.color_class,
        bgClass: t.bg_class,
        date: t.date,
        categoryId: t.category_id,
        userId: t.user_id,
        created_at: t.created_at,
        walletId: t.wallet_id,
        paymentMethodId: t.payment_method_id,
        installmentNumber: t.installment_number,
        installmentTotal: t.installment_total,
        installmentGroupId: t.installment_group_id,
        isFixed: t.is_fixed,
        financingDetails: meta // Pass parsed meta
      };
    });
  }

  private async checkAlerts(transaction: any): Promise<string[]> {
    const alerts: string[] = [];
    const settings = await this.getNotificationSettings();
    if (!settings) return [];

    // 1. Budget Alert
    if (settings.alert_limit && transaction.type === 'expense' && transaction.category_id) {
       const categories = await this.getCategories();
       const cat = categories.find(c => c.id === transaction.category_id);
       
       if (cat && cat.budget && cat.budget > 0) {
           const now = new Date(transaction.date);
           const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
           const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

           const { data } = await this.supabase.from('transactions')
                .select('amount')
                .eq('category_id', cat.id)
                .eq('type', 'expense')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);
            
           const totalSpent = (data || []).reduce((acc, t) => acc + t.amount, 0);

           if (totalSpent > cat.budget) {
               alerts.push(`🚨 Atenção! Você excedeu o orçamento de ${cat.name}.`);
           } else if (totalSpent > cat.budget * 0.9) {
               alerts.push(`⚠️ Alerta: Você já consumiu 90% do orçamento de ${cat.name}.`);
           }
       }
    }
    return alerts;
  }

  // NOVA: Suporta Parcelas e Fixas com Financiamento
  async addTransaction(
      transaction: Omit<Transaction, 'id' | 'icon' | 'colorClass' | 'bgClass' | 'userId'> & { installments?: number, isFixed?: boolean, icon?: string }
  ): Promise<{ success: boolean, error?: any, alerts?: string[] }> {
    if (!this.currentUser) return { success: false, error: 'Usuário não autenticado' };
    
    // Auto Categorization Rule
    let categoryId = transaction.categoryId;
    if (!categoryId) {
       const { data: rules } = await this.supabase.from('smart_category_rules').select('*').eq('user_id', this.currentUser.id);
       if (rules && rules.length > 0) {
          const match = rules.find(r => transaction.title.toLowerCase().includes(r.keyword.toLowerCase()));
          if (match) categoryId = match.category_id;
       }
    }

    const categories = await this.getCategories();
    const category = categories.find(c => c.id === categoryId);
    let icon = category?.icon || 'payments';
    if (transaction.icon && transaction.icon !== 'payments') icon = transaction.icon;
    
    const colorClass = category?.colorClass || 'text-gray-600';
    const bgClass = category?.bgClass || 'bg-gray-100';

    const payloads = [];
    const installmentGroupId = transaction.installments && transaction.installments > 1 ? uuidv4() : null;
    const installments = transaction.installments || 1;
    // Se for financiamento, o amount já é o valor da parcela. Se não for, é o total dividido.
    const isFinancing = !!transaction.financingDetails;
    const baseAmount = isFinancing ? transaction.amount : (transaction.amount / installments); 

    // Encode Financing Data into subtitle (Hack)
    let baseSubtitle = transaction.subtitle;
    if (transaction.financingDetails) {
        baseSubtitle += `${SEPARATOR}${JSON.stringify(transaction.financingDetails)}`;
    }

    // Gera N transações
    for (let i = 0; i < installments; i++) {
        const dateObj = new Date(transaction.date);
        dateObj.setMonth(dateObj.getMonth() + i); // Add months
        const isoDate = dateObj.toISOString().split('T')[0];

        let title = transaction.title;
        if (installments > 1) {
            title = `${transaction.title}`;
        }

        payloads.push({
            user_id: this.currentUser.id,
            title: title,
            subtitle: baseSubtitle, // Contains hidden meta
            amount: installments > 1 ? baseAmount : transaction.amount,
            type: transaction.type,
            date: isoDate,
            category_id: categoryId,
            wallet_id: transaction.walletId,
            payment_method_id: transaction.paymentMethodId,
            icon, color_class: colorClass, bg_class: bgClass,
            // New V2 Fields
            installment_number: installments > 1 ? i + 1 : null,
            installment_total: installments > 1 ? installments : null,
            installment_group_id: installmentGroupId,
            is_fixed: transaction.isFixed || false
        });
    }
    
    // Batch Insert
    const { error } = await this.supabase.from('transactions').insert(payloads);

    if (error) return { success: false, error };

    const alerts = await this.checkAlerts({ ...transaction, category_id: categoryId });
    return { success: true, alerts };
  }

  // --- EXISTING DASHBOARD & EXPORT METHODS (Updated mapping) ---

  async getDashboardMetrics(): Promise<{ metrics: DashboardMetrics, insights: MonthlyInsight }> {
    if (!this.currentUser) throw new Error("Not authenticated");
    const txs = await this.getTransactions(); // Uses updated parser
    const categories = await this.getCategories();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let balance = 0, income = 0, expense = 0, lastMonthIncome = 0, lastMonthExpense = 0, yearIncome = 0, yearExpense = 0;
    let biggestExpenseTx: Transaction | null = null;
    let lastTx: Transaction | null = null;
    const categoryExpenses: Record<string, number> = {};
    const expenseFrequency: Record<string, {count: number, amount: number, categoryId: string}> = {};

    txs.forEach((t, index) => {
        const tDate = new Date(t.date);
        const adjustedDate = new Date(tDate.getTime() + tDate.getTimezoneOffset() * 60000);
        
        // Balance Calculation: Only count up to today
        if (t.date <= todayStr) {
            if (t.type === 'income') balance += t.amount; else balance -= t.amount;
        }

        // Logic for current month
        if (adjustedDate.getMonth() === now.getMonth() && adjustedDate.getFullYear() === now.getFullYear()) {
            if (t.type === 'income') income += t.amount;
            else {
                expense += t.amount;
                if (t.categoryId) categoryExpenses[t.categoryId] = (categoryExpenses[t.categoryId] || 0) + t.amount;
                if (!biggestExpenseTx || t.amount > biggestExpenseTx.amount) biggestExpenseTx = t;
            }
        }
        
        // Logic for last month
        if (adjustedDate.getMonth() === (now.getMonth() - 1) && adjustedDate.getFullYear() === now.getFullYear()) {
             if (t.type === 'income') lastMonthIncome += t.amount; else lastMonthExpense += t.amount;
        }
        
        // Logic for current year stats
        if (adjustedDate.getFullYear() === now.getFullYear()) {
            if (t.type === 'income') yearIncome += t.amount; else {
                yearExpense += t.amount;
                const key = t.title.toLowerCase().trim();
                if (!expenseFrequency[key]) expenseFrequency[key] = { count: 0, amount: t.amount, categoryId: t.categoryId || '' };
                expenseFrequency[key].count++;
            }
        }
    });
    
    // Find actual Last Transaction (that is <= Today)
    lastTx = txs.find(t => t.date <= todayStr) || null;

    const monthVariationIncome = lastMonthIncome === 0 ? 0 : ((income - lastMonthIncome) / lastMonthIncome) * 100;
    const monthVariationExpense = lastMonthExpense === 0 ? 0 : ((expense - lastMonthExpense) / lastMonthExpense) * 100;
    const projectedBalance = balance * 1.05;

    let financialHealth: DashboardMetrics['financialHealth'] = 'stable';
    const ratio = expense > 0 ? income / expense : 2;
    if (ratio >= 1.2) financialHealth = 'excellent';
    else if (ratio >= 1.05) financialHealth = 'good';
    else if (ratio >= 0.9) financialHealth = 'stable';
    else financialHealth = 'critical';

    const topExpenses = Object.entries(expenseFrequency).sort(([,a], [,b]) => b.count - a.count).slice(0, 3).map(([title, data]) => ({ title: title.charAt(0).toUpperCase() + title.slice(1), count: data.count, categoryId: data.categoryId, amount: data.amount }));
    let topCategoryEntry = Object.entries(categoryExpenses).sort(([,a], [,b]) => b - a)[0];
    let topCategory = topCategoryEntry ? { name: categories.find(c => c.id === topCategoryEntry[0])?.name || 'Outros', total: topCategoryEntry[1], color: categories.find(c => c.id === topCategoryEntry[0])?.colorClass || '' } : null;

    return {
        metrics: { balance, income, expense, monthVariationIncome, monthVariationExpense, projectedBalance, financialHealth, yearlySavings: yearIncome - yearExpense, lastTransaction: lastTx, topExpenses },
        insights: { savings: income - expense, biggestExpense: biggestExpenseTx, topCategory }
    };
  }
  
  async getUserProfile(): Promise<UserProfile | null> { if (!this.currentUser) return null; await this.ensureProfileExists(); const { data } = await this.supabase.from('profiles').select('*').eq('id', this.currentUser.id).single(); return data || null; }
  
  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> { if (!this.currentUser) return; await this.supabase.from('profiles').update(updates).eq('id', this.currentUser.id); }
  
  async updateUserName(name: string): Promise<{ success: boolean; message?: string }> {
      if (!this.currentUser) return { success: false, message: 'Usuário não autenticado' };
      const { error } = await this.supabase.auth.updateUser({ data: { name: name } });
      if (error) return { success: false, message: error.message };
      this.currentUser.name = name;
      return { success: true };
  }

  async getNotificationSettings(): Promise<NotificationSettings | null> { if (!this.currentUser) return null; const { data } = await this.supabase.from('notification_settings').select('*').eq('user_id', this.currentUser.id).single(); return data || null; }
  async updateNotificationSettings(updates: Partial<NotificationSettings>): Promise<void> { if (!this.currentUser) return; await this.supabase.from('notification_settings').update(updates).eq('user_id', this.currentUser.id); }
  
  async logActivity(): Promise<void> { if (!this.currentUser) return; const today = new Date().toISOString().split('T')[0]; await this.supabase.from('user_activity').upsert({ user_id: this.currentUser.id, activity_date: today }, { onConflict: 'user_id, activity_date', ignoreDuplicates: true }); }
  
  async getUserStats(): Promise<UserStats> {
    if (!this.currentUser) return { daysActive: 0, totalTransactions: 0, currentStreak: 0, maxStreak: 0 };
    const { data } = await this.supabase.from('transactions').select('date').eq('user_id', this.currentUser.id);
    const transactions = data || [];
    const totalTransactions = transactions.length;
    if (totalTransactions === 0) return { daysActive: 0, totalTransactions: 0, currentStreak: 0, maxStreak: 0 };

    const uniqueDates = Array.from(new Set(transactions.map((t: any) => t.date as string))).sort((a: string, b: string) => b.localeCompare(a));
    const daysActive = uniqueDates.length;
    let currentStreak = 0;
    let maxStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let isStreakActive = false;
    let streakStartIndex = -1;
    // Cast to string array implicit via any but to make sure
    const uniqueDatesStr = uniqueDates as unknown as string[];
    
    if (uniqueDatesStr.includes(todayStr)) { isStreakActive = true; streakStartIndex = uniqueDatesStr.indexOf(todayStr); } 
    else if (uniqueDatesStr.includes(yesterdayStr)) { isStreakActive = true; streakStartIndex = uniqueDatesStr.indexOf(yesterdayStr); }

    if (isStreakActive) {
        currentStreak = 1;
        for (let i = streakStartIndex; i < uniqueDates.length - 1; i++) {
            const currentDate = new Date(uniqueDates[i] as string);
            const prevDate = new Date(uniqueDates[i+1] as string);
            const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) currentStreak++; else break;
        }
    }

    const sortedAsc = [...uniqueDates].sort();
    let tempStreak = sortedAsc.length > 1 ? 1 : 0;
    maxStreak = tempStreak;
    for (let i = 0; i < sortedAsc.length - 1; i++) {
        const d1 = new Date(sortedAsc[i] as string);
        const d2 = new Date(sortedAsc[i+1] as string);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) tempStreak++; else tempStreak = 1;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
    }
    return { daysActive, totalTransactions, currentStreak, maxStreak };
  }

  async getSmartRules(): Promise<SmartRule[]> { if (!this.currentUser) return []; const { data } = await this.supabase.from('smart_category_rules').select('*').eq('user_id', this.currentUser.id); return data || []; }
  async addSmartRule(keyword: string, categoryId: string): Promise<void> { if (!this.currentUser) return; await this.supabase.from('smart_category_rules').insert({ user_id: this.currentUser.id, keyword, category_id: categoryId }); }
  async deleteSmartRule(id: string): Promise<void> { if (!this.currentUser) return; await this.supabase.from('smart_category_rules').delete().eq('id', id); }
  
  async clearTransactions(): Promise<{ success: boolean, error?: any }> { if (!this.currentUser) return { success: false, error: 'Usuário não autenticado' }; const { error } = await this.supabase.from('transactions').delete().eq('user_id', this.currentUser.id); return error ? { success: false, error } : { success: true }; }
  
  async deleteAccount(): Promise<{ success: boolean, error?: any }> {
    if (!this.currentUser) return { success: false, error: 'Usuário não autenticado' };
    
    try {
        const userId = this.currentUser.id;

        // 0. Ensure session is valid
        const { data: { session } } = await this.supabase.auth.getSession();
        if (!session) throw new Error("Sessão inválida.");

        // 1. Delete dependent data first (Client-side attempt)
        // Explicitly try to delete user_activity first since it causes FK issues
        const { error: actError } = await this.supabase.from('user_activity').delete().eq('user_id', userId);
        if (actError) console.warn("Client-side user_activity delete failed:", actError);

        await this.supabase.from('transactions').delete().eq('user_id', userId);
        await this.supabase.from('financial_goals').delete().eq('user_id', userId);
        await this.supabase.from('smart_category_rules').delete().eq('user_id', userId);
        
        await this.supabase.from('categories').delete().eq('user_id', userId);
        await this.supabase.from('wallets').delete().eq('user_id', userId);
        await this.supabase.from('payment_methods').delete().eq('user_id', userId);
        await this.supabase.from('notification_settings').delete().eq('user_id', userId);

        const { error: profileError } = await this.supabase.from('profiles').delete().eq('id', userId);
        if (profileError) console.warn("Error deleting profile:", profileError);

        // 2. Try HARD Delete (RPC)
        // This relies on the SQL function `delete_user` being defined in Supabase
        const { error: rpcError } = await this.supabase.rpc('delete_user');
        
        // 3. Verification & SOFT Delete (Fallback)
        const { data: { user } } = await this.supabase.auth.getUser();
        
        // If RPC errored (e.g. FK constraint) OR User still exists -> Execute Scramble (Soft Delete)
        if (rpcError || user) {
            console.warn("Hard delete failed or incomplete. Executing soft delete (scramble).", rpcError);
            
            // If the error is exactly the FK constraint on user_activity, we know the RPC failed because the SQL wasn't cascading.
            // We proceed to soft delete to ensure the user cannot login anymore.
            
            const scramblePassword = uuidv4() + uuidv4() + "-DELETED-" + Date.now();
            const scrambleEmail = `${userId.slice(0, 8)}-deleted-${Date.now()}@deleted.fincontrol.app`;
            
            const { error: updateError } = await this.supabase.auth.updateUser({ 
                email: scrambleEmail,
                password: scramblePassword,
                data: { name: 'Deleted User', deleted_at: new Date().toISOString() }
            });

            if (updateError) {
                 return { success: false, error: "Falha ao desativar login: " + updateError.message };
            }
        }

        // 4. Sign out locally
        await this.logout();
        
        return { success: true };
    } catch (error: any) {
        console.error("Delete Account Critical Error:", error);
        return { success: false, error };
    }
  }
  
  async getExportableData(): Promise<RichTransaction[]> {
    if (!this.currentUser) return [];
    const [txs, cats, wallets, methods] = await Promise.all([this.getTransactions(), this.getCategories(), this.getWallets(), this.getPaymentMethods()]);
    const catMap = new Map(cats.map(c => [c.id, c.name]));
    const walletMap = new Map(wallets.map(w => [w.id, w.name]));
    const methodMap = new Map(methods.map(m => [m.id, m.name]));
    return txs.map(t => {
      const dateObj = new Date(t.date);
      const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);
      return {
        date: t.date,
        dateFormatted: adjustedDate.toLocaleDateString('pt-BR'),
        title: t.title,
        amount: t.amount,
        type: t.type === 'income' ? 'Receita' : 'Despesa',
        categoryName: catMap.get(t.categoryId || '') || 'Sem Categoria',
        walletName: walletMap.get(t.walletId || '') || 'Conta Padrão',
        methodName: methodMap.get(t.paymentMethodId || '') || 'Outros',
        isInstallment: !!t.installmentNumber,
        installmentInfo: t.installmentNumber ? `${t.installmentNumber}/${t.installmentTotal}` : ''
      };
    });
  }

  async exportData(): Promise<string> {
    const data = await this.getExportableData();
    if (data.length === 0) return '';
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Conta', 'Método', 'Valor', 'Parcela'];
    const rows = data.map(t => [t.dateFormatted, `"${t.title.replace(/"/g, '""')}"`, `"${t.categoryName}"`, t.type, `"${t.walletName}"`, `"${t.methodName}"`, t.amount.toFixed(2).replace('.', ','), t.installmentInfo]);
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  async exportExcelData(): Promise<string> { const csv = await this.exportData(); return '\uFEFF' + csv; }
  
  async createFullBackup(): Promise<string> { 
     const txs = await this.getTransactions();
     const cats = await this.getCategories();
     const wallets = await this.getWallets();
     const methods = await this.getPaymentMethods();
     const backup = { version: "1.0", timestamp: new Date().toISOString(), data: { transactions: txs, categories: cats, wallets: wallets, payment_methods: methods } };
     return JSON.stringify(backup, null, 2);
  }
  
  async importData(jsonString: string): Promise<{ success: boolean; message?: string }> {
      if (!this.currentUser) return { success: false, message: 'Usuário não autenticado.' };
      try {
          const backup = JSON.parse(jsonString);
          if (!backup.data || !backup.version) return { success: false, message: 'Arquivo inválido ou corrompido.' };
          const { transactions, categories, wallets, payment_methods } = backup.data;
          const userId = this.currentUser.id;
          const mapCategoryForDB = (c: any) => ({ id: c.id, user_id: userId, name: c.name, description: c.description, icon: c.icon, color_class: c.colorClass || c.color_class, bg_class: c.bg_class || c.bg_class, category_type: c.type || c.category_type });
          // Mapeamento atualizado para novos campos
          const mapTransactionForDB = (t: any) => ({ 
              id: t.id, user_id: userId, title: t.title, subtitle: t.subtitle, amount: t.amount, type: t.type, date: t.date, 
              category_id: t.categoryId || t.category_id, wallet_id: t.wallet_id || t.wallet_id, payment_method_id: t.paymentMethodId || t.payment_method_id, 
              icon: t.icon, color_class: t.colorClass || t.color_class, bg_class: t.bgClass || t.bg_class, created_at: t.created_at || new Date().toISOString(),
              installment_number: t.installmentNumber || t.installment_number,
              installment_total: t.installmentTotal || t.installment_total,
              installment_group_id: t.installmentGroupId || t.installment_group_id,
              is_fixed: t.isFixed || t.is_fixed
          });
          const mapWalletForDB = (w: any) => ({ id: w.id, user_id: userId, name: w.name, type: w.type, is_default: w.is_default });
          const mapMethodForDB = (m: any) => ({ id: m.id, user_id: userId, name: m.name });

          if (categories?.length) await this.supabase.from('categories').upsert(categories.map(mapCategoryForDB));
          if (wallets?.length) await this.supabase.from('wallets').upsert(wallets.map(mapWalletForDB));
          if (payment_methods?.length) await this.supabase.from('payment_methods').upsert(payment_methods.map(mapMethodForDB));
          if (transactions?.length) await this.supabase.from('transactions').upsert(transactions.map(mapTransactionForDB));
          return { success: true, message: 'Backup restaurado com sucesso!' };
      } catch (error: any) {
          console.error("Erro no restore:", error);
          return { success: false, message: error.message || 'Erro desconhecido ao restaurar.' };
      }
  }

  async getBalance(): Promise<{ total: number, income: number, expense: number }> { 
      const txs = await this.getTransactions(); 
      const today = new Date().toISOString().split('T')[0];
      let i = 0, e = 0; 
      
      txs.forEach(t => {
          if (t.date <= today) {
              if (t.type === 'income') i += t.amount; else e += t.amount; 
          }
      });
      
      return { total: i - e, income: i, expense: e }; 
  }
  
  async getMonthlyData(): Promise<any[]> {
    if (!this.currentUser) return [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const txs = await this.getTransactions();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => { return { name: (i + 1).toString(), income: 0, expense: 0 }; });
    txs.forEach(t => {
      const [y, m, d] = t.date.split('-').map(Number);
      if (y === currentYear && (m - 1) === currentMonth) {
         const dayIndex = d - 1;
         if (daysArray[dayIndex]) { if (t.type === 'income') daysArray[dayIndex].income += t.amount; else daysArray[dayIndex].expense += t.amount; }
      }
    });
    return daysArray;
  }

  async updateEmail(email: string): Promise<any> { return { success: true }; }
}

export const db = new DatabaseService();