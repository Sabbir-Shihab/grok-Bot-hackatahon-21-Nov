"use client";

import dynamic from "next/dynamic";

// The board reads localStorage and today's date, so it only renders in the browser.
const PulseboardApp = dynamic(() => import("./PulseboardApp"), {
  ssr: false,
  loading: () => (
    <section id="app" className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 sm:px-8">
      <div className="rounded-[28px] border border-[var(--line)] bg-white/60 p-10 text-[var(--ink-soft)]">
        Reading your Student OS…
      </div>
    </section>
  ),
});

export default function Board() {
  return <PulseboardApp />;
}
