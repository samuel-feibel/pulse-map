import { describe, expect, test } from 'vitest'
import { activeServiceIds, buildRailNetwork, buildTimetable, parseCsv, type GtfsFiles } from './gtfs'

describe('parseCsv', () => {
  test('reads rows by header, handling a byte-order mark, quotes and CRLF line endings', () => {
    const text = '﻿id,name,color\r\n1,"Judah, N",005B95\r\n2,Church,A96614\r\n'
    expect(parseCsv(text)).toEqual([
      { id: '1', name: 'Judah, N', color: '005B95' },
      { id: '2', name: 'Church', color: 'A96614' },
    ])
  })
})

const files: GtfsFiles = {
  routes: 'route_id,route_short_name,route_type,route_color\nN,N,0,005B95\n22,22,3,FF0000\nPM,PM,5,B49A36\n',
  trips: [
    'route_id,service_id,trip_id,direction_id,shape_id',
    'N,wk,n1,0,shapeA',
    'N,wk,n2,0,shapeA',
    'N,wk,n3,0,shapeShort',
    'N,wk,n4,1,shapeBack',
    '22,wk,b1,0,shapeBus',
    'PM,wk,p1,0,shapeP',
  ].join('\n'),
  shapes: [
    'shape_id,shape_pt_lon,shape_pt_lat,shape_pt_sequence',
    'shapeA,-122.40,37.78,2',
    'shapeA,-122.41,37.77,1',
    'shapeA,-122.39,37.79,3',
    'shapeShort,-122.41,37.77,1',
    'shapeShort,-122.40,37.78,2',
    'shapeBack,-122.39,37.79,1',
    'shapeBus,-122.5,37.7,1',
    'shapeP,-122.41,37.80,1',
    'shapeP,-122.41,37.79,2',
  ].join('\n'),
  stops: [
    'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station',
    's1,Embarcadero,37.79,-122.39,0,',
    's2,Duboce,37.77,-122.43,0,',
    's3,Cable stop,37.80,-122.41,0,',
    'p1,Big Station,37.70,-122.40,1,',
  ].join('\n'),
  stopTimes: [
    'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
    'n1,7:00:00,7:00:00,s1,1',
    'n1,7:10:00,7:10:00,s2,2',
    'n4,8:00:00,8:00:00,s2,1',
    'p1,9:00:00,9:00:00,s3,1',
  ].join('\n'),
}

describe('buildRailNetwork', () => {
  const network = buildRailNetwork(files, { prefix: 'SF', routeTypes: ['0', '5'], stationRouteTypes: ['0'] })

  test('keeps only rail routes, prefixed so ids from different agencies never collide', () => {
    expect(network.lines.map((l) => l.routeId).sort()).toEqual(['SF:N', 'SF:PM'])
  })

  test("draws each route with its most common direction-0 shape, in point order, in the route's color", () => {
    const n = network.lines.find((l) => l.routeId === 'SF:N')!
    expect(n.color).toBe('#005B95')
    expect(n.coordinates).toEqual([
      [-122.41, 37.77],
      [-122.4, 37.78],
      [-122.39, 37.79],
    ])
  })

  test('lists stations from that representative trip, only for the chosen route types', () => {
    expect(network.stations.map((s) => s.id).sort()).toEqual(['SF:s1', 'SF:s2'])
  })

  test('can keep only stops whose name marks them as stations (skipping street-corner stops)', () => {
    const named = buildRailNetwork(files, { prefix: 'SF', routeTypes: ['0'], stationRouteTypes: ['0'], stationNamePattern: 'Embarcadero' })
    expect(named.stations.map((s) => s.id)).toEqual(['SF:s1'])
  })

  test('can use parent stations instead (as BART publishes them)', () => {
    const parents = buildRailNetwork(files, { prefix: 'BA', routeTypes: ['0'], stationRouteTypes: [], useParentStations: true })
    expect(parents.stations).toEqual([{ id: 'BA:p1', position: { lng: -122.4, lat: 37.7 } }])
  })
})

describe('activeServiceIds', () => {
  const calendar = [
    'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date',
    'WK,1,1,1,1,1,0,0,20260801,20261231',
    'SA,0,0,0,0,0,1,0,20260801,20261231',
    'OLD,1,1,1,1,1,1,1,20250101,20250601',
  ].join('\n')
  const calendarDates = ['service_id,date,exception_type', 'WK,20261126,2', 'SA,20261126,1'].join('\n')

  test('runs weekday service on a weekday within its date range', () => {
    expect(activeServiceIds(calendar, calendarDates, '20261019')).toEqual(new Set(['WK']))
  })

  test('applies holiday exceptions: weekday service removed, Saturday service added', () => {
    expect(activeServiceIds(calendar, calendarDates, '20261126')).toEqual(new Set(['SA']))
  })

  test('skips service outside its date range', () => {
    expect(activeServiceIds(calendar, calendarDates, '20250701').has('OLD')).toBe(false)
  })
})

describe('buildTimetable', () => {
  const ttFiles: GtfsFiles = {
    ...files,
    routes: 'route_id,route_short_name,route_type,route_color\nY1,Yellow-S,1,FFFF33\nY2,Yellow-N,1,FFFF33\nBB,Bridge,3,000000\n',
    trips: [
      'route_id,service_id,trip_id,direction_id,shape_id',
      'Y2,WK,t1,0,shapeA',
      'Y1,WK,t2,1,shapeBack',
      'Y2,SA,t3,0,shapeA',
      'BB,WK,bus1,0,shapeBus',
    ].join('\n'),
    stops: [
      'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station',
      'A,Station A,37.70,-122.40,1,',
      'A-1,Platform A,37.7001,-122.4001,0,A',
      'B,Station B,37.80,-122.30,1,',
      'B-1,Platform B,37.8001,-122.3001,0,B',
    ].join('\n'),
    stopTimes: [
      'trip_id,arrival_time,departure_time,stop_id,stop_sequence',
      't1,7:00:00,7:01:00,A-1,1',
      't1,7:10:00,7:10:00,B-1,2',
      't2,25:05:00,25:05:00,B-1,0',
      't2,25:15:00,25:15:00,A-1,1',
      't3,9:00:00,9:00:00,A-1,1',
      'bus1,7:00:00,7:00:00,A-1,1',
    ].join('\n'),
    calendar: 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nWK,1,1,1,1,1,0,0,20260801,20261231\nSA,0,0,0,0,0,1,0,20260801,20261231\n',
    calendarDates: 'service_id,date,exception_type\n',
  }
  const timetable = buildTimetable(ttFiles, { prefix: 'BA', routeTypes: ['1'], stationRouteTypes: [], useParentStations: true }, '20261019')

  test("lists that day's rail trips only", () => {
    expect(timetable.trips.map((t) => t.id).sort()).toEqual(['BA:t1', 'BA:t2'])
  })

  test('gives stop times in seconds after midnight, including past-midnight times', () => {
    const t1 = timetable.trips.find((t) => t.id === 'BA:t1')!
    expect(t1.stops).toEqual([
      ['BA:A', 25_200, 25_260],
      ['BA:B', 25_800, 25_800],
    ])
    expect(timetable.trips.find((t) => t.id === 'BA:t2')!.stops[0][1]).toBe(90_300)
  })

  test("places platforms at their station and draws each trip on its color's line", () => {
    expect(timetable.stops['BA:A']).toEqual([-122.4, 37.7])
    expect(new Set(timetable.trips.map((t) => t.lineId))).toEqual(new Set(['BA:Y2']))
  })
})
