import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

interface TestResult {
  suite: string
  passed: boolean
  duration: number
  coverage?: {
    lines: number
    branches: number
    functions: number
    statements: number
  }
}

export class TestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting comprehensive test suite...\n')
    this.startTime = Date.now()

    try {
      // Run unit tests
      await this.runTestSuite('Unit Tests', 'pnpm test src/server/services/__tests__/*.test.ts')
      
      // Run integration tests
      await this.runTestSuite('Integration Tests', 'pnpm test src/server/services/__tests__/airportCacheIntegration.test.ts')
      
      // Run performance tests
      await this.runTestSuite('Performance Tests', 'pnpm test src/server/services/__tests__/cachePerformance.test.ts')
      
      // Run security tests
      await this.runTestSuite('Security Tests', 'pnpm test src/server/services/__tests__/cacheSecurity.test.ts')
      
      // Generate coverage report
      await this.generateCoverageReport()
      
      // Print summary
      await this.printSummary()
    } catch (error) {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    }
  }

  private async runTestSuite(name: string, command: string): Promise<void> {
    console.log(`\n📁 Running ${name}...`)
    const suiteStart = Date.now()
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, CI: 'true' }
      })
      
      const duration = Date.now() - suiteStart
      
      this.results.push({
        suite: name,
        passed: true,
        duration
      })
      
      console.log(`✅ ${name} passed in ${duration}ms`)
      if (stdout) console.log(stdout)
    } catch (error: any) {
      const duration = Date.now() - suiteStart
      
      this.results.push({
        suite: name,
        passed: false,
        duration
      })
      
      console.error(`❌ ${name} failed in ${duration}ms`)
      if (error.stdout) console.log(error.stdout)
      if (error.stderr) console.error(error.stderr)
    }
  }

  private async generateCoverageReport(): Promise<void> {
    console.log('\n📊 Generating coverage report...')
    
    try {
      await execAsync('pnpm test -- --coverage')
      
      // Read coverage summary
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
      const coverageData = await fs.readFile(coveragePath, 'utf-8')
      const coverage = JSON.parse(coverageData)
      
      const total = coverage.total
      console.log('\nCoverage Summary:')
      console.log(`  Lines:      ${total.lines.pct}%`)
      console.log(`  Branches:   ${total.branches.pct}%`)
      console.log(`  Functions:  ${total.functions.pct}%`)
      console.log(`  Statements: ${total.statements.pct}%`)
      
      // Add coverage to last test result
      if (this.results.length > 0) {
        this.results[this.results.length - 1].coverage = {
          lines: total.lines.pct,
          branches: total.branches.pct,
          functions: total.functions.pct,
          statements: total.statements.pct
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not generate coverage report')
    }
  }

  private async printSummary(): Promise<void> {
    const totalDuration = Date.now() - this.startTime
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    
    console.log('\n' + '='.repeat(50))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(50))
    
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.suite}: ${result.duration}ms`)
    })
    
    console.log('\n' + '-'.repeat(50))
    console.log(`Total: ${this.results.length} suites`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Duration: ${totalDuration}ms`)
    console.log('='.repeat(50))
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0)
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner()
  runner.runAllTests()
}