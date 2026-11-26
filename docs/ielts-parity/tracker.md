# IELTS parity tracker

Findings per test are in `findings/<slug>.json` (per-skill spoke output in
`findings/<slug>.<skill>.json`). Dumps in `dumps/` are gitignored.

| Slug | Status | Spoke | Found | Fixed | Needs reference | Needs code |
| --- | --- | --- | --- | --- | --- | --- |
| ielts-16-test-2 | in-progress (needs the paper for 14-16, 27-30) | hub (browsed localhost + dump) | 7 | 2 | 5 | 0 |
| ielts-16-test-3 | in-progress (waits for reference) | listening, reading spokes; hub for writing and display | 19 | 14 | 5 | 0 |

## ielts-16-test-3: needs reference

Only the Cambridge page or Jumpinto can settle these. Put screenshots or book
pages in `docs/ielts-reference/ielts-16-test-3/`.

- Listening 1, notes heading: is "The course focuses on skills and safety. Charlie would be placed in Level 5." two lines or one, and is the second the worked example?
- Listening 2, Q15-20: the exact instruction, the box title and the heading above the list ("Job opportunities"?).
- Listening 4, Q39: does the key accept "styles" as well as "style"?
- Listening 4, Q31-40: bullets on every note line, or only under "Benefits of knitting"?
- Reading 2, section C: "Lars Pile" or "Lars Pilø".

## ielts-16-test-2: needs reference

- Reading 2, Q14-16 and Reading 3, Q27-30: the question text of each multiple choice question is missing. Only the paper can supply it.
- Listening 2, Q11-15: is there a title above these questions on the paper?
- Reading 3: is there a standfirst under "How to make wise decisions"?
- Writing 1 and 2: the sample answer titles, if Jumpinto shows them.

## Same blank-stem problem elsewhere

`bun run ielts:scan-warnings -- question_stem_missing` lists every test. Today: ielts-16-test-2 (reading-2 Q14-16, reading-3 Q27-30) and ielts-18-test-4 (reading-2 Q14-16, reading-3 Q37-40).
