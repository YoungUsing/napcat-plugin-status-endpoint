import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig } from '../types'
import { IconTerminal } from '../components/icons'

const DEFAULT_TARGETS_JSON = '[\n  {"type": "group", "id": "123456789"},\n  {"type": "private", "id": "987654321"}\n]'

export default function ConfigPage() {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) setConfig(res.data)
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const saveConfig = useCallback(async (update: Partial<PluginConfig>) => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = { ...config, ...update }
            await noAuthFetch('/config', {
                method: 'POST',
                body: JSON.stringify(newConfig),
            })
            setConfig(newConfig)
            showToast('配置已保存', 'success')
        } catch {
            showToast('保存失败', 'error')
        } finally {
            setSaving(false)
        }
    }, [config])

    const updateField = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) => {
        if (!config) return
        const updated = { ...config, [key]: value }
        setConfig(updated)
        saveConfig({ [key]: value })
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载配置中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 stagger-children">
            {/* 心跳检测 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconTerminal size={16} className="text-gray-400" />
                    心跳检测
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用心跳检测"
                        desc="开启后定时向指定目标发送消息以检测在线状态"
                        checked={config.heartbeatEnabled}
                        onChange={(v) => updateField('heartbeatEnabled', v)}
                    />
                    <InputRow
                        label="心跳间隔 (秒)"
                        desc="两次心跳之间的间隔时间，建议不低于 60 秒"
                        value={String(config.heartbeatInterval)}
                        type="number"
                        onChange={(v) => updateField('heartbeatInterval', Number(v) || 300)}
                    />
                    <InputRow
                        label="心跳消息内容"
                        desc="发送的心跳消息文本"
                        value={config.heartbeatMessage}
                        onChange={(v) => updateField('heartbeatMessage', v)}
                    />
                    <div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">心跳目标（JSON）</div>
                        <div className="text-xs text-gray-400 mb-2">
                            JSON 数组，每个目标含 type（group/private）和 id（群号/QQ号）
                        </div>
                        <textarea
                            className="input-field min-h-[120px] font-mono text-xs"
                            value={config.heartbeatTargetsJson || '[]'}
                            onChange={(e) => updateField('heartbeatTargetsJson', e.target.value)}
                            placeholder={DEFAULT_TARGETS_JSON}
                        />
                    </div>
                </div>
            </div>

            {saving && (
                <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
                    保存中...
                </div>
            )}
        </div>
    )
}

function ToggleRow({ label, desc, checked, onChange }: {
    label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
            <label className="toggle">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="slider" />
            </label>
        </div>
    )
}

function InputRow({ label, desc, value, type = 'text', onChange }: {
    label: string; desc: string; value: string; type?: string; onChange: (v: string) => void
}) {
    const [local, setLocal] = useState(value)
    useEffect(() => { setLocal(value) }, [value])

    const handleBlur = () => {
        if (local !== value) onChange(local)
    }

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">{desc}</div>
            <input
                className="input-field"
                type={type}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            />
        </div>
    )
}
