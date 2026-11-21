import Board from "@/components/Board";

export default function Home() {
  return (
    <main className="flex-1">
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="float-soft absolute -left-16 top-16 h-56 w-56 rounded-full bg-[rgba(11,107,92,0.14)] blur-2xl" />
          <div className="absolute right-0 top-0 h-[70%] w-[55%] bg-[radial-gradient(circle_at_70%_20%,rgba(201,120,26,0.18),transparent_55%)]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.28'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[92vh] w-full max-w-6xl flex-col justify-between px-5 pb-16 pt-8 sm:px-8">
          <nav className="flex items-center justify-between animate-rise">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--teal)] text-sm font-bold text-white">
                Pb
              </span>
              <span className="font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
                Pulseboard
              </span>
            </div>
            <a
              href="#app"
              className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--teal)]"
            >
              Open board
            </a>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="animate-rise text-sm font-semibold uppercase tracking-[0.2em] text-[var(--teal)]">
                Cognition × Notion Student OS
              </p>
              <h1 className="animate-rise-delay-1 mt-5 font-[family-name:var(--font-fraunces)] text-[clamp(2.8rem,8vw,5.4rem)] leading-[0.95] tracking-[-0.03em] text-[var(--ink)]">
                Pulseboard
              </h1>
              <p className="animate-rise-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)] sm:text-xl">
                Your Notion Student OS already holds the semester. Pulseboard
                turns it into today&apos;s mission — ranked deadlines, grade-risk
                alerts, and a study plan you can finish.
              </p>
              <div className="animate-rise-delay-3 mt-8 flex flex-wrap gap-3">
                <a
                  href="#app"
                  className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-[var(--paper)] transition hover:bg-[var(--teal-deep)]"
                >
                  See today&apos;s priorities
                </a>
                <a
                  href="#how"
                  className="rounded-full border border-[var(--line)] bg-white/70 px-6 py-3 text-sm font-semibold transition hover:border-[var(--teal)]"
                >
                  How it works
                </a>
              </div>
            </div>

            <div className="animate-rise-delay-2 relative">
              <div className="absolute -inset-4 rounded-[36px] bg-[linear-gradient(145deg,rgba(11,107,92,0.18),rgba(201,120,26,0.12))] blur-xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-[var(--line)] bg-[rgba(16,36,31,0.92)] p-6 text-[var(--paper)] shadow-[var(--shadow)] sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                    Daily pulse
                  </p>
                  <span className="rounded-full bg-[rgba(201,120,26,0.2)] px-3 py-1 text-xs font-semibold text-[var(--amber)]">
                    3h window
                  </span>
                </div>
                <p className="mt-6 font-[family-name:var(--font-fraunces)] text-3xl leading-tight">
                  Finish what moves your GPA — not just what is loudest.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    { code: "MATH 240", task: "Eigenvalues problem set", mins: "55m" },
                    { code: "CS 201", task: "Binary tree lab report", mins: "45m" },
                    { code: "ENG 110", task: "Peer review comments", mins: "30m" },
                  ].map((row) => (
                    <div
                      key={row.task}
                      className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-white/50">
                          {row.code}
                        </p>
                        <p className="mt-1 text-sm font-medium">{row.task}</p>
                      </div>
                      <span className="text-sm text-[var(--amber)]">{row.mins}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section
        id="how"
        className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14"
      >
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            {
              title: "Read Student OS",
              body: "Pull Courses, Assignments, Notes, and Tasks from your Notion Student OS databases — or explore instantly with built-in demo data.",
            },
            {
              title: "Score what matters",
              body: "Each open task gets an urgency score from due date, weight %, and whether the course is under your target grade.",
            },
            {
              title: "Act and sync",
              body: "Follow the generated study blocks, then mark progress. Live mode writes status changes back into Notion.",
            },
          ].map((item) => (
            <article key={item.title} className="max-w-sm">
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">
                {item.title}
              </h2>
              <p className="mt-3 text-[var(--ink-soft)] leading-relaxed">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <Board />

      <footer className="border-t border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--ink-soft)] sm:px-8">
        Built for the Cognition × Notion Student OS Hackathon · Pulseboard keeps
        the semester in Notion and the day in focus.
      </footer>
    </main>
  );
}
