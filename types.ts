
export interface Transaction {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'income' | 'expense';
  icon: string;
  colorClass: string;
  bgClass: string;
  date: string;
  categoryId?: string;
  userId: string;
  created_at?: string;
  // Novos campos V2
  walletId?: string;
  paymentMethodId?: string;
  installmentNumber?: number; // 1
  installmentTotal?: number;  // 12
  installmentGroupId?: string;
  isFixed?: boolean;
  // Financiamento V3
  financingDetails?: {
    interestRate: number; // Taxa mensal
    loanAmount: number;   // Valor original financiado
    totalInterest: number; // Total de juros
  };
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  transactionCount?: number;
  spent?: number;
  budget?: number; // Limite do orçamento
  type: 'income' | 'expense' | 'both';
}

export interface Wallet {
  id: string;
  name: string;
  type: 'account' | 'cash' | 'savings' | 'investment';
  is_default: boolean;
  order?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  order?: number;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  icon: string;
  colorClass: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'ultra';
  created_at: string;
  theme: 'dark' | 'light' | 'amoled';
  accent_color: 'blue' | 'purple' | 'orange' | 'green';
  chart_style: 'detailed' | 'minimal';
  avatar_url?: string;
}

export interface NotificationSettings {
  user_id: string;
  alert_limit: boolean;
  alert_low_balance: boolean;
  alert_monthly_report: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
}

export interface SmartRule {
  id: string;
  user_id: string;
  keyword: string;
  category_id: string;
}

export interface UserStats {
  daysActive: number;
  totalTransactions: number;
  currentStreak: number;
  maxStreak: number;
}

export interface DashboardMetrics {
  balance: number;
  income: number;
  expense: number;
  monthVariationIncome: number;
  monthVariationExpense: number;
  projectedBalance: number;
  financialHealth: 'excellent' | 'good' | 'stable' | 'critical';
  yearlySavings: number;
  lastTransaction: Transaction | null;
  topExpenses: { title: string; count: number; categoryId: string; amount: number }[];
}

export interface MonthlyInsight {
  savings: number;
  biggestExpense: Transaction | null;
  topCategory: { name: string; total: number; color: string } | null;
}

// Relatório V2 Inteligente
export interface BudgetReport {
  totalBudget: number;
  totalSpent: number;
  remaining: number; // Saldo Livre (Orçamento - Gasto)
  
  // Novas Métricas V2
  fixedCosts: number; // Total de gastos fixos
  committedInstallments: number; // Total de parcelas
  variableSpent: number; // Gastos controláveis (Mercado, Lazer...)
  
  // Lista detalhada para a UI
  activeInstallmentsList: Transaction[]; 
  fixedCostsList: Transaction[];

  pace: 'slow' | 'on-track' | 'fast' | 'critical'; // Ritmo de gastos vs dias do mês
  daysPassedPct: number; // % do mês que passou
  budgetConsumedPct: number; // % do orçamento consumido
  
  categories: Category[];
  alertCategory: Category | null;
  goals: FinancialGoal[];
}