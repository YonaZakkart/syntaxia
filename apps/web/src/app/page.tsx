const features = [
  {
    title: 'Sandboxed execution',
    description:
      'Every solution runs in a disposable Docker container with no network, capped CPU, memory and output.',
  },
  {
    title: 'Run before you submit',
    description:
      'Try your code against the public tests, get per-test feedback and keep your submission history clean.',
  },
  {
    title: 'Progress you can see',
    description:
      'Submissions are graded per test case, so you always know what passed, what failed and how long it took.',
  },
  {
    title: 'AI mentor',
    description:
      'Progressive hints, debugging help and code reviews are on the roadmap. Practice smarter, not longer.',
    soon: true,
  },
];

const steps = [
  {
    title: 'Pick a challenge',
    description:
      'Browse curated problems by difficulty and language, from warm-ups to interview classics.',
  },
  {
    title: 'Write and run',
    description:
      'Edit your solution, execute it against public tests and iterate until the feedback is green.',
  },
  {
    title: 'Submit for grading',
    description:
      'Send the final version to the judge and get a detailed report for every test case, including hidden ones.',
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.18),transparent_55%)]"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <a
          href="/"
          className="flex items-center gap-3 text-lg font-semibold tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-brand font-mono text-sm font-bold text-slate-950">
            {'{ }'}
          </span>
          Syntaxia
        </a>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-5 text-sm text-slate-400 sm:flex"
        >
          <a className="transition hover:text-white" href="#features">
            Features
          </a>
          <a className="transition hover:text-white" href="#how-it-works">
            How it works
          </a>
          <a
            className="transition hover:text-white"
            href="https://github.com/YonaZakkart/syntaxia"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <a
            className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 transition hover:border-white/20 hover:bg-white/5"
            href="/login"
          >
            Sign in
          </a>
          <a
            className="rounded-lg bg-brand px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-emerald-300"
            href="/register"
          >
            Get started
          </a>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-16 px-6 pb-24 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            Online judge · backend live
          </p>

          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Practice code.
            <br />
            <span className="bg-gradient-to-r from-brand via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Ship confidence.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-400">
            Syntaxia is an AI-powered coding practice platform with a real
            online judge. Write a solution, run it against public tests and
            submit it to a secure sandbox that grades every case.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              href="/challenges"
            >
              Explore the platform
            </a>
            <a
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              href="https://github.com/YonaZakkart/syntaxia"
              rel="noreferrer"
              target="_blank"
            >
              View the source
            </a>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-white/5 pt-8 text-sm">
            <div>
              <dt className="text-slate-500">Languages</dt>
              <dd className="mt-1 font-mono text-base text-slate-200">
                JS · PY · C++
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Feedback</dt>
              <dd className="mt-1 font-mono text-base text-slate-200">
                Per test
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Sandbox</dt>
              <dd className="mt-1 font-mono text-base text-slate-200">
                Isolated
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand/20 via-cyan-400/10 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-panel/90 shadow-2xl shadow-emerald-950/60 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-300/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-3 font-mono text-xs text-slate-500">
                two-sum.js
              </span>
              <span className="ml-auto rounded-md bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                JavaScript
              </span>
            </div>

            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-slate-300">
              <code>
                <span className="text-slate-500">
                  {'// Find the two indices that add up to target'}
                </span>
                {'\n'}
                <span className="text-fuchsia-300">function</span>{' '}
                <span className="text-sky-300">twoSum</span>
                <span className="text-slate-400">{'('}</span>nums, target
                <span className="text-slate-400">{') {'}</span>
                {'\n  '}
                <span className="text-fuchsia-300">const</span> seen ={' '}
                <span className="text-fuchsia-300">new</span>{' '}
                <span className="text-amber-200">Map</span>
                <span className="text-slate-400">{'();'}</span>
                {'\n\n  '}
                <span className="text-fuchsia-300">for</span>
                {' ('}
                <span className="text-fuchsia-300">let</span> i = 0; i{' '}
                <span className="text-slate-400">{'<'}</span> nums.length; i++
                <span className="text-slate-400">{') {'}</span>
                {'\n    '}
                <span className="text-fuchsia-300">const</span> complement =
                target - nums[i];
                {'\n    '}
                <span className="text-fuchsia-300">if</span>
                {' (seen.'}
                <span className="text-sky-300">has</span>
                {'(complement)) {'}
                {'\n      '}
                <span className="text-fuchsia-300">return</span>
                {' [seen.'}
                <span className="text-sky-300">get</span>
                {'(complement), i];'}
                {'\n    '}
                <span className="text-slate-400">{'}'}</span>
                {'\n    seen.'}
                <span className="text-sky-300">set</span>
                {'(nums[i], i);'}
                {'\n  '}
                <span className="text-slate-400">{'}'}</span>
                {'\n'}
                <span className="text-slate-400">{'}'}</span>
              </code>
            </pre>

            <div className="border-t border-white/5 bg-slate-950/60 px-5 py-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-300">
                  ✓ 3 / 3 public tests passed
                </span>
                <span className="font-mono text-slate-500">42 ms</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-20"
      >
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand">
            Features
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to grow as a developer
          </h2>
          <p className="mt-4 text-pretty text-slate-400">
            A judge that behaves like the real thing, feedback you can act on
            and a workflow that keeps you moving.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((feature, index) => (
            <article
              className="group rounded-2xl border border-white/5 bg-white/[0.03] p-6 transition hover:border-brand/30 hover:bg-white/[0.05]"
              key={feature.title}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {feature.soon ? (
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
                    Roadmap
                  </span>
                ) : null}
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl scroll-mt-20 border-t border-white/5 px-6 py-20"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand">
              How it works
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              From idea to accepted in three steps
            </h2>
            <p className="mt-4 text-pretty text-slate-400">
              No setup, no local dependencies. Open a challenge, write code and
              let the judge do the rest.
            </p>
          </div>

          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li
                className="flex gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6"
                key={step.title}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand/10 font-mono text-sm font-semibold text-brand">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built with Next.js, Hono, PostgreSQL, Redis and Docker sandboxes.
          </p>
          <p className="font-mono text-xs">MIT licensed · Syntaxia</p>
        </div>
      </footer>
    </main>
  );
}
