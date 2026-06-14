import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { LEVEL_OPTIONS, LANGUAGE_OPTIONS } from '../types'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    id_card: '',
    languages: [] as string[],
    customLanguage: '',
    medical_experience: '',
    medical_level: 0,
    guidance_experience: '',
    guidance_level: 0,
    security_experience: '',
    security_level: 0
  })

  const updateForm = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const toggleLanguage = (lang: string) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const addCustomLanguage = () => {
    if (form.customLanguage.trim() && !form.languages.includes(form.customLanguage.trim())) {
      setForm(prev => ({
        ...prev,
        languages: [...prev.languages, prev.customLanguage.trim()],
        customLanguage: ''
      }))
    }
  }

  const canProceedStep1 = form.name.trim() && form.phone.trim()

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res: any = await api.post('/volunteers/register', {
        ...form,
        languages: form.customLanguage.trim() && !form.languages.includes(form.customLanguage.trim())
          ? [...form.languages, form.customLanguage.trim()]
          : form.languages
      })
      setSuccessId(res.id)
    } catch (e: any) {
      alert(e.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-12 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center text-5xl mb-6">
            ✅
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">报名成功！</h2>
          <p className="text-gray-600 mb-6 text-lg">感谢您申请成为赛事志愿者，请保留以下编号用于后续查询</p>
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-6 mb-8 border border-primary-100">
            <div className="text-sm text-gray-500 mb-2">您的志愿者编号</div>
            <div className="text-2xl font-mono font-bold text-primary-700 break-all">{successId}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 mb-8 text-left">
            <h4 className="font-bold text-blue-900 mb-2">📌 后续流程</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>组委会将通知您参加统一培训</li>
              <li>通过培训考核后，将根据您的技能匹配岗位</li>
              <li>收到分配通知后，请在志愿者入口确认岗位</li>
              <li>确认后将生成您的专属入场凭证</li>
            </ol>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(`/volunteer/${successId}`)} className="btn btn-primary py-3 px-8">
              进入志愿者中心
            </button>
            <button onClick={() => { setSuccessId(null); setStep(1); setForm({ name: '', phone: '', email: '', id_card: '', languages: [], customLanguage: '', medical_experience: '', medical_level: 0, guidance_experience: '', guidance_level: 0, security_experience: '', security_level: 0 }) }} className="btn btn-secondary py-3 px-8">
              继续报名
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-accent-500 p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">志愿者报名</h2>
          <p className="text-white/80">请认真填写以下信息，我们将根据您的技能与经验匹配合适的岗位</p>
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-white/70">
            <span>基本信息</span>
            <span>语言能力</span>
            <span>专业经验</span>
          </div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="label">姓名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.name}
                    onChange={e => updateForm('name', e.target.value)}
                    placeholder="请输入真实姓名"
                  />
                </div>
                <div>
                  <label className="label">手机号 <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    className="input-field"
                    value={form.phone}
                    onChange={e => updateForm('phone', e.target.value)}
                    placeholder="请输入手机号"
                  />
                </div>
                <div>
                  <label className="label">电子邮箱</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={e => updateForm('email', e.target.value)}
                    placeholder="用于接收通知（选填）"
                  />
                </div>
                <div>
                  <label className="label">身份证号</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.id_card}
                    onChange={e => updateForm('id_card', e.target.value)}
                    placeholder="用于身份核验（选填）"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button disabled={!canProceedStep1} onClick={() => setStep(2)} className="btn btn-primary py-3 px-8">
                  下一步 →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="label mb-3">语言能力 <span className="text-gray-400 font-normal">（可多选，用于语言服务岗位匹配）</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.languages.includes(lang)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {form.languages.includes(lang) && '✓ '}
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1"
                    value={form.customLanguage}
                    onChange={e => updateForm('customLanguage', e.target.value)}
                    placeholder="其他语言（选填）"
                  />
                  <button type="button" onClick={addCustomLanguage} className="btn btn-secondary whitespace-nowrap">
                    + 添加
                  </button>
                </div>
                {form.languages.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {form.languages.map(lang => (
                      <span key={lang} className="badge bg-primary-100 text-primary-800 text-sm py-1 px-3">
                        {lang}
                        <button onClick={() => toggleLanguage(lang)} className="ml-2 hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="btn btn-secondary py-3 px-8">← 上一步</button>
                <button onClick={() => setStep(3)} className="btn btn-primary py-3 px-8">下一步 →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              {[
                { key: 'medical', title: '医疗服务经验', icon: '🏥', color: 'red', desc: '包括急救、护理、医疗队服务等医疗相关经验' },
                { key: 'guidance', title: '引导服务经验', icon: '🧭', color: 'blue', desc: '包括展会引导、问询服务、礼宾接待等相关经验' },
                { key: 'security', title: '安检服务经验', icon: '🛡️', color: 'purple', desc: '包括安全检查、秩序维护、安保等相关经验' }
              ].map(cat => (
                <div key={cat.key} className={`p-6 rounded-2xl bg-${cat.color}-50/50 border border-${cat.color}-100`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-3xl">{cat.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{cat.title}</h3>
                      <p className="text-sm text-gray-500">{cat.desc}</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">经验等级</label>
                      <select
                        className="input-field"
                        value={(form as any)[`${cat.key}_level`]}
                        onChange={e => updateForm(`${cat.key}_level`, parseInt(e.target.value))}
                      >
                        {LEVEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="label">经验描述</label>
                    <textarea
                      className="input-field min-h-[80px] resize-none"
                      value={(form as any)[`${cat.key}_experience`]}
                      onChange={e => updateForm(`${cat.key}_experience`, e.target.value)}
                      placeholder="请详细描述您的相关经历、时长、具体职责等..."
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="btn btn-secondary py-3 px-8">← 上一步</button>
                <button disabled={loading} onClick={handleSubmit} className="btn btn-success py-3 px-10 text-lg">
                  {loading ? '提交中...' : '✓ 提交报名'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
