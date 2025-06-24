import React from 'react'
import { Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useComparison } from '@/contexts/ComparisonContext'

interface ComparisonButtonProps {
  onClick: () => void
}

export function ComparisonButton({ onClick }: ComparisonButtonProps) {
  const { comparedAirports } = useComparison()

  if (comparedAirports.length === 0) {
    return null
  }

  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-14 px-6 shadow-lg"
      size="lg"
    >
      <Scale className="mr-2 h-5 w-5" />
      Compare
      <Badge variant="secondary" className="ml-2">
        {comparedAirports.length}
      </Badge>
    </Button>
  )
}