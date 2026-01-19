export interface Account {
  id: string;
  name: string;
  currency: string;
  color: number;
  icon: string;
  orderNum?: number;
  isSynced: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: number;
  icon: string;
  orderNum: number;
  isSynced: boolean;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  toAmount?: number;
  title?: string;
  description?: string;
  dateTime?: number;
  dueDate?: number;
  categoryId?: string;
  recurringRuleId?: string;
  isSynced?: boolean;
}

export interface PlannedPaymentRule {
  id: string;
  startDate: number;
  intervalN: number;
  intervalType: string;
  oneTime: boolean;
  type: TransactionType;
  accountId: string;
  amount: number;
  categoryId: string;
  title: string;
}

export interface Settings {
  id: string;
  name: string;
  theme: string;
  currency: string;
  bufferAmount: number;
  settingName?: string;
  settingCurrency?: string;
}

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  plannedPaymentRules: PlannedPaymentRule[];
  settings: Settings[];
  transactions: Transaction[];
  sharedPrefs: Record<string, string>;
}