# Airport Database Frontend

A modern, responsive web application for exploring airport data and tracking live flights using public aviation APIs.

## Features

- 🛫 **Airport Explorer**: Search and browse airports worldwide by name, IATA/ICAO codes, city, or country
- ✈️ **Live Flight Tracker**: Real-time flight positions and information using OpenSky Network
- 📊 **Dashboard & Analytics**: Statistics and visualizations of flight data
- 🗺️ **Interactive Maps**: Visualize airports and flights on interactive maps using Leaflet
- 🌙 **Dark Mode**: Full dark mode support for comfortable viewing
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: React with TypeScript and TanStack Start
- **Routing**: TanStack Router (file-based)
- **State Management**: TanStack Query & Store
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Maps**: Leaflet with React-Leaflet
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- API keys for data sources (see Environment Setup below)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd airport-db

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server
pnpm dev
```

The application will be available at http://localhost:3000

### Environment Setup

You'll need to configure API keys in your `.env` file:

1. **API Ninjas** (Required for airport data)
   - Sign up at https://api-ninjas.com/
   - Get your free API key
   - Add to `.env`: `VITE_API_NINJAS_KEY=your_key_here`

2. **OpenSky Network** (Optional for better rate limits)
   - Register at https://opensky-network.org/
   - Add credentials to `.env`:
     ```
     VITE_OPENSKY_USERNAME=your_username
     VITE_OPENSKY_PASSWORD=your_password
     ```

3. **Other Optional APIs**:
   - AviationStack: `VITE_AVIATIONSTACK_KEY`
   - Mapbox (for enhanced maps): `VITE_MAPBOX_TOKEN`

## Available Scripts

```bash
pnpm dev        # Start development server on port 3000
pnpm build      # Build for production
pnpm start      # Run production build
pnpm test       # Run tests with Vitest
pnpm lint       # Run ESLint
pnpm format     # Run Prettier
pnpm check      # Run both Prettier and ESLint with fixes
```

## Project Structure

```
src/
├── api/            # API clients and configuration
│   ├── airports.ts # Airport API client
│   ├── flights.ts  # Flight tracking API client
│   ├── config.ts   # API configuration
│   └── base.ts     # Base utilities and error handling
├── components/     # React components
│   ├── ui/        # shadcn/ui components
│   └── Header.tsx # App header
├── routes/        # File-based routes
│   ├── __root.tsx # Root layout
│   └── index.tsx  # Home page
├── types/         # TypeScript type definitions
│   ├── airport.ts # Airport-related types
│   └── flight.ts  # Flight-related types
├── hooks/         # Custom React hooks
├── lib/           # Utilities and helpers
└── styles.css     # Global styles with Tailwind
```

## API Integration

This project integrates with the following APIs:

### 1. API Ninjas - Airports API
- Provides comprehensive airport data including IATA/ICAO codes, location, elevation
- Free tier: 10,000 requests/month
- Documentation: https://api-ninjas.com/api/airports

### 2. OpenSky Network API
- Real-time flight tracking data
- Anonymous access: Limited rate limits
- Authenticated access: Higher rate limits
- Documentation: https://openskynetwork.github.io/opensky-api/

### 3. AviationStack API (Optional)
- Alternative source for flight and airport data
- Free tier: 1,000 requests/month
- Documentation: https://aviationstack.com/documentation

## Development

### Adding UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/). To add new components:

```bash
pnpx shadcn@latest add [component-name]
```

Example:
```bash
pnpx shadcn@latest add card
pnpx shadcn@latest add dialog
pnpx shadcn@latest add table
```

### Testing API Connections

You can test the API connections by running:

```typescript
import { testApiConnection } from '@/api/test-api'
testApiConnection()
```

## Routing

This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add another a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router'
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you use the `<Outlet />` component.

Here is an example layout that includes a header:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Link } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
```

The `<TanStackRouterDevtools />` component is not required so you can remove it if you don't want it in your layout.

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/people',
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json() as Promise<{
      results: {
        name: string
      }[]
    }>
  },
  component: () => {
    const data = peopleRoute.useLoaderData()
    return (
      <ul>
        {data.results.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    )
  },
})
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

### React-Query

React-Query is an excellent addition or alternative to route loading and integrating it into you application is a breeze.

First add your dependencies:

```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

Next we'll need to create a query client and provider. We recommend putting those in `main.tsx`.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ...

const queryClient = new QueryClient()

// ...

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
```

You can also add TanStack Query Devtools to the root route (optional).

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools />
    </>
  ),
})
```

Now you can use `useQuery` to fetch your data.

```tsx
import { useQuery } from '@tanstack/react-query'

import './App.css'

function App() {
  const { data } = useQuery({
    queryKey: ['people'],
    queryFn: () =>
      fetch('https://swapi.dev/api/people')
        .then((res) => res.json())
        .then((data) => data.results as { name: string }[]),
    initialData: [],
  })

  return (
    <div>
      <ul>
        {data.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    </div>
  )
}

export default App
```

You can find out everything you need to know on how to use React-Query in the [React-Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview).

## State Management

Another common requirement for React applications is state management. There are many options for state management in React. TanStack Store provides a great starting point for your project.

First you need to add TanStack Store as a dependency:

```bash
pnpm add @tanstack/store
```

Now let's create a simple counter in the `src/App.tsx` file as a demonstration.

```tsx
import { useStore } from '@tanstack/react-store'
import { Store } from '@tanstack/store'
import './App.css'

const countStore = new Store(0)

function App() {
  const count = useStore(countStore)
  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
    </div>
  )
}

export default App
```

One of the many nice features of TanStack Store is the ability to derive state from other state. That derived state will update when the base state updates.

Let's check this out by doubling the count using derived state.

```tsx
import { useStore } from '@tanstack/react-store'
import { Store, Derived } from '@tanstack/store'
import './App.css'

const countStore = new Store(0)

const doubledStore = new Derived({
  fn: () => countStore.state * 2,
  deps: [countStore],
})
doubledStore.mount()

function App() {
  const count = useStore(countStore)
  const doubledCount = useStore(doubledStore)

  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
      <div>Doubled - {doubledCount}</div>
    </div>
  )
}

export default App
```

We use the `Derived` class to create a new store that is derived from another store. The `Derived` class has a `mount` method that will start the derived store updating.

Once we've created the derived store we can use it in the `App` component just like we would any other store using the `useStore` hook.

You can find out everything you need to know on how to use TanStack Store in the [TanStack Store documentation](https://tanstack.com/store/latest).

## Task Management

This project uses Task Master for development workflow management. View current tasks:

```bash
mcp__task-master__get_tasks
mcp__task-master__next_task
```

## Contributing

1. Check the task list for open items
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Your License Here]

## Resources

- [TanStack Documentation](https://tanstack.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [OpenSky Network API Documentation](https://openskynetwork.github.io/opensky-api/)
- [API Ninjas Documentation](https://api-ninjas.com/api/airports)
