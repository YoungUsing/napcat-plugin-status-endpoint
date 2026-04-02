/**
 * NapCat 插件模板 - 主入口
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

// src/index.ts
import type { NapCatPluginContext, PluginModule } from 'napcat-types';

/**
 * 监控 API 插件
 * 
 * 提供外部 HTTP 端点，用于查询 QQ 机器人的账号状态（是否在线）
 * 端点地址: GET http://napcat-host:port/plugin/<plugin-id>/api/status
 * 响应格式: { online: boolean, userId?: number, nickname?: string, timestamp: number, error?: string }
 */
export const plugin_init: PluginModule['plugin_init'] = async (ctx: NapCatPluginContext) => {
    ctx.logger.info('账号状态监控插件已加载');

    // 注册无需鉴权的 GET 接口，外部可直接访问
    ctx.router.getNoAuth('/status', async (req, res) => {
        ctx.logger.debug(`收到状态查询请求，来自 ${req.headers['x-forwarded-for'] || req.headers.host}`);

        try {
            // 调用 OneBot 标准 Action: get_login_info
            // 如果机器人在线且适配器工作正常，该调用会成功返回 { user_id, nickname }
            // 如果机器人已掉线或适配器异常，调用会抛出异常
            const loginInfo = await ctx.actions.call(
                'get_login_info',
                void 0,                          // 无参数
                ctx.adapterName,
                ctx.pluginManager.config
            );

            // 成功获取登录信息 => 机器人在线
            const userId = loginInfo?.user_id;
            const nickname = loginInfo?.nickname;

            ctx.logger.debug(`状态查询成功: 在线, QQ=${userId}, 昵称=${nickname}`);
            res.json({
                online: true,
                userId,
                nickname,
                timestamp: Date.now(),
            });
        } catch (err) {
            // 调用失败 => 机器人离线或网络问题
            const errorMsg = err instanceof Error ? err.message : String(err);
            ctx.logger.warn(`状态查询失败: 机器人可能离线, 错误: ${errorMsg}`);
            res.json({
                online: false,
                error: errorMsg,
                timestamp: Date.now(),
            });
        }
    });

    // 可选：增加一个简单的健康检查端点，用于验证插件是否正常运行
    ctx.router.getNoAuth('/health', (_req, res) => {
        res.json({ status: 'ok', plugin: 'napcat-plugin-monitor' });
    });
};

// 无需清理资源，插件卸载时自动释放路由