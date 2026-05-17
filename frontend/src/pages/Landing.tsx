import { SignInButton, SignUpButton } from '@clerk/react'
import { ArrowRight, Zap, Brain, Lock, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">DeepAgent</span>
        </div>
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Get Started
            </Button>
          </SignUpButton>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            AI-Powered Code
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {' '}Transformation
            </span>
          </h1>
          <p className="mt-6 text-xl text-slate-400">
            Transform your codebase with DeepAgent. Automate refactoring, enhance quality, and accelerate development with AI-driven agents.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <SignUpButton mode="modal">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignUpButton>
            <Button variant="outline" size="lg" className="border-slate-700 hover:bg-slate-800">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-white mb-16">Powerful Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 backdrop-blur">
              <Brain className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">AI Agents</h3>
              <p className="text-slate-400">
                Multi-agent system with specialized roles: Specs, Architect, Developer, and Reviewer for comprehensive code transformation.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 backdrop-blur">
              <Rocket className="h-10 w-10 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Fast Execution</h3>
              <p className="text-slate-400">
                Docker-based sandboxed execution ensures safe, isolated code transformation with real-time streaming results.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 backdrop-blur">
              <Lock className="h-10 w-10 text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Secure & Isolated</h3>
              <p className="text-slate-400">
                Enterprise-grade security with isolated workspaces, persistent memory, and comprehensive audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to transform your code?</h2>
          <p className="text-lg text-slate-400 mb-8">
            Join thousands of developers using DeepAgent to accelerate their projects.
          </p>
          <SignUpButton mode="modal">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
              Get Started Free
            </Button>
          </SignUpButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center text-slate-400">
          <p>&copy; 2026 DeepAgent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
