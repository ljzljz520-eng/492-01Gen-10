import { useEffect, useState } from 'react'
import api from '../api'
import { Volunteer, Venue, Position, STATUS_MAP, POSITION_TYPE_MAP, LEVEL_OPTIONS } from '../types'

type TabType = 'volunteers' | 'venues' | 'training' | 'assign'

export default function AdminPage() {
  const [tab, setTab] = useState<TabType>('volunteers')
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [eligibleVolunteers, setEligibleVolunteers] = useState<Volunteer[]>([])
  const [showAssignModal, setShowAssignModal] = useState<Position | null>(null)
  const [trainingModal, setTrainingModal] = useState<Volunteer | null>(null)
  const [newVenueModal, setNewVenueModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [newVenue, setNewVenue] = useState({ name: '', location: '', capacity: 0, description: '' })
  const [trainingForm, setTrainingForm] = useState({ score: 80, passed: true })
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterTraining, setFilterTraining] = useState<string>('')
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    if (tab === 'volunteers' || tab === 'training') fetchVolunteers()
    if (tab === 'venues' || tab === 'assign') fetchVenues()
  }, [tab, filterStatus, filterTraining, searchKeyword])

  useEffect(() => {
    if (selectedShiftId) fetchPositions(selectedShiftId)
  }, [selectedShiftId])

  useEffect(() => {
    if (showAssignModal) fetchEligibleVolunteers(showAssignModal.id)
  }, [showAssignModal])

  const fetchVolunteers = () => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterTraining) params.set('training_passed', filterTraining)
    api.get(`/volunteers${params.toString() ? '?' + params.toString() : ''}`).then((data: any) => {
      let result = data
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase()
        result = result.filter((v: Volunteer) =>
          v.name.toLowerCase().includes(kw) || v.phone.includes(kw) || v.id.toLowerCase().includes(kw)
        )
      }
      setVolunteers(result)
    })
  }

  const fetchVenues = () => api.get('/venues').then((data: any) => setVenues(data))
  const fetchPositions = (shiftId: number) => api.get(`/shifts/${shiftId}/positions`).then((data: any) => setPositions(data))
  const fetchEligibleVolunteers = (positionId: number) =>
    api.get(`/assignments/eligible-volunteers?position_id=${positionId}`).then((data: any) => setEligibleVolunteers(data))

  const handleSaveTraining = async () => {
    if (!trainingModal) return
    try {
      await api.put(`/volunteers/${trainingModal.id}/training`, {
        training_score: trainingForm.score,
        training_passed: trainingForm.passed
      })
      alert('培训结果已保存')
      setTrainingModal(null)
      fetchVolunteers()
    } catch (e: any) { alert(e.message) }
  }

  const handleCreateVenue = async () => {
    if (!newVenue.name.trim()) { alert('请输入场馆名称'); return }
    try {
      await api.post('/venues', newVenue)
      alert('场馆创建成功')
      setNewVenueModal(false)
      setNewVenue({ name: '', location: '', capacity: 0, description: '' })
      fetchVenues()
    } catch (e: any) { alert(e.message) }
  }

  const handleAssignVolunteer = async (volunteerId: string) => {
    if (!showAssignModal) return
    try {
      await api.post('/assignments', { volunteer_id: volunteerId, position_id: showAssignModal.id })
      alert('分配成功')
      setShowAssignModal(null)
      fetchPositions(selectedShiftId!)
      fetchVenues()
    } catch (e: any) { alert(e.message) }
  }

  const handleCancelAssignment = async (position: Position) => {
    if (!position.volunteer_id || !confirm(`确定取消 ${position.volunteer_name} 的岗位分配？`)) return
    const assignment = await api.get(`/volunteers/${position.volunteer_id}`).catch(() => null)
    const assignments = assignment?.assignments || []
    const target = assignments.find((a: any) => a.position_id === position.id)
    if (target) {
      try {
        await api.post(`/assignments/${target.id}/cancel`)
        alert('已取消')
        fetchPositions(selectedShiftId!)
        fetchVenues()
      } catch (e: any) { alert(e.message) }
    }
  }

  const stats = {
    total: volunteers.length,
    trained: volunteers.filter(v => v.training_passed).length,
    assigned: volunteers.filter(v => ['assigned', 'confirmed', 'in_progress', 'completed'].includes(v.status)).length,
    pending: volunteers.filter(v => v.status === 'registered').length
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {[
          { key: 'volunteers', label: '👥 志愿者列表', badge: stats.total },
          { key: 'training', label: '🎓 培训管理', badge: stats.pending },
          { key: 'venues', label: '🏟️ 场馆班次', badge: venues.length },
          { key: 'assign', label: '📍 岗位分配', badge: '-' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabType)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              tab === t.key
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {t.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-gray-100'}`}>
              {t.badge}
            </span>
          </button>
        ))}
      </div>

      {(tab === 'volunteers' || tab === 'training') && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                className="input-field max-w-xs"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="🔍 搜索姓名/手机号/编号..."
              />
              <select className="input-field max-w-[160px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">全部状态</option>
                {Object.entries(STATUS_MAP).slice(0, 7).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select className="input-field max-w-[180px]" value={filterTraining} onChange={e => setFilterTraining(e.target.value)}>
                <option value="">培训状态</option>
                <option value="true">已通过培训</option>
                <option value="false">未通过/未培训</option>
              </select>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">共 <strong className="text-gray-900">{stats.total}</strong> 人</span>
              <span className="text-green-600">已培训 <strong>{stats.trained}</strong></span>
              <span className="text-primary-600">已分配 <strong>{stats.assigned}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">姓名</th>
                  <th className="table-header">联系方式</th>
                  <th className="table-header">技能概要</th>
                  <th className="table-header">培训情况</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold text-sm">
                          {v.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{v.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm space-y-0.5">
                        <p>📱 {v.phone}</p>
                        {v.email && <p className="text-gray-400 text-xs">📧 {v.email}</p>}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {v.languages?.slice(0, 3).map(l => (
                          <span key={l} className="badge bg-blue-50 text-blue-700">🌐 {l}</span>
                        ))}
                        {v.medical_level > 0 && <span className="badge bg-red-50 text-red-700">🏥 L{v.medical_level}</span>}
                        {v.guidance_level > 0 && <span className="badge bg-green-50 text-green-700">🧭 L{v.guidance_level}</span>}
                        {v.security_level > 0 && <span className="badge bg-purple-50 text-purple-700">🛡️ L{v.security_level}</span>}
                        {!v.languages?.length && v.medical_level === 0 && v.guidance_level === 0 && v.security_level === 0 && (
                          <span className="text-gray-400 text-xs">无技能记录</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {v.training_passed ? (
                        <span className="badge bg-green-100 text-green-800">✓ {v.training_score}分</span>
                      ) : v.training_score !== undefined ? (
                        <span className="badge bg-red-100 text-red-800">✗ 未通过</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-600">未培训</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${STATUS_MAP[v.status]?.color || 'bg-gray-100'}`}>
                        {STATUS_MAP[v.status]?.label || v.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => { setTrainingModal(v); setTrainingForm({ score: v.training_score || 80, passed: !!v.training_passed }) }} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                          {tab === 'training' || !v.training_passed ? '录入培训' : '修改成绩'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {volunteers.length === 0 && (
                  <tr><td colSpan={6} className="table-cell text-center py-16 text-gray-400">暂无志愿者数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'venues' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">场馆与班次管理</h3>
            <button onClick={() => setNewVenueModal(true)} className="btn btn-primary">
              + 新增场馆
            </button>
          </div>
          <div className="grid gap-4">
            {venues.map(venue => (
              <div key={venue.id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md">
                      🏟️
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{venue.name}</h4>
                      <div className="text-sm text-gray-500 space-y-0.5 mt-1">
                        <p>📍 {venue.location || '位置未设置'}</p>
                        <p>👥 容量: {venue.capacity}人</p>
                        {venue.description && <p className="text-gray-400">{venue.description}</p>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(venue.shifts || []).map(shift => (
                    <div key={shift.id} className="p-4 rounded-xl border-2 border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer"
                      onClick={() => { setTab('assign'); setSelectedShiftId(shift.id) }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900">{shift.name}</span>
                        <span className="text-xs text-gray-400">{shift.date}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">⏰ {shift.start_time} - {shift.end_time}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden mr-3">
                          <div className="h-full bg-gradient-to-r from-primary-500 to-green-500"
                            style={{ width: `${shift.total_positions ? ((shift.filled_positions || 0) / shift.total_positions) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                          {shift.filled_positions || 0}/{shift.total_positions || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(venue.shifts || []).length === 0 && (
                    <div className="col-span-full text-center py-6 text-gray-400 text-sm">暂无班次</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'assign' && (
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="card p-4 lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
            <h4 className="font-bold text-gray-900 mb-3 px-2 py-2 sticky top-0 bg-white">选择场馆班次</h4>
            {venues.map(venue => (
              <div key={venue.id} className="mb-4">
                <div className="font-medium text-sm text-gray-700 px-2 mb-2">🏟️ {venue.name}</div>
                <div className="space-y-1">
                  {(venue.shifts || []).map(shift => (
                    <button
                      key={shift.id}
                      onClick={() => setSelectedShiftId(shift.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                        selectedShiftId === shift.id
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{shift.name}</div>
                      <div className={`text-xs ${selectedShiftId === shift.id ? 'text-white/80' : 'text-gray-400'}`}>
                        {shift.date} · {shift.start_time}-{shift.end_time}
                      </div>
                      <div className={`text-xs mt-1 ${selectedShiftId === shift.id ? 'text-white/80' : 'text-gray-500'}`}>
                        {shift.filled_positions || 0}/{shift.total_positions || 0} 岗位已分配
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card p-6 lg:col-span-3">
            {!selectedShiftId ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-6xl mb-4">👈</div>
                <p>请先从左侧选择一个班次开始分配岗位</p>
              </div>
            ) : (
              <div>
                <h4 className="text-lg font-bold mb-6 flex items-center gap-3">
                  <span>📋 岗位分配</span>
                  <span className="badge bg-gray-100 text-gray-700">
                    {positions.filter(p => p.volunteer_id).length}/{positions.length} 已分配
                  </span>
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {['language', 'medical', 'guidance', 'security'].map(type => {
                    const list = positions.filter(p => p.type === type)
                    if (list.length === 0) return null
                    return (
                      <div key={type} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <span>{
                            type === 'language' ? '🌐' : type === 'medical' ? '🏥' : type === 'guidance' ? '🧭' : '🛡️'
                          }</span>
                          {POSITION_TYPE_MAP[type]}
                          <span className="text-xs font-normal text-gray-400 ml-auto">
                            {list.filter(p => p.volunteer_id).length}/{list.length}
                          </span>
                        </h5>
                        <div className="space-y-2">
                          {list.map(p => (
                            <div key={p.id} className={`p-3 rounded-xl border-2 transition-all ${
                              p.volunteer_id
                                ? 'bg-white border-green-200'
                                : 'bg-white border-dashed border-gray-300 hover:border-primary-400 cursor-pointer'
                            }`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-400 mb-0.5">
                                    等级要求: L{p.required_level} · {LEVEL_OPTIONS[p.required_level]?.label}
                                  </div>
                                  {p.volunteer_id ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                                        {(p.volunteer_name || '?').charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-medium text-sm truncate">{p.volunteer_name}</div>
                                        <div className="text-xs text-gray-400 truncate">{p.volunteer_phone}</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => setShowAssignModal(p)} className="text-primary-600 hover:text-primary-800 font-medium text-sm">
                                      + 点击分配志愿者
                                    </button>
                                  )}
                                </div>
                                {p.volunteer_id && (
                                  <button
                                    onClick={() => handleCancelAssignment(p)}
                                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                                  >
                                    取消
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {trainingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setTrainingModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold">🎓 培训成绩录入</h3>
              <p className="text-sm text-gray-500 mt-1">{trainingModal.name}</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="label">培训分数</label>
                <input type="number" min="0" max="100" className="input-field text-xl text-center font-bold py-4"
                  value={trainingForm.score} onChange={e => setTrainingForm(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))} />
                <input type="range" min="0" max="100" className="w-full mt-3"
                  value={trainingForm.score} onChange={e => setTrainingForm(prev => ({ ...prev, score: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="label">考核结果</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setTrainingForm(p => ({ ...p, passed: true }))}
                    className={`p-4 rounded-xl border-2 transition-all ${trainingForm.passed ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}>
                    <div className="text-2xl mb-1">✓</div>
                    <div className="font-bold">通过</div>
                    <div className="text-xs opacity-70">可参与岗位分配</div>
                  </button>
                  <button onClick={() => setTrainingForm(p => ({ ...p, passed: false }))}
                    className={`p-4 rounded-xl border-2 transition-all ${!trainingForm.passed ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'}`}>
                    <div className="text-2xl mb-1">✗</div>
                    <div className="font-bold">未通过</div>
                    <div className="text-xs opacity-70">暂不可分配</div>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setTrainingModal(null)} className="btn btn-secondary flex-1">取消</button>
              <button onClick={handleSaveTraining} disabled={loading} className="btn btn-primary flex-1">
                {loading ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold mb-1">📍 选择志愿者分配</h3>
              <p className="text-sm text-gray-500">
                {POSITION_TYPE_MAP[showAssignModal.type]} · 等级要求 L{showAssignModal.required_level}
                <span className="ml-3">共找到 <strong className="text-primary-600">{eligibleVolunteers.length}</strong> 位匹配候选人</span>
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {eligibleVolunteers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">😔</div>
                  <p>暂无符合条件的志愿者</p>
                  <p className="text-xs mt-2">请降低岗位等级要求或等待更多志愿者通过培训</p>
                </div>
              ) : (
                eligibleVolunteers.map((v, idx) => (
                  <div key={v.id} className="p-4 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold text-lg">
                          {v.name.charAt(0)}
                        </div>
                        {idx < 3 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent-500 text-white text-xs flex items-center justify-center font-bold shadow">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-gray-900">{v.name}</span>
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                            匹配度 {v.match_score || 0}
                          </span>
                          <span className="text-xs text-gray-400">培训 {v.training_score}分</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {v.languages?.slice(0, 2).map(l => (
                            <span key={l} className="badge bg-blue-50 text-blue-700 text-xs">🌐 {l}</span>
                          ))}
                          {v.medical_level > 0 && <span className="badge bg-red-50 text-red-700 text-xs">🏥 L{v.medical_level}</span>}
                          {v.guidance_level > 0 && <span className="badge bg-green-50 text-green-700 text-xs">🧭 L{v.guidance_level}</span>}
                          {v.security_level > 0 && <span className="badge bg-purple-50 text-purple-700 text-xs">🛡️ L{v.security_level}</span>}
                          {v.experience_count > 0 && <span className="badge bg-yellow-50 text-yellow-700 text-xs">⭐ {v.experience_count}次经验</span>}
                        </div>
                      </div>
                      <button onClick={() => handleAssignVolunteer(v.id)} className="btn btn-success whitespace-nowrap">
                        分配此岗位
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t border-gray-100">
              <button onClick={() => setShowAssignModal(null)} className="btn btn-secondary w-full">关闭</button>
            </div>
          </div>
        </div>
      )}

      {newVenueModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setNewVenueModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold">🏟️ 新增场馆</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">场馆名称 *</label>
                <input className="input-field" value={newVenue.name} onChange={e => setNewVenue(p => ({ ...p, name: e.target.value }))} placeholder="如：主体育场" />
              </div>
              <div>
                <label className="label">位置</label>
                <input className="input-field" value={newVenue.location} onChange={e => setNewVenue(p => ({ ...p, location: e.target.value }))} placeholder="场馆地址" />
              </div>
              <div>
                <label className="label">容量（人）</label>
                <input type="number" className="input-field" value={newVenue.capacity || ''} onChange={e => setNewVenue(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="label">说明</label>
                <textarea className="input-field resize-none min-h-[80px]" value={newVenue.description} onChange={e => setNewVenue(p => ({ ...p, description: e.target.value }))} placeholder="场馆用途说明..." />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setNewVenueModal(false)} className="btn btn-secondary flex-1">取消</button>
              <button onClick={handleCreateVenue} className="btn btn-primary flex-1">确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
