/** Familiar names for the airliners most often seen at Logan, keyed by ICAO type code. */
const NAMES: Readonly<Record<string, string>> = {
  A20N: 'A320neo',
  A21N: 'A321neo',
  A319: 'A319',
  A320: 'A320',
  A321: 'A321',
  A332: 'A330-200',
  A333: 'A330-300',
  A339: 'A330-900neo',
  A359: 'A350-900',
  A35K: 'A350-1000',
  B712: '717',
  B737: '737-700',
  B738: '737-800',
  B739: '737-900',
  B38M: '737 MAX 8',
  B39M: '737 MAX 9',
  B752: '757-200',
  B763: '767-300',
  B772: '777-200',
  B77W: '777-300ER',
  B788: '787-8',
  B789: '787-9',
  B78X: '787-10',
  BCS1: 'A220-100',
  BCS3: 'A220-300',
  CRJ9: 'CRJ-900',
  E170: 'E170',
  E75L: 'E175',
  E75S: 'E175',
  E190: 'E190',
  E195: 'E195',
}

const UNKNOWN = 'Aircraft'

export const aircraftName = (typeCode: string | null): string =>
  typeCode ? (NAMES[typeCode] ?? typeCode) : UNKNOWN
