const PIN_STORAGE_KEY = 'finora_user_pin';
const PIN_ATTEMPTS_KEY = 'finora_pin_attempts';
const PIN_LOCKED_TIME_KEY = 'finora_pin_locked_time';

export const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const LOCK_DURATION_MS = LOCK_DURATION_MINUTES * 60 * 1000;
const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);

const getScopedKey = (baseKey: string, userId: string) => `${baseKey}_${userId}`;

const getStoredNumber = (key: string) => {
    const storedValue = localStorage.getItem(key);
    const parsedValue = Number.parseInt(storedValue ?? '0', 10);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export interface PINStatus {
    isPINSet: boolean;
    isLocked: boolean;
    attemptsLeft: number;
    timeUntilUnlock: number;
}

export const getPINStatus = (userId: string): PINStatus => {
    const attemptsKey = getScopedKey(PIN_ATTEMPTS_KEY, userId);
    const lockKey = getScopedKey(PIN_LOCKED_TIME_KEY, userId);
    const pinKey = getScopedKey(PIN_STORAGE_KEY, userId);
    const now = Date.now();

    let attempts = getStoredNumber(attemptsKey);
    const lockedUntil = getStoredNumber(lockKey);
    let isLocked = false;
    let timeUntilUnlock = 0;

    if (lockedUntil > now) {
        isLocked = true;
        timeUntilUnlock = lockedUntil - now;
    } else if (lockedUntil) {
        localStorage.removeItem(lockKey);
        localStorage.setItem(attemptsKey, '0');
        attempts = 0;
    }

    return {
        isPINSet: !!localStorage.getItem(pinKey),
        isLocked,
        attemptsLeft: isLocked ? 0 : Math.max(0, MAX_ATTEMPTS - attempts),
        timeUntilUnlock,
    };
};

export const setPIN = (userId: string, newPIN: string): boolean => {
    if (!PIN_PATTERN.test(newPIN)) {
        throw new Error(`PIN must be exactly ${PIN_LENGTH} digits`);
    }

    const pinKey = getScopedKey(PIN_STORAGE_KEY, userId);
    const attemptsKey = getScopedKey(PIN_ATTEMPTS_KEY, userId);
    const lockKey = getScopedKey(PIN_LOCKED_TIME_KEY, userId);

    // This stays local to the device. If stronger protection is needed later,
    // we should switch to a proper crypto-based approach instead of obfuscation.
    const hashedPIN = btoa(newPIN + userId);
    localStorage.setItem(pinKey, hashedPIN);
    localStorage.setItem(attemptsKey, '0');
    localStorage.removeItem(lockKey);

    return true;
};

export const verifyPIN = (userId: string, enteredPIN: string): boolean => {
    if (!PIN_PATTERN.test(enteredPIN)) {
        throw new Error(`PIN must be exactly ${PIN_LENGTH} digits`);
    }

    const status = getPINStatus(userId);
    if (status.isLocked) {
        throw new Error('Account locked. Try again later.');
    }

    const pinKey = getScopedKey(PIN_STORAGE_KEY, userId);
    const attemptsKey = getScopedKey(PIN_ATTEMPTS_KEY, userId);
    const lockKey = getScopedKey(PIN_LOCKED_TIME_KEY, userId);
    const storedPIN = localStorage.getItem(pinKey);

    if (!storedPIN) {
        throw new Error('PIN is not set for this account');
    }

    const hashedPIN = btoa(enteredPIN + userId);
    if (storedPIN === hashedPIN) {
        localStorage.setItem(attemptsKey, '0');
        localStorage.removeItem(lockKey);
        return true;
    }

    const newAttempts = getStoredNumber(attemptsKey) + 1;
    localStorage.setItem(attemptsKey, newAttempts.toString());

    if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCK_DURATION_MS;
        localStorage.setItem(lockKey, lockUntil.toString());
        throw new Error(`Too many wrong attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`);
    }

    const attemptsLeft = MAX_ATTEMPTS - newAttempts;
    throw new Error(`Wrong PIN. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining`);
};

export const clearPIN = (userId: string): void => {
    localStorage.removeItem(getScopedKey(PIN_STORAGE_KEY, userId));
    localStorage.removeItem(getScopedKey(PIN_ATTEMPTS_KEY, userId));
    localStorage.removeItem(getScopedKey(PIN_LOCKED_TIME_KEY, userId));
};

export const clearAccount = async (logout: () => Promise<void>): Promise<void> => {
    if (!window.confirm('All account data will be cleared. The application will reload.')) {
        return;
    }

    try {
        await logout();
        localStorage.clear();
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout');
    }
};
