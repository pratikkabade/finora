import type { FinanceData } from '../types/finance.types';

const STORAGE_KEY_PREFIX = 'financeAppData_';
const LAST_SYNC_KEY_PREFIX = 'lastSync_';

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
 * Save finance data to localStorage for a specific user
 */
export function saveToLocalStorage(userId: string, data: FinanceData): void {
  try {
    const key = getUserStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(getLastSyncKey(userId), new Date().toISOString());
  } catch (error) {
    console.error('Error saving to localStorage:', error);
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
