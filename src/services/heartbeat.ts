/**
 * 心跳检测服务
 *
 * 通过定时向配置的群聊或私聊发送消息来检测机器人是否在线。
 * 使用 NapCat 标准 OneBot v11 协议：send_group_msg / send_private_msg。
 */

import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import type { HeartbeatState, HeartbeatTarget } from '../types';

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isValidTarget(t: unknown): t is HeartbeatTarget {
    return isObject(t) && typeof t.type === 'string' && typeof t.id === 'string';
}

function parseTargets(raw: string): HeartbeatTarget[] {
    if (!raw || !raw.trim()) return [];
    // 容错：去掉尾部逗号等常见 JSON 手误
    const sanitized = raw.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
    try {
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) return parsed.filter(isValidTarget);
    } catch { /* ignore */ }
    return [];
}

function getTargets(): HeartbeatTarget[] {
    return parseTargets(pluginState.config.heartbeatTargetsJson);
}

/** 心跳运行状态 */
export const heartbeatState: HeartbeatState = {
    lastSuccess: 0,
    lastAttempt: 0,
    consecutiveFailures: 0,
    online: false,
    targetResults: {},
};

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeatToTarget(
    ctx: NapCatPluginContext,
    target: HeartbeatTarget,
): Promise<boolean> {
    const message = pluginState.config.heartbeatMessage || '[心跳检测]';
    const targetKey = `${target.type}:${target.id}`;

    try {
        if (target.type === 'group') {
            await ctx.actions.call(
                'send_group_msg',
                { group_id: target.id, message, auto_escape: false },
                ctx.adapterName,
                ctx.pluginManager.config,
            );
        } else {
            await ctx.actions.call(
                'send_private_msg',
                { user_id: target.id, message, auto_escape: false },
                ctx.adapterName,
                ctx.pluginManager.config,
            );
        }

        heartbeatState.targetResults[targetKey] = { success: true, timestamp: Date.now() };
        ctx.logger.debug(`[心跳] ${targetKey} 发送成功`);
        return true;
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        heartbeatState.targetResults[targetKey] = {
            success: false,
            timestamp: Date.now(),
            error: errorMsg,
        };
        ctx.logger.warn(`[心跳] ${targetKey} 发送失败: ${errorMsg}`);
        return false;
    }
}

async function runHeartbeat(ctx: NapCatPluginContext): Promise<void> {
    const targets = getTargets();
    if (targets.length === 0) return;

    heartbeatState.lastAttempt = Date.now();

    const results = await Promise.all(
        targets.map((target) => sendHeartbeatToTarget(ctx, target)),
    );

    const anySuccess = results.some(Boolean);
    if (anySuccess) {
        heartbeatState.lastSuccess = Date.now();
        heartbeatState.consecutiveFailures = 0;
        heartbeatState.online = true;
    } else {
        heartbeatState.consecutiveFailures++;
        if (heartbeatState.consecutiveFailures >= 2) {
            heartbeatState.online = false;
        }
    }
}

export function startHeartbeat(ctx: NapCatPluginContext): void {
    const config = pluginState.config;
    if (!config.heartbeatEnabled) {
        ctx.logger.debug('[心跳] 未启用，跳过启动');
        return;
    }
    const targets = getTargets();
    if (targets.length === 0) {
        ctx.logger.debug('[心跳] 未配置目标，跳过启动');
        return;
    }

    const intervalMs = Math.max(config.heartbeatInterval, 30) * 1000;
    ctx.logger.info(`[心跳] 已启动，间隔 ${config.heartbeatInterval}s，目标数: ${targets.length}`);

    runHeartbeat(ctx);

    heartbeatTimer = setInterval(() => runHeartbeat(ctx), intervalMs);
    pluginState.timers.set('heartbeat', heartbeatTimer);
}

export function stopHeartbeat(ctx: NapCatPluginContext): void {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        pluginState.timers.delete('heartbeat');
        ctx.logger.info('[心跳] 已停止');
    }
}

export async function triggerHeartbeat(ctx: NapCatPluginContext): Promise<HeartbeatState> {
    if (getTargets().length === 0) {
        ctx.logger.warn('[心跳] 无配置目标，无法执行');
        return heartbeatState;
    }
    await runHeartbeat(ctx);
    return heartbeatState;
}

export function registerHeartbeatRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    router.getNoAuth('/heartbeat/status', (_req, res) => {
        res.json({
            code: 0,
            data: {
                heartbeatEnabled: pluginState.config.heartbeatEnabled,
                heartbeatInterval: pluginState.config.heartbeatInterval,
                heartbeatMessage: pluginState.config.heartbeatMessage,
                heartbeatTargetsJson: pluginState.config.heartbeatTargetsJson,
                targets: getTargets(),
                state: heartbeatState,
            },
        });
    });

    router.postNoAuth('/heartbeat/trigger', async (_req, res) => {
        try {
            const state = await triggerHeartbeat(ctx);
            res.json({ code: 0, data: state });
        } catch (err) {
            res.status(500).json({ code: -1, message: String(err) });
        }
    });
}
