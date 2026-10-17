import type { TransitProvider } from '../transit/types'
import { fetchLines } from './lines'
import { fetchStations } from './stations'
import { fetchVehicles } from './vehicles'

/** MBTA (Boston) transit for the given route ids, e.g. ['Red', 'Orange']. */
export function createMbtaProvider(routeIds: readonly string[]): TransitProvider {
  return {
    loadLines: () => fetchLines(routeIds),
    loadStations: () => fetchStations(routeIds),
    fetchVehicles: () => fetchVehicles(routeIds),
  }
}
