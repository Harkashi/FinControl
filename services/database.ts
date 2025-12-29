
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Transaction, Category, User, UserProfile, NotificationSettings, SmartRule, UserStats, Wallet, PaymentMethod, BudgetReport, FinancialGoal, DashboardMetrics, AutomationSettings, FinancialScore, SmartAlert, ComparisonData, BehaviorAnalysis } from '../types';

// Safe Environment Access to prevent crash
const getEnv = (key: string, fallback: string = '') => {
  try {
    // @ts-ignore
    return (import.meta as any).env?.[key] || fallback;
  } catch (e) {
    return fallback;
  }
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'https://dpylbmgtgajjubnncyrh.supabase.co'); 
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_lFxqA6ONs4Oh8fMkx5cBlg_S2F2IDP2');

// Seeds
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
  isInstallment: boolean;
  installmentInfo: string;
}

// Helpers
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const getLocalToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const SEPARATOR = '|||';
function parseSubtitle(rawSubtitle: string | null) {
    if (!rawSubtitle) return { text: '', meta: undefined };
    if (!rawSubtitle.includes(SEPARATOR)) return { text: rawSubtitle, meta: undefined };
    
    const parts = rawSubtitle.split(SEPARATOR);
    const text = parts[0].trim();
    let meta = undefined;
    try {
        meta = JSON.parse(parts[1].trim());
    } catch (e) {}
    return { text, meta };
}

class DatabaseService {
  public supabase: SupabaseClient;
  private currentUser: User | null = null;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  // --- AUTH ---
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
      const { data: profile } = await this.supabase.from('profiles').select('id').eq('id', data.user.id).single();
      if (!profile) await this.ensureProfileExists();
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
    try {
      const { data } = await this.supabase.auth.getSession();
      if (data.session?.user) {
        this.currentUser = this.mapSupabaseUser(data.session.user);
        await this.ensureProfileExists();
        return true;
      }
    } catch (e) {
      console.warn("Session check failed", e);
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
      await this.seedDefaultWallets();
      await this.seedDefaultMethods();
    }
  }

  private async seedDefaultCategories() {
    if (!this.currentUser) return;
    try {
      const { count } = await this.supabase.from('categories').select('*', { count: 'exact', head: true }).eq('user_id', this.currentUser.id);
      if (count && count > 0) return;
      const payload = DEFAULT_CATEGORY_SEEDS.map(c => ({ user_id: this.currentUser!.id, ...c }));
      await this.supabase.from('categories').insert(payload);
    } catch (e) { console.error("Error seeding categories:", e); }
  }
  private async seedDefaultWallets() {
    if (!this.currentUser) return;
    try {
      const { count } = await this.supabase.from('wallets').select('*', { count: 'exact', head: true }).eq('user_id', this.currentUser.id);
      if (count && count > 0) return;
      const payload = DEFAULT_WALLETS.map(w => ({ user_id: this.currentUser!.id, ...w }));
      await this.supabase.from('wallets').insert(payload);
    } catch(e) { console.error("Seeding wallets failed", e); }
  }
  private async seedDefaultMethods() {
    if (!this.currentUser) return;
    try {
      const { count } = await this.supabase.from('payment_methods').select('*', { count: 'exact', head: true }).eq('user_id', this.currentUser.id);
      if (count && count > 0) return;
      const payload = DEFAULT_METHODS.map(m => ({ user_id: this.currentUser!.id, ...m }));
      await this.supabase.from('payment_methods').insert(payload);
    } catch(e) { console.error("Seeding methods failed", e); }
  }

  // --- CORE GETTERS ---
  async getWallets(): Promise<Wallet[]> {
    if (!this.currentUser) return [];
    let { data } = await this.supabase.from('wallets').select('*').eq('user_id', this.currentUser.id);
    if (!data || data.length === 0) {
      await this.seedDefaultWallets();
      const retry = await this.supabase.from('wallets').select('*').eq('user_id', this.currentUser.id);
      data = retry.data;
    }
    const safeData = data || [];
    return safeData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }

  async saveWallet(wallet: Partial<Wallet>): Promise<{ success: boolean; error?: any }> {
     if (!this.currentUser) return { success: false, error: 'Usuário não autenticado' };
     try {
        if (wallet.id) {
            const { error } = await this.supabase.from('wallets').update({ name: wallet.name, type: wallet.type, is_default: wallet.is_default }).eq('id', wallet.id);
            if (error) throw error;
        } else {
            const { error } = await this.supabase.from('wallets').insert({ user_id: this.currentUser.id, name: wallet.name, type: wallet.type || 'account', is_default: wallet.is_default || false });
            if (error) throw error;
        }
        return { success: true };
     } catch (e) { return { success: false, error: e }; }
  }

  async updateWalletsOrder(wallets: Wallet[]): Promise<void> {
     if (!this.currentUser) return;
     try {
        const updates = wallets.map((w, index) => ({ id: w.id, user_id: this.currentUser!.id, name: w.name, type: w.type, is_default: w.is_default, order: index }));
        await this.supabase.from('wallets').upsert(updates);
     } catch (e) {}
  }

  async deleteWallet(id: string): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    await this.supabase.from('transactions').update({ wallet_id: null }).eq('wallet_id', id);
    const { error } = await this.supabase.from('wallets').delete().eq('id', id);
    return error ? { success: false, error } : { success: true };
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    if (!this.currentUser) return [];
    let { data } = await this.supabase.from('payment_methods').select('*').eq('user_id', this.currentUser.id);
    if (!data || data.length === 0) {
      await this.seedDefaultMethods();
      const retry = await this.supabase.from('payment_methods').select('*').eq('user_id', this.currentUser.id);
      data = retry.data;
    }
    const safeData = data || [];
    return safeData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }

  async savePaymentMethod(method: Partial<PaymentMethod>): Promise<{ success: boolean; error?: any }> {
     if (!this.currentUser) return { success: false, error: 'Usuário não autenticado' };
     try {
        if (method.id) {
            const { error } = await this.supabase.from('payment_methods').update({ name: method.name }).eq('id', method.id);
            if (error) throw error;
        } else {
            const { error } = await this.supabase.from('payment_methods').insert({ user_id: this.currentUser.id, name: method.name });
            if (error) throw error;
        }
        return { success: true };
     } catch (e) { return { success: false, error: e }; }
  }

  async updatePaymentMethodsOrder(methods: PaymentMethod[]): Promise<void> {
      if (!this.currentUser) return;
      try {
        const updates = methods.map((m, index) => ({ id: m.id, user_id: this.currentUser!.id, name: m.name, order: index }));
        await this.supabase.from('payment_methods').upsert(updates);
      } catch (e) {}
  }

  async deletePaymentMethod(id: string): Promise<void> {
    if (!this.currentUser) return;
    await this.supabase.from('transactions').update({ payment_method_id: null }).eq('payment_method_id', id);
    await this.supabase.from('payment_methods').delete().eq('id', id);
  }

  async getCategories(): Promise<Category[]> {
    if (!this.currentUser) return [];
    const { data } = await this.supabase.from('categories').select('*').eq('user_id', this.currentUser.id);
    if (!data || data.length === 0) {
       await this.seedDefaultCategories();
       const { data: newData } = await this.supabase.from('categories').select('*').eq('user_id', this.currentUser.id);
       return (newData || []).map(this.mapCategoryFromDB);
    }
    return (data || []).map(this.mapCategoryFromDB);
  }

  private mapCategoryFromDB(c: any): Category {
    let budget = c.budget ?? c.budget_limit ?? 0;
    let description = c.description || '';
    if (budget === 0 && description && description.includes(SEPARATOR)) {
        try {
            const parts = description.split(SEPARATOR);
            const meta = JSON.parse(parts[1].trim());
            if (meta && typeof meta.budget === 'number') budget = meta.budget;
            description = parts[0].trim();
        } catch (e) {}
    }
    return {
      id: c.id, name: c.name, description: description, icon: c.icon,
      colorClass: c.color_class || 'text-gray-600', bgClass: c.bg_class || 'bg-gray-100',
      type: c.category_type || 'both', budget: budget
    };
  }
  
  async updateCategoryBudget(categoryId: string, limit: number): Promise<{ success: boolean, error?: any }> {
      if (!this.currentUser) return { success: false, error: 'Not authenticated' };
      const { error } = await this.supabase.from('categories').update({ budget: limit }).eq('id', categoryId).eq('user_id', this.currentUser.id);
      return { success: !error };
  }

  async resetAllCategoryBudgets(): Promise<{ success: boolean; error?: any }> {
      if (!this.currentUser) return { success: false };
      try {
          const { data: categories } = await this.supabase.from('categories').select('*').eq('user_id', this.currentUser.id);
          if (!categories) return { success: true };
          const updates = categories.map((cat: any) => ({ ...cat, budget: 0, budget_limit: 0 }));
          await this.supabase.from('categories').upsert(updates);
          return { success: true };
      } catch (e) { return { success: false, error: e }; }
  }

  async saveCategory(category: Category): Promise<{success: boolean, error?: any}> {
    if (!this.currentUser) return { success: false, error: 'Not authenticated' };
    const payload = {
      user_id: this.currentUser.id, name: category.name, description: category.description,
      icon: category.icon, color_class: category.colorClass, bg_class: category.bgClass, category_type: category.type
    };
    if (category.id) {
       const { error } = await this.supabase.from('categories').update(payload).eq('id', category.id);
       return { success: !error, error };
    } else {
       const { error } = await this.supabase.from('categories').insert(payload);
       return { success: !error, error };
    }
  }
  
  async deleteCategory(id: string): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false };
    try {
        await this.supabase.from('smart_category_rules').delete().eq('category_id', id);
        const { count } = await this.supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('category_id', id);
        if (count && count > 0) {
            const { data: others } = await this.supabase.from('categories').select('id').eq('user_id', this.currentUser.id).neq('id', id).limit(1);
            if (others && others.length > 0) {
                await this.supabase.from('transactions').update({ category_id: others[0].id }).eq('category_id', id);
            }
        }
        await this.supabase.from('categories').delete().eq('id', id);
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async getGoals(): Promise<FinancialGoal[]> {
    if (!this.currentUser) return [];
    try {
        const { data } = await this.supabase.from('financial_goals').select('*').eq('user_id', this.currentUser.id);
        return (data || []).map((g: any) => ({
            id: g.id, name: g.name, targetAmount: g.target_amount, currentAmount: g.current_amount,
            deadline: g.deadline, icon: g.icon || 'savings', colorClass: g.color_class || 'text-blue-500'
        }));
    } catch(e) { return []; }
  }

  async saveGoal(goal: Partial<FinancialGoal>): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false };
    const payload: any = {
      user_id: this.currentUser.id, name: goal.name, target_amount: goal.targetAmount,
      current_amount: goal.currentAmount || 0, deadline: goal.deadline, icon: goal.icon, color_class: goal.colorClass
    };
    if (goal.id) {
       const { error } = await this.supabase.from('financial_goals').update(payload).eq('id', goal.id);
       return { success: !error };
    } else {
       const { error } = await this.supabase.from('financial_goals').insert(payload);
       return { success: !error };
    }
  }

  async deleteGoal(id: string): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false };
    const { error } = await this.supabase.from('financial_goals').delete().eq('id', id);
    return { success: !error };
  }

  async getTransactions(): Promise<Transaction[]> {
    if (!this.currentUser) return [];
    const { data } = await this.supabase.from('transactions').select('*').eq('user_id', this.currentUser.id).order('date', { ascending: false }).order('created_at', { ascending: false });
    return (data || []).map((t: any) => {
      const { text, meta } = parseSubtitle(t.subtitle);
      return {
        id: t.id, title: t.title, subtitle: text, amount: t.amount, type: t.type,
        icon: t.icon, colorClass: t.color_class, bgClass: t.bg_class, date: t.date,
        categoryId: t.category_id, userId: t.user_id, created_at: t.created_at, 
        walletId: t.wallet_id, paymentMethodId: t.payment_method_id,
        installmentNumber: t.installment_number, installmentTotal: t.installment_total,
        installmentGroupId: t.installment_group_id, isFixed: t.is_fixed, financingDetails: meta
      };
    });
  }

  async addTransaction(tx: any): Promise<{ success: boolean, error?: any, alerts?: string[] }> {
    if (!this.currentUser) return { success: false };
    
    let categoryId = tx.categoryId;
    // 1. Smart Rules Logic
    if (!categoryId) {
       try {
           const { data: rules } = await this.supabase.from('smart_category_rules').select('*').eq('user_id', this.currentUser.id);
           if (rules && rules.length > 0) {
            const match = rules.find((r: any) => tx.title.toLowerCase().includes(r.keyword.toLowerCase()));
            if (match) categoryId = match.category_id;
           }
       } catch (e) {}
    }

    // 2. FETCH CATEGORY STYLES (Fix for the generic icon issue)
    let finalIcon = tx.icon || 'payments';
    let finalColor = 'text-gray-600';
    let finalBg = 'bg-gray-100';

    if (categoryId) {
        // Try to find category details to apply correct branding
        const { data: cat } = await this.supabase
            .from('categories')
            .select('icon, color_class, bg_class')
            .eq('id', categoryId)
            .single();
        
        if (cat) {
            // Only use category icon if a specific custom icon (like for car installment) wasn't passed
            if (!tx.icon) finalIcon = cat.icon;
            finalColor = cat.color_class;
            finalBg = cat.bg_class;
        }
    }

    // 3. Installment Logic
    let installments = tx.installments || 1;
    // Special handling for Fixed Costs: Generate 12 occurrences if set to 1, to simulate recurrence
    if (tx.isFixed && installments === 1) {
        installments = 12;
    }

    const payloads = [];
    const groupId = installments > 1 ? uuidv4() : null;
    let baseAmount = tx.amount;
    // Se não for financiamento (que tem valor total fixo no amount), divide o valor total pelas parcelas
    // Only divide if it's NOT fixed cost (fixed costs have same amount each month) AND NOT financing
    if (installments > 1 && !tx.financingDetails && !tx.isFixed) {
        baseAmount = tx.amount / installments;
    }

    let sub = tx.subtitle;
    if (tx.financingDetails) sub += `${SEPARATOR}${JSON.stringify(tx.financingDetails)}`;

    for (let i = 0; i < installments; i++) {
        const d = new Date(tx.date);
        d.setMonth(d.getMonth() + i);
        const isoDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        
        // For fixed costs, installment info is null/irrelevant for user display, but kept internal
        const instNum = (installments > 1 && !tx.isFixed) ? i + 1 : null;
        const instTotal = (installments > 1 && !tx.isFixed) ? installments : null;

        payloads.push({
            user_id: this.currentUser.id, 
            title: tx.title, 
            subtitle: sub, 
            amount: baseAmount, 
            type: tx.type, 
            date: isoDate, 
            category_id: categoryId,
            wallet_id: tx.walletId, 
            payment_method_id: tx.paymentMethodId,
            // Use the fetched styles
            icon: finalIcon, 
            color_class: finalColor, 
            bg_class: finalBg,
            installment_number: instNum, 
            installment_total: instTotal,
            installment_group_id: groupId, 
            is_fixed: tx.isFixed
        });
    }
    const { error } = await this.supabase.from('transactions').insert(payloads);
    return { success: !error, alerts: [] };
  }

  async getBalance(): Promise<{ total: number; income: number; expense: number }> {
    const transactions = await this.getTransactions();
    const today = getLocalToday();
    let total = 0, income = 0, expense = 0;
    for (const t of transactions) {
      if (t.date <= today) {
        if (t.type === 'income') { income += t.amount; total += t.amount; }
        else { expense += t.amount; total -= t.amount; }
      }
    }
    return { total, income, expense };
  }

  // --- ADVANCED SCORE IMPLEMENTATION ---
  async getAdvancedFinancialScore(): Promise<FinancialScore> {
    try {
        const transactions = await this.getTransactions();
        const categories = await this.getCategories();
        
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        let totalIncome = 0;
        let totalExpense = 0;
        let fixedCosts = 0;
        let categoriesOverBudget = 0;
        let activeInstallmentsCount = 0;
        const categorySpend: Record<string, number> = {};

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= thirtyDaysAgo && tDate <= now) {
                if (t.type === 'income') totalIncome += t.amount;
                else {
                    totalExpense += t.amount;
                    if (t.categoryId) categorySpend[t.categoryId] = (categorySpend[t.categoryId] || 0) + t.amount;
                    if (t.isFixed) fixedCosts += t.amount;
                }
            }
            if (t.type === 'expense' && t.installmentTotal && t.installmentTotal > 1 && tDate >= thirtyDaysAgo) {
                activeInstallmentsCount++;
            }
        });

        categories.forEach(c => {
            if (c.budget && c.budget > 0) {
                const spent = categorySpend[c.id] || 0;
                if (spent > c.budget) categoriesOverBudget++;
            }
        });

        let rawScore = 0;
        const factors: FinancialScore['factors'] = [];

        // 1. Savings
        if (totalIncome > 0) {
            const savingsRate = (totalIncome - totalExpense) / totalIncome;
            if (savingsRate >= 0.20) {
                rawScore += 400;
                factors.push({ label: 'Alta Capacidade de Poupança', impact: 'positive', value: `+${(savingsRate*100).toFixed(0)}%` });
            } else if (savingsRate >= 0.10) {
                rawScore += 300;
                factors.push({ label: 'Poupança Saudável', impact: 'positive', value: `+${(savingsRate*100).toFixed(0)}%` });
            } else if (savingsRate > 0) {
                rawScore += 150;
                factors.push({ label: 'Saldo Positivo', impact: 'neutral', value: 'No limite' });
            } else {
                factors.push({ label: 'Gastos superam Ganhos', impact: 'negative', value: 'Crítico' });
            }
        } else {
             factors.push({ label: 'Sem renda registrada', impact: 'neutral', value: '-' });
        }

        // 2. Fixed Costs
        if (totalIncome > 0) {
            const fixedRatio = fixedCosts / totalIncome;
            if (fixedRatio <= 0.30) {
                rawScore += 300;
                factors.push({ label: 'Custos Fixos Baixos', impact: 'positive', value: 'Excelente' });
            } else if (fixedRatio <= 0.50) {
                rawScore += 200;
                factors.push({ label: 'Custos Fixos Equilibrados', impact: 'positive', value: 'Ok' });
            } else {
                rawScore += 100;
                factors.push({ label: 'Custos Fixos Altos', impact: 'neutral', value: 'Atenção' });
            }
        }

        // 3. Budget
        if (categoriesOverBudget === 0) {
            rawScore += 200;
            factors.push({ label: 'Orçamentos Respeitados', impact: 'positive', value: '100%' });
        } else if (categoriesOverBudget <= 2) {
            rawScore += 100;
            factors.push({ label: 'Alguns Orçamentos Excedidos', impact: 'neutral', value: `-${categoriesOverBudget}` });
        } else {
            factors.push({ label: 'Descontrole de Categorias', impact: 'negative', value: 'Múltiplos' });
        }

        // 4. Installments
        if (activeInstallmentsCount === 0) {
            rawScore += 100;
        } else if (activeInstallmentsCount <= 3) {
            rawScore += 70;
        } else {
            factors.push({ label: 'Muitos Parcelamentos', impact: 'neutral', value: `${activeInstallmentsCount} ativos` });
        }

        if (totalIncome === 0 && totalExpense === 0) rawScore = 500;

        let status: 'healthy' | 'stable' | 'attention' | 'critical' = 'critical';
        if (rawScore >= 800) status = 'healthy';
        else if (rawScore >= 600) status = 'stable';
        else if (rawScore >= 400) status = 'attention';

        return { score: rawScore, status, factors };
    } catch (e) {
        console.error("Advanced Score Error", e);
        return { score: 0, status: 'critical', factors: [] };
    }
  }

  async getBehaviorAnalysis(): Promise<BehaviorAnalysis | null> {
    // Basic Stub for behavior to prevent errors if called
    return {
        weekDayStats: [], busiestDay: { day: 'N/A', amount: 0 }, averageTicket: 0,
        purchaseSize: { small: {count:0, total:0, label:''}, medium: {count:0, total:0, label:''}, large: {count:0, total:0, label:''} },
        topMerchant: 'N/A'
    };
  }

  // --- OTHER ---
  async getDashboardMetrics(): Promise<any> {
    // Re-use simplified logic for dashboard to keep it fast
    const balance = await this.getBalance();
    return {
        metrics: {
            balance: balance.total, income: balance.income, expense: balance.expense,
            financialHealth: balance.income > balance.expense ? 'good' : 'critical',
            topExpenses: []
        }
    };
  }

  async getBudgetsReport(month: number, year: number): Promise<BudgetReport> {
      // 1. Fetch Goals
      const goals = await this.getGoals();

      // 2. Fetch Transactions & Categories
      const txs = await this.getTransactions();
      const cats = await this.getCategories();

      // 3. Filter Transactions for selected Month/Year
      const monthlyTxs = txs.filter(t => {
          // Use string parsing to be consistent with local strings
          const [y, m, d] = t.date.split('-').map(Number);
          return (m - 1) === month && y === year;
      });

      // 4. Calculate Totals
      let totalSpent = 0;
      let totalBudget = 0;
      let fixedCosts = 0;
      let committedInstallments = 0;
      
      cats.forEach(c => { if(c.budget) totalBudget += c.budget; });

      const fixedCostsList: Transaction[] = [];
      const activeInstallmentsList: Transaction[] = [];

      monthlyTxs.forEach(t => {
          if(t.type === 'expense') {
              totalSpent += t.amount;
              
              if (t.isFixed) {
                  fixedCosts += t.amount;
                  fixedCostsList.push(t);
              } else if (t.installmentTotal && t.installmentTotal > 1) {
                  committedInstallments += t.amount;
                  activeInstallmentsList.push(t);
              }
          }
      });

      const variableSpent = totalSpent - fixedCosts - committedInstallments;
      
      // Calculate Percentages for Categories
      const categoriesWithSpend = cats.map(c => {
          const catSpent = monthlyTxs
            .filter(t => t.categoryId === c.id && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
          return { ...c, spent: catSpent };
      });

      // Calculate Pace
      const now = new Date();
      const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysPassed = isCurrentMonth ? now.getDate() : (now > new Date(year, month + 1, 0) ? daysInMonth : 0);
      const daysPassedPct = (daysPassed / daysInMonth) * 100;
      const budgetConsumedPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      
      let pace: 'slow' | 'on-track' | 'fast' | 'critical' = 'on-track';
      if (totalBudget > 0) {
          if (budgetConsumedPct > 100) pace = 'critical';
          else if (budgetConsumedPct > daysPassedPct + 10) pace = 'fast'; 
          else if (budgetConsumedPct < daysPassedPct - 10) pace = 'slow';
      }

      return {
          totalBudget, 
          totalSpent, 
          remaining: totalBudget - totalSpent,
          fixedCosts, 
          committedInstallments, 
          variableSpent,
          activeInstallmentsList, 
          fixedCostsList, 
          pace, 
          daysPassedPct, 
          budgetConsumedPct,
          categories: categoriesWithSpend, 
          alertCategory: null, 
          goals // Fixed: returning goals
      };
  }

  async getDetailedComparison(month: number, year: number): Promise<any> {
      return { currentTotal: 0, prevTotal: 0, diffValue: 0, diffPct: 0, categories: [] };
  }

  // User Profile
  async getUserProfile(): Promise<UserProfile | null> {
      if (!this.currentUser) return null;
      const { data } = await this.supabase.from('profiles').select('*').eq('id', this.currentUser.id).single();
      return data;
  }
  async updateUserProfile(data: any) {
      if (!this.currentUser) return;
      await this.supabase.from('profiles').update(data).eq('id', this.currentUser.id);
  }
  async updateUserName(name: string) { /* ... */ }
  
  // REAL IMPLEMENTATION
  async getUserStats(): Promise<UserStats> {
    if (!this.currentUser) return { daysActive: 0, totalTransactions: 0, currentStreak: 0, maxStreak: 0 };
    
    try {
        // Fetch dates only for performance
        const { data } = await this.supabase
          .from('transactions')
          .select('date')
          .eq('user_id', this.currentUser.id)
          .order('date', { ascending: false });

        if (!data || data.length === 0) {
            return { daysActive: 0, totalTransactions: 0, currentStreak: 0, maxStreak: 0 };
        }

        const totalTransactions = data.length;
        
        // Fix: Ensure we take only YYYY-MM-DD part if Supabase returns full ISO string
        // Also cast to any to avoid TS issues with partial select
        const uniqueDates = Array.from(new Set(data.map((t: any) => String(t.date).substring(0, 10)))).sort((a: string, b: string) => b.localeCompare(a));
        const daysActive = uniqueDates.length;

        // Calculate Streaks
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const datesAsTime = uniqueDates.map((d: string) => {
            // Parse YYYY-MM-DD safely
            const [y, m, day] = d.split('-').map(Number);
            return new Date(y, m-1, day).getTime();
        });

        let currentStreak = 0;
        let maxStreak = 0;
        let tempStreak = 0;

        // Calculate Max Streak
        if (datesAsTime.length > 0) {
            tempStreak = 1;
            maxStreak = 1;
            for (let i = 0; i < datesAsTime.length - 1; i++) {
                const diffTime = datesAsTime[i] - datesAsTime[i+1];
                const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
                
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    maxStreak = Math.max(maxStreak, tempStreak);
                    tempStreak = 1;
                }
            }
            maxStreak = Math.max(maxStreak, tempStreak);
        }

        // Calculate Current Streak
        if (datesAsTime.length > 0) {
            const lastActivity = datesAsTime[0];
            const diffFromToday = Math.round((today.getTime() - lastActivity) / (1000 * 3600 * 24));
            
            // Streak is active if last transaction was today (0) or yesterday (1)
            if (diffFromToday <= 1) {
                currentStreak = 1;
                for (let i = 0; i < datesAsTime.length - 1; i++) {
                    const diffTime = datesAsTime[i] - datesAsTime[i+1];
                    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
                    if (diffDays === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }

        return { daysActive, totalTransactions, currentStreak, maxStreak };
    } catch (e) {
        console.error("Error calculating user stats", e);
        return { daysActive: 0, totalTransactions: 0, currentStreak: 0, maxStreak: 0 };
    }
  }

  // --- IMPLEMENTED FEATURES ---
  async getNotificationSettings(): Promise<NotificationSettings | null> {
      if (!this.currentUser) return null;
      const { data } = await this.supabase.from('notification_settings').select('*').eq('user_id', this.currentUser.id).single();
      return data;
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
      if (!this.currentUser) return;
      await this.supabase.from('notification_settings').update(settings).eq('user_id', this.currentUser.id);
  }

  async logActivity() {} // Still stub for analytics

  async getSmartRules(): Promise<SmartRule[]> {
    if (!this.currentUser) return [];
    try {
        const { data } = await this.supabase.from('smart_category_rules').select('*').eq('user_id', this.currentUser.id);
        return data || [];
    } catch (e) {
        return [];
    }
  }

  async addSmartRule(keyword: string, categoryId: string): Promise<boolean> {
    if (!this.currentUser) return false;
    const { error } = await this.supabase.from('smart_category_rules').insert({
        user_id: this.currentUser.id,
        keyword,
        category_id: categoryId
    });
    return !error;
  }

  async deleteSmartRule(id: string): Promise<boolean> {
    if (!this.currentUser) return false;
    const { error } = await this.supabase.from('smart_category_rules').delete().eq('id', id);
    return !error;
  }
  
  // FIXED RETURN TYPES
  async clearTransactions(): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: { message: 'Usuário não autenticado.' } };
    const { error } = await this.supabase.from('transactions').delete().eq('user_id', this.currentUser.id);
    if (error) return { success: false, error };
    return { success: true };
  }

  async deleteAccount(): Promise<{ success: boolean; error?: any }> {
    if (!this.currentUser) return { success: false, error: { message: 'Usuário não autenticado.' } };
    
    // Clear data
    const res = await this.clearTransactions();
    if (!res.success) return { success: false, error: res.error || { message: 'Falha ao limpar transações.' } };

    try {
        await this.supabase.from('categories').delete().eq('user_id', this.currentUser.id);
        await this.supabase.from('wallets').delete().eq('user_id', this.currentUser.id);
        await this.supabase.from('payment_methods').delete().eq('user_id', this.currentUser.id);
        await this.supabase.from('financial_goals').delete().eq('user_id', this.currentUser.id);
        await this.supabase.from('profiles').delete().eq('id', this.currentUser.id);
        
        await this.logout();
        return { success: true };
    } catch(e: any) {
        return { success: false, error: { message: e.message || 'Erro ao excluir dados.' } };
    }
  }

  async getExportableData(): Promise<RichTransaction[]> {
      const txs = await this.getTransactions();
      const cats = await this.getCategories();
      const wallets = await this.getWallets();
      const methods = await this.getPaymentMethods();

      const catMap = new Map(cats.map(c => [c.id, c.name]));
      const walletMap = new Map(wallets.map(w => [w.id, w.name]));
      const methodMap = new Map(methods.map(m => [m.id, m.name]));

      return txs.map(t => {
        const d = new Date(t.date);
        const adjustedDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
          return {
              date: t.date,
              dateFormatted: adjustedDate.toLocaleDateString('pt-BR'),
              title: t.title,
              amount: t.amount,
              type: t.type === 'income' ? 'Receita' : 'Despesa',
              categoryName: catMap.get(t.categoryId || '') || 'Sem Categoria',
              walletName: walletMap.get(t.walletId || '') || 'Conta Padrão',
              methodName: methodMap.get(t.paymentMethodId || '') || 'Outros',
              isInstallment: (t.installmentTotal || 0) > 1,
              installmentInfo: t.installmentTotal ? `${t.installmentNumber}/${t.installmentTotal}` : ''
          };
      });
  }

  async exportData(): Promise<string> {
      const data = await this.getExportableData();
      const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria', 'Conta', 'Método'];
      const rows = data.map(t => [
          t.dateFormatted,
          `"${t.title.replace(/"/g, '""')}"`,
          t.amount.toFixed(2).replace('.', ','),
          t.type,
          `"${t.categoryName}"`,
          `"${t.walletName}"`,
          `"${t.methodName}"`
      ]);
      return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  }

  async exportExcelData(): Promise<string> {
      return this.exportData();
  }

  async createFullBackup(): Promise<string> {
    const txs = await this.getTransactions();
    const cats = await this.getCategories();
    const wallets = await this.getWallets();
    const methods = await this.getPaymentMethods();
    const goals = await this.getGoals();
    return JSON.stringify({ transactions: txs, categories: cats, wallets, methods, goals }, null, 2);
  }

  async importData(s: string): Promise<{ success: boolean; message?: string }> {
    try {
        const data = JSON.parse(s);
        if (!data || !data.transactions) return { success: false, message: 'Arquivo inválido.' };
        // Mock import logic
        return { success: true, message: 'Importação simulada com sucesso.' };
    } catch (e) {
        return { success: false, message: 'Erro ao ler JSON.' };
    }
  }

  async updateEmail(e: string): Promise<{ success: boolean; type?: string; message?: string }> {
      const { data, error } = await this.supabase.auth.updateUser({ email: e });
      if (error) return { success: false, message: error.message };
      // Check if confirmed immediately
      if (data.user?.email === e) return { success: true, type: 'updated' };
      return { success: true, type: 'confirm' };
  }
}

export const db = new DatabaseService();
