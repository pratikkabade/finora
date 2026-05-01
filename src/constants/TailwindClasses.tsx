const base = {
    interact: "cursor-pointer select-none transition-[transform,box-shadow,border-color,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 transition-all",
    btn: (color: string, shade = 600) =>
        `bg-${color}-${shade} hover:bg-${color}-700`,
    btnRed: "bg-linear-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
    btnGreen: "bg-linear-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
    btnBlue: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-700/80",
    flex: "flex items-center justify-center gap-2",
    cardFrame: "relative overflow-hidden rounded-[1.75rem] text-slate-900 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.36)] backdrop-blur-2xl dark:text-slate-50",
    cardInteract: "transition-[box-shadow,border-color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-slate-300/80 hover:shadow-[0_28px_72px_-34px_rgba(15,23,42,0.46)] dark:hover:border-slate-500/70",
    whiteBtn: "app-border-surface relative overflow-hidden rounded-2xl bg-slate-100 text-slate-900 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:bg-slate-800 dark:text-slate-50",
    greenBtn: "text-green-600! dark:text-green-300! bg-green-50/75 dark:bg-green-950/40 border border-green-200/70 dark:border-green-800/60",
    whiteBtnDisabled: "app-border-surface relative overflow-hidden rounded-2xl bg-slate-50 text-slate-900 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:bg-slate-900 dark:text-slate-50 border border-slate-400 dark:border-slate-600",
    whiteBtnInteract: "hover:bg-slate-200 hover:shadow-[0_22px_50px_-26px_rgba(15,23,42,0.46)] dark:hover:bg-slate-800/70",
    redBtn: "text-red-600! dark:text-red-300! bg-red-50/75 dark:bg-red-950/40 border border-red-200/70 dark:border-red-800/60",
    redBtnInteract: "hover:bg-red-100/70 hover:shadow-[0_20px_46px_-28px_rgba(225,29,72,0.36)] dark:hover:bg-red-900/40",
};

const freeBtn = "px-4 py-2 rounded-2xl text-sm font-medium backdrop-blur-lg sm:flex-none";
const standardCardSurface = "app-border-surface bg-white/82 dark:bg-slate-950/55";
const softPanelSurface = "app-border-soft bg-white/72 dark:bg-slate-900/52";

export const FreeBlueBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.btnBlue} text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.55)]`;
export const FreeRedBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.btnRed} text-white shadow-[0_18px_46px_-26px_rgba(225,29,72,0.58)]`;
export const FreeGreenBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.greenBtn} justify-start`;
export const FreeWhiteBtn = `${freeBtn} ${base.flex} ${base.interact} ${base.whiteBtn} ${base.whiteBtnInteract} justify-start`;
export const FreeWhiteBtnDisabled = `${freeBtn} ${base.flex} ${base.whiteBtnDisabled} cursor-not-allowed justify-start`;

export const SegmentedToggleShell = 'app-border-soft rounded-2xl border border-slate-300/75 bg-slate-200/78 p-0.5 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.34)] backdrop-blur-xl dark:border-slate-700/65 dark:bg-slate-900/60';
export const SegmentedToggleTrack = 'relative grid grid-cols-2 gap-0';
export const SegmentedToggleThumb = 'pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-[0.95rem] border border-slate-300/90 bg-white shadow-[0_12px_30px_-18px_rgba(37,99,235,0.35)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-slate-700/65 dark:bg-gray-800/88 dark:shadow-[0_12px_30px_-18px_rgba(37,99,235,0.45)]';
export const SegmentedToggleItemSelected = 'relative z-10 flex items-center justify-center gap-2 rounded-[0.95rem] border border-transparent px-3 py-2.5 text-sm font-semibold text-blue-700 transition-all duration-300 cursor-pointer dark:text-blue-200';
export const SegmentedToggleItemUnselected = 'relative z-10 flex items-center justify-center gap-2 rounded-[0.95rem] border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-300 cursor-pointer hover:bg-white/32 hover:text-blue-800 dark:text-gray-400 dark:hover:bg-slate-800/20 dark:hover:text-blue-200';
export const SegmentedToggleStatusRow = 'mt-2 flex items-center gap-2 px-2 text-xs text-gray-600 transition-all duration-300 dark:text-gray-400';

export const AppChartBtn = `${base.cardFrame} ${softPanelSurface} app-card-spotlight p-4 text-left shadow-[0_18px_48px_-30px_rgba(15,23,42,0.34)] sm:p-5 md:p-4`

export const ModalOut = "app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/34 p-4 backdrop-blur-xl sm:p-0";
export const ModalPopUp = "app-modal-panel app-border-soft mx-auto max-h-[90vh] w-full overflow-y-auto rounded-[2rem] bg-white/92 shadow-[0_32px_90px_-38px_rgba(15,23,42,0.58)] backdrop-blur-2xl dark:bg-slate-900/92";
export const ModalHeader = "app-divider-border sticky top-0 z-10 flex items-center justify-between bg-white/62 p-5 backdrop-blur-xl dark:bg-slate-900/55 sm:p-7";

export const settingBtnPlainClass = `${FreeWhiteBtn} w-full`;
export const settingBtnInteractiveClass = settingBtnPlainClass;
export const settingBtnPlainNoHoverClass1 = `${freeBtn} ${base.flex} ${base.whiteBtn} shadow-none! cursor-default`;
export const settingBtnPlainNoHoverClass2 = "flex flex-row gap-4 items-center justify-start cursor-default";
export const settingBtnDangerClass = `${freeBtn} ${base.flex} ${base.redBtn} ${base.interact} ${base.redBtnInteract} w-full items-center justify-start`;

export const settingBtnDetailTextClass = 'text-xs text-gray-600 dark:text-gray-400 mt-1';

export const transactionCard = `${base.cardFrame} ${standardCardSurface} ${base.cardInteract} p-3 transition-transform duration-200 active:scale-95 transition-all sm:p-3 md:p-4`;
export const amountCard = `${base.cardFrame} ${softPanelSurface} app-card-spotlight app-section-pop p-4 sm:p-5 md:p-6`;
export const pieChartCard = `${base.cardFrame} ${softPanelSurface} ${base.cardInteract} app-card-spotlight p-3 sm:p-4 md:p-6 w-full md:flex-1`;
export const categorySelector = `${base.cardFrame} ${softPanelSurface} app-card-spotlight p-3 sm:p-4 md:p-6 w-full`;

export const transactionFieldClasses = 'flex items-center justify-between gap-2 px-3 py-2 text-md text-gray-900 dark:text-gray-50 bg-white dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-800 dark:hover:bg-sky-500/12 dark:hover:text-sky-100 cursor-pointer rounded-lg shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] focus:outline-none focus:ring-2 focus:ring-white/50 dark:focus:ring-gray-600/50 focus:border-transparent transition-all duration-300'