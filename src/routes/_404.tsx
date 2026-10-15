import { Link, createFileRoute, useNavigate  } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/_404')({
  component: NotFound,
})

function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="container py-16 max-w-4xl mx-auto">
      <Card className="text-center">
        <CardContent className="pt-16 pb-16">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-muted p-6">
              <AlertCircle className="h-16 w-16 text-muted-foreground" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Oops! It looks like this page took off without filing a flight plan. 
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="default"
              onClick={() => navigate({ to: '/' })}
              className="inline-flex items-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            <Link to="/airports">
              <Button
                variant="outline"
                className="inline-flex items-center w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Airports
              </Button>
            </Link>
          </div>
          
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">Popular Pages</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/" className="text-primary hover:underline">
                Home
              </Link>
              <Link to="/airports" className="text-primary hover:underline">
                Airport Explorer
              </Link>
              <Link to="/flights" className="text-primary hover:underline">
                Live Flight Tracker
              </Link>
              <Link to="/favorites" className="text-primary hover:underline">
                Favorites
              </Link>
              <Link to="/settings" className="text-primary hover:underline">
                Settings
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}