# Stage illustrations — placeholder

`stage-1-placeholder.svg` through `stage-9-placeholder.svg` are plain tinted circles,
still used by the dev-only `app/dev/components/ComponentGallery.tsx` and by nothing
else in the shipped app since the week illustrations below replaced their other two
callers. **These are not real illustrations** — no `stage-N-placeholder.json` Lottie
file has ever existed for any of the nine stages either.

# Week illustrations

`weeks/week-1.svg` through `weeks/week-40.svg` are the real per-week fetal
illustrations, sourced from the `Baby Illustration/` folder at the repo root and
renamed for a predictable path. `lib/domain/illustrations.ts`'s `weekIllustrationSrc()`
is the only place that builds a path into this set — it clamps any gestational week
into 1–40, so it's also what the Today "overdue" edge state uses once she's past her
due date (there's no week 41/42 art; that state reuses week 40's).

Three callers read this set: `app/(app)/today/page.tsx` (the Today tab hero),
`app/(app)/baby/page.tsx` (the Baby tab hero), and `TodayEdgeState`'s "overdue" screen
(indirectly, via whatever `stage` Today's page.tsx passed through). None of them
build the path themselves — go through `weekIllustrationSrc()` to change it.

**Week 1's source file was corrupt** (a 1.6MB SVG wrapper around an embedded PNG,
where weeks 2–40 are clean 3–10KB hand-drawn vectors in a consistent style) —
`weeks/week-1.svg` is a copy of week 2's art standing in until a real week-1 vector
is sourced; swapping that one file is the only change needed once it arrives.

No `weeks/week-N.json` Lottie file exists for any week yet — `IllustrationContainer`
already treats a missing/failing `lottieUrl` as "fall back to the static image", so
`weekIllustrationSrc()` points at the path a future animated asset would use without
requiring a code change to pick it up, same as the stage placeholders did.
