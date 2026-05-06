import type { Category } from '../types/finance.types';

export const sortCategoriesByOrder = (categories: Category[]) => {
    return [...categories].sort((categoryA, categoryB) => {
        const orderA = Number(categoryA.orderNum) || 0;
        const orderB = Number(categoryB.orderNum) || 0;
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return categoryA.name.localeCompare(categoryB.name);
    });
};
