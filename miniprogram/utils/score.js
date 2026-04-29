function getScore(scores) {
  return scores.reduce((total, score) => total + score, 0)
}

module.exports = { getScore }
