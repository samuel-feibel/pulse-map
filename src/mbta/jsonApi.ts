/** Minimal, defensive readers for the MBTA's JSON:API responses. */

export interface Resource {
  readonly type: string
  readonly id: string
  readonly attributes: Readonly<Record<string, unknown>>
  readonly relationships: Readonly<Record<string, unknown>>
}

export interface Document {
  readonly data: readonly Resource[]
  readonly included: readonly Resource[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function toResource(value: unknown): Resource | null {
  if (!isRecord(value) || typeof value.type !== 'string' || typeof value.id !== 'string') {
    return null
  }
  return {
    type: value.type,
    id: value.id,
    attributes: isRecord(value.attributes) ? value.attributes : {},
    relationships: isRecord(value.relationships) ? value.relationships : {},
  }
}

const toResources = (values: unknown): Resource[] =>
  Array.isArray(values) ? values.map(toResource).filter((r): r is Resource => r !== null) : []

/** Validates the top-level shape; malformed individual resources are dropped. */
export function readDocument(body: unknown): Document {
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error('Unexpected MBTA response: missing "data" array')
  }
  return { data: toResources(body.data), included: toResources(body.included) }
}

/** The id a to-one relationship points at, e.g. relationshipId(vehicle, 'route') → 'Red'. */
export function relationshipId(resource: Resource, name: string): string | null {
  const relationship = resource.relationships[name]
  if (!isRecord(relationship) || !isRecord(relationship.data)) {
    return null
  }
  return typeof relationship.data.id === 'string' ? relationship.data.id : null
}

export const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
