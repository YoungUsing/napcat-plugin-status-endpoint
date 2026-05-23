/**
 * NapCat 插件 - 状态监控端点
 *
 * 导出 PluginModule 接口定义的生命周期函数，NapCat 加载插件时会调用这些函数。
 *
 * 生命周期：
 *   plugin_init        → 插件加载时调用（必选）
 *   plugin_onmessage   → 收到事件时调用（需通过 post_type 判断事件类型）
 *   plugin_onevent     → 收到所有 OneBot 事件时调用
 *   plugin_cleanup     → 插件卸载/重载时调用
 *
 * 配置相关：
 *   plugin_config_ui          → 导出配置 Schema，用于 WebUI 自动生成配置面板
 *   plugin_get_config         → 自定义配置读取
 *   plugin_set_config         → 自定义配置保存
 *   plugin_on_config_change   → 配置变更回调
 *
 * @author YoungUsing
 * @license MIT
 */

import type { NapCatPluginContext, PluginModule } from 'napcat-types';
import { pluginState } from './core/state';
import { heartbeatState, startHeartbeat, stopHeartbeat, registerHeartbeatRoutes } from './services/heartbeat';
import { CONFIG_SCHEMA } from './config';

export const plugin_config_ui = CONFIG_SCHEMA;

export const plugin_init: PluginModule['plugin_init'] = async (ctx: NapCatPluginContext) => {
    pluginState.init(ctx);
    ctx.logger.info('机器人状态监控插件已加载');

    // 注册心跳 API 路由
    registerHeartbeatRoutes(ctx);

    // ========== 状态查询 API（根据在线状态返回不同 HTTP 状态码）==========
    ctx.router.getNoAuth('/status', async (req, res) => {
        try {
            const loginInfo = await ctx.actions.call(
                'get_login_info',
                {},
                ctx.adapterName,
                ctx.pluginManager.config
            );
            // 在线：返回 201 Created，区别于默认页
            res.status(201).json({
                online: true,
                userId: loginInfo?.user_id,
                nickname: loginInfo?.nickname,
                timestamp: Date.now(),
                heartbeat: heartbeatState.online,
                heartbeatLastSuccess: heartbeatState.lastSuccess,
                heartbeatFailures: heartbeatState.consecutiveFailures,
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            ctx.logger.warn(`状态查询失败: ${errorMsg}`);
            // 离线：返回 503 Service Unavailable
            res.status(503).json({
                online: false,
                error: errorMsg,
                timestamp: Date.now(),
                heartbeat: heartbeatState.online,
                heartbeatLastSuccess: heartbeatState.lastSuccess,
                heartbeatFailures: heartbeatState.consecutiveFailures,
            });
        }
    });

    // 健康检查（始终返回 200）
    ctx.router.getNoAuth('/health', (_req, res) => {
        res.status(200).json({ status: 'ok', plugin: 'napcat-plugin-monitor' });
    });

    // 启动心跳检测（如果配置了则自动开始）
    startHeartbeat(ctx);
};

export const plugin_cleanup: PluginModule['plugin_cleanup'] = (ctx) => {
    stopHeartbeat(ctx);
    pluginState.cleanup();
    ctx.logger.info('机器人状态监控插件已卸载');
};
