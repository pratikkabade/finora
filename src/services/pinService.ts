// PIN Authentication Service - Local Storage Only
const PIN_STORAGE_KEY = 'finora_user_pin';
const PIN_ATTEMPTS_KEY = 'finora_pin_attempts';
const PIN_LOCKED_TIME_KEY = 'finora_pin_locked_time';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 3 * 60 * 1000; // 3 minutes

export interface PINStatus {
  isPINSet: boolean;
  isLocked: boolean;
  attemptsLeft: number;
  timeUntilUnlock: number;
}

export const getPINStatus = (userId: string): PINStatus => {
  const attempts = parseInt(localStorage.getItem(`${PIN_ATTEMPTS_KEY}_${userId}`) || '0', 10);
  const lockedTime = parseInt(localStorage.getItem(`${PIN_LOCKED_TIME_KEY}_${userId}`) || '0', 10);
  const now = Date.now();

  let isLocked = false;
  let timeUntilUnlock = 0;

  if (lockedTime && now < lockedTime) {
    isLocked = true;
    timeUntilUnlock = lockedTime - now;
  } else if (lockedTime && now >= lockedTime) {
    // Unlock and reset attempts
    localStorage.removeItem(`${PIN_LOCKED_TIME_KEY}_${userId}`);
    localStorage.setItem(`${PIN_ATTEMPTS_KEY}_${userId}`, '0');
  }

  const pin = localStorage.getItem(`${PIN_STORAGE_KEY}_${userId}`);

  return {
    isPINSet: !!pin,
    isLocked,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts),
    timeUntilUnlock,
  };
};

export const setPIN = (userId: string, newPIN: string): boolean => {
  if (!newPIN || newPIN.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }

  // Simple hash - in production, use proper hashing
  const hashedPIN = btoa(newPIN + userId);
  localStorage.setItem(`${PIN_STORAGE_KEY}_${userId}`, hashedPIN);
  localStorage.setItem(`${PIN_ATTEMPTS_KEY}_${userId}`, '0');
  localStorage.removeItem(`${PIN_LOCKED_TIME_KEY}_${userId}`);

  return true;
};

export const verifyPIN = (userId: string, enteredPIN: string): boolean => {
  const status = getPINStatus(userId);

  if (status.isLocked) {
    throw new Error(
      `Account locked. Try again in ${Math.ceil(status.timeUntilUnlock / 1000)} seconds`
    );
  }

  const storedPIN = localStorage.getItem(`${PIN_STORAGE_KEY}_${userId}`);
  const hashedPIN = btoa(enteredPIN + userId);

  if (storedPIN === hashedPIN) {
    // Correct PIN - reset attempts
    localStorage.setItem(`${PIN_ATTEMPTS_KEY}_${userId}`, '0');
    localStorage.removeItem(`${PIN_LOCKED_TIME_KEY}_${userId}`);
    return true;
  } else {
    // Wrong PIN - increment attempts
    const currentAttempts = parseInt(
      localStorage.getItem(`${PIN_ATTEMPTS_KEY}_${userId}`) || '0',
      10
    );
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= MAX_ATTEMPTS) {
      // Lock the account
      const lockUntil = LOCK_DURATION_MS + Date.now();
      localStorage.setItem(`${PIN_LOCKED_TIME_KEY}_${userId}`, lockUntil.toString());
      throw new Error('Too many wrong attempts. Account locked for 15 minutes.');
    } else {
      localStorage.setItem(`${PIN_ATTEMPTS_KEY}_${userId}`, newAttempts.toString());
      throw new Error(
        `Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempt${
          MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''
        } remaining`
      );
    }
  }
};

export const clearPIN = (userId: string): void => {
  localStorage.removeItem(`${PIN_STORAGE_KEY}_${userId}`);
  localStorage.removeItem(`${PIN_ATTEMPTS_KEY}_${userId}`);
  localStorage.removeItem(`${PIN_LOCKED_TIME_KEY}_${userId}`);
};

export const clearAccount = async (
    logout: () => Promise<void>
): Promise<void> => {
    if (window.confirm('All account data will be cleared. The application will reload.')) {
        localStorage.clear();
        window.location.reload();
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout');
        }
    }
};