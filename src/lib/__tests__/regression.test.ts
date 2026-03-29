import { describe, it, expect } from 'vitest'
import { computeOLS } from '../regression'

describe('computeOLS', () => {
  it('returns null for fewer than 2 points', () => {
    expect(computeOLS([])).toBeNull()
    expect(computeOLS([{ x: 1, y: 2 }])).toBeNull()
  })

  it('returns null for degenerate case (all same x)', () => {
    expect(computeOLS([{ x: 3, y: 1 }, { x: 3, y: 5 }])).toBeNull()
  })

  it('computes perfect linear fit (y = 2x + 1)', () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]
    const result = computeOLS(points)
    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(2)
    expect(result!.intercept).toBeCloseTo(1)
    expect(result!.r2).toBeCloseTo(1)
  })

  it('predict function returns slope * x + intercept', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ]
    const result = computeOLS(points)!
    expect(result.predict(5)).toBeCloseTo(10)
  })

  it('computes partial fit (non-zero R²)', () => {
    const points = [
      { x: 1, y: 2 },
      { x: 2, y: 2.1 },
      { x: 3, y: 3.9 },
      { x: 4, y: 4.2 },
    ]
    const result = computeOLS(points)
    expect(result).not.toBeNull()
    expect(result!.r2).toBeGreaterThan(0.8)
    expect(result!.r2).toBeLessThanOrEqual(1)
  })

  it('works with exactly 2 points', () => {
    const result = computeOLS([{ x: 0, y: 0 }, { x: 4, y: 8 }])
    expect(result).not.toBeNull()
    expect(result!.slope).toBeCloseTo(2)
    expect(result!.intercept).toBeCloseTo(0)
  })
})
