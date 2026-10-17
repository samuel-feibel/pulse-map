import { describe, expect, test } from 'vitest'
import { COLORS, minimalStyle } from './mapStyle'

const style = minimalStyle()

describe('minimalStyle', () => {
  test('draws no text or icons', () => {
    expect(style.layers.filter((layer) => layer.type === 'symbol')).toEqual([])
    expect(style.glyphs).toBeUndefined()
    expect(style.sprite).toBeUndefined()
  })

  test('uses a black background so unlit areas emit no projector light', () => {
    const background = style.layers.find((layer) => layer.type === 'background')
    expect(background?.paint).toMatchObject({ 'background-color': '#000000' })
  })

  test('draws only water, parks and roads', () => {
    const sourceLayers = new Set(
      style.layers.flatMap((layer) => ('source-layer' in layer ? [layer['source-layer']] : [])),
    )
    expect([...sourceLayers].sort()).toEqual(['landcover', 'park', 'transportation', 'water', 'waterway'])
  })

  test('colors water blue, parks green and roads one neutral color', () => {
    const paintColors = style.layers.map((layer) => JSON.stringify(layer.paint ?? {}))
    expect(paintColors.some((p) => p.includes(COLORS.water))).toBe(true)
    expect(paintColors.some((p) => p.includes(COLORS.park))).toBe(true)
    expect(paintColors.some((p) => p.includes(COLORS.road))).toBe(true)
  })
})
