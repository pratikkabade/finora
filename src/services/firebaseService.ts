import { db } from '../config/firebase';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  FieldValue,
} from 'firebase/firestore';
import type {
  Account,
  Category,
  FinanceData,
  PlannedPaymentRule,
  Settings,
  Transaction,
} from '../types/finance.types';

const FIREBASE_COLLECTION = 'users';
const FIREBASE_READ_TIMEOUT_MS = 5000;
const FIREBASE_COLLECTION_READ_TIMEOUT_MS = 15000;
const FIREBASE_WRITE_TIMEOUT_MS = 20000;
const FIREBASE_FULL_BACKUP_TIMEOUT_MS = 60000;
const FIREBASE_FETCH_MAX_RETRIES = 1;
const FIREBASE_RETRY_DELAY_MS = 350;
const FIREBASE_BATCH_OPERATION_LIMIT = 450;
const FIREBASE_SCHEMA_VERSION = 2;
const FIREBASE_BACKUP_FORMAT = 'normalized';
const TRANSIENT_FIREBASE_ERROR_CODES = new Set(['unavailable', 'deadline-exceeded']);

type FirebaseErrorLike = Error & { code?: string; message?: string };
type FinanceCollectionName = 'accounts' | 'categories' | 'transactions' | 'plannedPaymentRules' | 'settings';
type FinanceCollectionItem = Account | Category | Transaction | PlannedPaymentRule | Settings;
type BatchOperation = (batch: ReturnType<typeof writeBatch>) => void;

export interface FirebaseFinanceData extends FinanceData {
  lastSynced?: FieldValue;
  lastModified?: FieldValue;
  __source?: 'normalized' | 'legacy';
}

export interface FinanceDataPatch {
  accounts?: Account[];
  categories?: Category[];
  transactions?: Transaction[];
  plannedPaymentRules?: PlannedPaymentRule[];
  settings?: Settings[];
  sharedPrefs?: Record<string, string>;
}

export interface FinanceDataDeletes {
  accounts?: string[];
  categories?: string[];
  transactions?: string[];
  plannedPaymentRules?: string[];
  settings?: string[];
}

interface FetchFinanceDataOptions {
  throwOnTransientError?: boolean;
}

const collectionNames: FinanceCollectionName[] = [
  'accounts',
  'categories',
  'transactions',
  'plannedPaymentRules',
  'settings',
];

const delay = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms);
});

const withTimeout = async <T>(operation: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error(timeoutMessage) as FirebaseErrorLike;
      timeoutError.code = 'deadline-exceeded';
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

const getFirebaseErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  if (!('code' in error)) {
    return undefined;
  }

  const codeValue = (error as { code: unknown }).code;
  return typeof codeValue === 'string' ? codeValue : undefined;
};

const isTransientFirebaseError = (error: unknown): boolean => {
  const code = getFirebaseErrorCode(error);
  return code ? TRANSIENT_FIREBASE_ERROR_CODES.has(code) : false;
};

const toFirebaseErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const messageValue = (error as { message: unknown }).message;
    if (typeof messageValue === 'string' && messageValue.trim().length > 0) {
      return messageValue;
    }
  }
  return fallback;
};

const mapBackupError = (userId: string, error: unknown): Error => {
  const code = getFirebaseErrorCode(error);
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return new Error('Firebase is currently unavailable or timed out. Please check your internet connection and try again.');
  }

  if (code === 'permission-denied') {
    console.error('Permission error details:', {
      code,
      message: toFirebaseErrorMessage(error, 'Unknown permission error'),
      userId,
    });
    return new Error(
      'Permission denied: Firestore security rules may not be configured correctly.\n\n' +
      'Quick Fix:\n' +
      '1. Go to Firebase Console -> Firestore Database -> Rules\n' +
      '2. Replace rules with the ones in FIREBASE_SETUP.md\n' +
      '3. Click "Publish"\n' +
      '4. Refresh browser and try again'
    );
  }

  return error instanceof Error ? error : new Error('Failed to back up data to Firebase.');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const stripUndefinedValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedValues);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefinedValues(entryValue)]),
  );
};

const getUserDocRef = (userId: string) => doc(db, FIREBASE_COLLECTION, userId);

const getCollectionRef = (userId: string, collectionName: FinanceCollectionName) => {
  return collection(getUserDocRef(userId), collectionName);
};

const getItemDocRef = (userId: string, collectionName: FinanceCollectionName, itemId: string) => {
  return doc(getCollectionRef(userId, collectionName), itemId);
};

const getItemId = (item: FinanceCollectionItem): string => item.id;

const buildRootMetadata = (data: FinanceData) => ({
  backupFormat: FIREBASE_BACKUP_FORMAT,
  schemaVersion: FIREBASE_SCHEMA_VERSION,
  sharedPrefs: data.sharedPrefs || {},
  counts: {
    accounts: data.accounts.length,
    categories: data.categories.length,
    transactions: data.transactions.length,
    plannedPaymentRules: data.plannedPaymentRules.length,
    settings: data.settings.length,
  },
  lastSynced: serverTimestamp(),
  lastModified: serverTimestamp(),
  accounts: deleteField(),
  categories: deleteField(),
  transactions: deleteField(),
  plannedPaymentRules: deleteField(),
  settings: deleteField(),
});

const commitOperationsInChunks = async (operations: BatchOperation[]): Promise<void> => {
  for (let index = 0; index < operations.length; index += FIREBASE_BATCH_OPERATION_LIMIT) {
    const batch = writeBatch(db);
    operations
      .slice(index, index + FIREBASE_BATCH_OPERATION_LIMIT)
      .forEach((operation) => operation(batch));
    await batch.commit();
  }
};

const getExistingDocumentIds = async (
  userId: string,
  collectionName: FinanceCollectionName,
): Promise<Set<string>> => {
  const snapshot = await getDocs(getCollectionRef(userId, collectionName));
  return new Set(snapshot.docs.map((documentSnapshot) => documentSnapshot.id));
};

const addSetOperations = <T extends FinanceCollectionItem>(
  operations: BatchOperation[],
  userId: string,
  collectionName: FinanceCollectionName,
  items: T[],
) => {
  items.forEach((item) => {
    operations.push((batch) => {
      batch.set(
        getItemDocRef(userId, collectionName, getItemId(item)),
        stripUndefinedValues(item) as Record<string, unknown>,
      );
    });
  });
};

const addDeleteOperationsForRemovedItems = async <T extends FinanceCollectionItem>(
  operations: BatchOperation[],
  userId: string,
  collectionName: FinanceCollectionName,
  currentItems: T[],
) => {
  const currentIds = new Set(currentItems.map(getItemId));
  const existingIds = await getExistingDocumentIds(userId, collectionName);

  existingIds.forEach((existingId) => {
    if (currentIds.has(existingId)) return;

    operations.push((batch) => {
      batch.delete(getItemDocRef(userId, collectionName, existingId));
    });
  });
};

const fetchCollectionItems = async <T extends FinanceCollectionItem>(
  userId: string,
  collectionName: FinanceCollectionName,
): Promise<T[]> => {
  const snapshot = await getDocs(getCollectionRef(userId, collectionName));
  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  })) as T[];
};

const fetchNormalizedFinanceData = async (
  userId: string,
  rootData: Record<string, unknown>,
): Promise<FirebaseFinanceData> => {
  const [
    accounts,
    categories,
    transactions,
    plannedPaymentRules,
    settings,
  ] = await Promise.all([
    fetchCollectionItems<Account>(userId, 'accounts'),
    fetchCollectionItems<Category>(userId, 'categories'),
    fetchCollectionItems<Transaction>(userId, 'transactions'),
    fetchCollectionItems<PlannedPaymentRule>(userId, 'plannedPaymentRules'),
    fetchCollectionItems<Settings>(userId, 'settings'),
  ]);

  const sharedPrefs = isRecord(rootData.sharedPrefs)
    ? Object.fromEntries(
      Object.entries(rootData.sharedPrefs).filter((entry): entry is [string, string] => {
        return typeof entry[1] === 'string';
      }),
    )
    : {};

  return {
    accounts,
    categories,
    transactions,
    plannedPaymentRules,
    settings,
    sharedPrefs,
    __source: 'normalized',
  };
};

const isNormalizedBackup = (rootData: Record<string, unknown>): boolean => {
  return rootData.backupFormat === FIREBASE_BACKUP_FORMAT || rootData.schemaVersion === FIREBASE_SCHEMA_VERSION;
};

const isLegacyFinanceData = (rootData: Record<string, unknown>): boolean => {
  return Array.isArray(rootData.accounts)
    && Array.isArray(rootData.categories)
    && Array.isArray(rootData.transactions);
};

/**
 * Fetch finance data from Firestore for a specific user.
 * Reads the normalized subcollection layout first, with a legacy root-document fallback.
 */
export async function fetchFinanceDataFromFirebase(
  userId: string,
  options: FetchFinanceDataOptions = {}
): Promise<FirebaseFinanceData | null> {
  const { throwOnTransientError = false } = options;
  const docRef = getUserDocRef(userId);

  for (let attempt = 0; attempt <= FIREBASE_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      const docSnap = await withTimeout(
        getDoc(docRef),
        FIREBASE_READ_TIMEOUT_MS,
        'Firebase fetch timed out.'
      );

      if (!docSnap.exists()) {
        return null;
      }

      const rootData = docSnap.data();
      if (isNormalizedBackup(rootData)) {
        return await withTimeout(
          fetchNormalizedFinanceData(userId, rootData),
          FIREBASE_COLLECTION_READ_TIMEOUT_MS,
          'Firebase restore timed out.'
        );
      }

      if (isLegacyFinanceData(rootData)) {
        const legacyData = rootData as Partial<FinanceData>;
        return {
          accounts: Array.isArray(legacyData.accounts) ? legacyData.accounts : [],
          categories: Array.isArray(legacyData.categories) ? legacyData.categories : [],
          transactions: Array.isArray(legacyData.transactions) ? legacyData.transactions : [],
          plannedPaymentRules: Array.isArray(legacyData.plannedPaymentRules) ? legacyData.plannedPaymentRules : [],
          settings: Array.isArray(legacyData.settings) ? legacyData.settings : [],
          sharedPrefs: isRecord(rootData.sharedPrefs) ? rootData.sharedPrefs as Record<string, string> : {},
          __source: 'legacy',
        };
      }

      return null;
    } catch (error) {
      const shouldRetry = isTransientFirebaseError(error) && attempt < FIREBASE_FETCH_MAX_RETRIES;
      if (shouldRetry) {
        await delay(FIREBASE_RETRY_DELAY_MS);
        continue;
      }

      if (isTransientFirebaseError(error)) {
        if (throwOnTransientError) {
          throw new Error('Firebase is currently unavailable or timed out. Please try again.');
        }
        console.warn('Firebase fetch unavailable; returning null to allow local fallback.');
        return null;
      }

      console.error('Error fetching from Firebase:', error);
      throw error;
    }
  }

  return null;
}

/**
 * Backup/sync a complete local snapshot to Firestore's normalized layout.
 */
export async function backupFinanceDataToFirebase(
  userId: string,
  data: FinanceData
): Promise<void> {
  try {
    const operations: BatchOperation[] = [
      (batch) => {
        batch.set(getUserDocRef(userId), buildRootMetadata(data), { merge: true });
      },
    ];

    addSetOperations(operations, userId, 'accounts', data.accounts);
    addSetOperations(operations, userId, 'categories', data.categories);
    addSetOperations(operations, userId, 'transactions', data.transactions);
    addSetOperations(operations, userId, 'plannedPaymentRules', data.plannedPaymentRules);
    addSetOperations(operations, userId, 'settings', data.settings);

    await Promise.all([
      addDeleteOperationsForRemovedItems(operations, userId, 'accounts', data.accounts),
      addDeleteOperationsForRemovedItems(operations, userId, 'categories', data.categories),
      addDeleteOperationsForRemovedItems(operations, userId, 'transactions', data.transactions),
      addDeleteOperationsForRemovedItems(operations, userId, 'plannedPaymentRules', data.plannedPaymentRules),
      addDeleteOperationsForRemovedItems(operations, userId, 'settings', data.settings),
    ]);

    await withTimeout(
      commitOperationsInChunks(operations),
      FIREBASE_FULL_BACKUP_TIMEOUT_MS,
      'Firebase backup timed out.'
    );
  } catch (error) {
    console.error('Error backing up to Firebase:', error);
    throw mapBackupError(userId, error);
  }
}

/**
 * Sync only the records that changed after a normalized backup already exists.
 */
export async function syncFinanceDataPatchToFirebase(
  userId: string,
  patch: FinanceDataPatch,
): Promise<void> {
  try {
    const operations: BatchOperation[] = [
      (batch) => {
        batch.set(getUserDocRef(userId), {
          backupFormat: FIREBASE_BACKUP_FORMAT,
          schemaVersion: FIREBASE_SCHEMA_VERSION,
          ...(patch.sharedPrefs ? { sharedPrefs: patch.sharedPrefs } : {}),
          lastSynced: serverTimestamp(),
          lastModified: serverTimestamp(),
        }, { merge: true });
      },
    ];

    addSetOperations(operations, userId, 'accounts', patch.accounts ?? []);
    addSetOperations(operations, userId, 'categories', patch.categories ?? []);
    addSetOperations(operations, userId, 'transactions', patch.transactions ?? []);
    addSetOperations(operations, userId, 'plannedPaymentRules', patch.plannedPaymentRules ?? []);
    addSetOperations(operations, userId, 'settings', patch.settings ?? []);

    await withTimeout(
      commitOperationsInChunks(operations),
      FIREBASE_WRITE_TIMEOUT_MS,
      'Firebase update timed out.'
    );
  } catch (error) {
    console.error('Error updating Firebase:', error);
    throw mapBackupError(userId, error);
  }
}

/**
 * Delete specific normalized records after they are removed locally.
 */
export async function deleteFinanceDataRecordsFromFirebase(
  userId: string,
  deletes: FinanceDataDeletes,
): Promise<void> {
  try {
    const operations: BatchOperation[] = [
      (batch) => {
        batch.set(getUserDocRef(userId), {
          backupFormat: FIREBASE_BACKUP_FORMAT,
          schemaVersion: FIREBASE_SCHEMA_VERSION,
          lastSynced: serverTimestamp(),
          lastModified: serverTimestamp(),
        }, { merge: true });
      },
    ];

    collectionNames.forEach((collectionName) => {
      (deletes[collectionName] ?? []).forEach((itemId) => {
        operations.push((batch) => {
          batch.delete(getItemDocRef(userId, collectionName, itemId));
        });
      });
    });

    await withTimeout(
      commitOperationsInChunks(operations),
      FIREBASE_WRITE_TIMEOUT_MS,
      'Firebase delete timed out.'
    );
  } catch (error) {
    console.error('Error deleting Firebase records:', error);
    throw mapBackupError(userId, error);
  }
}

/**
 * Update a specific field in Firestore. Kept for compatibility with older callers.
 */
export async function updateFinanceDataInFirebase(
  userId: string,
  updateData: Partial<FinanceData>
): Promise<void> {
  try {
    const docRef = getUserDocRef(userId);
    const dataToUpdate = {
      ...updateData,
      lastModified: serverTimestamp(),
    };

    await withTimeout(
      updateDoc(docRef, dataToUpdate),
      FIREBASE_WRITE_TIMEOUT_MS,
      'Firebase update timed out.'
    );
  } catch (error) {
    console.error('Error updating Firebase:', error);
    throw error;
  }
}

/**
 * Check if user already has data in Firestore.
 */
export async function hasUserDataInFirebase(userId: string): Promise<boolean> {
  try {
    const docSnap = await withTimeout(
      getDoc(getUserDocRef(userId)),
      FIREBASE_READ_TIMEOUT_MS,
      'Firebase fetch timed out.'
    );
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking user data:', error);
    return false;
  }
}

export async function clearNormalizedFinanceDataFromFirebase(userId: string): Promise<void> {
  try {
    await Promise.all(collectionNames.map(async (collectionName) => {
      const snapshot = await getDocs(getCollectionRef(userId, collectionName));
      await Promise.all(snapshot.docs.map((documentSnapshot) => deleteDoc(documentSnapshot.ref)));
    }));
  } catch (error) {
    console.error('Error clearing normalized Firebase data:', error);
    throw mapBackupError(userId, error);
  }
}
