import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  FieldValue,
} from 'firebase/firestore';
import type { FinanceData } from '../types/finance.types';

const FIREBASE_COLLECTION = 'users';
const FIREBASE_READ_TIMEOUT_MS = 5000;
const FIREBASE_WRITE_TIMEOUT_MS = 20000;
const FIREBASE_FETCH_MAX_RETRIES = 1;
const FIREBASE_RETRY_DELAY_MS = 350;
const TRANSIENT_FIREBASE_ERROR_CODES = new Set(['unavailable', 'deadline-exceeded']);

type FirebaseErrorLike = Error & { code?: string; message?: string };

export interface FirebaseFinanceData extends FinanceData {
  lastSynced?: FieldValue;
  lastModified?: FieldValue;
}

interface FetchFinanceDataOptions {
  throwOnTransientError?: boolean;
}

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

/**
 * Fetch finance data from Firestore for a specific user
 * Uses a short timeout and retry to avoid long UI blocking.
 */
export async function fetchFinanceDataFromFirebase(
  userId: string,
  options: FetchFinanceDataOptions = {}
): Promise<FirebaseFinanceData | null> {
  const { throwOnTransientError = false } = options;
  const docRef = doc(db, FIREBASE_COLLECTION, userId);

  for (let attempt = 0; attempt <= FIREBASE_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      const docSnap = await withTimeout(
        getDoc(docRef),
        FIREBASE_READ_TIMEOUT_MS,
        'Firebase fetch timed out.'
      );
      return docSnap.exists() ? (docSnap.data() as FirebaseFinanceData) : null;
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
 * Backup/sync local finance data to Firestore
 */
export async function backupFinanceDataToFirebase(
  userId: string,
  data: FinanceData
): Promise<void> {
  try {
    const docRef = doc(db, FIREBASE_COLLECTION, userId);
    const dataToSave: FirebaseFinanceData = {
      ...data,
      lastSynced: serverTimestamp(),
      lastModified: serverTimestamp(),
    };

    await withTimeout(
      setDoc(docRef, dataToSave, { merge: true }),
      FIREBASE_WRITE_TIMEOUT_MS,
      'Firebase backup timed out.'
    );
  } catch (error) {
    console.error('Error backing up to Firebase:', error);
    throw mapBackupError(userId, error);
  }
}

/**
 * Update a specific field in Firestore (for real-time sync)
 */
export async function updateFinanceDataInFirebase(
  userId: string,
  updateData: Partial<FinanceData>
): Promise<void> {
  try {
    const docRef = doc(db, FIREBASE_COLLECTION, userId);
    const dataToUpdate: any = {
      ...updateData,
      lastModified: serverTimestamp(),
    };

    await withTimeout(
      updateDoc(docRef, dataToUpdate),
      FIREBASE_WRITE_TIMEOUT_MS,
      'Firebase update timed out.'
    );
    console.log('Data updated in Firebase successfully');
  } catch (error) {
    console.error('Error updating Firebase:', error);
    throw error;
  }
}

/**
 * Check if user already has data in Firestore
 */
export async function hasUserDataInFirebase(userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, FIREBASE_COLLECTION, userId);
    const docSnap = await withTimeout(
      getDoc(docRef),
      FIREBASE_READ_TIMEOUT_MS,
      'Firebase fetch timed out.'
    );
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking user data:', error);
    return false;
  }
}
