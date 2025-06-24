// Common airports data for autocomplete suggestions
// This list includes major international airports worldwide

export interface CommonAirport {
  iata: string
  icao: string
  name: string
  city: string
  country: string
}

export const commonAirports: Array<CommonAirport> = [
  // United States
  { iata: 'ATL', icao: 'KATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'USA' },
  { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA' },
  { iata: 'ORD', icao: 'KORD', name: "O'Hare International", city: 'Chicago', country: 'USA' },
  { iata: 'DFW', icao: 'KDFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'USA' },
  { iata: 'DEN', icao: 'KDEN', name: 'Denver International', city: 'Denver', country: 'USA' },
  { iata: 'JFK', icao: 'KJFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA' },
  { iata: 'SFO', icao: 'KSFO', name: 'San Francisco International', city: 'San Francisco', country: 'USA' },
  { iata: 'SEA', icao: 'KSEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'USA' },
  { iata: 'LAS', icao: 'KLAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'USA' },
  { iata: 'MCO', icao: 'KMCO', name: 'Orlando International', city: 'Orlando', country: 'USA' },
  { iata: 'EWR', icao: 'KEWR', name: 'Newark Liberty International', city: 'Newark', country: 'USA' },
  { iata: 'MIA', icao: 'KMIA', name: 'Miami International', city: 'Miami', country: 'USA' },
  { iata: 'PHX', icao: 'KPHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'USA' },
  { iata: 'IAH', icao: 'KIAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'USA' },
  { iata: 'BOS', icao: 'KBOS', name: 'Logan International', city: 'Boston', country: 'USA' },
  { iata: 'MSP', icao: 'KMSP', name: 'Minneapolis−Saint Paul International', city: 'Minneapolis', country: 'USA' },
  { iata: 'DTW', icao: 'KDTW', name: 'Detroit Metropolitan', city: 'Detroit', country: 'USA' },
  { iata: 'FLL', icao: 'KFLL', name: 'Fort Lauderdale-Hollywood International', city: 'Fort Lauderdale', country: 'USA' },
  { iata: 'PHL', icao: 'KPHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'USA' },
  { iata: 'LGA', icao: 'KLGA', name: 'LaGuardia', city: 'New York', country: 'USA' },
  
  // Europe
  { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow', city: 'London', country: 'UK' },
  { iata: 'CDG', icao: 'LFPG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany' },
  { iata: 'AMS', icao: 'EHAM', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain' },
  { iata: 'BCN', icao: 'LEBL', name: 'Barcelona–El Prat', city: 'Barcelona', country: 'Spain' },
  { iata: 'LGW', icao: 'EGKK', name: 'London Gatwick', city: 'London', country: 'UK' },
  { iata: 'MUC', icao: 'EDDM', name: 'Munich', city: 'Munich', country: 'Germany' },
  { iata: 'FCO', icao: 'LIRF', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome', country: 'Italy' },
  { iata: 'IST', icao: 'LTFM', name: 'Istanbul', city: 'Istanbul', country: 'Turkey' },
  { iata: 'ZRH', icao: 'LSZH', name: 'Zurich', city: 'Zurich', country: 'Switzerland' },
  { iata: 'CPH', icao: 'EKCH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark' },
  { iata: 'VIE', icao: 'LOWW', name: 'Vienna International', city: 'Vienna', country: 'Austria' },
  { iata: 'OSL', icao: 'ENGM', name: 'Oslo', city: 'Oslo', country: 'Norway' },
  { iata: 'ARN', icao: 'ESSA', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden' },
  { iata: 'DUB', icao: 'EIDW', name: 'Dublin', city: 'Dublin', country: 'Ireland' },
  { iata: 'BRU', icao: 'EBBR', name: 'Brussels', city: 'Brussels', country: 'Belgium' },
  { iata: 'LIS', icao: 'LPPT', name: 'Lisbon', city: 'Lisbon', country: 'Portugal' },
  { iata: 'HEL', icao: 'EFHK', name: 'Helsinki', city: 'Helsinki', country: 'Finland' },
  { iata: 'ATH', icao: 'LGAV', name: 'Athens International', city: 'Athens', country: 'Greece' },
  
  // Asia
  { iata: 'DXB', icao: 'OMDB', name: 'Dubai International', city: 'Dubai', country: 'UAE' },
  { iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda', city: 'Tokyo', country: 'Japan' },
  { iata: 'NRT', icao: 'RJAA', name: 'Narita International', city: 'Tokyo', country: 'Japan' },
  { iata: 'HKG', icao: 'VHHH', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong' },
  { iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore' },
  { iata: 'ICN', icao: 'RKSI', name: 'Incheon International', city: 'Seoul', country: 'South Korea' },
  { iata: 'BKK', icao: 'VTBS', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand' },
  { iata: 'DEL', icao: 'VIDP', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India' },
  { iata: 'PVG', icao: 'ZSPD', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'China' },
  { iata: 'PEK', icao: 'ZBAA', name: 'Beijing Capital International', city: 'Beijing', country: 'China' },
  { iata: 'CAN', icao: 'ZGGG', name: 'Guangzhou Baiyun International', city: 'Guangzhou', country: 'China' },
  { iata: 'KUL', icao: 'WMKK', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'Malaysia' },
  { iata: 'BOM', icao: 'VABB', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'India' },
  { iata: 'TPE', icao: 'RCTP', name: 'Taiwan Taoyuan International', city: 'Taipei', country: 'Taiwan' },
  { iata: 'MNL', icao: 'RPLL', name: 'Ninoy Aquino International', city: 'Manila', country: 'Philippines' },
  { iata: 'CGK', icao: 'WIII', name: 'Soekarno–Hatta International', city: 'Jakarta', country: 'Indonesia' },
  { iata: 'DOH', icao: 'OTHH', name: 'Hamad International', city: 'Doha', country: 'Qatar' },
  { iata: 'AUH', icao: 'OMAA', name: 'Abu Dhabi International', city: 'Abu Dhabi', country: 'UAE' },
  { iata: 'BLR', icao: 'VOBL', name: 'Kempegowda International', city: 'Bangalore', country: 'India' },
  { iata: 'KIX', icao: 'RJBB', name: 'Kansai International', city: 'Osaka', country: 'Japan' },
  
  // Oceania
  { iata: 'SYD', icao: 'YSSY', name: 'Sydney', city: 'Sydney', country: 'Australia' },
  { iata: 'MEL', icao: 'YMML', name: 'Melbourne', city: 'Melbourne', country: 'Australia' },
  { iata: 'BNE', icao: 'YBBN', name: 'Brisbane', city: 'Brisbane', country: 'Australia' },
  { iata: 'AKL', icao: 'NZAA', name: 'Auckland', city: 'Auckland', country: 'New Zealand' },
  { iata: 'PER', icao: 'YPPH', name: 'Perth', city: 'Perth', country: 'Australia' },
  { iata: 'ADL', icao: 'YPAD', name: 'Adelaide', city: 'Adelaide', country: 'Australia' },
  { iata: 'CHC', icao: 'NZCH', name: 'Christchurch International', city: 'Christchurch', country: 'New Zealand' },
  { iata: 'WLG', icao: 'NZWN', name: 'Wellington International', city: 'Wellington', country: 'New Zealand' },
  
  // Canada
  { iata: 'YYZ', icao: 'CYYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada' },
  { iata: 'YVR', icao: 'CYVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada' },
  { iata: 'YUL', icao: 'CYUL', name: 'Montréal–Trudeau International', city: 'Montreal', country: 'Canada' },
  { iata: 'YYC', icao: 'CYYC', name: 'Calgary International', city: 'Calgary', country: 'Canada' },
  { iata: 'YEG', icao: 'CYEG', name: 'Edmonton International', city: 'Edmonton', country: 'Canada' },
  { iata: 'YOW', icao: 'CYOW', name: 'Ottawa Macdonald-Cartier International', city: 'Ottawa', country: 'Canada' },
  
  // South America
  { iata: 'GRU', icao: 'SBGR', name: 'São Paulo–Guarulhos International', city: 'São Paulo', country: 'Brazil' },
  { iata: 'MEX', icao: 'MMMX', name: 'Mexico City International', city: 'Mexico City', country: 'Mexico' },
  { iata: 'EZE', icao: 'SAEZ', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'Argentina' },
  { iata: 'GIG', icao: 'SBGL', name: 'Rio de Janeiro–Galeão International', city: 'Rio de Janeiro', country: 'Brazil' },
  { iata: 'BOG', icao: 'SKBO', name: 'El Dorado International', city: 'Bogotá', country: 'Colombia' },
  { iata: 'LIM', icao: 'SPJC', name: 'Jorge Chávez International', city: 'Lima', country: 'Peru' },
  { iata: 'SCL', icao: 'SCEL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'Chile' },
  { iata: 'CUN', icao: 'MMUN', name: 'Cancún International', city: 'Cancún', country: 'Mexico' },
  { iata: 'PTY', icao: 'MPTO', name: 'Tocumen International', city: 'Panama City', country: 'Panama' },
  
  // Africa
  { iata: 'JNB', icao: 'FAOR', name: 'O. R. Tambo International', city: 'Johannesburg', country: 'South Africa' },
  { iata: 'CAI', icao: 'HECA', name: 'Cairo International', city: 'Cairo', country: 'Egypt' },
  { iata: 'CPT', icao: 'FACT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa' },
  { iata: 'CMN', icao: 'GMMN', name: 'Mohammed V International', city: 'Casablanca', country: 'Morocco' },
  { iata: 'ADD', icao: 'HAAB', name: 'Addis Ababa Bole International', city: 'Addis Ababa', country: 'Ethiopia' },
  { iata: 'NBO', icao: 'HKJK', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'Kenya' },
  { iata: 'LOS', icao: 'DNMM', name: 'Murtala Muhammed International', city: 'Lagos', country: 'Nigeria' },
  
  // Middle East
  { iata: 'TLV', icao: 'LLBG', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel' },
  { iata: 'JED', icao: 'OEJN', name: 'King Abdulaziz International', city: 'Jeddah', country: 'Saudi Arabia' },
  { iata: 'RUH', icao: 'OERK', name: 'King Khalid International', city: 'Riyadh', country: 'Saudi Arabia' },
  { iata: 'KWI', icao: 'OKBK', name: 'Kuwait International', city: 'Kuwait City', country: 'Kuwait' },
  { iata: 'BAH', icao: 'OBBI', name: 'Bahrain International', city: 'Manama', country: 'Bahrain' },
  { iata: 'AMM', icao: 'OJAI', name: 'Queen Alia International', city: 'Amman', country: 'Jordan' },
  { iata: 'BEY', icao: 'OLBA', name: 'Beirut–Rafic Hariri International', city: 'Beirut', country: 'Lebanon' },
]