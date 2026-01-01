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

export interface FirebaseFinanceData extends FinanceData {
  lastSynced?: FieldValue;
  lastModified?: FieldValue;
}

/**
 * Fetch finance data from Firestore for a specific user
 * Includes retry logic for offline scenarios
 */
export async function fetchFinanceDataFromFirebase(userId: string, retryCount = 0): Promise<FirebaseFinanceData | null> {
  try {
    const docRef = doc(db, FIREBASE_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as FirebaseFinanceData;
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching from Firebase:', error);
    
    // If offline error and haven't retried, wait and retry once
    if (error?.code === 'unavailable' && retryCount < 1) {
      console.log('Firebase unavailable, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchFinanceDataFromFirebase(userId, retryCount + 1);
    }
    
    // Return null for offline errors after retries (will use local cache or default)
    if (error?.code === 'unavailable') {
      console.warn('Firebase offline - using local cache or default data');
      return null;
    }
    
    throw error;
  }
}

/**
 * Backup/sync local finance data to Firestore
 */
export async function backupFinanceDataToFirebase(
  userId: string,
  data: FinanceData
): Promise<void> {
  try {
    console.log(`Backing up data for user: ${userId}`);
    const docRef = doc(db, FIREBASE_COLLECTION, userId);
    const dataToSave: FirebaseFinanceData = {
      ...data,
      lastSynced: serverTimestamp(),
      lastModified: serverTimestamp(),
    };

    await setDoc(docRef, dataToSave, { merge: true });
    console.log('✓ Data backed up to Firebase successfully');
  } catch (error: any) {
    console.error('✗ Error backing up to Firebase:', error);
    
    // Provide more helpful error message
    if (error?.code === 'unavailable') {
      throw new Error('Firebase is currently unavailable. Please check your internet connection and try again.');
    } else if (error?.code === 'permission-denied') {
      console.error('Permission Error Details:', {
        code: error.code,
        message: error.message,
        userId: userId
      });
      throw new Error(
        'Permission Denied: Firestore security rules may not be configured correctly.\n\n' +
        'Quick Fix:\n' +
        '1. Go to Firebase Console → Firestore Database → Rules\n' +
        '2. Replace rules with the ones in FIREBASE_SETUP.md\n' +
        '3. Click "Publish"\n' +
        '4. Refresh browser and try again'
      );
    }
    
    throw error;
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

    await updateDoc(docRef, dataToUpdate);
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
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking user data:', error);
    return false;
  }
}
