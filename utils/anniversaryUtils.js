class AnniversaryUtils {
  static KEY = 'anniversaries';

  // 获取所有纪念日
  static getAll() {
    const anniversaries = localStorage.getItem(this.KEY);
    return anniversaries ? JSON.parse(anniversaries) : [];
  }

  // 添加纪念日
  static add(name, date) {
    const anniversaries = this.getAll();
    const newAnniversary = { id: Date.now(), name, date };
    anniversaries.push(newAnniversary);
    localStorage.setItem(this.KEY, JSON.stringify(anniversaries));
    return newAnniversary;
  }

  // 更新纪念日
  static update(id, name, date) {
    const anniversaries = this.getAll();
    const index = anniversaries.findIndex(item => item.id === id);
    if (index >= 0) {
      anniversaries[index] = { ...anniversaries[index], name, date };
      localStorage.setItem(this.KEY, JSON.stringify(anniversaries));
      return anniversaries[index];
    }
    return null;
  }

  // 删除纪念日
  static delete(id) {
    const anniversaries = this.getAll();
    const filtered = anniversaries.filter(item => item.id !== id);
    localStorage.setItem(this.KEY, JSON.stringify(filtered));
    return filtered.length !== anniversaries.length;
  }

  // 计算距今天数
  static daysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anniversaryDate = new Date(dateStr);
    anniversaryDate.setHours(0, 0, 0, 0);
    return Math.ceil((anniversaryDate - today) / (1000 * 60 * 60 * 24));
  }
}

export default AnniversaryUtils;