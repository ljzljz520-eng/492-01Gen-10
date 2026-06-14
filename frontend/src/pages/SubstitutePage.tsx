import { useEffect, useState } from 'react'
import api from '../api'
import { Venue, Volunteer, SubstituteLog, POSITION_TYPE_MAP } from '../types'

export default function SubstitutePage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [substituteLogs, setSubstituteLogs] = useState<SubstituteLog[]>([])
  const [activeTab, setActiveTab] = useState<'find' | 'logs'>('find')
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('临时缺人')

  useEffect(() => {
    fetchVenues()
    fetchLogs()
  }, [])

  const fetchVenues = () => api.get('/venues').then((d: any) => setVenues(d))
  const fetchLogs = () => api.get('/substitutes/logs').then((d: any) => setSubstituteLogs(d))

  const fetchPositionsForShift = (shiftId: number) => {
    api.get(`/shifts/${shiftId}/positions`).then((d: any) => {
      const assigned = d.filter((p: any) => p.volunteer_id)
      if (assigned.length > 0) {
        setSelectedPosition(assigned[0])
        fetchRecommendations(null, assigned[0].id)
      }
    })
  }

  const fetchRecommendations = async (assignmentId: number | null, positionId?: number) => {
    setLoading(true)
    try {
      let url = '/substitutes/recommendations?'
      if (assignmentId) url += `assignment_id=${assignmentId}`
      if (positionId) url += `position_id=${positionId}`
      const data: any = await api.get(url)
      setRecommendations(data)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedShiftId) fetchPositionsForShift(selectedShiftId)
  }, [selectedShiftId])

  const handleSelectPosition = (pos: any) => {
    setSelectedPosition(pos)
    fetchRecommendations(null, pos.id)
  }

  const handleAssignSubstitute = async (substituteId: string) => {
    if (!selectedPosition || !selectedPosition.volunteer_id) {
      alert('请先选择一个已分配的岗位')
      return
    }
    const assignmentData: any = await api.get(`/volunteers/${selectedPosition.volunteer_id}`).catch(() => null)
    const assignments = assignmentData?.assignments || []
    const targetAssignment = assignments.find((a: any) => a.position_id === selectedPosition.id)
    if (!targetAssignment) {
      alert('未找到分配记录，请尝试其他岗位')
      return
    }
    if (!confirm(`确定将 ${selectedPosition.volunteer_name} 替换为新的志愿者吗？`)) return
    try {
      setLoading(true)
      await api.post('/substitutes', {
        assignment_id: targetAssignment.id,
        substitute_volunteer_id: substituteId,
        reason
      })
      alert('替补分配成功！')
      fetchRecommendations(null, selectedPosition.id)
      fetchLogs()
      fetchVenues()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const availableShifts = venues.flatMap(v => (v.shifts || []).map(s => ({ ...s, venue_name: v.name })))

  const shiftPositions = selectedShiftId ? (() => {
    for (const v of venues) {
      const found = (v.shifts || []).find(s => s.id === selectedShiftId)
      if (found) return found
    }
    return null
  })() : null

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-4">
        <button onClick={() => setActiveTab('find')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'find' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
          🔍 查找替补志愿者
        </button>
        <button onClick={() => setActiveTab('logs')}
          className={`px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'logs' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
          📋 替补记录 ({substituteLogs.length})
        </button>
      </div>

      {activeTab === 'find' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-6 space-y-5">
            <h3 className="font-bold text-gray-900">1. 选择班次与岗位</h3>
            <div>
              <label className="label">选择场馆班次</label>
              <select className="input-field" value={selectedShiftId || ''} onChange={e => setSelectedShiftId(e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- 请选择 --</option>
                {venues.map(v => (
                  <optgroup key={v.id} label={v.name}>
                    {(v.shifts || []).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.date} ({s.start_time}-{s.end_time}) [{s.filled_positions || 0}/{s.total_positions || 0}]
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {shiftPositions && (
              <div>
                <label className="label">选择需要替补的岗位</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(() => {
                    let positions: any[] = []
                    venues.forEach(v => {
                      const shift = (v.shifts || []).find(s => s.id === selectedShiftId)
                      if (shift) {
                        api.get(`/shifts/${shift.id}/positions`).then((d: any) => { positions = d })
                      }
                    })
                    return null
                  })()}
                  <ShiftPositionList shiftId={selectedShiftId} selected={selectedPosition} onSelect={handleSelectPosition} />
                </div>
              </div>
            )}
          </div>

          <div className="card p-6 lg:col-span-2">
            <h3 className="font-bold text-gray-900 mb-5">2. 智能推荐替补志愿者</h3>
            {!recommendations ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-6xl mb-4">🎯</div>
                <p>请先从左侧选择一个已分配的岗位</p>
                <p className="text-xs mt-2">系统将自动匹配同技能、高评分的候选志愿者</p>
              </div>
            ) : loading ? (
              <div className="text-center py-16 text-gray-400">
                <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4" />
                <p>正在分析匹配度...</p>
              </div>
            ) : (
              <div>
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-accent-50 to-yellow-50 border border-accent-200">
                  <div className="text-sm text-gray-500 mb-1">需要替补的岗位</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-lg">{POSITION_TYPE_MAP[recommendations.position?.type] || recommendations.position?.type}</span>
                    <span className="text-sm text-gray-600">🏟️ {recommendations.position?.venue_name}</span>
                    <span className="text-sm text-gray-600">📅 {recommendations.position?.shift_name}</span>
                    {selectedPosition?.volunteer_name && (
                      <span className="badge bg-red-100 text-red-800 ml-auto">原: {selectedPosition.volunteer_name}</span>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="label">替补原因</label>
                  <select className="input-field" value={reason} onChange={e => setReason(e.target.value)}>
                    <option value="临时缺人">临时缺人</option>
                    <option value="志愿者临时有事">志愿者临时有事</option>
                    <option value="身体不适">身体不适</option>
                    <option value="岗位调整">岗位调整</option>
                    <option value="其他原因">其他原因</option>
                  </select>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto">
                  {recommendations.recommendations?.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p>😔 暂无合适的替补候选人</p>
                      <p className="text-xs mt-2">该时段可能没有空闲且符合技能要求的志愿者</p>
                    </div>
                  ) : (
                    recommendations.recommendations?.map((v: Volunteer & any, idx: number) => (
                      <div key={v.id} className="p-5 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:shadow-md transition-all">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                              {v.name.charAt(0)}
                            </div>
                            {idx < 3 && (
                              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-accent-500 text-white text-sm flex items-center justify-center font-bold shadow-lg">
                                {idx + 1}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-lg">{v.name}</span>
                              <span className="badge bg-gradient-to-r from-green-100 to-emerald-100 text-green-800">
                                匹配度 {(v.match_score || 0)}
                              </span>
                              <span className="badge bg-blue-100 text-blue-800">📱 {v.phone}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {v.languages?.slice(0, 3).map(l => (
                                <span key={l} className="badge bg-blue-50 text-blue-700 text-xs">🌐 {l}</span>
                              ))}
                              {v.medical_level > 0 && <span className="badge bg-red-50 text-red-700 text-xs">🏥 L{v.medical_level}</span>}
                              {v.guidance_level > 0 && <span className="badge bg-green-50 text-green-700 text-xs">🧭 L{v.guidance_level}</span>}
                              {v.security_level > 0 && <span className="badge bg-purple-50 text-purple-700 text-xs">🛡️ L{v.security_level}</span>}
                              {v.experience_count > 0 && <span className="badge bg-yellow-50 text-yellow-700 text-xs">⭐ 有{v.experience_count}次经验</span>}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>培训: {v.training_score}分</span>
                              <span>状态: <span className={`badge bg-gray-100 text-gray-700`}>{v.status}</span></span>
                            </div>
                          </div>
                          <button disabled={loading} onClick={() => handleAssignSubstitute(v.id)} className="btn btn-success whitespace-nowrap py-2.5 px-5">
                            🔄 指派替补
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-lg">📋 替补调度记录</h3>
            <p className="text-sm text-gray-500 mt-1">共 {substituteLogs.length} 条替补记录</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">时间</th>
                  <th className="table-header">场馆/班次</th>
                  <th className="table-header">岗位类型</th>
                  <th className="table-header">原志愿者</th>
                  <th className="table-header">替补志愿者</th>
                  <th className="table-header">原因</th>
                  <th className="table-header">状态</th>
                </tr>
              </thead>
              <tbody>
                {substituteLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                    <td className="table-cell">
                      <div className="font-medium">{log.venue_name}</div>
                      <div className="text-xs text-gray-400">{log.shift_name}</div>
                    </td>
                    <td className="table-cell">{POSITION_TYPE_MAP[log.position_type] || log.position_type}</td>
                    <td className="table-cell">
                      <span className="badge bg-red-50 text-red-700">{log.original_volunteer_name}</span>
                    </td>
                    <td className="table-cell">
                      {log.substitute_volunteer_name ? (
                        <span className="badge bg-green-100 text-green-800">{log.substitute_volunteer_name}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell text-sm text-gray-600">{log.reason}</td>
                    <td className="table-cell">
                      <span className="badge bg-purple-100 text-purple-800">
                        {log.status === 'resolved' ? '已解决' : log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {substituteLogs.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center py-16 text-gray-400">暂无替补记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ShiftPositionList({ shiftId, selected, onSelect }: { shiftId: number | null; selected: any; onSelect: (p: any) => void }) {
  const [positions, setPositions] = useState<any[]>([])
  useEffect(() => {
    if (shiftId) api.get(`/shifts/${shiftId}/positions`).then((d: any) => setPositions(d.filter((p: any) => p.volunteer_id)))
  }, [shiftId])

  if (!shiftId || positions.length === 0) return (
    <div className="text-sm text-gray-400 text-center py-6">
      {shiftId ? '该班次暂无已分配的岗位' : '请先选择班次'}
    </div>
  )

  return (
    positions.map((p: any) => (
      <button key={p.id} onClick={() => onSelect(p)}
        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
          selected?.id === p.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
        }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm">{POSITION_TYPE_MAP[p.type]}</span>
          <span className="text-xs text-gray-400">L{p.required_level}</span>
        </div>
        <div className="text-xs text-gray-600 truncate">👤 {p.volunteer_name}</div>
      </button>
    ))
  )
}
