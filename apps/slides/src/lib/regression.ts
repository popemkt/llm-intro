export interface Point {
  x: number
  y: number
}

export interface RegressionResult {
  slope: number
  intercept: number
  predict: (x: number) => number
  r2: number
}

/**
 * Ordinary Least Squares linear regression.
 * Returns null when fewer than 2 points or degenerate (all same x).
 *
 * m = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
 * b = (Σy − m·Σx) / n
 */
export function computeOLS(points: Point[]): RegressionResult | null {
  const n = points.length
  if (n < 2) return null

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (const { x, y } of points) {
    sumX  += x
    sumY  += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) return null

  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const meanY = sumY / n
  let ssTot = 0, ssRes = 0
  for (const { x, y } of points) {
    ssTot += (y - meanY) ** 2
    ssRes += (y - (slope * x + intercept)) ** 2
  }
  const r2 = ssTot < 1e-10 ? 1 : 1 - ssRes / ssTot

  return { slope, intercept, r2, predict: (x) => slope * x + intercept }
}
