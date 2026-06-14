import { useEffect, useState } from 'react'
import api from '../api'
import { Volunteer, Certification, STATUS_MAP } from '../types'

export default function CertificationPage() {
  const [activeTab, setActiveTab] = useState<'issue' | 'list' | 'verify'>('list')
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null)
  const [eligibility, setEligibility] = useState<any>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyResult, setVerifyResult] = useState<any>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCertDetail, setShowCertDetail] = useState<Certification | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = () => {
    Promise.all([
      api.get('/volunteers'),
      api.get('/certifications')
    ]).then(([v, c]) => {
      setVolunteers(v as Volunteer[])
      setCertifications(c as Certification[])
    })
  }

  const checkEligibility = async (v: Volunteer) => {
    setSelectedVolunteer(v)
    setLoading(true)
    try {
      const data: any = await api.get(`/certifications/eligibility/${v.id}`)
      setEligibility(data)
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  const issueCertification = async (type: 'service' | 'excellent') => {
    if (!selectedVolunteer) return
    if (type === 'excellent' && !eligibility?.is_excellent) {
      if (!confirm('该志愿者暂未达到优秀志愿者标准，确认强制颁发？')) return
    }
    try {
      setLoading(true)
      const res: any = await api.post('/certifications', { volunteer_id: selectedVolunteer.id, type })
      alert(`${res.certification.title} 颁发成功！编号: ${res.certification.certificate_code}`)
      setSelectedVolunteer(null)
      setEligibility(null)
      fetchData()
      setActiveTab('list')
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  const handleVerify = async () => {
    if (!verifyCode.trim()) { alert('请输入证明编号'); return }
    setVerifyLoading(true)
    setVerifyResult(null)
    try {
      const data: any = await api.get(`/certifications/verify/${verifyCode.trim()}`)
      setVerifyResult(data)
    } catch (e: any) {
      setVerifyResult({ valid: false, error: e.message })
    } finally { setVerifyLoading(false) }
  }

  const filteredCerts = certifications.filter(c => {
    if (!searchKeyword) return true
    const kw = searchKeyword.toLowerCase()
    return (
      c.certificate_code.toLowerCase().includes(kw) ||
      (c.volunteer_name || '').toLowerCase().includes(kw) ||
      c.title.toLowerCase().includes(kw)
    )
  })

  const certTypeColors: Record<string, { bg: string; icon: string; border: string }> = {
    service: { bg: 'from-blue-500 to-indigo-600', icon: '📜', border: 'border-blue-200' },
    excellent: { bg: 'from-yellow-400 via-accent-500 to-orange-500', icon: '🏆', border: 'border-yellow-200' }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200 pb-4 flex-wrap">
        {[
          { key: 'list', label: '📋 已颁发证明', badge: certifications.length },
          { key: 'issue', label: '🏅 颁发证明' },
          { key: 'verify', label: '🔍 证明验证' }
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === t.key ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {t.label}
            {t.badge !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20' : 'bg-gray-100'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div>
          <div className="card p-5 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span>📜</span> 证明列表
                <span className="text-sm font-normal text-gray-500">共 {certifications.length} 份</span>
              </h3>
              <input className="input-field max-w-xs" placeholder="🔍 搜索编号/姓名/类型..."
                value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} />
            </div>
          </div>

          {filteredCerts.length === 0 ? (
            <div className="card p-16 text-center text-gray-400">
              <div className="text-6xl mb-4">📭</div>
              <p>{searchKeyword ? '未找到匹配的证明' : '暂无已颁发的证明'}</p>
              {!searchKeyword && (
                <button onClick={() => setActiveTab('issue')} className="btn btn-primary mt-4">
                  前往颁发证明
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCerts.map(cert => {
                const style = certTypeColors[cert.type] || certTypeColors.service
                return (
                  <div key={cert.id} className={`card overflow-hidden hover:shadow-xl transition-all border-2 ${style.border} cursor-pointer`}
                    onClick={() => setShowCertDetail(cert)}>
                    <div className={`p-6 bg-gradient-to-br ${style.bg} text-white relative overflow-hidden`}>
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
                      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
                      <div className="relative z-10">
                        <div className="text-4xl mb-3">{style.icon}</div>
                        <h4 className="text-xl font-bold mb-1">{cert.title}</h4>
                        <div className="text-sm text-white/80">2026 国际体育赛事组委会</div>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold">
                          {(cert.volunteer_name || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{cert.volunteer_name}</div>
                          <div className="text-xs text-gray-500">{cert.volunteer_phone}</div>
                        </div>
                        {cert.is_excellent === 1 && (
                          <div className="ml-auto badge bg-yellow-100 text-yellow-800">⭐ 优秀</div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-sm">
                        <div>
                          <div className="text-gray-400 text-xs">服务时长</div>
                          <div className="font-bold text-gray-900">{Math.floor(cert.total_service_minutes / 60)}小时</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs">准时率</div>
                          <div className={`font-bold ${cert.on_time_rate >= 90 ? 'text-green-600' : cert.on_time_rate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {cert.on_time_rate}%
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">证明编号</div>
                        <div className="font-mono text-xs text-primary-700 font-bold truncate bg-primary-50 px-3 py-1.5 rounded-lg">
                          {cert.certificate_code}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 text-right">
                        颁发于 {new Date(cert.issued_at).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'issue' && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="card p-5 lg:col-span-2 max-h-[70vh] overflow-hidden flex flex-col">
            <h3 className="font-bold text-lg mb-4">👥 选择志愿者</h3>
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {volunteers.length === 0 && (
                <div className="text-center py-10 text-gray-400">暂无志愿者数据</div>
              )}
              {volunteers.map(v => {
                const completedCount = certifications.filter(c => c.volunteer_id === v.id).length
                return (
                  <button key={v.id} onClick={() => checkEligibility(v)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedVolunteer?.id === v.id
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-accent-400 text-white flex items-center justify-center font-bold shrink-0">
                        {v.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{v.name}</span>
                          <span className={`badge ${STATUS_MAP[v.status]?.color} text-[10px] py-0.5`}>
                            {STATUS_MAP[v.status]?.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate">📱 {v.phone}</div>
                      </div>
                      {completedCount > 0 && (
                        <span className="badge bg-green-100 text-green-700 text-xs shrink-0">
                          {completedCount}份
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card p-6 lg:col-span-3">
            {!selectedVolunteer ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-6xl mb-4">👈</div>
                <p>请从左侧选择一名志愿者</p>
                <p className="text-xs mt-2">系统将自动评估其是否符合优秀志愿者条件</p>
              </div>
            ) : loading ? (
              <div className="text-center py-16 text-gray-400">
                <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4" />
                <p>评估资格中...</p>
              </div>
            ) : eligibility && (
              <div>
                <div className="flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                    {selectedVolunteer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedVolunteer.name}</h3>
                    <p className="text-gray-500 mt-1">📱 {selectedVolunteer.phone} {selectedVolunteer.email && `· 📧 ${selectedVolunteer.email}`}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-5 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-sm text-blue-600 mb-1">完成任务数</div>
                    <div className="text-3xl font-bold text-blue-800">{eligibility.total_assignments}</div>
                    <div className={`text-xs mt-2 ${eligibility.total_assignments >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                      要求 ≥ 3 次 {eligibility.total_assignments >= 3 ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-green-50 border border-green-100">
                    <div className="text-sm text-green-600 mb-1">累计服务时长</div>
                    <div className="text-3xl font-bold text-green-800">
                      {Math.floor(eligibility.total_service_minutes / 60)}
                      <span className="text-lg ml-1">小时</span>
                    </div>
                    <div className={`text-xs mt-2 ${eligibility.total_service_minutes >= 480 ? 'text-green-600' : 'text-gray-400'}`}>
                      要求 ≥ 8 小时(480分) {eligibility.total_service_minutes >= 480 ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="text-sm text-purple-600 mb-1">准时出勤率</div>
                    <div className="text-3xl font-bold text-purple-800">{eligibility.on_time_rate}%</div>
                    <div className={`text-xs mt-2 ${parseFloat(eligibility.on_time_rate) >= 90 ? 'text-green-600' : 'text-gray-400'}`}>
                      要求 ≥ 90% {parseFloat(eligibility.on_time_rate) >= 90 ? '✓' : '✗'}
                    </div>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl mb-6 border-2 ${
                  eligibility.is_excellent
                    ? 'bg-gradient-to-r from-yellow-50 to-accent-50 border-yellow-300'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                      eligibility.is_excellent ? 'bg-gradient-to-br from-yellow-400 to-accent-500 text-white shadow-lg' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {eligibility.is_excellent ? '🏆' : '📋'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900">
                        {eligibility.is_excellent ? '✨ 符合优秀志愿者条件' : '暂不符合优秀志愿者条件'}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {eligibility.is_excellent
                          ? '该志愿者服务时长充足、出勤率高，可颁发优秀志愿者证书'
                          : '满足以下条件即自动判定为优秀：≥3次任务 + ≥8小时服务 + ≥90%准时率'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <button disabled={loading} onClick={() => issueCertification('service')}
                    className="p-5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:shadow-xl transition-all text-left">
                    <div className="text-3xl mb-2">📜</div>
                    <div className="font-bold text-lg mb-1">颁发志愿服务证明</div>
                    <div className="text-sm text-white/80">所有完成服务的志愿者均可颁发</div>
                  </button>
                  <button disabled={loading} onClick={() => issueCertification('excellent')}
                    className={`p-5 rounded-2xl text-white hover:shadow-xl transition-all text-left ${
                      eligibility.is_excellent
                        ? 'bg-gradient-to-br from-yellow-400 via-accent-500 to-orange-500'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                    <div className="text-3xl mb-2">🏆</div>
                    <div className="font-bold text-lg mb-1">颁发优秀志愿者证书</div>
                    <div className="text-sm text-white/80">
                      {eligibility.is_excellent ? '✓ 已满足优秀志愿者标准' : '⚠ 暂未达到优秀标准'}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'verify' && (
        <div className="max-w-2xl mx-auto">
          <div className="card p-10">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-4xl mb-4 shadow-lg">
                🔍
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">证明真伪验证</h3>
              <p className="text-gray-500">输入证明上的编号即可核验其真实性</p>
            </div>

            <div className="flex gap-3 mb-8">
              <input
                type="text"
                className="input-field flex-1 text-center font-mono py-4 text-lg"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="请输入证明编号，如: CERT-XXXXXX-XXXX"
              />
              <button disabled={verifyLoading} onClick={handleVerify} className="btn btn-primary px-8 py-4 text-lg">
                {verifyLoading ? '验证中...' : '验证'}
              </button>
            </div>

            {verifyResult && (
              <div className={`p-8 rounded-2xl border-2 ${
                verifyResult.valid
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                  : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300'
              }`}>
                {verifyResult.valid ? (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl">✓</div>
                      <div>
                        <h4 className="text-xl font-bold text-green-800">此证明真实有效</h4>
                        <p className="text-sm text-green-600">该证书已在系统中登记备案</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-green-200/50">
                        <span className="text-gray-600">证明类型</span>
                        <span className="font-bold text-gray-900">{verifyResult.certification.title}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-green-200/50">
                        <span className="text-gray-600">持证人</span>
                        <span className="font-bold text-gray-900">{verifyResult.certification.volunteer_name}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-green-200/50">
                        <span className="text-gray-600">是否优秀</span>
                        <span className={`font-bold ${verifyResult.certification.is_excellent === 1 ? 'text-yellow-600' : 'text-gray-500'}`}>
                          {verifyResult.certification.is_excellent === 1 ? '⭐ 优秀志愿者' : '普通志愿者'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-green-200/50">
                        <span className="text-gray-600">累计服务</span>
                        <span className="font-bold text-gray-900">{Math.floor(verifyResult.certification.total_service_minutes / 60)} 小时</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-green-200/50">
                        <span className="text-gray-600">准时出勤率</span>
                        <span className="font-bold text-gray-900">{verifyResult.certification.on_time_rate}%</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">颁发日期</span>
                        <span className="font-bold text-gray-900">{new Date(verifyResult.certification.issued_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-white/70 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">证明编号</div>
                      <div className="font-mono font-bold text-primary-700">{verifyResult.certification.certificate_code}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500 text-white flex items-center justify-center text-3xl mb-4">✗</div>
                    <h4 className="text-xl font-bold text-red-800 mb-2">验证失败</h4>
                    <p className="text-red-600">{verifyResult.error || '该证明编号不存在或已失效'}</p>
                    <p className="text-sm text-gray-500 mt-4">请检查编号是否正确，注意大小写</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showCertDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCertDetail(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`p-10 bg-gradient-to-br ${certTypeColors[showCertDetail.type]?.bg || certTypeColors.service.bg} text-white relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
              <div className="relative z-10">
                <div className="text-xs text-white/80 mb-2 tracking-widest">CERTIFICATE OF VOLUNTEER SERVICE</div>
                <div className="text-6xl mb-4">{certTypeColors[showCertDetail.type]?.icon || '📜'}</div>
                <h2 className="text-3xl font-bold mb-2">{showCertDetail.title}</h2>
                <p className="text-white/80">2026 国际体育赛事组委会 · 官方颁发</p>
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-4 p-5 rounded-xl bg-gray-50 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-2xl font-bold">
                  {(showCertDetail.volunteer_name || '?').charAt(0)}
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">兹证明</div>
                  <div className="text-2xl font-bold text-gray-900">{showCertDetail.volunteer_name}</div>
                  <div className="text-sm text-gray-500">📱 {showCertDetail.volunteer_phone}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { label: '累计志愿服务时长', value: `${Math.floor(showCertDetail.total_service_minutes / 60)} 小时 ${showCertDetail.total_service_minutes % 60} 分钟` },
                  { label: '服务准时出勤率', value: `${showCertDetail.on_time_rate}%` },
                  { label: showCertDetail.is_excellent === 1 ? '荣誉级别' : '证书级别', value: showCertDetail.is_excellent === 1 ? '⭐ 优秀志愿者（最高级别）' : '标准志愿服务证明' },
                  { label: '颁发日期', value: new Date(showCertDetail.issued_at).toLocaleDateString('zh-CN') + ' ' + new Date(showCertDetail.issued_at).toLocaleTimeString('zh-CN').substring(0, 5) }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 mb-6">
                <div className="text-xs text-gray-500 mb-2">📋 唯一证书编号 / Certificate No.</div>
                <div className="font-mono font-bold text-lg text-primary-700 break-all">{showCertDetail.certificate_code}</div>
                <div className="text-xs text-gray-400 mt-2">请在"证明验证"页面输入此编号核验真伪</div>
              </div>

              <div className="flex gap-6 items-center pt-4 border-t border-dashed border-gray-200">
                <div className="flex-1">
                  <div className="h-16 border-b-2 border-gray-800 mb-1" />
                  <div className="text-xs text-gray-500 text-center">组委会主任签章</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="w-20 h-20 rounded-full border-4 border-red-500/30 flex items-center justify-center text-red-500/50 text-xs font-bold">
                    组委会章
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowCertDetail(null)} className="btn btn-primary w-full py-3">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
