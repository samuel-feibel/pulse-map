import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '../geo'

/** Gap between the plane and its label, in pixels. */
const LABEL_GAP = 14
/** Past this fraction of the wall width, labels go on the plane's left so they stay on the wall. */
const FLIP_AT = 0.65

export interface PlaneLabel {
  readonly lines: readonly string[]
  readonly position: LngLat
  readonly opacity: number
}

/** Takeoff/landing call-outs as HTML markers next to the plane (the map style has no fonts). */
export function createPlaneLabels(map: MapLibreMap): (labels: ReadonlyMap<string, PlaneLabel>) => void {
  const markers = new Map<string, { marker: Marker; text: string }>()

  return (labels) => {
    markers.forEach((entry, id) => {
      if (!labels.has(id)) {
        entry.marker.remove()
        markers.delete(id)
      }
    })
    labels.forEach((label, id) => {
      const text = label.lines.join('\n')
      const existing = markers.get(id)
      const marker =
        existing?.marker ??
        new Marker({ element: Object.assign(document.createElement('div'), { className: 'plane-label' }), anchor: 'left' })
          .setLngLat([label.position.lng, label.position.lat])
          .addTo(map)
      if (existing?.text !== text) {
        marker.getElement().replaceChildren(...label.lines.map((line) => Object.assign(document.createElement('div'), { textContent: line })))
      }
      const element = marker.getElement()
      const isNearRightEdge = map.project([label.position.lng, label.position.lat]).x > map.getContainer().clientWidth * FLIP_AT
      marker.setOffset(isNearRightEdge ? [-LABEL_GAP - element.offsetWidth, 0] : [LABEL_GAP, 0])
      element.style.textAlign = isNearRightEdge ? 'right' : 'left'
      marker.setLngLat([label.position.lng, label.position.lat])
      element.style.opacity = label.opacity.toFixed(2)
      markers.set(id, { marker, text })
    })
  }
}
