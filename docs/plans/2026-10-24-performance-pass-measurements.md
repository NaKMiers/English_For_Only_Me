# Performance Pass - Measurements

Read-only page timings taken for the 2026-10-24 performance pass
([design](./2026-10-24-performance-pass-design.md),
[test plan](./2026-10-24-performance-pass-test-plan.md)). Every request is an
anonymous GET, so nothing is written to the database. `total` is time to the
last byte (the `loading.tsx` skeleton streams first, so first-byte time hides
the real cost). First run is cold-ish, median and max are over the rest.

## Live site before the pass (englishforonlyme.site)

Response header `x-vercel-id: hkg1::iad1::...`: requests entered Vercel in
Hong Kong and ran in Washington DC, while Atlas is in Hong Kong.

```
route                                                      total_first_ms total_med_ms total_max_ms   html_kb
/                                                              1188     1193     1196     115.1
/dictation                                                     1935     2473     2542     126.4
/dictation/ted                                                 1499     2314     2320     130.7
/dictation/videos/6a55223b6c2397cc339c7db0/practice            3759     2968     3164     248.8
/vocabulary                                                     556     1522     3701      67.4
/vocabulary/words                                             30136     2222     9698      91.7
/grammar                                                       9703     2385    11726     136.8
/grammar/points                                               20979     3820    31064     717.3
/grammar/points/adjective-order                                5651     3272     3704     118.1
```

## Local before the pass (`next start`, Atlas about 25 ms away)

```
route                                                      total_first_ms total_med_ms total_max_ms   html_kb
/                                                                 9       12       43     113.6
/dictation                                                      198      186      209     126.3
/dictation/ted                                                  231      140      192     130.2
/dictation/videos/6a55223b6c2397cc339c7db0/practice             562      261      663     248.8
/vocabulary                                                       9        9       15      66.7
/vocabulary/words                                                11       10       12      90.9
/grammar                                                        150      113      152     136.7
/grammar/points                                                 773      704      795     717.3
/grammar/points/adjective-order                                 100       97       98     118.1
```

## Local after the pass

```
route                                                      total_first_ms total_med_ms total_max_ms   html_kb
/                                                                15       17       20     113.0
/dictation                                                      981       14       17     125.2
/dictation/ted                                                  237       15       16     134.5
/dictation/videos/6a55223b6c2397cc339c7db0/practice             226      145      183     177.1
/vocabulary                                                     175       62       67     155.4
/vocabulary/words                                                41       10       12      92.3
/grammar                                                        158       11       13     134.8
/grammar/points                                                 140       33       40     702.5
/grammar/points/adjective-order                                 112       11       11     117.3
```

## Local after the React Compiler

Same server numbers as above, within noise: the compiler changes how much the
browser re-renders, not server time. The practice first run is a cold start.

```
route                                                      total_first_ms total_med_ms total_max_ms   html_kb
/                                                                17       19       26     113.4
/dictation                                                       58       10       16     125.4
/dictation/ted                                                   57       13       14     134.6
/dictation/videos/6a55223b6c2397cc339c7db0/practice            1208      149      192     177.4
/vocabulary                                                     149       61       67     155.7
/vocabulary/words                                                37        9       15      92.3
/grammar                                                         27       10       13     134.9
/grammar/points                                                  45       27       47     702.5
/grammar/points/adjective-order                                  18        9       29     117.3
```

The live numbers after deploy are still to be taken: run the script below
against the deployed site and compare with the first table.

## Script

Usage: `bash bench.sh https://englishforonlyme.site 4`

```bash
#!/usr/bin/env bash
# usage: bench.sh BASE_URL [runs]
B=${1:-http://localhost:3002}; N=${2:-6}
ROUTES="/ /dictation /dictation/ted /dictation/videos/6a55223b6c2397cc339c7db0/practice /vocabulary /vocabulary/words /grammar /grammar/points /grammar/points/adjective-order"
printf "%-58s %8s %8s %8s %9s\n" route total_first_ms total_med_ms total_max_ms html_kb
for r in $ROUTES; do
  ts=()
  for i in $(seq 1 $N); do
    out=$(curl -s -o /dev/null -w "%{time_total} %{size_download}" "$B$r")
    ts+=("$(echo $out | awk '{printf "%d", $1*1000}')"); sz=$(echo $out | awk '{print $2}')
  done
  first=${ts[0]}; rest=$(printf "%s\n" "${ts[@]:1}" | sort -n)
  med=$(echo "$rest" | awk '{a[NR]=$1} END{print a[int((NR+1)/2)]}'); max=$(echo "$rest" | tail -1)
  printf "%-58s %8s %8s %8s %9.1f\n" "$r" "$first" "$med" "$max" "$(echo "$sz/1024" | bc -l)"
done
```
