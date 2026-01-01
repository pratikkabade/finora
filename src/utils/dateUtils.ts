export const getFormattedDate = (timestamp: number): string => {
    const date = timestamp;
    const seconds = Math.floor(date / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) {
        return `few seconds.`;
    } else {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}.`;
    }
}

export const updateTime = (lastSyncTime: number, setDisplayTime: (time: string) => void, setNeedSync: (needSync: boolean) => void) => {
    const now = Date.now();
    const diff = now - lastSyncTime;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        setDisplayTime('just now');
    } else if (minutes < 60) {
        setDisplayTime(`${minutes}m ago`);
    } else if (hours < 24) {
        setDisplayTime(`${hours}h ago`);
    } else {
        setDisplayTime(`${days}d ago`);
        setNeedSync(true);
    }
};

export const getMonthYear = (date: Date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  return { month, year };
};

export const getMonthName = (month: number) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

export const generateMonthYearOptions = (transactions: any[]) => {
  const monthYearSet = new Set<string>();
  
  transactions.forEach(t => {
    const timestamp = t.dateTime || t.dueDate;
    if (timestamp) {
      const date = new Date(timestamp);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthYearSet.add(key);
    }
  });

  const options = Array.from(monthYearSet).map(key => {
    const [year, month] = key.split('-');
    return {
      value: key,
      label: `${getMonthName(parseInt(month))} ${year}`,
      year: parseInt(year),
      month: parseInt(month)
    };
  });

  return options.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

export const isCurrentMonth = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  return date.getMonth() === now.getMonth() && 
         date.getFullYear() === now.getFullYear();
};

export const filterTransactionsByMonth = (transactions: any[], month: number, year: number) => {
  return transactions.filter(t => {
    const timestamp = t.dateTime || t.dueDate;
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    return date.getMonth() === month && date.getFullYear() === year;
  });
};

export const getCurrentOrPastTransactions = (transactions: any[]) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return transactions.filter(t => {
    // Skip planned payments (those with recurringRuleId but no dateTime)
    if (t.recurringRuleId && !t.dateTime) return false;
    
    const timestamp = t.dateTime || t.dueDate;
    if (!timestamp) return false;
    
    const date = new Date(timestamp);
    const transactionYear = date.getFullYear();
    const transactionMonth = date.getMonth();
    
    // Include if year is less than current year
    if (transactionYear < currentYear) return true;
    
    // Include if same year and month is less than or equal to current month
    if (transactionYear === currentYear && transactionMonth <= currentMonth) return true;
    
    return false;
  });
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};