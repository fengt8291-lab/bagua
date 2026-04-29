const API = require('../../config/api')

Page({
  data: {
    status: 'intro',
    question: '',
    tosses: [],
    tossIndex: 0,
    mainHex: null,
    changedHex: null,
    lines: [],
    aiInterpretation: '',
    bannerAdLoaded: false,
    currentGroup: [null, null, null],
    currentLineIndex: 1,
    tossAnimating: false,
  },

  onLoad() {},

  startDivination() {
    this.setData({ status: 'inputing', question: '' })
  },

  onQuestionInput(e) {
    this.setData({ question: e.detail.value })
  },

  confirmQuestion() {
    const { question } = this.data
    if (!question.trim()) {
      wx.showToast({ title: '请输入您的问题', icon: 'none' })
      return
    }
    if (question.length < 5) {
      wx.showToast({ title: '问题太短了，再详细点', icon: 'none' })
      return
    }
    this.setData({ status: 'tossing', tosses: [], tossIndex: 0, currentGroup: [null, null, null] })
    this.tossInterval = setInterval(() => this.doOneToss(), 700)
  },

  doOneToss() {
    const { tossIndex, tosses } = this.data
    if (tossIndex >= 18) {
      clearInterval(this.tossInterval)
      this.setData({ tossAnimating: false })
      this.calculateHexagram()
      return
    }

    const coins = [
      Math.random() > 0.5 ? 1 : 0,
      Math.random() > 0.5 ? 1 : 0,
      Math.random() > 0.5 ? 1 : 0
    ]
    const sum = coins[0] + coins[1] + coins[2]
    const yang = sum >= 2 ? 1 : 0
    const old = sum === 3 || sum === 0 ? 1 : 0
    const tossValue = yang ? (old ? 6 : 7) : (old ? 9 : 8)

    const newTosses = [...tosses, tossValue]
    const groupIndex = tossIndex % 3
    const currentGroup = [...this.data.currentGroup]
    currentGroup[groupIndex] = { value: tossValue, isYang: yang === 1 }

    this.setData({
      tosses: newTosses,
      tossIndex: tossIndex + 1,
      currentGroup: currentGroup,
      currentLineIndex: Math.floor(tossIndex / 3) + 1,
      tossAnimating: true,
    })
  },

  calculateHexagram() {
    const { tosses } = this.data
    const HEX_NAMES = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']

    const calcGua = (i0, i1, i2) => {
      return (tosses[i0] >= 7 ? 1 : 0) * 4 +
             (tosses[i1] >= 7 ? 1 : 0) * 2 +
             (tosses[i2] >= 7 ? 1 : 0)
    }

    const outerIdx = calcGua(5, 4, 3)
    const innerIdx = calcGua(2, 1, 0)

    const LINE_NAMES = ['初九', '九二', '九三', '六四', '九五', '上六']
    const LINE_TEXTS = { 6: '老阳·变', 7: '少阳', 9: '老阴·动', 8: '少阴' }

    const sixTosses = tosses.slice(3).reverse()
    const displayLines = sixTosses.map((t, i) => ({
      index: i,
      name: LINE_NAMES[i],
      value: t,
      isYang: t === 6 || t === 7,
      isOld: t === 6 || t === 9,
      symbol: (t === 6 || t === 7) ? '—' : '--',
      text: LINE_TEXTS[t] || ''
    }))

    const changedCount = tosses.filter(t => t === 6 || t === 9).length
    const mainHex = HEX_NAMES[outerIdx] + HEX_NAMES[innerIdx]

    const changedTosses = tosses.map(t => {
      if (t === 6) return 9
      if (t === 9) return 6
      return t
    })
    const outerChg = (changedTosses[5] >= 7 ? 1 : 0) * 4 + (changedTosses[4] >= 7 ? 1 : 0) * 2 + (changedTosses[3] >= 7 ? 1 : 0)
    const innerChg = (changedTosses[2] >= 7 ? 1 : 0) * 4 + (changedTosses[1] >= 7 ? 1 : 0) * 2 + (changedTosses[0] >= 7 ? 1 : 0)
    const changedHex = changedCount > 0 ? HEX_NAMES[outerChg] + HEX_NAMES[innerChg] : null

    this.setData({
      mainHex: mainHex,
      changedHex: changedHex,
      lines: displayLines,
      changedCount: changedCount,
    })

    this.getAIInterpretation(mainHex, changedHex, displayLines)
  },

  getAIInterpretation(mainHex, changedHex, lines) {
    const { question, changedCount } = this.data
    wx.showLoading({ title: 'AI解读中...' })

    wx.cloud.callFunction({
      name: 'apiProxy',
      data: {
        path: API.ENDPOINTS.BAGUA,
        data: {
          question,
          mainHex,
          changedHex: changedHex || '无',
          lines: lines.map(l => l.name + '：' + l.text)
        }
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.code === 0) {
          this.setData({ aiInterpretation: res.result.data.data.interpretation, status: 'result' })
        } else {
          this.setData({ aiInterpretation: this._buildFallbackInterpretation(mainHex, changedHex, changedCount), status: 'result' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ aiInterpretation: this._buildFallbackInterpretation(mainHex, changedHex, changedCount), status: 'result' })
      }
    })
  },

  _buildFallbackInterpretation(mainHex, changedHex, changedCount) {
    return '【' + mainHex + '】' + (changedHex ? ' → 【' + changedHex + '】' : '') + '\n\n此卦显示，你所问之事目前处于关键节点。变爻' + changedCount + '个，说明局势尚在变化之中，结果尚未完全定型。\n\n建议：当前宜静不宜动，先守成再图进取。保持耐心，局势会在一段时间后自然明朗。'
  },

  onShareAppMessage() {
    const { mainHex } = this.data
    return { title: '我起了一卦【' + mainHex + '】，你也来试试', path: '/pages/bagua/index' }
  },

  onUnload() {
    if (this.tossInterval) {
      clearInterval(this.tossInterval)
    }
  },

  reset() {
    if (this.tossInterval) {
      clearInterval(this.tossInterval)
    }
    this.setData({
      status: 'intro',
      question: '',
      tosses: [],
      tossIndex: 0,
      mainHex: null,
      changedHex: null,
      lines: [],
      aiInterpretation: '',
      currentGroup: [null, null, null],
      currentLineIndex: 1,
      tossAnimating: false,
      bannerAdLoaded: false,
    })
  }
})