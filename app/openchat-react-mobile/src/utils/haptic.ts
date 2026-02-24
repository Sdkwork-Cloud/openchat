
/**
 * Advanced Haptic Feedback Engine
 * Standardized for iOS-like tactile responses
 */
export const Haptic = {
    // 细微刻度感（用于选择器、数值调整）
    selection: () => {
        if (navigator.vibrate) navigator.vibrate(2);
    },
    
    // 轻微冲击（普通点击）
    light: () => {
        if (navigator.vibrate) navigator.vibrate(10);
    },
    
    // 中等冲击（状态切换、确认）
    medium: () => {
        if (navigator.vibrate) navigator.vibrate(20);
    },
    
    // 沉重冲击（删除、警告）
    heavy: () => {
        if (navigator.vibrate) navigator.vibrate(35);
    },
    
    // 成功序列
    success: () => {
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    },
    
    // 错误序列
    error: () => {
        if (navigator.vibrate) navigator.vibrate([50, 40, 50, 40, 50]);
    },
    
    // 刚性碰撞（弹窗弹出、底部触底）
    rigid: () => {
        if (navigator.vibrate) navigator.vibrate(5);
    }
};
