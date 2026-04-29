Page({
  data: {
    anniversaries: [],
    showAddModal: false,
    newName: '',
    newDate: ''
  },

  onLoad() {
    this.loadAnniversaries()
  },

  onShow() {
    this.loadAnniversaries()
  },

  loadAnniversaries() {
    const db = wx.cloud.database()
    db.collection('anniversaries')
      .orderBy('date', 'asc')
      .get()
      .then(res => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const anniversaries = res.data.map(item => {
          const eventDate = new Date(item.date)
          eventDate.setHours(0, 0, 0, 0)
          const diffTime = eventDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          return {
            ...item,
            daysUntil: diffDays,
            isPast: diffDays < 0,
            isToday: diffDays === 0
          }
        })

        this.setData({ anniversaries })
      })
      .catch(err => {
        console.error('加载纪念日失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

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

    wx.showLoading({ title: '添加中...' })

    const db = wx.cloud.database()
    db.collection('anniversaries').add({
      data: {
        name: newName.trim(),
        date: newDate,
        createTime: db.serverDate()
      }
    })
    .then(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.setData({ showAddModal: false })
      this.loadAnniversaries()
    })
    .catch(err => {
      wx.hideLoading()
      console.error('添加纪念日失败:', err)
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },

  deleteAnniversary(e) {
    const { id } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个纪念日吗？',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('anniversaries').doc(id).remove()
            .then(() => {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadAnniversaries()
            })
            .catch(err => {
              console.error('删除纪念日失败:', err)
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
        }
      }
    })
  }
})