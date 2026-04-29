const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const API_BASE = 'https://soul.nihaofengzi.top'

exports.main = async (event, context) => {
  const { path, data, method = 'POST' } = event

  try {
    const response = await axios({
      url: `${API_BASE}${path}`,
      method: method,
      data: data,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    return {
      code: 0,
      data: response.data
    }
  } catch (error) {
    console.error('API调用失败:', error)
    return {
      code: -1,
      msg: error.message || '网络请求失败'
    }
  }
}