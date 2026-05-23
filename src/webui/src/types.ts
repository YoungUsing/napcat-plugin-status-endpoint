export interface PluginStatus {
    pluginName: string
    uptime: number
    uptimeFormatted: string
    config: PluginConfig
    stats: {
        processed: number
        todayProcessed: number
        lastUpdateDay: string
    }
}

export interface PluginConfig {
    debug: boolean
    heartbeatEnabled: boolean
    heartbeatInterval: number
    heartbeatMessage: string
    heartbeatTargetsJson: string
}

export interface HeartbeatTarget {
    type: 'group' | 'private'
    id: string
}

export interface GroupInfo {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
    enabled: boolean
}

export interface ApiResponse<T = unknown> {
    code: number
    data?: T
    message?: string
}
