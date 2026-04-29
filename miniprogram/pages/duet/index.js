const API = require('../../config/api')

Page({
  data: {
    status: 'pair',

    myCode: '',
    partnerCode: '',
    pairId: '',

    currentQ: 0,
    totalQ: 15,
    answers: [],
    partnerAnswers: [],

    resultType: '',
    resultTitle: '',
    dimensions: [],
    suggestions: [],
    shareText: '',

    bannerLoaded: false,

    questions: [
      { text: '周末你更想做什么？', options: ['宅家休息', '外出探索', '朋友聚会', '学习提升'] },
      { text: '遇到分歧时你通常？', options: ['坚持己见', '寻求妥协', '暂时回避', '换位思考'] },
      { text: '你更喜欢哪种约会？', options: ['浪漫晚餐', '户外运动', '看电影', '一起做饭'] },
      { text: '收到消息你会？', options: ['秒回', '想一下再回', '忙完再回', '看心情'] },
      { text: '你的消费观是？', options: ['及时享乐', '精打细算', '投资自己', '攒钱为主'] },
      { text: '压力大时你会？', options: ['找人倾诉', '独处消化', '运动释放', '吃东西'] },
      { text: '你更看重对方什么？', options: ['外貌', '性格', '才华', '经济'] },
      { text: '旅行时你更在意？', options: ['目的地', '同行的人', '美食', '拍照打卡'] },
      { text: '吵架后你会？', options: ['主动和好', '等对方和好', '冷战几天', '看谁的错'] },
      { text: '你理想的相处模式？', options: ['天天黏一起', '各自有空间', '定期约会', '随缘'] },
      { text: '对方忘记纪念日？', options: ['很生气', '提醒一下', '无所谓', '也忘了'] },
      { text: '你更相信？', options: ['一见钟情', '日久生情', '缘分天注定', '自己争取'] },
      { text: '朋友圈你会？', options: ['经常发', '偶尔发', '只看不发', '设置分组'] },
      { text: '你做决定时？', options: ['凭感觉', '理性分析', '参考他人', '抛硬币'] },
      { text: '你希望未来？', options: ['稳定安逸', '充满挑战', '自由自在', '事业有成'] }
    ]
  },

  onLoad() {
    const cache = wx.getStorageSync('duet_cache') || {}
    if (cache.myCode) {
      this.setData({ myCode: cache.myCode, pairId: cache.pairId, status: 'pair' })
    }
  },

  onUnload() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
  },

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const nums = '0123456789'
    let code = ''
    for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)]
    code += '-'
    for (let i = 0; i < 3; i++) code += nums[Math.floor(Math.random() * nums.length)]
    const pairId = 'pair_' + Date.now()
    this.setData({ myCode: code, pairId })
    wx.setStorageSync('duet_cache', { myCode: code, pairId })
    this.setData({ status: 'pair' })
  },

  onPartnerCodeInput(e) {
    this.setData({ partnerCode: e.detail.value.toUpperCase() })
  },

  startPairing() {
    const { partnerCode } = this.data
    if (partnerCode.length !== 7 || partnerCode.indexOf('-') !== 3) {
      wx.showToast({ title: '配对码格式：ABC-123', icon: 'none' })
      return
    }
    wx.showLoading({ title: '连接中...' })

    wx.cloud.callFunction({
      name: 'apiProxy',
      data: {
        path: API.ENDPOINTS.DUET_PAIR,
        data: {
          myCode: this.data.myCode,
          partnerCode: partnerCode,
          pairId: this.data.pairId
        }
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.code === 0) {
          this.setData({
            pairId: res.result.data.data.pairId,
            status: 'answering',
            currentQ: 0,
            answers: []
          })
        } else {
          wx.showToast({ title: res.result?.data?.msg || '配对失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '配对失败，请检查网络', icon: 'none' })
      }
    })
  },

  selectAnswer(optionIndex) {
    const { currentQ, answers, totalQ } = this.data
    const newAnswers = [...answers]
    newAnswers[currentQ] = optionIndex

    this.setData({ answers: newAnswers })

    if (currentQ < totalQ - 1) {
      setTimeout(() => {
        this.setData({ currentQ: currentQ + 1 })
      }, 300)
    } else {
      this.submitAnswers()
    }
  },

  submitAnswers() {
    wx.showLoading({ title: '等待对方...' })
    const { pairId, answers, myCode } = this.data

    wx.cloud.callFunction({
      name: 'apiProxy',
      data: {
        path: API.ENDPOINTS.DUET_SUBMIT,
        data: { pairId, myCode, answers }
      },
      success: (res) => {
        if (res.result && res.result.code === 0) {
          this.setData({ status: 'waiting' })
          this.waitForPartner()
        } else {
          wx.showToast({ title: '提交失败', icon: 'none' })
          wx.hideLoading()
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '提交失败，请检查网络', icon: 'none' })
      }
    })
  },

  waitForPartner() {
    const { pairId, partnerCode } = this.data
    let pollCount = 0
    const maxPolls = 15

    this.pollTimer = setInterval(() => {
      pollCount++
      wx.cloud.callFunction({
        name: 'apiProxy',
        data: {
          path: API.ENDPOINTS.DUET_POLL,
          data: { pairId, partnerCode }
        },
        success: (res) => {
          if (res.result && res.result.code === 0 && res.result.data.data.ready) {
            clearInterval(this.pollTimer)
            clearTimeout(this.timeoutTimer)
            this.calculateResult(res.result.data.data)
          }
        },
        fail: () => clearInterval(this.pollTimer)
      })

      if (pollCount >= maxPolls) {
        clearInterval(this.pollTimer)
      }
    }, 2000)

    this.timeoutTimer = setTimeout(() => {
      clearInterval(this.pollTimer)
      if (this.data.status === 'waiting') {
        wx.showToast({ title: '对方超时，进入本地结果', icon: 'none' })
        this.setData({ status: 'result', resultType: 'local' })
        wx.hideLoading()
      }
    }, 30000)
  },

  calculateResult(data) {
    const { answers, partnerAnswers } = data

    let consensusCount = 0
    for (let i = 0; i < answers.length; i++) {
      if (answers[i] === partnerAnswers[i]) consensusCount++
    }
    const consensusRate = consensusCount / answers.length

    const typeNames = ['互补型', '同步型', '探索型', '守护型', '弹性型']
    const typeIndex = Math.floor(consensusRate * typeNames.length) % typeNames.length
    const resultType = typeNames[typeIndex]
    const resultTitles = {
      '互补型': '你们的差异，是最好的礼物',
      '同步型': '你们在同一频率上',
      '探索型': '一起冒险的伙伴',
      '守护型': '彼此最踏实的后盾',
      '弹性型': '吵不散的关系'
    }

    const dimensions = [
      { name: '沟通方式', mine: '直接', partner: '委婉', score: Math.floor(consensusRate * 100) },
      { name: '决策模式', mine: '理性', partner: '感性', score: Math.floor((1 - consensusRate) * 60 + 40) },
      { name: '冲突处理', mine: '冷处理', partner: '热解决', score: Math.floor(consensusRate * 70 + 30) },
      { name: '亲密距离', mine: '独立', partner: '依赖', score: Math.floor(consensusRate * 80 + 20) },
    ]

    const suggestions = [
      '建议每周有一次不带目的的聊天',
      '对方说"没事"的时候，其实可能有事',
      '差异不是问题，忽视差异才是',
    ]

    const shareText = `我在Duet测出"${resultType}"，${resultTitles[resultType]}。你也来试试？`

    this.setData({
      status: 'result',
      resultType,
      resultTitle: resultTitles[resultType],
      dimensions,
      suggestions,
      shareText,
      partnerAnswers,
    })
    wx.hideLoading()
  },

  onShareAppMessage() {
    return {
      title: this.data.shareText || '测测我们的关系化学反应',
      path: '/pages/duet/index'
    }
  },

  reset() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
    wx.removeStorageSync('duet_cache')
    this.setData({
      status: 'pair',
      myCode: '', partnerCode: '', pairId: '',
      currentQ: 0, answers: [], partnerAnswers: [],
      resultType: '', resultTitle: '', dimensions: [],
      suggestions: [], shareText: ''
    })
  }
})