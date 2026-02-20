const base = {
    interact: "active:scale-[0.97] select-none cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300",
    btn: (color: string, shade = 600) =>
        `bg-${color}-${shade} hover:bg-${color}-700`,
    flex: "flex items-center justify-center gap-2",
    fadeIn: "fade-in",
    whiteBtn: "text-gray-900! dark:text-white! bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl",
    whiteBtnInteract: "hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-slate-300 dark:hover:border-slate-600",
    redBtn: "text-red-600! dark:text-red-400! bg-red-50/50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50",
    redBtnInteract: "hover:bg-red-100/50 dark:hover:bg-red-900/30 cursor-pointer",
};

const freeBtn = `${base.fadeIn} px-4 py-2 rounded-2xl text-sm font-medium backdrop-blur-lg sm:flex-none`;

export const FreeBlueBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.btn("blue")} text-white`;
export const FreeRedBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.btn("red")} text-white`;
export const FreeWhiteBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.whiteBtn} ${base.whiteBtnInteract} justify-start`;

export const AppChartBtn = `${base.interact} ${base.whiteBtn} ${base.whiteBtnInteract} p-4 sm:p-5 md:p-3 text-left w-64 group`

export const ModalOut = "fixed inset-0 bg-white/50 dark:bg-gray-900/70 backdrop-blur-lg flex items-center justify-center z-50 p-4 sm:p-0"
export const ModalPopUp = "w-full max-w-sm sm:max-w-md mx-auto backdrop-blur-2xl rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl bg-white dark:bg-gray-800 fade-in"
export const ModalHeader = "flex items-center justify-between p-5 sm:p-7 backdrop-blur-md sticky top-0 rounded-t-3xl z-10"

export const settingBtnPlainClass = `${FreeWhiteBtn} w-full`;
export const settingBtnPlainNoHoverClass1 = `${freeBtn} ${base.flex} ${base.whiteBtn} shadow-none! cursor-default`;
export const settingBtnPlainNoHoverClass2 = "flex flex-row gap-4 items-center justify-start cursor-default";
export const settingBtnDangerClass = `${freeBtn} ${base.flex} ${base.redBtn} ${base.interact} ${base.redBtnInteract} w-full items-center justify-start cursor-default`;

export const settingBtnDetailTextClass = 'text-xs text-gray-600 dark:text-gray-400 mt-1';

export const transactionCard = `${base.interact} ${base.whiteBtn} ${base.whiteBtnInteract} p-3 sm:p-2 md:p-3`;
export const amountCard = `${base.whiteBtn} p-4 sm:p-5 md:p-6`;
export const pieChartCard = `${base.whiteBtn} p-3 sm:p-4 md:p-6 w-full md:flex-1`;
export const categorySelector = `${base.whiteBtn} p-3 sm:p-4 md:p-6 w-full`;