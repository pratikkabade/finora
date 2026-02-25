import type { FinanceData } from '../types/finance.types';
import { getCurrentOrPastTransactions } from '../utils/dateUtils';

const STORAGE_KEY_PREFIX = 'financeAppData_';
const LAST_SYNC_KEY_PREFIX = 'lastSync_';
const BALANCE_SUMMARY_KEY_PREFIX = 'balanceSummary_';
export const NET_BALANCE_ACCOUNT_IDS_PREF_KEY = 'net_balance_account_ids';

export interface BalanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  lastCalculatedAt: string;
}

/**
 * Get the storage key for a specific user
 */
function getUserStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Get the last sync timestamp key for a user
 */
function getLastSyncKey(userId: string): string {
  return `${LAST_SYNC_KEY_PREFIX}${userId}`;
}

/**
 * Get the balance summary key for a user
 */
function getBalanceSummaryKey(userId: string): string {
  return `${BALANCE_SUMMARY_KEY_PREFIX}${userId}`;
}

function parseNetBalanceAccountIdsPreference(rawValue?: string): string[] | null {
  if (!rawValue || rawValue.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    }

    if (typeof parsed === 'string') {
      return parsed.split(',').map(id => id.trim()).filter(Boolean);
    }
  } catch {
    return rawValue.split(',').map(id => id.trim()).filter(Boolean);
  }

  return null;
}

/**
 * Resolve which accounts should be included for net balance calculation.
 * Priority: sharedPrefs selection -> legacy account.includeInBalance -> all accounts.
 */
export function getIncludedNetBalanceAccountIds(data: FinanceData): string[] {
  const allAccountIds = data.accounts.map(account => account.id);
  if (allAccountIds.length === 0) return [];

  const preferredAccountIds = parseNetBalanceAccountIdsPreference(
    data.sharedPrefs?.[NET_BALANCE_ACCOUNT_IDS_PREF_KEY],
  );

  if (preferredAccountIds) {
    const validPreferredIds = preferredAccountIds.filter(id => allAccountIds.includes(id));
    if (validPreferredIds.length > 0) {
      return validPreferredIds;
    }
  }

  const hasLegacyIncludeFlag = data.accounts.some(account => account.includeInBalance === false);
  if (hasLegacyIncludeFlag) {
    return data.accounts
      .filter(account => account.includeInBalance !== false)
      .map(account => account.id);
  }

  return allAccountIds;
}

/**
 * Calculate summary values from finance data.
 */
export function calculateBalanceSummary(data: FinanceData): BalanceSummary {
  const includedAccountIds = new Set(getIncludedNetBalanceAccountIds(data));
  const validTransactions = getCurrentOrPastTransactions(data.transactions)
    .filter(transaction => includedAccountIds.has(transaction.accountId));

  const { totalIncome, totalExpense } = validTransactions.reduce(
    (acc, tx) => {
      if (tx.type === 'INCOME') {
        acc.totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        acc.totalExpense += tx.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0 },
  );

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount: validTransactions.length,
    lastCalculatedAt: new Date().toISOString(),
  };
}

/**
 * Save finance data to localStorage for a specific user
 */
export function saveToLocalStorage(userId: string, data: FinanceData): BalanceSummary | null {
  try {
    const key = getUserStorageKey(userId);
    const balanceSummary = calculateBalanceSummary(data);

    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(getBalanceSummaryKey(userId), JSON.stringify(balanceSummary));
    localStorage.setItem(getLastSyncKey(userId), new Date().toISOString());
    return balanceSummary;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return null;
  }
}

/**
 * Load finance data from localStorage for a specific user
 */
export function loadFromLocalStorage(userId: string): FinanceData | null {
  try {
    const key = getUserStorageKey(userId);
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as FinanceData;
    }
    return null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

/**
 * Load cached balance summary from localStorage for a specific user
 */
export function loadBalanceSummaryFromLocalStorage(userId: string): BalanceSummary | null {
  try {
    const key = getBalanceSummaryKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data) as BalanceSummary;
    if (
      typeof parsed.totalIncome === 'number' &&
      typeof parsed.totalExpense === 'number' &&
      typeof parsed.netBalance === 'number' &&
      typeof parsed.transactionCount === 'number'
    ) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Error loading balance summary from localStorage:', error);
    return null;
  }
}

/**
 * Get the last sync timestamp for a user
 */
export function getLastSyncTime(userId: string): Date | null {
  try {
    const key = getLastSyncKey(userId);
    const timestamp = localStorage.getItem(key);
    if (timestamp) {
      return new Date(timestamp);
    }
    return null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
}

/**
 * Clear all user data from localStorage
 */
export function clearUserData(userId: string): void {
  try {
    const key = getUserStorageKey(userId);
    localStorage.removeItem(key);
    localStorage.removeItem(getBalanceSummaryKey(userId));
    localStorage.removeItem(getLastSyncKey(userId));
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
}

/**
 * Check if user has local data
 */
export function hasLocalData(userId: string): boolean {
  const key = getUserStorageKey(userId);
  return localStorage.getItem(key) !== null;
}
