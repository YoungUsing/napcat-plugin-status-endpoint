/**
 * 插件配置模块
 */

import type { PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

export const DEFAULT_CONFIG: PluginConfig = {
    debug: false,
    heartbeatEnabled: false,
    heartbeatInterval: 300,
    heartbeatMessage: '[心跳检测]',
    heartbeatTargetsJson: '[]',
};

export const CONFIG_SCHEMA: PluginConfigSchema = [
    {
        key: 'heartbeatEnabled',
        type: 'boolean',
        label: '启用心跳检测',
        default: false,
        description: '开启后定时向指定目标发送消息以检测在线状态',
    },
    {
        key: 'heartbeatInterval',
        type: 'number',
        label: '心跳间隔（秒）',
        default: 300,
        description: '两次心跳之间的间隔时间，建议不低于 60 秒',
    },
    {
        key: 'heartbeatMessage',
        type: 'string',
        label: '心跳消息内容',
        default: '[心跳检测]',
        description: '发送的心跳消息文本',
    },
    {
        key: 'heartbeatTargetsJson',
        type: 'string',
        label: '心跳目标（JSON）',
        default: '[]',
        description: 'JSON 数组。示例: [{"type":"group","id":"123456"},{"type":"private","id":"987654"}]',
    },
];
