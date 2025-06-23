# Component Structure

## Core Layout Components

### Header
- **Purpose**: Main navigation and branding
- **Features**: Logo, navigation menu, dark mode toggle, mobile menu
- **Location**: `components/Header.tsx` (already exists)

### Footer
- **Purpose**: Site information and links
- **Features**: Copyright, API credits, GitHub link
- **Location**: `components/Footer.tsx`

### Layout
- **Purpose**: Main layout wrapper
- **Features**: Consistent page structure, responsive design
- **Location**: `components/Layout.tsx`

## Airport Components

### AirportSearch
- **Purpose**: Search interface for airports
- **Features**: Search by name/IATA/ICAO, autocomplete, filters
- **Location**: `components/airport/AirportSearch.tsx`

### AirportCard
- **Purpose**: Display individual airport information
- **Features**: Airport details, location, map preview
- **Location**: `components/airport/AirportCard.tsx`

### AirportList
- **Purpose**: Grid/list view of airports
- **Features**: Responsive grid, pagination, sorting
- **Location**: `components/airport/AirportList.tsx`

### AirportDetails
- **Purpose**: Detailed airport information view
- **Features**: Full details, map, arrivals/departures
- **Location**: `components/airport/AirportDetails.tsx`

## Flight Components

### FlightMap
- **Purpose**: Interactive map showing flights
- **Features**: Real-time positions, flight paths, filters
- **Location**: `components/flight/FlightMap.tsx`

### FlightCard
- **Purpose**: Display individual flight information
- **Features**: Flight details, status, altitude/speed
- **Location**: `components/flight/FlightCard.tsx`

### FlightList
- **Purpose**: List view of flights
- **Features**: Sortable table, filters, real-time updates
- **Location**: `components/flight/FlightList.tsx`

### FlightTracker
- **Purpose**: Track specific flight
- **Features**: Flight path, current position, details
- **Location**: `components/flight/FlightTracker.tsx`

## Common Components

### SearchBar
- **Purpose**: Reusable search input
- **Features**: Debounced input, clear button, loading state
- **Location**: `components/common/SearchBar.tsx`

### LoadingSpinner
- **Purpose**: Loading indicator
- **Features**: Various sizes, with text option
- **Location**: `components/common/LoadingSpinner.tsx`

### ErrorMessage
- **Purpose**: Error display
- **Features**: Error details, retry button, friendly messaging
- **Location**: `components/common/ErrorMessage.tsx`

### EmptyState
- **Purpose**: No data placeholder
- **Features**: Icon, message, action button
- **Location**: `components/common/EmptyState.tsx`

### Map
- **Purpose**: Base map component
- **Features**: Leaflet wrapper, markers, popups
- **Location**: `components/common/Map.tsx`

## Dashboard Components

### StatsCard
- **Purpose**: Display statistics
- **Features**: Number, label, trend indicator
- **Location**: `components/dashboard/StatsCard.tsx`

### Chart
- **Purpose**: Data visualization
- **Features**: Various chart types using Recharts
- **Location**: `components/dashboard/Chart.tsx`

## Component Hierarchy

```
App
├── Layout
│   ├── Header
│   ├── Main Content
│   │   ├── AirportSearch
│   │   ├── AirportList
│   │   │   └── AirportCard[]
│   │   ├── FlightMap
│   │   │   └── FlightMarkers
│   │   ├── FlightList
│   │   │   └── FlightCard[]
│   │   └── Dashboard
│   │       ├── StatsCard[]
│   │       └── Chart[]
│   └── Footer
└── Common Components
    ├── LoadingSpinner
    ├── ErrorMessage
    └── EmptyState
```