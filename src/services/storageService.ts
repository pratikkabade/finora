import type { FinanceData } from '../types/finance.types';
import { getCurrentOrPastTransactions } from '../utils/dateUtils';

const STORAGE_KEY_PREFIX = 'financeAppData_';
const LAST_SYNC_KEY_PREFIX = 'lastSync_';
const LAST_CLOUD_BACKUP_DATE_KEY_PREFIX = 'lastCloudBackupDate_';
const LOCAL_MODIFIED_DATE_KEY_PREFIX = 'localModifiedDate_';
const LOCAL_SYNC_QUEUE_KEY_PREFIX = 'localSyncQueue_';
const BALANCE_SUMMARY_KEY_PREFIX = 'balanceSummary_';
export const NET_BALANCE_ACCOUNT_IDS_PREF_KEY = 'net_balance_account_ids';

export type LocalSyncCollectionName = 'accounts' | 'categories' | 'transactions' | 'plannedPaymentRules' | 'settings';

export interface LocalSyncQueue {
  needsFullBackup: boolean;
  updated: Record<LocalSyncCollectionName, string[]>;
  deleted: Record<LocalSyncCollectionName, string[]>;
  sharedPrefs: boolean;
}

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

function getLastCloudBackupDateKey(userId: string): string {
  return `${LAST_CLOUD_BACKUP_DATE_KEY_PREFIX}${userId}`;
}

function getLocalModifiedDateKey(userId: string): string {
  return `${LOCAL_MODIFIED_DATE_KEY_PREFIX}${userId}`;
}

function getLocalSyncQueueKey(userId: string): string {
  return `${LOCAL_SYNC_QUEUE_KEY_PREFIX}${userId}`;
}

/**
 * Get the balance summary key for a user
 */
function getBalanceSummaryKey(userId: string): string {
  return `${BALANCE_SUMMARY_KEY_PREFIX}${userId}`;
}

const localSyncCollections: LocalSyncCollectionName[] = [
  'accounts',
  'categories',
  'transactions',
  'plannedPaymentRules',
  'settings',
];

const createEmptyLocalSyncQueue = (): LocalSyncQueue => ({
  needsFullBackup: false,
  updated: {
    accounts: [],
    categories: [],
    transactions: [],
    plannedPaymentRules: [],
    settings: [],
  },
  deleted: {
    accounts: [],
    categories: [],
    transactions: [],
    plannedPaymentRules: [],
    settings: [],
  },
  sharedPrefs: false,
});

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const normalizeLocalSyncQueue = (value: unknown): LocalSyncQueue => {
  const queue = createEmptyLocalSyncQueue();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return queue;
  }

  const record = value as Partial<LocalSyncQueue>;
  queue.needsFullBackup = record.needsFullBackup === true;
  queue.sharedPrefs = record.sharedPrefs === true;

  localSyncCollections.forEach((collectionName) => {
    queue.updated[collectionName] = uniqueValues(
      Array.isArray(record.updated?.[collectionName]) ? record.updated[collectionName] : [],
    );
    queue.deleted[collectionName] = uniqueValues(
      Array.isArray(record.deleted?.[collectionName]) ? record.deleted[collectionName] : [],
    );
  });

  return queue;
};

export function getLocalSyncQueue(userId: string): LocalSyncQueue {
  try {
    const rawValue = localStorage.getItem(getLocalSyncQueueKey(userId));
    return rawValue ? normalizeLocalSyncQueue(JSON.parse(rawValue)) : createEmptyLocalSyncQueue();
  } catch (error) {
    console.error('Error getting local sync queue:', error);
    return createEmptyLocalSyncQueue();
  }
}

function saveLocalSyncQueue(userId: string, queue: LocalSyncQueue): void {
  localStorage.setItem(getLocalSyncQueueKey(userId), JSON.stringify(queue));
}

export function clearLocalSyncQueue(userId: string): void {
  try {
    localStorage.removeItem(getLocalSyncQueueKey(userId));
  } catch (error) {
    console.error('Error clearing local sync queue:', error);
  }
}

export function markLocalSyncNeedsFullBackup(userId: string): void {
  try {
    const queue = getLocalSyncQueue(userId);
    saveLocalSyncQueue(userId, { ...queue, needsFullBackup: true });
  } catch (error) {
    console.error('Error marking full sync required:', error);
  }
}

export function queueLocalSyncUpdates(
  userId: string,
  collectionName: LocalSyncCollectionName,
  itemIds: string[],
): void {
  try {
    const queue = getLocalSyncQueue(userId);
    const nextUpdatedIds = new Set(queue.updated[collectionName]);
    const nextDeletedIds = new Set(queue.deleted[collectionName]);

    itemIds.filter(Boolean).forEach((itemId) => {
      nextDeletedIds.delete(itemId);
      nextUpdatedIds.add(itemId);
    });

    queue.updated[collectionName] = Array.from(nextUpdatedIds);
    queue.deleted[collectionName] = Array.from(nextDeletedIds);
    saveLocalSyncQueue(userId, queue);
  } catch (error) {
    console.error('Error queueing local sync update:', error);
  }
}

export function queueLocalSyncDeletes(
  userId: string,
  collectionName: LocalSyncCollectionName,
  itemIds: string[],
): void {
  try {
    const queue = getLocalSyncQueue(userId);
    const nextUpdatedIds = new Set(queue.updated[collectionName]);
    const nextDeletedIds = new Set(queue.deleted[collectionName]);

    itemIds.filter(Boolean).forEach((itemId) => {
      nextUpdatedIds.delete(itemId);
      nextDeletedIds.add(itemId);
    });

    queue.updated[collectionName] = Array.from(nextUpdatedIds);
    queue.deleted[collectionName] = Array.from(nextDeletedIds);
    saveLocalSyncQueue(userId, queue);
  } catch (error) {
    console.error('Error queueing local sync delete:', error);
  }
}

export function queueLocalSyncSharedPrefs(userId: string): void {
  try {
    const queue = getLocalSyncQueue(userId);
    saveLocalSyncQueue(userId, { ...queue, sharedPrefs: true });
  } catch (error) {
    console.error('Error queueing shared preferences sync:', error);
  }
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
export function saveToLocalStorage(
  userId: string,
  data: FinanceData,
  options: { markModified?: boolean } = {},
): BalanceSummary | null {
  try {
    const { markModified = true } = options;
    const key = getUserStorageKey(userId);
    const balanceSummary = calculateBalanceSummary(data);

    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(getBalanceSummaryKey(userId), JSON.stringify(balanceSummary));
    if (markModified) {
      localStorage.setItem(getLocalModifiedDateKey(userId), new Date().toISOString());
    }
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
    const key = getLastCloudBackupDateKey(userId);
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

export function getLastCloudBackupDate(userId: string): string | null {
  try {
    return localStorage.getItem(getLastCloudBackupDateKey(userId));
  } catch (error) {
    console.error('Error getting last cloud backup date:', error);
    return null;
  }
}

export function setLastCloudBackupDate(userId: string, timestamp: string): void {
  try {
    localStorage.setItem(getLastCloudBackupDateKey(userId), timestamp);
    localStorage.setItem(getLastSyncKey(userId), timestamp);
  } catch (error) {
    console.error('Error setting last cloud backup date:', error);
  }
}

export function getLocalModifiedDate(userId: string): string | null {
  try {
    return localStorage.getItem(getLocalModifiedDateKey(userId));
  } catch (error) {
    console.error('Error getting local modified date:', error);
    return null;
  }
}

export function setLocalModifiedDate(userId: string, timestamp: string): void {
  try {
    localStorage.setItem(getLocalModifiedDateKey(userId), timestamp);
  } catch (error) {
    console.error('Error setting local modified date:', error);
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
    localStorage.removeItem(getLastCloudBackupDateKey(userId));
    localStorage.removeItem(getLocalModifiedDateKey(userId));
    localStorage.removeItem(getLocalSyncQueueKey(userId));
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
