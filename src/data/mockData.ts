import type {
  AirportOption,
  CalendarPrice,
  DestinationPoint,
  FlightTemplate,
  RouteInsight,
} from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

const today = new Date()
today.setHours(0, 0, 0, 0)

function addDays(base: Date, offset: number) {
  return new Date(base.getTime() + offset * DAY_MS)
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function createCalendar(basePrice: number, seed: number): CalendarPrice[] {
  return Array.from({ length: 84 }, (_, index) => {
    const date = addDays(today, index + 7)
    const swing =
      Math.sin((index + seed) / 3.5) * 22 +
      Math.cos((index + seed) / 8) * 14 +
      (index % 7 === 1 ? -24 : 0) +
      (index % 7 === 5 ? 18 : 0) +
      (Math.floor(index / 7) % 3 === 2 ? 12 : -6)
    const price = Math.max(89, Math.round(basePrice + swing))
    const valueScore = Math.max(
      64,
      Math.min(98, Math.round(96 - (price - basePrice) / 2 + ((index + seed) % 5))),
    )

    return {
      date: toIsoDate(date),
      price,
      valueScore,
    }
  })
}

function createHistory(basePrice: number, seed: number, direction: RouteInsight['direction']) {
  return Array.from({ length: 30 }, (_, index) => {
    const baseShift =
      direction === 'falling' ? -index * 1.4 : direction === 'rising' ? index * 1.3 : index * 0.15
    const wave = Math.sin((index + seed) / 3) * 11 + Math.cos((index + seed) / 6) * 5
    return Math.max(92, Math.round(basePrice + wave + baseShift))
  })
}

function lowest(values: number[]) {
  return Math.min(...values)
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function createRouteInsight(config: {
  origin: string
  destination: string
  basePrice: number
  seed: number
  direction: RouteInsight['direction']
  summary: string
  buyRecommendation: string
  historicalTip: string
  cheapestWeek: string
  weatherSummary: string
  timezoneDifference: string
}) {
  const history = createHistory(config.basePrice, config.seed, config.direction)
  const calendar = createCalendar(config.basePrice, config.seed)
  const last7 = history.slice(-7)
  const monthlyAverage = average(history)
  const recentAverage = average(last7)
  const previous7 = history.slice(-14, -7)
  const weeklyChangePercent = Math.round(
    ((recentAverage - average(previous7)) / average(previous7)) * 100,
  )

  return {
    routeKey: `${config.origin}-${config.destination}`,
    weekLowest: lowest(last7),
    monthLowest: lowest(history),
    direction: config.direction,
    weeklyChangePercent,
    monthlyAverage,
    recentAverage,
    summary: config.summary,
    buyRecommendation: config.buyRecommendation,
    historicalTip: config.historicalTip,
    cheapestWeek: config.cheapestWeek,
    weatherSummary: config.weatherSummary,
    timezoneDifference: config.timezoneDifference,
    history,
    calendar,
  } satisfies RouteInsight
}

export const airportOptions: AirportOption[] = [
  { code: 'ATL', city: 'Atlanta', airport: 'Hartsfield-Jackson Atlanta International', country: 'United States', state: 'Georgia', metro: 'Atlanta', priority: 100, aliases: ['Atlanta Airport'] },
  { code: 'AUS', city: 'Austin', airport: 'Austin-Bergstrom International', country: 'United States', state: 'Texas', metro: 'Austin', priority: 86 },
  { code: 'BNA', city: 'Nashville', airport: 'Nashville International', country: 'United States' },
  { code: 'BOS', city: 'Boston', airport: 'Logan International', country: 'United States', state: 'Massachusetts', metro: 'Boston', priority: 89, aliases: ['Boston Logan'] },
  { code: 'BOB', city: 'Bora Bora', airport: 'Motu Mute', country: 'French Polynesia' },
  { code: 'CLT', city: 'Charlotte', airport: 'Charlotte Douglas International', country: 'United States' },
  { code: 'DCA', city: 'Washington', airport: 'Ronald Reagan Washington National', country: 'United States', state: 'District of Columbia', metro: 'Washington', priority: 93, aliases: ['Reagan National', 'Washington National'] },
  { code: 'DEN', city: 'Denver', airport: 'Denver International', country: 'United States', state: 'Colorado', metro: 'Denver', priority: 98 },
  { code: 'DFW', city: 'Dallas', airport: 'Dallas/Fort Worth International', country: 'United States', state: 'Texas', metro: 'Dallas-Fort Worth', priority: 99, aliases: ['Dallas Fort Worth', 'DFW Airport'] },
  { code: 'DTW', city: 'Detroit', airport: 'Detroit Metropolitan Wayne County', country: 'United States' },
  { code: 'EWR', city: 'Newark', airport: 'Newark Liberty International', country: 'United States', state: 'New Jersey', metro: 'New York', priority: 90, aliases: ['Newark Airport', 'Liberty Newark'] },
  { code: 'FLL', city: 'Fort Lauderdale', airport: 'Fort Lauderdale-Hollywood International', country: 'United States' },
  { code: 'HNL', city: 'Honolulu', airport: 'Daniel K. Inouye International', country: 'United States' },
  { code: 'IAD', city: 'Washington', airport: 'Washington Dulles International', country: 'United States', state: 'Virginia', metro: 'Washington', priority: 88, aliases: ['Dulles'] },
  { code: 'IAH', city: 'Houston', airport: 'George Bush Intercontinental', country: 'United States', state: 'Texas', metro: 'Houston', priority: 91, aliases: ['Houston Intercontinental', 'Bush Intercontinental'] },
  { code: 'JFK', city: 'New York', airport: 'John F. Kennedy International', country: 'United States', state: 'New York', metro: 'New York', priority: 97, aliases: ['Kennedy Airport', 'JFK Airport'] },
  { code: 'LAS', city: 'Las Vegas', airport: 'Harry Reid International', country: 'United States', state: 'Nevada', metro: 'Las Vegas', priority: 90, aliases: ['McCarran'] },
  { code: 'LAX', city: 'Los Angeles', airport: 'Los Angeles International', country: 'United States', state: 'California', metro: 'Los Angeles', priority: 99, aliases: ['LAX Airport'] },
  { code: 'MCO', city: 'Orlando', airport: 'Orlando International', country: 'United States', state: 'Florida', metro: 'Orlando', priority: 87, aliases: ['MCO Airport'] },
  { code: 'MIA', city: 'Miami', airport: 'Miami International', country: 'United States', state: 'Florida', metro: 'Miami-Fort Lauderdale', priority: 89 },
  { code: 'MSP', city: 'Minneapolis', airport: 'Minneapolis-Saint Paul International', country: 'United States', state: 'Minnesota', metro: 'Minneapolis-Saint Paul', priority: 84, aliases: ['Twin Cities'] },
  { code: 'ORD', city: 'Chicago', airport: "O'Hare International", country: 'United States', state: 'Illinois', metro: 'Chicago', priority: 98, aliases: ['Chicago Ohare', "O'Hare"] },
  { code: 'PDX', city: 'Portland', airport: 'Portland International', country: 'United States' },
  { code: 'PHL', city: 'Philadelphia', airport: 'Philadelphia International', country: 'United States' },
  { code: 'PHX', city: 'Phoenix', airport: 'Phoenix Sky Harbor International', country: 'United States', state: 'Arizona', metro: 'Phoenix', priority: 88, aliases: ['Sky Harbor'] },
  { code: 'PPT', city: 'Papeete', airport: "Tahiti Faa'a International", country: 'French Polynesia' },
  { code: 'SAN', city: 'San Diego', airport: 'San Diego International', country: 'United States', state: 'California', metro: 'San Diego', priority: 81, aliases: ['Lindbergh Field'] },
  { code: 'SEA', city: 'Seattle', airport: 'Seattle-Tacoma International', country: 'United States', state: 'Washington', metro: 'Seattle', priority: 91, aliases: ['SeaTac', 'Sea-Tac'] },
  { code: 'SFO', city: 'San Francisco', airport: 'San Francisco International', country: 'United States', state: 'California', metro: 'San Francisco Bay Area', priority: 94, aliases: ['SFO Airport'] },
  { code: 'SLC', city: 'Salt Lake City', airport: 'Salt Lake City International', country: 'United States', state: 'Utah', metro: 'Salt Lake City', priority: 70 },
  { code: 'STT', city: 'St. Thomas', airport: 'Cyril E. King', country: 'U.S. Virgin Islands' },
  { code: 'TPA', city: 'Tampa', airport: 'Tampa International', country: 'United States', state: 'Florida', metro: 'Tampa Bay', priority: 76 },
  { code: 'YUL', city: 'Montreal', airport: 'Montreal-Trudeau International', country: 'Canada' },
  { code: 'YVR', city: 'Vancouver', airport: 'Vancouver International', country: 'Canada' },
  { code: 'YYZ', city: 'Toronto', airport: 'Toronto Pearson International', country: 'Canada' },
  { code: 'MEX', city: 'Mexico City', airport: 'Benito Juarez International', country: 'Mexico' },
  { code: 'GRU', city: 'Sao Paulo', airport: 'Guarulhos International', country: 'Brazil' },
  { code: 'EZE', city: 'Buenos Aires', airport: 'Ezeiza International', country: 'Argentina' },
  { code: 'LHR', city: 'London', airport: 'Heathrow', country: 'United Kingdom', metro: 'London', priority: 100, aliases: ['London Heathrow'] },
  { code: 'LGW', city: 'London', airport: 'Gatwick', country: 'United Kingdom', metro: 'London', priority: 81, aliases: ['London Gatwick'] },
  { code: 'CDG', city: 'Paris', airport: 'Charles de Gaulle', country: 'France', metro: 'Paris', priority: 89, aliases: ['Paris CDG'] },
  { code: 'ORY', city: 'Paris', airport: 'Orly', country: 'France', metro: 'Paris', priority: 63, aliases: ['Paris Orly'] },
  { code: 'AMS', city: 'Amsterdam', airport: 'Schiphol', country: 'Netherlands' },
  { code: 'FRA', city: 'Frankfurt', airport: 'Frankfurt Airport', country: 'Germany', metro: 'Frankfurt', priority: 82 },
  { code: 'MUC', city: 'Munich', airport: 'Munich Airport', country: 'Germany' },
  { code: 'MAD', city: 'Madrid', airport: 'Adolfo Suarez Madrid-Barajas', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', airport: 'Barcelona-El Prat', country: 'Spain' },
  { code: 'FCO', city: 'Rome', airport: 'Leonardo da Vinci Fiumicino', country: 'Italy', metro: 'Rome', priority: 73, aliases: ['Fiumicino'] },
  { code: 'ZRH', city: 'Zurich', airport: 'Zurich Airport', country: 'Switzerland' },
  { code: 'IST', city: 'Istanbul', airport: 'Istanbul Airport', country: 'Turkey', metro: 'Istanbul', priority: 75 },
  { code: 'ATH', city: 'Athens', airport: 'Athens International', country: 'Greece' },
  { code: 'CAI', city: 'Cairo', airport: 'Cairo International', country: 'Egypt' },
  { code: 'JNB', city: 'Johannesburg', airport: 'O.R. Tambo International', country: 'South Africa' },
  { code: 'CPT', city: 'Cape Town', airport: 'Cape Town International', country: 'South Africa' },
  { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'United Arab Emirates', metro: 'Dubai', priority: 86 },
  { code: 'DOH', city: 'Doha', airport: 'Hamad International', country: 'Qatar', metro: 'Doha', priority: 72 },
  { code: 'AUH', city: 'Abu Dhabi', airport: 'Zayed International', country: 'United Arab Emirates' },
  { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi International', country: 'India', metro: 'Delhi', priority: 79 },
  { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji Maharaj International', country: 'India', metro: 'Mumbai', priority: 71 },
  { code: 'SIN', city: 'Singapore', airport: 'Singapore Changi', country: 'Singapore', metro: 'Singapore', priority: 84 },
  { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi', country: 'Thailand' },
  { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong International', country: 'Hong Kong', metro: 'Hong Kong', priority: 74 },
  { code: 'ICN', city: 'Seoul', airport: 'Incheon International', country: 'South Korea', metro: 'Seoul', priority: 77 },
  { code: 'NRT', city: 'Tokyo', airport: 'Narita International', country: 'Japan', metro: 'Tokyo', priority: 75, aliases: ['Tokyo Narita'] },
  { code: 'HND', city: 'Tokyo', airport: 'Haneda', country: 'Japan', metro: 'Tokyo', priority: 85, aliases: ['Tokyo Haneda'] },
  { code: 'SYD', city: 'Sydney', airport: 'Sydney Kingsford Smith', country: 'Australia', metro: 'Sydney', priority: 73 },
  { code: 'MEL', city: 'Melbourne', airport: 'Melbourne Airport', country: 'Australia' },
  { code: 'AKL', city: 'Auckland', airport: 'Auckland Airport', country: 'New Zealand' },
  { code: 'BDL', city: 'Hartford', airport: 'Bradley International', country: 'United States', state: 'Connecticut', metro: 'Hartford', priority: 54, aliases: ['Bradley Airport', 'Hartford Springfield'] },
  { code: 'BUF', city: 'Buffalo', airport: 'Buffalo Niagara International', country: 'United States', state: 'New York', metro: 'Buffalo', priority: 45 },
  { code: 'BWI', city: 'Baltimore', airport: 'Baltimore/Washington International', country: 'United States', state: 'Maryland', metro: 'Washington', priority: 84, aliases: ['BWI Marshall', 'Baltimore Washington'] },
  { code: 'CHS', city: 'Charleston', airport: 'Charleston International', country: 'United States', state: 'South Carolina', metro: 'Charleston', priority: 48 },
  { code: 'CLE', city: 'Cleveland', airport: 'Cleveland Hopkins International', country: 'United States', state: 'Ohio', metro: 'Cleveland', priority: 57 },
  { code: 'CMH', city: 'Columbus', airport: 'John Glenn Columbus International', country: 'United States', state: 'Ohio', metro: 'Columbus', priority: 53 },
  { code: 'CVG', city: 'Cincinnati', airport: 'Cincinnati/Northern Kentucky International', country: 'United States', state: 'Kentucky', metro: 'Cincinnati', priority: 58, aliases: ['Northern Kentucky'] },
  { code: 'DAL', city: 'Dallas', airport: 'Dallas Love Field', country: 'United States', state: 'Texas', metro: 'Dallas-Fort Worth', priority: 82, aliases: ['Love Field', 'Dallas Love'] },
  { code: 'GEG', city: 'Spokane', airport: 'Spokane International', country: 'United States', state: 'Washington', metro: 'Spokane', priority: 37 },
  { code: 'HOU', city: 'Houston', airport: 'William P. Hobby', country: 'United States', state: 'Texas', metro: 'Houston', priority: 67, aliases: ['Houston Hobby', 'Hobby Airport'] },
  { code: 'IND', city: 'Indianapolis', airport: 'Indianapolis International', country: 'United States', state: 'Indiana', metro: 'Indianapolis', priority: 50 },
  { code: 'JAX', city: 'Jacksonville', airport: 'Jacksonville International', country: 'United States', state: 'Florida', metro: 'Jacksonville', priority: 49 },
  { code: 'LGA', city: 'New York', airport: 'LaGuardia', country: 'United States', state: 'New York', metro: 'New York', priority: 88, aliases: ['La Guardia', 'LaGuardia Airport'] },
  { code: 'MCI', city: 'Kansas City', airport: 'Kansas City International', country: 'United States', state: 'Missouri', metro: 'Kansas City', priority: 51 },
  { code: 'MDW', city: 'Chicago', airport: 'Midway International', country: 'United States', state: 'Illinois', metro: 'Chicago', priority: 74, aliases: ['Chicago Midway'] },
  { code: 'MEM', city: 'Memphis', airport: 'Memphis International', country: 'United States', state: 'Tennessee', metro: 'Memphis', priority: 39 },
  { code: 'MKE', city: 'Milwaukee', airport: 'Milwaukee Mitchell International', country: 'United States', state: 'Wisconsin', metro: 'Milwaukee', priority: 43, aliases: ['Mitchell Airport'] },
  { code: 'MSY', city: 'New Orleans', airport: 'Louis Armstrong New Orleans International', country: 'United States', state: 'Louisiana', metro: 'New Orleans', priority: 61 },
  { code: 'OAK', city: 'Oakland', airport: 'Oakland International', country: 'United States', state: 'California', metro: 'San Francisco Bay Area', priority: 59 },
  { code: 'OGG', city: 'Kahului', airport: 'Kahului', country: 'United States', state: 'Hawaii', metro: 'Maui', priority: 42, aliases: ['Maui'] },
  { code: 'OMA', city: 'Omaha', airport: 'Eppley Airfield', country: 'United States', state: 'Nebraska', metro: 'Omaha', priority: 34 },
  { code: 'ONT', city: 'Ontario', airport: 'Ontario International', country: 'United States', state: 'California', metro: 'Los Angeles', priority: 55 },
  { code: 'PBI', city: 'West Palm Beach', airport: 'Palm Beach International', country: 'United States', state: 'Florida', metro: 'South Florida', priority: 40 },
  { code: 'PIT', city: 'Pittsburgh', airport: 'Pittsburgh International', country: 'United States', state: 'Pennsylvania', metro: 'Pittsburgh', priority: 47 },
  { code: 'PWM', city: 'Portland', airport: 'Portland International Jetport', country: 'United States', state: 'Maine', metro: 'Portland Maine', priority: 30, aliases: ['Portland Maine'] },
  { code: 'RDU', city: 'Raleigh', airport: 'Raleigh-Durham International', country: 'United States', state: 'North Carolina', metro: 'Research Triangle', priority: 63, aliases: ['Raleigh Durham', 'Durham Airport'] },
  { code: 'RNO', city: 'Reno', airport: 'Reno-Tahoe International', country: 'United States', state: 'Nevada', metro: 'Reno', priority: 31, aliases: ['Tahoe Airport'] },
  { code: 'RSW', city: 'Fort Myers', airport: 'Southwest Florida International', country: 'United States', state: 'Florida', metro: 'Fort Myers', priority: 46 },
  { code: 'SAT', city: 'San Antonio', airport: 'San Antonio International', country: 'United States', state: 'Texas', metro: 'San Antonio', priority: 56 },
  { code: 'SAV', city: 'Savannah', airport: 'Savannah/Hilton Head International', country: 'United States', state: 'Georgia', metro: 'Savannah', priority: 33, aliases: ['Hilton Head Airport'] },
  { code: 'SJC', city: 'San Jose', airport: 'Norman Y. Mineta San Jose International', country: 'United States', state: 'California', metro: 'San Francisco Bay Area', priority: 52 },
  { code: 'SJU', city: 'San Juan', airport: 'Luis Munoz Marin International', country: 'Puerto Rico', metro: 'San Juan', priority: 52, aliases: ['Puerto Rico'] },
  { code: 'SMF', city: 'Sacramento', airport: 'Sacramento International', country: 'United States', state: 'California', metro: 'Sacramento', priority: 44 },
  { code: 'SNA', city: 'Orange County', airport: 'John Wayne', country: 'United States', state: 'California', metro: 'Los Angeles', priority: 58, aliases: ['John Wayne Airport', 'Santa Ana'] },
  { code: 'STL', city: 'St. Louis', airport: 'St. Louis Lambert International', country: 'United States', state: 'Missouri', metro: 'St. Louis', priority: 60, aliases: ['Lambert'] },
  { code: 'TUL', city: 'Tulsa', airport: 'Tulsa International', country: 'United States', state: 'Oklahoma', metro: 'Tulsa', priority: 28 },
  { code: 'YYC', city: 'Calgary', airport: 'Calgary International', country: 'Canada', metro: 'Calgary', priority: 49 },
  { code: 'CUN', city: 'Cancun', airport: 'Cancun International', country: 'Mexico', metro: 'Cancun', priority: 62 },
  { code: 'SJD', city: 'San Jose del Cabo', airport: 'Los Cabos International', country: 'Mexico', metro: 'Los Cabos', priority: 42, aliases: ['Cabo', 'Cabo San Lucas'] },
  { code: 'GIG', city: 'Rio de Janeiro', airport: 'Galeao International', country: 'Brazil', metro: 'Rio de Janeiro', priority: 55 },
  { code: 'SCL', city: 'Santiago', airport: 'Arturo Merino Benitez International', country: 'Chile', metro: 'Santiago', priority: 54 },
  { code: 'BOG', city: 'Bogota', airport: 'El Dorado International', country: 'Colombia', metro: 'Bogota', priority: 59 },
  { code: 'LIM', city: 'Lima', airport: 'Jorge Chavez International', country: 'Peru', metro: 'Lima', priority: 57 },
  { code: 'LCY', city: 'London', airport: 'London City', country: 'United Kingdom', metro: 'London', priority: 43, aliases: ['City Airport London'] },
  { code: 'MAN', city: 'Manchester', airport: 'Manchester Airport', country: 'United Kingdom', metro: 'Manchester', priority: 56 },
  { code: 'BRU', city: 'Brussels', airport: 'Brussels Airport', country: 'Belgium', metro: 'Brussels', priority: 48 },
  { code: 'DUB', city: 'Dublin', airport: 'Dublin Airport', country: 'Ireland', metro: 'Dublin', priority: 59 },
  { code: 'BER', city: 'Berlin', airport: 'Berlin Brandenburg', country: 'Germany', metro: 'Berlin', priority: 53 },
  { code: 'LIS', city: 'Lisbon', airport: 'Humberto Delgado', country: 'Portugal', metro: 'Lisbon', priority: 52 },
  { code: 'MXP', city: 'Milan', airport: 'Malpensa', country: 'Italy', metro: 'Milan', priority: 57 },
  { code: 'VCE', city: 'Venice', airport: 'Marco Polo', country: 'Italy', metro: 'Venice', priority: 39 },
  { code: 'VIE', city: 'Vienna', airport: 'Vienna International', country: 'Austria', metro: 'Vienna', priority: 50 },
  { code: 'CPH', city: 'Copenhagen', airport: 'Copenhagen Airport', country: 'Denmark', metro: 'Copenhagen', priority: 49 },
  { code: 'ARN', city: 'Stockholm', airport: 'Arlanda', country: 'Sweden', metro: 'Stockholm', priority: 46 },
  { code: 'OSL', city: 'Oslo', airport: 'Oslo Gardermoen', country: 'Norway', metro: 'Oslo', priority: 42 },
  { code: 'HEL', city: 'Helsinki', airport: 'Helsinki Airport', country: 'Finland', metro: 'Helsinki', priority: 41 },
  { code: 'CMN', city: 'Casablanca', airport: 'Mohammed V International', country: 'Morocco', metro: 'Casablanca', priority: 44 },
  { code: 'NBO', city: 'Nairobi', airport: 'Jomo Kenyatta International', country: 'Kenya', metro: 'Nairobi', priority: 45 },
  { code: 'ADD', city: 'Addis Ababa', airport: 'Bole International', country: 'Ethiopia', metro: 'Addis Ababa', priority: 43 },
  { code: 'DWC', city: 'Dubai', airport: 'Al Maktoum International', country: 'United Arab Emirates', metro: 'Dubai', priority: 28, aliases: ['Dubai World Central'] },
  { code: 'RUH', city: 'Riyadh', airport: 'King Khalid International', country: 'Saudi Arabia', metro: 'Riyadh', priority: 46 },
  { code: 'JED', city: 'Jeddah', airport: 'King Abdulaziz International', country: 'Saudi Arabia', metro: 'Jeddah', priority: 45 },
  { code: 'BLR', city: 'Bengaluru', airport: 'Kempegowda International', country: 'India', metro: 'Bengaluru', priority: 54, aliases: ['Bangalore'] },
  { code: 'HYD', city: 'Hyderabad', airport: 'Rajiv Gandhi International', country: 'India', metro: 'Hyderabad', priority: 44 },
  { code: 'KUL', city: 'Kuala Lumpur', airport: 'Kuala Lumpur International', country: 'Malaysia', metro: 'Kuala Lumpur', priority: 57 },
  { code: 'HKT', city: 'Phuket', airport: 'Phuket International', country: 'Thailand', metro: 'Phuket', priority: 40 },
  { code: 'SGN', city: 'Ho Chi Minh City', airport: 'Tan Son Nhat International', country: 'Vietnam', metro: 'Ho Chi Minh City', priority: 50, aliases: ['Saigon'] },
  { code: 'HAN', city: 'Hanoi', airport: 'Noi Bai International', country: 'Vietnam', metro: 'Hanoi', priority: 41 },
  { code: 'CGK', city: 'Jakarta', airport: 'Soekarno-Hatta International', country: 'Indonesia', metro: 'Jakarta', priority: 55 },
  { code: 'DPS', city: 'Denpasar', airport: 'Ngurah Rai International', country: 'Indonesia', metro: 'Bali', priority: 53, aliases: ['Bali'] },
  { code: 'MNL', city: 'Manila', airport: 'Ninoy Aquino International', country: 'Philippines', metro: 'Manila', priority: 56 },
  { code: 'TPE', city: 'Taipei', airport: 'Taiwan Taoyuan International', country: 'Taiwan', metro: 'Taipei', priority: 58 },
  { code: 'PVG', city: 'Shanghai', airport: 'Pudong International', country: 'China', metro: 'Shanghai', priority: 70 },
  { code: 'SHA', city: 'Shanghai', airport: 'Hongqiao International', country: 'China', metro: 'Shanghai', priority: 47 },
  { code: 'PEK', city: 'Beijing', airport: 'Beijing Capital International', country: 'China', metro: 'Beijing', priority: 66 },
  { code: 'PKX', city: 'Beijing', airport: 'Beijing Daxing International', country: 'China', metro: 'Beijing', priority: 48 },
  { code: 'CAN', city: 'Guangzhou', airport: 'Baiyun International', country: 'China', metro: 'Guangzhou', priority: 52 },
  { code: 'SZX', city: 'Shenzhen', airport: 'Baoan International', country: 'China', metro: 'Shenzhen', priority: 47 },
  { code: 'GMP', city: 'Seoul', airport: 'Gimpo International', country: 'South Korea', metro: 'Seoul', priority: 41 },
  { code: 'KIX', city: 'Osaka', airport: 'Kansai International', country: 'Japan', metro: 'Osaka', priority: 57 },
  { code: 'ITM', city: 'Osaka', airport: 'Itami', country: 'Japan', metro: 'Osaka', priority: 35 },
  { code: 'BNE', city: 'Brisbane', airport: 'Brisbane Airport', country: 'Australia', metro: 'Brisbane', priority: 49 },
  { code: 'PER', city: 'Perth', airport: 'Perth Airport', country: 'Australia', metro: 'Perth', priority: 45 },
  { code: 'CHC', city: 'Christchurch', airport: 'Christchurch Airport', country: 'New Zealand', metro: 'Christchurch', priority: 31 },
]

function normalizeAirportSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function airportLabel(airport: AirportOption) {
  const location = [airport.city, airport.state].filter(Boolean).join(', ')
  return `${location} (${airport.code}) - ${airport.airport}`
}

function airportAliases(airport: AirportOption) {
  return [
    airport.code,
    airport.city,
    airport.airport,
    airport.metro,
    airport.state,
    `${airport.city} ${airport.code}`,
    `${airport.city} ${airport.airport}`,
    `${airport.airport} ${airport.code}`,
    `${airport.city} ${airport.country}`,
    `${airport.city} airport`,
    `${airport.airport} airport`,
    airportLabel(airport),
    ...(airport.aliases ?? []),
  ].filter(Boolean) as string[]
}

const airportByCode = new Map(airportOptions.map((airport) => [airport.code, airport]))
const airportAliasMap = new Map<string, string>()

for (const airport of airportOptions) {
  for (const alias of airportAliases(airport)) {
    airportAliasMap.set(normalizeAirportSearchValue(alias), airport.code)
  }
}

function scoreAirportMatch(airport: AirportOption, normalizedQuery: string) {
  if (!normalizedQuery) {
    return -1
  }

  const code = normalizeAirportSearchValue(airport.code)
  const city = normalizeAirportSearchValue(airport.city)
  const metro = normalizeAirportSearchValue(airport.metro ?? '')
  const state = normalizeAirportSearchValue(airport.state ?? '')
  const airportName = normalizeAirportSearchValue(airport.airport)
  const label = normalizeAirportSearchValue(airportLabel(airport))
  const aliases = (airport.aliases ?? []).map(normalizeAirportSearchValue)

  let score = airport.priority ?? 0

  if (normalizedQuery === code) score += 500
  if (normalizedQuery === city) score += 360
  if (metro && normalizedQuery === metro) score += 320
  if (normalizedQuery === airportName) score += 340
  if (normalizedQuery === label) score += 300
  if (aliases.includes(normalizedQuery)) score += 280

  if (code.startsWith(normalizedQuery)) score += 240
  if (city.startsWith(normalizedQuery)) score += 220
  if (metro.startsWith(normalizedQuery)) score += 200
  if (airportName.startsWith(normalizedQuery)) score += 190
  if (state.startsWith(normalizedQuery)) score += 140

  if (city.includes(normalizedQuery)) score += 120
  if (metro.includes(normalizedQuery)) score += 110
  if (airportName.includes(normalizedQuery)) score += 105
  if (state.includes(normalizedQuery)) score += 70
  if (label.includes(normalizedQuery)) score += 80
  if (aliases.some((alias) => alias.includes(normalizedQuery))) score += 95

  return score
}

export function findAirportMatches(value: string, limit = 8) {
  const normalizedQuery = normalizeAirportSearchValue(value)

  if (!normalizedQuery) {
    return airportOptions
      .slice()
      .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))
      .slice(0, limit)
  }

  return airportOptions
    .map((airport) => ({ airport, score: scoreAirportMatch(airport, normalizedQuery) }))
    .filter((result) => result.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.airport.priority ?? 0) - (left.airport.priority ?? 0) ||
        left.airport.city.localeCompare(right.airport.city),
    )
    .slice(0, limit)
    .map((result) => result.airport)
}

export const airportSearchSuggestions = Array.from(
  new Set(
    airportOptions
      .slice()
      .sort(
        (left, right) =>
          (right.priority ?? 0) - (left.priority ?? 0) ||
          left.city.localeCompare(right.city) ||
          left.code.localeCompare(right.code),
      )
      .flatMap((airport) => [airportLabel(airport), airport.code, airport.city, airport.airport]),
  ),
)

export function resolveAirportCode(value: string) {
  const normalized = normalizeAirportSearchValue(value)

  if (!normalized) {
    return ''
  }

  const exactAlias = airportAliasMap.get(normalized)
  if (exactAlias) {
    return exactAlias
  }

  const codeMatch = normalized.match(/\b[A-Z]{3}\b/)
  if (codeMatch && airportByCode.has(codeMatch[0])) {
    return codeMatch[0]
  }

  const [bestMatch] = findAirportMatches(value, 1)
  if (bestMatch) {
    return bestMatch.code
  }

  return codeMatch ? codeMatch[0] : normalized.slice(0, 3)
}

export const destinationExplorerByOrigin: Record<string, DestinationPoint[]> = {
  DFW: [
    { airport: 'DEN', city: 'Denver', x: 32, y: 21, price: 129, valueTag: 'Best value', summary: 'Fast nonstop windows all day' },
    { airport: 'MIA', city: 'Miami', x: 76, y: 41, price: 178, valueTag: 'Popular', summary: 'Strong direct inventory this week' },
    { airport: 'SEA', city: 'Seattle', x: 20, y: 8, price: 241, valueTag: 'Comfort pick', summary: 'Great Alaska and Delta timing' },
    { airport: 'SAN', city: 'San Diego', x: 14, y: 28, price: 198, valueTag: 'Cheapest sun route', summary: 'Best fares midweek' },
    { airport: 'JFK', city: 'New York', x: 85, y: 16, price: 216, valueTag: 'Business heavy', summary: 'Premium cabins pricing well' },
    { airport: 'STT', city: 'St. Thomas', x: 88, y: 54, price: 412, valueTag: 'Aspirational', summary: 'Worth watching for drops' },
  ],
  JFK: [
    { airport: 'LAX', city: 'Los Angeles', x: 10, y: 27, price: 247, valueTag: 'Most searched', summary: 'Direct competition holding prices' },
    { airport: 'MIA', city: 'Miami', x: 77, y: 41, price: 154, valueTag: 'Great deal', summary: 'Cheapest week opens in 10 days' },
    { airport: 'DFW', city: 'Dallas', x: 32, y: 28, price: 188, valueTag: 'Fastest', summary: 'Morning departures scoring highest' },
    { airport: 'SFO', city: 'San Francisco', x: 9, y: 19, price: 262, valueTag: 'Work trip', summary: 'Business value outperforms LAX' },
    { airport: 'STT', city: 'St. Thomas', x: 88, y: 54, price: 389, valueTag: 'Leisure', summary: 'Watch for Tuesday fare resets' },
  ],
}

export const routeInsights: Record<string, RouteInsight> = {
  'DFW-MIA': createRouteInsight({
    origin: 'DFW',
    destination: 'MIA',
    basePrice: 186,
    seed: 6,
    direction: 'falling',
    summary: 'Average fare dropping 12% this week thanks to strong nonstop inventory.',
    buyRecommendation: 'Best time to buy: wait 2–3 days unless you need a morning nonstop.',
    historicalTip: 'Prices historically soften on Tuesday mornings for this route.',
    cheapestWeek: 'Apr 28 – May 4',
    weatherSummary: '82°F and humid with scattered afternoon showers in Miami.',
    timezoneDifference: '+1 hour from Dallas',
  }),
  'DFW-DEN': createRouteInsight({
    origin: 'DFW',
    destination: 'DEN',
    basePrice: 138,
    seed: 12,
    direction: 'stable',
    summary: 'Prices have remained stable over the last 30 days with shallow midweek dips.',
    buyRecommendation: 'Book now if the timing works. Risk of a major drop is low.',
    historicalTip: 'Tuesday and Wednesday departures consistently carry the best value.',
    cheapestWeek: 'May 5 – May 11',
    weatherSummary: '58°F and crisp with mild mountain winds in Denver.',
    timezoneDifference: '-1 hour from Dallas',
  }),
  'DFW-SEA': createRouteInsight({
    origin: 'DFW',
    destination: 'SEA',
    basePrice: 236,
    seed: 18,
    direction: 'rising',
    summary: 'This fare is higher than the recent average as late-month demand picks up.',
    buyRecommendation: 'Buy now for direct flights. Waiting could cost another 6–9%.',
    historicalTip: 'Alaska nonstop fares tend to reset overnight on Sundays.',
    cheapestWeek: 'May 19 – May 25',
    weatherSummary: '61°F with overcast skies and a low chance of rain in Seattle.',
    timezoneDifference: '-2 hours from Dallas',
  }),
  'DFW-STT': createRouteInsight({
    origin: 'DFW',
    destination: 'STT',
    basePrice: 406,
    seed: 22,
    direction: 'falling',
    summary: 'Leisure pricing is easing after a crowded holiday stretch.',
    buyRecommendation: 'Wait for a softer fare unless you find a sub-$390 one-stop.',
    historicalTip: 'Connecting itineraries through MIA price best 18–24 days out.',
    cheapestWeek: 'May 12 – May 18',
    weatherSummary: '84°F tropical weather with a passing island breeze in St. Thomas.',
    timezoneDifference: '+1 hour from Dallas',
  }),
  'JFK-LAX': createRouteInsight({
    origin: 'JFK',
    destination: 'LAX',
    basePrice: 244,
    seed: 27,
    direction: 'stable',
    summary: 'Premium-heavy demand is keeping fares steady despite broad capacity.',
    buyRecommendation: 'Book now if you want lie-flat timing. Economy can wait a few days.',
    historicalTip: 'Red-eye returns usually undercut same-day daylight options by 8–10%.',
    cheapestWeek: 'Apr 21 – Apr 27',
    weatherSummary: '72°F and sunny with light coastal haze in Los Angeles.',
    timezoneDifference: '-3 hours from New York',
  }),
}

export const flightTemplates: FlightTemplate[] = [
  {
    id: 'dfw-mia-aa-1183',
    origin: 'DFW',
    destination: 'MIA',
    airline: 'American',
    flightNumber: 'AA 1183',
    departureTime: '06:15',
    arrivalTime: '10:02',
    totalMinutes: 167,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 179,
    airlineQuality: 7.8,
    delayRisk: 'Low',
    aircraft: 'A321neo',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Same-terminal departure and arrival flow.',
    extrasEstimate: 34,
    fareProfile: 'Standard',
  },
  {
    id: 'dfw-mia-dl-2147',
    origin: 'DFW',
    destination: 'MIA',
    airline: 'Delta',
    flightNumber: 'DL 2147',
    departureTime: '08:40',
    arrivalTime: '12:29',
    totalMinutes: 169,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 198,
    airlineQuality: 8.6,
    delayRisk: 'Low',
    aircraft: 'B737-900',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Terminal D departure, smooth ground transfer on arrival.',
    extrasEstimate: 29,
    fareProfile: 'Flex',
  },
  {
    id: 'dfw-mia-ua-545',
    origin: 'DFW',
    destination: 'MIA',
    airline: 'United',
    flightNumber: 'UA 545',
    departureTime: '09:55',
    arrivalTime: '15:47',
    totalMinutes: 292,
    stops: 1,
    layovers: ['IAH'],
    layoverMinutes: [52],
    baseFare: 163,
    airlineQuality: 7.5,
    delayRisk: 'Moderate',
    aircraft: 'B737 MAX 8',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'tight',
    terminalNote: 'Tight domestic connection in Houston.',
    extrasEstimate: 41,
    fareProfile: 'Saver',
  },
  {
    id: 'dfw-mia-b6-1001',
    origin: 'DFW',
    destination: 'MIA',
    airline: 'JetBlue',
    flightNumber: 'B6 1001',
    departureTime: '18:15',
    arrivalTime: '00:18',
    totalMinutes: 323,
    stops: 1,
    layovers: ['JFK'],
    layoverMinutes: [108],
    baseFare: 171,
    airlineQuality: 7.9,
    delayRisk: 'Moderate',
    aircraft: 'A220-300',
    regionalAircraft: false,
    overnightLayover: true,
    seatComfort: 'spacious',
    terminalNote: 'Evening connection with a terminal shift at JFK.',
    extrasEstimate: 36,
    fareProfile: 'Standard',
  },
  {
    id: 'dfw-den-wn-332',
    origin: 'DFW',
    destination: 'DEN',
    airline: 'Southwest',
    flightNumber: 'WN 332',
    departureTime: '07:00',
    arrivalTime: '08:25',
    totalMinutes: 145,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 129,
    airlineQuality: 7.6,
    delayRisk: 'Low',
    aircraft: 'B737-800',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Bags and gate flow are especially simple on this routing.',
    extrasEstimate: 18,
    fareProfile: 'Standard',
  },
  {
    id: 'dfw-den-aa-901',
    origin: 'DFW',
    destination: 'DEN',
    airline: 'American',
    flightNumber: 'AA 901',
    departureTime: '11:20',
    arrivalTime: '12:48',
    totalMinutes: 148,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 141,
    airlineQuality: 7.8,
    delayRisk: 'Low',
    aircraft: 'A319',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'tight',
    terminalNote: 'Good for a short same-day business run.',
    extrasEstimate: 26,
    fareProfile: 'Saver',
  },
  {
    id: 'dfw-den-ua-720',
    origin: 'DFW',
    destination: 'DEN',
    airline: 'United',
    flightNumber: 'UA 720',
    departureTime: '14:10',
    arrivalTime: '18:41',
    totalMinutes: 271,
    stops: 1,
    layovers: ['COS'],
    layoverMinutes: [44],
    baseFare: 122,
    airlineQuality: 7.5,
    delayRisk: 'Elevated',
    aircraft: 'CRJ-700',
    regionalAircraft: true,
    overnightLayover: false,
    seatComfort: 'tight',
    terminalNote: 'Regional jet segment and short connection buffer.',
    extrasEstimate: 33,
    fareProfile: 'Saver',
  },
  {
    id: 'dfw-sea-as-612',
    origin: 'DFW',
    destination: 'SEA',
    airline: 'Alaska',
    flightNumber: 'AS 612',
    departureTime: '07:55',
    arrivalTime: '10:39',
    totalMinutes: 284,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 239,
    airlineQuality: 8.7,
    delayRisk: 'Low',
    aircraft: 'B737 MAX 9',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Top-rated carrier quality on a clean nonstop.',
    extrasEstimate: 31,
    fareProfile: 'Flex',
  },
  {
    id: 'dfw-sea-dl-2245',
    origin: 'DFW',
    destination: 'SEA',
    airline: 'Delta',
    flightNumber: 'DL 2245',
    departureTime: '13:30',
    arrivalTime: '18:12',
    totalMinutes: 342,
    stops: 1,
    layovers: ['SLC'],
    layoverMinutes: [88],
    baseFare: 214,
    airlineQuality: 8.6,
    delayRisk: 'Moderate',
    aircraft: 'A220-300',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'spacious',
    terminalNote: 'Easy Salt Lake connection with good recovery time.',
    extrasEstimate: 35,
    fareProfile: 'Standard',
  },
  {
    id: 'dfw-sea-aa-2411',
    origin: 'DFW',
    destination: 'SEA',
    airline: 'American',
    flightNumber: 'AA 2411',
    departureTime: '19:05',
    arrivalTime: '00:41',
    totalMinutes: 336,
    stops: 1,
    layovers: ['PHX'],
    layoverMinutes: [62],
    baseFare: 206,
    airlineQuality: 7.8,
    delayRisk: 'Moderate',
    aircraft: 'A321',
    regionalAircraft: false,
    overnightLayover: true,
    seatComfort: 'standard',
    terminalNote: 'Late arrival and a less forgiving evening connection.',
    extrasEstimate: 38,
    fareProfile: 'Saver',
  },
  {
    id: 'dfw-stt-aa-1607',
    origin: 'DFW',
    destination: 'STT',
    airline: 'American',
    flightNumber: 'AA 1607',
    departureTime: '07:25',
    arrivalTime: '14:58',
    totalMinutes: 393,
    stops: 1,
    layovers: ['MIA'],
    layoverMinutes: [74],
    baseFare: 398,
    airlineQuality: 7.8,
    delayRisk: 'Moderate',
    aircraft: 'A321',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Reliable single connection with reasonable customs flow.',
    extrasEstimate: 42,
    fareProfile: 'Standard',
  },
  {
    id: 'dfw-stt-dl-1410',
    origin: 'DFW',
    destination: 'STT',
    airline: 'Delta',
    flightNumber: 'DL 1410',
    departureTime: '12:50',
    arrivalTime: '20:26',
    totalMinutes: 456,
    stops: 1,
    layovers: ['ATL'],
    layoverMinutes: [42],
    baseFare: 372,
    airlineQuality: 8.6,
    delayRisk: 'Elevated',
    aircraft: 'A321neo',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Connection in ATL is legal but aggressive.',
    extrasEstimate: 46,
    fareProfile: 'Flex',
  },
  {
    id: 'dfw-stt-ua-810',
    origin: 'DFW',
    destination: 'STT',
    airline: 'United',
    flightNumber: 'UA 810',
    departureTime: '16:10',
    arrivalTime: '09:02',
    totalMinutes: 712,
    stops: 2,
    layovers: ['IAH', 'SJU'],
    layoverMinutes: [58, 266],
    baseFare: 329,
    airlineQuality: 7.5,
    delayRisk: 'Elevated',
    aircraft: 'E175',
    regionalAircraft: true,
    overnightLayover: true,
    seatComfort: 'tight',
    terminalNote: 'Two-stop itinerary with a poor overnight stretch in San Juan.',
    extrasEstimate: 58,
    fareProfile: 'Saver',
  },
  {
    id: 'jfk-lax-dl-401',
    origin: 'JFK',
    destination: 'LAX',
    airline: 'Delta',
    flightNumber: 'DL 401',
    departureTime: '06:35',
    arrivalTime: '09:49',
    totalMinutes: 374,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 259,
    airlineQuality: 8.6,
    delayRisk: 'Low',
    aircraft: 'B757',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'standard',
    terminalNote: 'Popular nonstop with a strong on-time profile.',
    extrasEstimate: 33,
    fareProfile: 'Flex',
  },
  {
    id: 'jfk-lax-b6-21',
    origin: 'JFK',
    destination: 'LAX',
    airline: 'JetBlue',
    flightNumber: 'B6 21',
    departureTime: '09:50',
    arrivalTime: '13:22',
    totalMinutes: 392,
    stops: 0,
    layovers: [],
    layoverMinutes: [],
    baseFare: 238,
    airlineQuality: 7.9,
    delayRisk: 'Moderate',
    aircraft: 'A321LR',
    regionalAircraft: false,
    overnightLayover: false,
    seatComfort: 'spacious',
    terminalNote: 'Solid Mint upgrade path if premium pricing drops.',
    extrasEstimate: 36,
    fareProfile: 'Standard',
  },
  {
    id: 'jfk-lax-aa-300',
    origin: 'JFK',
    destination: 'LAX',
    airline: 'American',
    flightNumber: 'AA 300',
    departureTime: '17:25',
    arrivalTime: '23:54',
    totalMinutes: 449,
    stops: 1,
    layovers: ['PHX'],
    layoverMinutes: [57],
    baseFare: 211,
    airlineQuality: 7.8,
    delayRisk: 'Moderate',
    aircraft: 'A321',
    regionalAircraft: false,
    overnightLayover: true,
    seatComfort: 'tight',
    terminalNote: 'Lowest-price option, but late arrival and connection drag value down.',
    extrasEstimate: 47,
    fareProfile: 'Saver',
  },
]
