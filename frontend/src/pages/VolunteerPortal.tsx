import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { Volunteer, Assignment, STATUS_MAP, POSITION_TYPE_MAP } from '../types'

export default function VolunteerPortal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [volunteerId, setVolunteerId] = useState(id || '')
  const [searchId, setSearchId] = useState(id || '')
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCredential, setShowCredential] = useState<Assignment | null>(null)

  const fetchVolunteer = async (vid: string) => {
    if (!vid) return
    setLoading(true)
    try {
      const data: any = await api.get(`/volunteers/${vid}`)
      setVolunteer(data)
      setVolunteerId(vid)
    } catch (e: any) {
      alert(e.message || '未找到志愿者信息')
      setVolunteer(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchVolunteer(id)
  }, [id])

  const handleConfirm = async (assignmentId: number) => {
    if (!confirm('确认接受此岗位分配？确认后将生成您的入场凭证，不可更改。')) return
    try {
      const res: any = await api.post(`/assignments/${assignmentId}/confirm`)
      alert('确认成功！入场凭证已生成')
      fetchVolunteer(volunteerId)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleReject = async (assignmentId: number) => {
    const reason = prompt('请告知拒绝原因（选填）：')
    try {
      await api.post(`/assignments/${assignmentId}/reject`, { reason })
      alert('已反馈')
      fetchVolunteer(volunteerId)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCheckIn = async (assignmentId: number) => {
    try {
      const res: any = await api.post(`/assignments/${assignmentId}/check-in`)
      alert(res.message)
      fetchVolunteer(volunteerId)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCheckOut = async (assignmentId: number) => {
    try {
      const res: any = await api.post(`/assignments/${assignmentId}/check-out`)
      alert(`${res.message}，服务时长：${Math.floor(res.service_minutes / 60)}小时${res.service_minutes % 60}分钟`)
      fetchVolunteer(volunteerId)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const getSkillSummary = (v: Volunteer) => {
    const items: string[] = []
    if (v.languages?.length) items.push(`🌐 语言: ${v.languages.join('、')}`)
    if (v.medical_level > 0) items.push(`🏥 医疗: L${v.medical_level}`)
    if (v.guidance_level > 0) items.push(`🧭 引导: L${v.guidance_level}`)
    if (v.security_level > 0) items.push(`🛡️ 安检: L${v.security_level}`)
    return items
  }

  if (!volunteer) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card p-10 text-center">
          <div className="text-6xl mb-6">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">志愿者中心</h2>
          <p className="text-gray-500 mb-8">请输入您报名时获取的志愿者编号</p>
          <div className="space-y-4">
            <input
              type="text"
              className="input-field text-center text-lg py-4"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              placeholder="请输入志愿者编号"
            />
            <button
              disabled={loading || !searchId.trim()}
              onClick={() => {
                fetchVolunteer(searchId.trim())
                navigate(`/volunteer/${searchId.trim()}`, { replace: true })
              }}
              className="btn btn-primary w-full py-4 text-lg"
            >
              {loading ? '查询中...' : '查询我的信息'}
            </button>
            <button onClick={() => navigate('/register')} className="btn btn-secondary w-full py-3">
              还没有报名？立即报名
            </button>
          </div>
        </div>
      </div>
    )
  }

  const pendingAssignments = volunteer.assignments?.filter(a => a.status === 'pending') || []
  const confirmedAssignments = volunteer.assignments?.filter(a => ['confirmed', 'in_progress'].includes(a.status)) || []
  const completedAssignments = volunteer.assignments?.filter(a => a.status === 'completed') || []

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
              {volunteer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{volunteer.name}</h2>
                <span className={`badge ${STATUS_MAP[volunteer.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                  {STATUS_MAP[volunteer.status]?.label || volunteer.status}
                </span>
              </div>
              <div className="text-gray-500 space-y-1 text-sm">
                <p>📱 {volunteer.phone}</p>
                <p>📧 {volunteer.email || '未填写'}</p>
                <p className="font-mono text-xs">ID: {volunteer.id}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {volunteer.training_passed ? (
              <div className="badge bg-green-100 text-green-800 text-sm py-1.5 px-4">
                ✓ 培训已通过 {volunteer.training_score ? `(${volunteer.training_score}分)` : ''}
              </div>
            ) : volunteer.training_score !== undefined ? (
              <div className="badge bg-red-100 text-red-800 text-sm py-1.5 px-4">
                ✗ 培训未通过
              </div>
            ) : (
              <div className="badge bg-yellow-100 text-yellow-800 text-sm py-1.5 px-4">
                ⏳ 等待培训安排
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">🎯 技能标签</h3>
          <div className="flex flex-wrap gap-3">
            {getSkillSummary(volunteer).map((item, idx) => (
              <span key={idx} className="px-4 py-2 bg-gray-50 rounded-xl text-gray-700 font-medium text-sm border border-gray-100">
                {item}
              </span>
            ))}
            {getSkillSummary(volunteer).length === 0 && (
              <span className="text-gray-400">暂无技能标签</span>
            )}
          </div>
        </div>
      </div>

      {pendingAssignments.length > 0 && (
        <div className="card p-8 border-l-4 border-yellow-400">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>📋</span> 待确认的岗位分配 ({pendingAssignments.length})
          </h3>
          <div className="space-y-4">
            {pendingAssignments.map(a => (
              <div key={a.id} className="p-6 rounded-2xl bg-yellow-50 border border-yellow-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-lg text-gray-900">{POSITION_TYPE_MAP[a.position_type || ''] || a.position_type}</h4>
                      <span className="badge bg-yellow-200 text-yellow-800">待确认</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p>🏟️ 场馆: {a.venue_name}</p>
                      <p>📅 日期: {a.date}</p>
                      <p>⏰ 班次: {a.shift_name} ({a.start_time} - {a.end_time})</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleConfirm(a.id)} className="btn btn-success py-2.5 px-6">
                      ✓ 确认接受
                    </button>
                    <button onClick={() => handleReject(a.id)} className="btn btn-danger py-2.5 px-6">
                      ✗ 拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmedAssignments.length > 0 && (
        <div className="card p-8 border-l-4 border-green-400">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>✅</span> 已确认的岗位 ({confirmedAssignments.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {confirmedAssignments.map(a => (
              <div key={a.id} className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900">{POSITION_TYPE_MAP[a.position_type || '']}</h4>
                    <span className={`badge ${STATUS_MAP[a.status]?.color}`}>{STATUS_MAP[a.status]?.label}</span>
                  </div>
                  {a.is_late === 1 && a.status === 'in_progress' && (
                    <span className="badge bg-red-100 text-red-800">已迟到</span>
                  )}
                </div>
                <div className="space-y-1.5 text-sm text-gray-600 mb-5">
                  <p>🏟️ <strong>{a.venue_name}</strong></p>
                  <p>📅 {a.date} · {a.shift_name}</p>
                  <p>⏰ {a.start_time} - {a.end_time}</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowCredential(a)}
                    className="w-full btn btn-primary"
                  >
                    🎫 查看入场凭证
                  </button>
                  {a.status === 'confirmed' && (
                    <button onClick={() => handleCheckIn(a.id)} className="w-full btn btn-success">
                      📍 签到入场
                    </button>
                  )}
                  {a.status === 'in_progress' && (
                    <button onClick={() => handleCheckOut(a.id)} className="w-full btn btn-warning">
                      ⏹️ 签退离场
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completedAssignments.length > 0 && (
        <div className="card p-8 border-l-4 border-purple-400">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>🏆</span> 已完成的服务 ({completedAssignments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="table-header">岗位</th>
                  <th className="table-header">场馆</th>
                  <th className="table-header">日期/班次</th>
                  <th className="table-header">服务时长</th>
                  <th className="table-header">状态</th>
                </tr>
              </thead>
              <tbody>
                {completedAssignments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{POSITION_TYPE_MAP[a.position_type || '']}</td>
                    <td className="table-cell">{a.venue_name}</td>
                    <td className="table-cell text-gray-600">{a.date} · {a.shift_name}</td>
                    <td className="table-cell">
                      <span className="font-bold text-green-600">
                        {Math.floor(a.service_minutes / 60)}时{a.service_minutes % 60}分
                      </span>
                    </td>
                    <td className="table-cell">
                      {a.is_late === 1 ? (
                        <span className="badge bg-orange-100 text-orange-800">迟到 · 已完成</span>
                      ) : (
                        <span className="badge bg-green-100 text-green-800">准时完成</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">累计服务</div>
              <div className="text-3xl font-bold text-purple-700">
                {Math.floor(completedAssignments.reduce((s, a) => s + a.service_minutes, 0) / 60)}
                <span className="text-lg">小时</span>
                <span className="text-xl ml-2">
                  {completedAssignments.reduce((s, a) => s + a.service_minutes, 0) % 60}
                  <span className="text-sm">分</span>
                </span>
              </div>
            </div>
            <button onClick={() => navigate('/certifications')} className="btn btn-primary">
              🏅 申请服务证明
            </button>
          </div>
        </div>
      )}

      {volunteer.assignments?.length === 0 && volunteer.training_passed === 1 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">等待岗位分配</h3>
          <p className="text-gray-500 mb-4">您已通过培训，组委会将根据您的技能尽快分配岗位</p>
          <p className="text-sm text-gray-400">分配完成后您将在此处看到待确认信息</p>
        </div>
      )}

      {showCredential && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCredential(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-primary-600 to-accent-500 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="text-sm text-white/80 mb-1">OFFICIAL VOLUNTEER PASS</div>
                <h3 className="text-2xl font-bold mb-1">入场凭证</h3>
                <div className="text-white/90 text-sm">2026 国际体育赛事</div>
              </div>
            </div>
            <div className="p-8 text-center space-y-5">
              <div className="w-40 h-40 mx-auto bg-gray-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-5xl mb-2">🎫</div>
                <div className="text-xs text-gray-500">二维码区域</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">凭证编号</div>
                <div className="font-mono text-lg font-bold text-primary-700">{showCredential.credential_code || '生成中...'}</div>
              </div>
              <div className="text-left space-y-2.5 text-sm">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">姓名</span>
                  <span className="font-bold text-gray-900">{volunteer.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">岗位</span>
                  <span className="font-bold text-gray-900">{POSITION_TYPE_MAP[showCredential.position_type || '']}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">场馆</span>
                  <span className="font-bold text-gray-900">{showCredential.venue_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">日期</span>
                  <span className="font-bold text-gray-900">{showCredential.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时间</span>
                  <span className="font-bold text-gray-900">{showCredential.start_time} - {showCredential.end_time}</span>
                </div>
              </div>
              <button onClick={() => setShowCredential(null)} className="btn btn-primary w-full py-3 mt-4">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
