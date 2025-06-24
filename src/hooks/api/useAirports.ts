import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type { Airport, AirportSearchParams } from '@/types/airport'
import { airportsApi } from '@/api'

// Query keys factory
export const airportKeys = {
  all: ['airports'] as const,
  search: (params: AirportSearchParams) => [...airportKeys.all, 'search', params] as const,
  byIATA: (iata: string) => [...airportKeys.all, 'iata', iata] as const,
  byICAO: (icao: string) => [...airportKeys.all, 'icao', icao] as const,
  byCity: (city: string, country?: string) => 
    [...airportKeys.all, 'city', city, country] as const,
  byCountry: (country: string) => [...airportKeys.all, 'country', country] as const,
}

// Hook to search airports with various parameters
export function useAirportSearch(
  params: AirportSearchParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: airportKeys.search(params),
    queryFn: () => airportsApi.searchAirports(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled ?? true,
  })
}

// Hook to get airport by IATA code
export function useAirportByIATA(
  iataCode: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: airportKeys.byIATA(iataCode),
    queryFn: () => airportsApi.getAirportByIATA(iataCode),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!iataCode && (options?.enabled ?? true),
  })
}

// Hook to get airport by ICAO code
export function useAirportByICAO(
  icaoCode: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: airportKeys.byICAO(icaoCode),
    queryFn: () => airportsApi.getAirportByICAO(icaoCode),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!icaoCode && (options?.enabled ?? true),
  })
}

// Hook to search airports by name
export function useAirportSearchByName(
  name: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: airportKeys.search({ name }),
    queryFn: () => airportsApi.searchByName(name),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!name && name.length >= 2 && (options?.enabled ?? true),
  })
}

// Hook to get airports by city
export function useAirportsByCity(
  city: string,
  country?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: airportKeys.byCity(city, country),
    queryFn: () => airportsApi.getAirportsByCity(city, country),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!city && (options?.enabled ?? true),
  })
}

// Hook to get airports by country
export function useAirportsByCountry(
  country: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: airportKeys.byCountry(country),
    queryFn: () => airportsApi.getAirportsByCountry(country),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!country && (options?.enabled ?? true),
  })
}

// Infinite query for paginated airport search
// NOTE: Disabled because offset parameter is only available for premium API Ninjas accounts
// export function useInfiniteAirportSearch(params: Omit<AirportSearchParams, 'offset'>) {
//   return useInfiniteQuery({
//     queryKey: [...airportKeys.search(params), 'infinite'],
//     queryFn: ({ pageParam = 0 }) =>
//       airportsApi.searchAirports({ ...params, offset: pageParam }),
//     getNextPageParam: (lastPage, allPages) => {
//       // API Ninjas returns max 30 results per request
//       const totalFetched = allPages.reduce((sum, page) => sum + page.length, 0)
//       return lastPage.length === 30 ? totalFetched : undefined
//     },
//     initialPageParam: 0,
//     staleTime: 5 * 60 * 1000,
//     gcTime: 10 * 60 * 1000,
//   })
// }

// Suspense versions for SSR
export function useSuspenseAirportByIATA(iataCode: string) {
  return useSuspenseQuery({
    queryKey: airportKeys.byIATA(iataCode),
    queryFn: () => airportsApi.getAirportByIATA(iataCode),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}

export function useSuspenseAirportsByCountry(country: string) {
  return useSuspenseQuery({
    queryKey: airportKeys.byCountry(country),
    queryFn: () => airportsApi.getAirportsByCountry(country),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}