import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  title?: string
  message: string
  error?: Error | unknown
  onRetry?: () => void
  action?: React.ReactNode
  className?: string
  showDetails?: boolean
}

export function ErrorMessage({
  title = 'Error',
  message,
  error,
  onRetry,
  action,
  className,
  showDetails = false,
}: ErrorMessageProps) {
  const errorDetails = error instanceof Error ? error.message : String(error)

  return (
    <Alert variant="destructive" className={cn('', className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p>{message}</p>
          
          {showDetails && error && (
            <details className="text-sm">
              <summary className="cursor-pointer hover:text-destructive-foreground">
                Show error details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-destructive/10 p-2 text-xs">
                {errorDetails}
              </pre>
            </details>
          )}
          
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {action && <div className="mt-3">{action}</div>}
        </div>
      </AlertDescription>
    </Alert>
  )
}