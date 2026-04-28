// Duet 小程序 - 核心逻辑
// 双人配对测试：配对码机制 + 共识场景题 + 结果对比

Page({
  data: {
    // 状态：pair | answering | waiting | result
    status: 'pair',
    
    // 配对信息
    myCode: '',       // 我的配对码 ABC-123
    partnerCode: '',   // 对方配对码
    pairId: '',        // 配对会话ID
    
    // 题目进度
    currentQ: 0,      // 当前第几题（0-based）
    totalQ: 15,        // 总题数
    answers: [],      // 我的答案数组
    partnerAnswers: [], // 对方答案（从服务器拉取）
    
    // 结果
    resultType: '',
    resultTitle: '',
    dimensions: [],    // 6维分析
    suggestions: [],  // 改善建议
    shareText: '',
    
    // Banner广告
    bannerLoaded: false,
  },

  onLoad() {
    // 检查是否有未完成的配对
    const cache = wx.getStorageSync('duet_cache') || {}
    if (cache.myCode) {
      this.setData({ myCode: cache.myCode, pairId: cache.pairId, status: 'pair' })
    }
  },

  // 生成配对码
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

  // 输入对方配对码
  onPartnerCodeInput(e) {
    this.setData({ partnerCode: e.detail.value.toUpperCase() })
  },

  // 开始配对
  startPairing() {
    const { partnerCode } = this.data
    if (partnerCode.length !== 7 || partnerCode.indexOf('-') !== 3) {
      wx.showToast({ title: '配对码格式：ABC-123', icon: 'none' })
      return
    }
    wx.showLoading({ title: '连接中...' })
    
    wx.request({
      url: 'https://soul.nihaofengzi.top/api/duet/pair',
      method: 'POST',
      data: {
        myCode: this.data.myCode,
        partnerCode: partnerCode,
        pairId: this.data.pairId
      },
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 0) {
          this.setData({ 
            pairId: res.data.data.pairId,
            status: 'answering',
            currentQ: 0,
            answers: []
          })
        } else {
          wx.showToast({ title: res.data.msg || '配对失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        // TODO: 降级到本地题目模式
        this.setData({ status: 'answering' })
      }
    })
  },

  // 答题 - 选择答案
  selectAnswer(optionIndex) {
    const { currentQ, answers, totalQ } = this.data
    const newAnswers = [...answers]
    newAnswers[currentQ] = optionIndex
    
    this.setData({ answers: newAnswers })
    
    if (currentQ < totalQ - 1) {
      // 下一题
      setTimeout(() => {
        this.setData({ currentQ: currentQ + 1 })
      }, 300)
    } else {
      // 最后一题，提交
      this.submitAnswers()
    }
  },

  // 提交答案
  submitAnswers() {
    wx.showLoading({ title: '等待对方...' })
    const { pairId, answers, myCode } = this.data
    
    wx.request({
      url: 'https://soul.nihaofengzi.top/api/duet/submit',
      method: 'POST',
      data: { pairId, myCode, answers },
      success: (res) => {
        if (res.data.code === 0) {
          // 已提交，等待对方
          this.setData({ status: 'waiting' })
          // 轮询检查对方是否完成
          this.waitForPartner()
        } else {
          wx.showToast({ title: '提交失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        // TODO: 离线模式
        this.setData({ status: 'result', resultType: 'local_test' })
      }
    })
  },

  // 等待对方完成
  waitForPartner() {
    const { pairId, partnerCode } = this.data
    const checkInterval = setInterval(() => {
      wx.request({
        url: 'https://soul.nihaofengzi.top/api/duet/poll',
        data: { pairId, partnerCode },
        success: (res) => {
          if (res.data && res.data.code === 0 && res.data.data.ready) {
            clearInterval(checkInterval)
            this.calculateResult(res.data.data)
          }
        },
        fail: () => clearInterval(checkInterval)
      })
    }, 2000)
    
    // 30秒超时
    setTimeout(() => {
      clearInterval(checkInterval)
      if (this.data.status === 'waiting') {
        wx.showToast({ title: '对方超时，进入本地结果', icon: 'none' })
        this.setData({ status: 'result', resultType: 'local' })
      }
    }, 30000)
  },

  // 计算结果
  calculateResult(data) {
    const { answers, partnerAnswers } = data
    
    // 计算共识维度（双方答案相同比例）
    let consensusCount = 0
    for (let i = 0; i < answers.length; i++) {
      if (answers[i] === partnerAnswers[i]) consensusCount++
    }
    const consensusRate = consensusCount / answers.length

    // 关系类型判定（简化版）
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
      { name: '决策模式', mine: '理性', partner: '感性', score: Math.floor((1-consensusRate) * 60 + 40) },
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

  // 分享
  onShareAppMessage() {
    return {
      title: this.data.shareText || '测测我们的关系化学反应',
      path: '/pages/duet/index'
    }
  },

  // 重置
  reset() {
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