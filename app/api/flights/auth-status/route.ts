import { NextResponse } from 'next/server'
import { openskyAuth } from '../../../../src/server/services/openskyAuth'

export async function GET() {
  try {
    const isAuthenticated = await openskyAuth.isAuthenticated()
    const authType = openskyAuth.getAuthType()
    
    return NextResponse.json({
      authType,
      isAuthenticated,
    })
  } catch (error) {
    console.error('Error checking auth status:', error)
    return NextResponse.json(
      { authType: 'none', isAuthenticated: false },
      { status: 500 }
    )
  }
}