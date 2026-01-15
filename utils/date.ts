/**
 * 統一處理應用程式中的日期格式化
 */

/**
 * 格式化日期為本地字串 (例如: 2024/1/15)
 */
export const formatDate = (date: Date | string | number): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
};

/**
 * 格式化為 ISO 日期字串 (YYYY-MM-DD)
 */
export const formatISODate = (date: Date | string | number): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

/**
 * 獲取目前時間的格式化字串 (HH:mm)
 */
export const getCurrentTimeStr = (): string => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
