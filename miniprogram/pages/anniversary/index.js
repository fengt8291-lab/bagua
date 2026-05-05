const API = require('../../config/api')

Page({
  data: {
    anniversaries: [],
    showAddModal: false,
    showNameModal: false,
    showDelModal: false,
    delTargetId: '',
    newName: '',
    newDate: '',
    coupleName: '',
    showAbout: false,
    editingCoupleName: false,
    editCoupleName: '',
  },

  onLoad() {
    this.loadAnniversaries()
    this.loadCoupleName()
  },

  onShow() {
    this.loadAnniversaries()
  },

  // =====================================================================
  // Couple Name
  // =====================================================================

  loadCoupleName() {
    const coupleName = wx.getStorageSync('coupleName') || ''
    this.setData({ coupleName })
  },

  showNameModal() {
    this.setData({
      showNameModal: true,
      editCoupleName: this.data.coupleName || '',
    })
  },

  hideNameModal() {
    this.setData({ showNameModal: false })
  },

  onCoupleNameInput(e) {
    this.setData({ editCoupleName: e.detail.value })
  },

  saveCoupleName() {
    const name = this.data.editCoupleName.trim()
    wx.setStorageSync('coupleName', name)
    this.setData({ coupleName: name, showNameModal: false })
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  // =====================================================================
  // Anniversary List
  // =====================================================================

  loadAnniversaries() {
    const raw = wx.getStorageSync('anniversaries') || '[]'
    let list = []
    try { list = JSON.parse(raw) } catch (e) {}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    list = list.map(item => {
      const eventDate = new Date(item.date)
      eventDate.setHours(0, 0, 0, 0)
      const diffTime = eventDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return {
        ...item,
        daysUntil: diffDays,
        isPast: diffDays < 0,
        isToday: diffDays === 0,
      }
    })

    // Sort: today first, then upcoming, then past
    list.sort((a, b) => {
      if (a.isToday && !b.isToday) return -1
      if (!a.isToday && b.isToday) return 1
      return a.daysUntil - b.daysUntil
    })

    this.setData({ anniversaries: list })
  },

  // =====================================================================
  // Add
  // =====================================================================

  showAdd() {
    this.setData({ showAddModal: true, newName: '', newDate: '' })
  },

  hideAdd() {
    this.setData({ showAddModal: false })
  },

  onNameInput(e) {
    this.setData({ newName: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ newDate: e.detail.value })
  },

  addAnniversary() {
    const { newName, newDate } = this.data
    if (!newName.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    if (!newDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: newName.trim(),
      date: newDate,
      createAt: new Date().toISOString().slice(0, 10),
    }

    const raw = wx.getStorageSync('anniversaries') || '[]'
    let list = []
    try { list = JSON.parse(raw) } catch (e) {}
    list.push(item)
    wx.setStorageSync('anniversaries', JSON.stringify(list))

    this.setData({ showAddModal: false })
    this.loadAnniversaries()
    wx.showToast({ title: '添加成功', icon: 'success' })
  },

  // =====================================================================
  // Delete
  // =====================================================================

  confirmDelete(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ delTargetId: id, showDelModal: true })
  },

  hideDel() {
    this.setData({ showDelModal: false, delTargetId: '' })
  },

  doDelete() {
    const id = this.data.delTargetId
    const raw = wx.getStorageSync('anniversaries') || '[]'
    let list = []
    try { list = JSON.parse(raw) } catch (e) {}
    list = list.filter(item => item.id !== id)
    wx.setStorageSync('anniversaries', JSON.stringify(list))
    this.setData({ showDelModal: false, delTargetId: '' })
    this.loadAnniversaries()
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  // =====================================================================
  // About
  // =====================================================================

  toggleAbout() {
    this.setData({ showAbout: !this.data.showAbout })
  },
})