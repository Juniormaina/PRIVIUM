import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, Shield, Zap, Globe, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../providers/auth-provider';
import { useEffect } from 'react';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/privium.svg" alt="PRIVIUM" className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide text-surface-100">PRIVIUM</span>
              <span className="text-[10px] text-surface-500">Enterprise Treasury</span>
            </div>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <button onClick={() => scrollTo('features')} className="text-sm text-surface-400 hover:text-surface-100 transition-colors">Features</button>
            <button onClick={() => scrollTo('security')} className="text-sm text-surface-400 hover:text-surface-100 transition-colors">Security</button>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link to="/signup">
              <Button className="text-sm">
                Get started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-privium-500/10 blur-[120px]" />
          <div className="absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-privium-400/5 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-accent/5 blur-[80px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Logo */}
          <div className="mb-8 inline-flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-privium-500/20 blur-xl" />
              <img src="/privium.svg" alt="PRIVIUM" className="relative h-20 w-20" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-privium-500/20 bg-privium-500/10 px-4 py-1.5 text-xs font-medium text-privium-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Avalanche Blockchain
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-br from-surface-100 via-surface-200 to-surface-400 bg-clip-text text-transparent">
              Enterprise Treasury
            </span>
            <br />
            <span className="bg-gradient-to-r from-privium-400 via-privium-300 to-accent bg-clip-text text-transparent">
              & Payroll on Avalanche
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-surface-400">
            Manage your organization's treasury, process payroll in crypto and fiat,
            and maintain full audit compliance — all secured by the Avalanche blockchain.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 text-base">
                Start free trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Sign in to dashboard
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 text-xs text-surface-500">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-privium-400" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-privium-400" />
              Real-time settlements
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-privium-400" />
              Multi-chain support
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() => scrollTo('features')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-surface-500 hover:text-surface-300 transition-colors"
          aria-label="Scroll to features"
        >
          <ChevronRight className="h-6 w-6 rotate-90" />
        </button>
      </section>

      {/* Features */}
      <section id="features" className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              <span className="bg-gradient-to-r from-surface-100 to-surface-300 bg-clip-text text-transparent">
                Everything you need to scale
              </span>
            </h2>
            <p className="mt-4 text-lg text-surface-400">
              Enterprise-grade tools for modern treasury management
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Multi-account Treasury',
                description: 'Manage operating, reserve, payroll pool, and treasury vault accounts with granular controls and real-time balances.',
                icon: Shield,
              },
              {
                title: 'Automated Payroll',
                description: 'Process payroll across crypto and fiat with automated scheduling, tax calculations, and compliance reporting.',
                icon: Zap,
              },
              {
                title: 'Blockchain Security',
                description: 'All transactions secured and verified on Avalanche with full on-chain audit trail and multi-sig approvals.',
                icon: Globe,
              },
              {
                title: 'Real-time Analytics',
                description: 'Live dashboards with transaction monitoring, cash flow forecasting, and portfolio performance tracking.',
                icon: Sparkles,
              },
              {
                title: 'Team Management',
                description: 'Role-based access controls, approval workflows, and activity logs for complete governance.',
                icon: Shield,
              },
              {
                title: 'Compliance Ready',
                description: 'Built-in compliance tools with automated reporting, audit logs, and regulatory framework support.',
                icon: Zap,
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-surface-800 bg-surface-900/50 p-6 transition-all duration-300 hover:border-privium-500/30 hover:bg-surface-900 hover:shadow-lg hover:shadow-privium-500/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-privium-500/10 text-privium-400 mb-4 group-hover:bg-privium-500/20 transition-colors">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-surface-200">{feature.title}</h3>
                <p className="mt-2 text-sm text-surface-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative border-t border-surface-800/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-privium-500/20 bg-privium-500/10 px-3 py-1 text-xs font-medium text-privium-400 mb-4">
                <Shield className="h-3 w-3" />
                Enterprise Security
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">
                <span className="bg-gradient-to-r from-surface-100 to-surface-300 bg-clip-text text-transparent">
                  Built on Avalanche
                </span>
              </h2>
              <p className="mt-4 text-surface-400 leading-relaxed">
                PRIVIUM leverages the Avalanche blockchain for sub-second transaction finality,
                low fees, and enterprise-grade security. Every treasury operation is recorded
                on-chain with immutable audit trails.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Multi-signature approval workflows',
                  'End-to-end encryption for all data',
                  'SOC 2 Type II certified infrastructure',
                  'Real-time fraud detection & monitoring',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-surface-300">
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-privium-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-privium-500/20 to-accent/10 blur-3xl" />
              <div className="relative rounded-2xl border border-surface-800 bg-surface-900/80 p-6 backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-3">
                  <img src="/privium.svg" alt="" className="h-8 w-8" />
                  <div>
                    <div className="text-sm font-semibold text-surface-200">Network Status</div>
                    <div className="text-xs text-surface-500">Avalanche C-Chain</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-surface-950 px-3 py-2 text-sm">
                    <span className="text-surface-400">Block Height</span>
                    <span className="font-mono text-surface-200">24,891,423</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface-950 px-3 py-2 text-sm">
                    <span className="text-surface-400">Finality</span>
                    <span className="flex items-center gap-1.5 text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      &lt; 2s
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface-950 px-3 py-2 text-sm">
                    <span className="text-surface-400">Validators</span>
                    <span className="text-surface-200">1,426</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface-950 px-3 py-2 text-sm">
                    <span className="text-surface-400">TPS</span>
                    <span className="text-surface-200">4,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative border-t border-surface-800/50 px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <img src="/privium.svg" alt="PRIVIUM" className="h-14 w-14" />
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">
            <span className="bg-gradient-to-r from-surface-100 to-surface-300 bg-clip-text text-transparent">
              Ready to transform your treasury?
            </span>
          </h2>
          <p className="mt-4 text-lg text-surface-400">
            Join leading enterprises managing billions in assets on PRIVIUM.
            Start your free trial today — no credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 text-base">
                Start free trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <img src="/privium.svg" alt="PRIVIUM" className="h-7 w-7" />
              <span className="text-sm font-semibold text-surface-300">PRIVIUM</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-surface-500">
              <span>Enterprise Treasury Platform</span>
              <span className="hidden sm:inline">&middot;</span>
              <span>&copy; 2025 PRIVIUM. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}