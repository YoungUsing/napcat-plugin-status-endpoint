/**
 * 类型定义文件
 */

// ==================== 插件配置 ====================

export interface PluginConfig {
    debug: boolean;
    /** 是否启用心跳检测 */
    heartbeatEnabled: boolean;
    /** 心跳间隔（秒） */
    heartbeatInterval: number;
    /** 心跳消息内容 */
    heartbeatMessage: string;
    /** 心跳目标 JSON 字符串 */
    heartbeatTargetsJson: string;
}

// ==================== 心跳检测 ====================

export type HeartbeatTargetType = 'group' | 'private';

export interface HeartbeatTarget {
    type: HeartbeatTargetType;
    id: string;
}

export interface HeartbeatState {
    lastSuccess: number;
    lastAttempt: number;
    consecutiveFailures: number;
    online: boolean;
    targetResults: Record<string, { success: boolean; timestamp: number; error?: string }>;
}

// ==================== API 响应 ====================

export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data?: T;
}
