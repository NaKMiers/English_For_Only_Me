# IELTS 1-21 content audit

_Generated 2026-11-09. Report only: nothing in the app or database was changed._

## How this was checked

- **Scope:** all 84 tests in MongoDB (`ielts-1-test-1` … `ielts-21-test-4`; `ielts-2-test-4` is a draft), every listening part, reading passage and writing task.
- **Not compared with Jumpinto.** jumpinto.com is blocked by the organization policy in the browser pane and by Cloudflare for the headless browser. This is a self-audit: each test is checked against its own transcript/passage, IELTS conventions, and the reviewers' memory of the Cambridge keys.
- **Script checks** (deterministic): numbering 1-40, group ranges, answers vs options, TFNG/YNNG values, word limits, evidence quotes, missing images/audio, plus the app's own `checkTest`.
- **AI review:** 9 Sonnet agents read a review sheet per test (every question, answer, and the cited transcript line or paragraph) and judged answers, question types, invented content, structure and text.
- **Confidence:** answer-key findings that rest on memory of the paper carry a confidence rating; treat `low` as "check against the book". Findings I re-checked by hand are marked ✔︎; disputed ones ⚠︎.

## Totals

| Source | High | Medium | Low | Total |
| --- | --- | --- | --- | --- |
| AI review | 43 | 96 | 193 | 332 |
| Script checks | - | - | - | 522 |

AI findings by category: missing-variant 81 · wrong-type 71 · structure 28 · missing-visual 28 · invented-options 25 · wrong-answer 24 · text-error 19 · other 16 · evidence-wrong 15 · missing-example 14 · instruction-mismatch 11

Script findings by check:

- 243 × Missing or broken evidence (no quote, quote not in the cited line, index out of range)
- 156 × Completion answer does not appear in the line/paragraph it cites
- 44 × Mentions a diagram/picture/map but has no image
- 41 × Instruction word limit differs from the stored word limit (or an answer exceeds it)
- 18 × App's own consistency check: warning
- 8 × Listening part without exactly 10 questions
- 6 × Plan/map labelling group with no image
- 5 × Listening part with no audio
- 1 × App's own consistency check: error

## Patterns to fix across many tests

1. **Duplicate test.** `ielts-21-test-3` is the same content as `ielts-21-test-2` (8 of 9 sections identical) ✔︎. One real Cambridge 21 test is missing.
2. **Visuals replaced or missing.** Map/plan/picture tasks whose options were turned into made-up text descriptions (often copied from the transcript, which gives the answer away), and "Label the diagram" / chart tasks with no image. This is the Q1-5 problem fixed in IELTS 1 Test 1, repeated across most books. See `invented-options` and `missing-visual` rows, plus the script's `visual` / `visual?` items.
3. **Wrong question type.** `note-completion` used as a catch-all for form, table, flow-chart, summary and sentence completion; heading lists stored as `matching-information` or `matching-features` (sometimes keyed A-H, colliding with paragraph letters); sentence endings stored as `matching-features` or split multiple-choice; "Choose TWO letters" stored as single-choice (either letter scores).
4. **Correct answers marked wrong.** Answers stored with `&` only ("Sudan & India", "1882 & 1883"), combined answers where one item is enough, dates/times/postcodes/phone numbers without the usual variants ("24 April" vs "24th April", "DG7 4PH" vs "DG74PH").
5. **Questions that cannot be answered as shown.** Blank question stems (16-2, 18-4 reading MC), matching groups with no items (11-4, 14-4 listening Q8-10), paragraph-letter questions where the passage has no letters (12-2 R3), questions using another question's option list (2-2, 2-4), word banks missing options (6-2, 7-3).
6. **Missing examples and word boxes.** Part 1 examples, "paragraph B has been done for you" headings examples, and summary word lists the instruction refers to.
7. **Evidence gaps.** 243 questions have no evidence or a quote that is not in the cited line, so the "show evidence" button fails there. Many reading questions in IELTS 1-5 have none at all.
8. **Audio.** No audio for all four listening parts of `ielts-8-test-4` and for `ielts-2-test-3` listening-4.

## High-severity findings (all)

| Test | Section | Q | Category | Conf. | Detail | Suggested fix |
| --- | --- | --- | --- | --- | --- | --- |
| ielts-1-test-1 | listening-3 | 21 | wrong-answer | high | Stored B ('took place last term'). Line 8: handout 'you should have received yesterday at the orientation meeting' -> the meeting took place recently (yesterday). Correct option is A ('took place recently'). ✔︎ | answer A |
| ielts-1-test-2 | reading-2 | 20-23 | missing-visual | high | Instruction says 'Label the diagram below' (A beehive) but the group has no image; it was rewritten as text notes that give away the label positions. Q21 is also wrong: 'Frames: lifted out and lowered into an uncapper, held in {{q21}}' stores 'frames' (circular), whereas the passage says the uncapped frames 'are put in a carousel' -> carousel. Q20 evidence points to the uncapper sentence instead of the 'frames of empty comb' sentence (para 5). | restore the hive diagram image with labels; Q21 answer should be 'carousel'; fix evidence for Q20 |
| ielts-1-test-2 | reading-2 | 17 | wrong-answer | medium | Stored 'machines' for 'where {{q17}} are used to remove the wax'. 'machines' is not in the passage (instruction: words from the passage) and its own evidence quote is 'rotating blades shave away the wax' -> 'rotating blades'. A learner typing the passage words is marked wrong. | answer 'rotating blades' (variants: blades) |
| ielts-1-test-2 | reading-2 | 19 | wrong-answer | medium | Stored only 'split'; passage word is 'separated' ('a healthy double hive ... can be separated into two boxes'). Flow-chart instruction asks for words from the passage, so 'separated' must be accepted (it is the likely original key). | answer 'separated' (also accept 'split') |
| ielts-1-test-2 | reading-2 | 16 | wrong-answer | medium | Template says 'farmers {{q16}} beekeepers for placing them on their land' with stored answer 'charge', but the passage says 'the beekeeper will pay the farmer to allow his bees to feed'. The sentence direction contradicts the passage and 'charge' is not a passage word. Original flowchart most likely has 'beekeepers {{q16}} farmers' with answer 'pay'. | rewrite the box as 'where beekeepers {{q16}} farmers ...' and answer 'pay' |
| ielts-1-test-2 | reading-2 | 13,14 | wrong-answer | medium | Q14 'when the hives are {{q14}} and the bees are generally tranquil' is stored as 'empty', but the cited evidence is the supers/'frames of empty comb' sentence from a different paragraph; the passage says the hives are packed at night and 'are not being opened' (closed/stacked), never that hives are empty. Q13 'prepare' is also not a passage word (passage: 'pack ... hives', 'move the bees'). These two boxes do not match the passage so they cannot be answered reliably. | re-derive Q13/Q14 from the original flowchart (likely pack / closed or similar passage words) and fix evidence blocks |
| ielts-1-test-4 | reading-2 | 23 | wrong-answer | high | Stored A (Dr Marx) for 'Women hold higher positions now than they used to.' The matching text is paragraph D: Hilary Sears 'said that women have raised the level of grades they are employed in but have still not broken through barriers to the top' -> B (Sears). The stored evidence (Marx: better qualified) does not support the statement. Cambridge key for Q23 is B. | answer B; replace evidence with paragraph D sentence |
| ielts-2-test-1 | reading-1 | 6-9 | missing-visual | high | plan-map-labelling group ('Complete the labels on the diagram below', Diagram B) has imageUrl empty: no diagram at all. The 'title' field is just the list of options and the question prompts were rewritten as text ('Runways and taxiways foundation', 'Sand layer'), so the task is not answerable as on the paper. Q6 is also internally odd: prompt 'Runways and taxiways foundation' with stored answer B 'runways and taxiways' (the foundation per paragraph 9 is the granite rock, option A). | restore Diagram B image with numbered label points 6-9; re-verify Q6 (likely A granite) against the diagram |
| ielts-2-test-2 | listening-1 | 2 | wrong-answer | high | Q1 and Q2 share one group with a single option list (A ground floor / B second floor / C third floor). Q2 asks for the monthly rent ($615, line 13) but its stored answer is 'A' = 'ground floor', which is meaningless; the learner is offered floor options for a rent question and can never be marked right. The rent options (e.g. A/B/C amounts) were never stored. | split Q2 into its own group with rent options (one of which is $615) and set the matching letter |
| ielts-2-test-2 | listening-4 | 35,36,38 | missing-variant | medium | Answers are stored with ampersands only: 'cool & wet', 'warm & wet', 'wool & timber'. Learners will type 'cool and wet', 'warm and wet', 'wool and timber' (the transcript wording is 'cool and wet', 'wool and timber'; 'warmer ... and much wetter'). Unless the checker maps & to and, correct answers are marked wrong. | add variants with 'and' (cool and wet, warm and wet, warmer and wetter, wool and timber) |
| ielts-2-test-4 | reading-1 | 8,9 | wrong-answer | high | Q7-9 are one multiple-choice group whose only option list belongs to Q7 (A pre-occupied with recession ... D shoppers displeased with government). Q8 'What is Mintel?' (stored B) and Q9 'A consumer expressing concern ... without actively supporting' (stored C) are answered against Q7's options, so B/C are meaningless (e.g. Q8 B = 'more widespread interest in the environment agenda'). The real options for Q8 (e.g. a market research organisation) and Q9 (e.g. armchair green) are missing, so these two questions cannot be answered or marked meaningfully. | split Q8 and Q9 into their own groups with their own options (Q8 market research organisation; Q9 'armchair green') and recompute letters |
| ielts-2-test-4 | listening-4 | 33 | invented-options | high | Original item is 'Which pie chart shows the proportion of men and women respondents?' with three pie-chart pictures A-C; here the group has no image (imageUrl empty) and the chart options were replaced by invented text ('Women were slightly more than half of respondents', ...). The prompt still says 'pie chart', and the letter A cannot be verified against the real pictures (audio only says women 'just slightly in the majority'). | restore the three pie-chart images A-C and re-derive the letter |
| ielts-3-test-1 | reading-1 | 11-14 | missing-visual | high | 'Look at the drawings of different projectiles below, A-H' - the group has no image; the options are literally 'Drawing A' ... 'Drawing H'. The learner cannot see any drawing, so Q11-14 (stored B, E, F, G) cannot be answered and the keys cannot be verified. | upload the projectile drawings A-H and attach them to the group |
| ielts-3-test-1 | listening-4 | 31 | invented-options | high | Original task: 'Choose A, B or C to represent the bar chart column for the figures quoted' (a bar chart image). Here there is no image (imageUrl empty) and the columns were replaced by invented text options ('About a quarter of a million people a day / About a million / About ten thousand'). The letter A is correct only for this made-up order; it will not match the real chart's column letters. | restore the bar chart image and use the paper's column letter |
| ielts-3-test-1 | listening-1 | 2 | missing-variant | medium | Q2 'Rent: {{q2}} a month' stores only '250 & 500'. The audio says 'ranges from 250 pounds per month ... to about 500 pounds'. Natural answers '250 to 500', '£250 - £500', '250-500', '250 and 500' are not accepted unless the checker maps '&' to 'and' and handles 'to'. | add variants: 250 to 500, 250-500, £250-£500, £250 to £500, 250 and 500 |
| ielts-3-test-2 | listening-1 | 6-10 | missing-visual | high | plan-map-labelling 'Label the rooms on the map below' has no map image. The options A-H are the room NAMES (Computer Laboratory, Library, ...) and each question prompt is the same name, so the stored letters (C, D, A, H, G) just map a name to itself and do not represent positions on the real school map (where letters mark places and the learner must locate them from the directions). The task cannot be done as designed. | add the school map image with lettered positions A-H and make options the letters; re-derive the key from the map |
| ielts-3-test-2 | listening-4 | 38-40 | invented-options | high | 'Indicate who made the hats below' uses pictures of hats A-E on the paper. Here the options are invented text descriptions ('A single strip around the base topped with a cone, forming a castle turret shape', 'Three pillbox hats stacked...') lifted from Vivien's narration, which turns the task into trivial text matching and cannot match the real picture letters (C, D, A stored). | restore the hat pictures A-E and re-derive the letters from the images |
| ielts-3-test-2 | reading-1 | 6-8 | missing-visual | high | plan-map-labelling 'Label the tunnels on the diagram below' has no diagram. Prompts were invented to carry the clues ('Tunnel 6 (approx. 20 cm deep)', 'Tunnel 8 (shallowest)') and the options are beetle-type names; on the paper the learner reads the diagram's depths/shapes. Stored D, A, B follow from the text clues but are not tied to any real diagram. | add the dung-beetle tunnel diagram and label points 6-8; remove the depth hints from the prompts |
| ielts-3-test-3 | listening-2 | 13 | wrong-answer | high | Table row 'When? {{q13}}' is stored as 'reception', which just repeats the 'Where? Reception' row. The audio (line 3) gives the time: 'you need to come to reception between 2 and 6 pm, Monday to Thursday'. Correct answer is the registration time/day (e.g. 'Monday to Thursday, 2 to 6 pm'); a learner giving the right answer is marked wrong and 'reception' is accepted. | answer 'Monday to Thursday' / '2 to 6 pm' / 'Monday to Thursday 2-6 pm' (check the original: Mon-Thurs 2-6 pm) |
| ielts-4-test-3 | reading-1 | 5 | wrong-answer | high | Only accepted answer is the combined string 'Sudan & India'. The passage says the courier service 'first started in the Sudan' (a similar programme was later taken up in India); the expected answer in the paper is 'Sudan'. A learner typing 'Sudan' is marked wrong, and 'Sudan and India' also fails because of the '&'. | answers: Sudan; (optionally) Sudan and India / Sudan & India / the Sudan |
| ielts-4-test-3 | listening-4 | 38,40 | wrong-type | high | Both 'Choose TWO letters' questions are stored as type multiple-choice (single select) with answers [D,F] and [A,C] interpreted as alternatives, so a learner who picks only one right letter is marked correct and cannot select two. Each takes one question number, so the section also compresses the numbering (paper counts two marks per TWO-letter question, so Q38-39 / Q40 layout differs; the security question may not exist as a separate item in the paper). | Use multiple-choice-multi with correctKeys D,F (Q38-39) and A,C (Q40) and renumber; verify against the paper which TWO-letter questions exist. |
| ielts-6-test-3 | listening-2 | 14-17 | missing-visual | high | Map-labelling task has no image (imageUrl empty). The speaker says 'look at the map I've given you ... we're here, at the information centre' and the original has a map with letters A-J on it. Without the map the learner cannot do the task; (mechanical already flagged 'no image'). | upload the Rosewood house and gardens map and set it as the group image |
| ielts-6-test-3 | listening-2 | 14-17 | invented-options | high | Because the map is missing, options A-J were replaced by invented text descriptions copied/derived from the transcript (e.g. 'H) Area of pear trees and flowers, on the left after the first corner', 'F) Entrance with a 500 year old tree, on the right after the second corner', 'D) Far side of the garage', 'B) Side entrance, between the house and the garage'). These spell out the answer (the question is 'Pear Alley', option text says pear trees) and are not the letters on the real map; lettering/answer key (H, F, B, D) cannot be verified against the original map. | restore the map image with its letters A-J as plain letter options and re-check the key against the map |
| ielts-8-test-2 | listening-2 | 12-14 | invented-options | high | Original is a plan-labelling task: a wall plan of the park with locations lettered A-I, and the three prompts are place names. Stored version has no plan; it turns the options into an area-name list (A Rare Breeds ... I Orchard, in transcript order) and the prompts into descriptions ('Largest section of the park', 'Two small rectangular areas', 'Southeastern corner...'). The letters C/F/H are therefore invented and do not match the real map letters, and the speaker's directions (moving east, south of the grazing area) cannot be followed without the plan. | Restore the plan image with letters A-I and original prompts (Forest Area / fish farms / market garden-type items) with the real map letters as answers; or convert to a name-based task and drop the letter keys. |
| ielts-9-test-2 | listening-2 | 12 | wrong-answer | high | Table 'Holt Island - Open: between {{q12}}'. Transcript line 11: 'The island is only open to the public from Friday to Sunday'. Stored answers are 'Friday and Sunday / Friday & Sunday', which neither matches the heard wording nor the meaning (it is open all three days); a learner who writes 'Friday to Sunday' (the correct answer) is marked wrong. Mechanical check flagged only that the answer is not in the evidence. ⚠︎ disputed: the table reads "between ___", so the stored answer fits | Answer 'Friday to Sunday' (accept 'Friday - Sunday', 'Fri to Sun', 'Friday through Sunday'); remove 'Friday and Sunday'. |
| ielts-9-test-2 | listening-2 | 17-20 | invented-options | high | Original is a map of Hinchingbrooke Park with locations lettered A-I; the speaker's directions (northwest, southern part, circular area surrounded by paths, between two paths) can only be followed on the map. Stored group has no image and the option list is a set of made-up place descriptions ('Bird hide, west of the lake', 'Path junction beside the lake', 'Resting point beside the lake', 'Path near the East gate', 'Open area near the East gate', 'Area near the West gate' ...) whose letters do not come from the paper. Answers A/I/F/E are therefore not verifiable and the task is partly self-answering (option A names the bird hide). | Add the park map with its real letters A-I and use only letters as options; re-derive the answer letters from the map. |
| ielts-9-test-3 | reading-1 | 9-12 | wrong-answer | medium | Summary completion with a lettered word list (A-I). Elsewhere in the bank (ielts-8-test-2 R2 Q18-22, ielts-8-test-3 R1 Q7-10) such groups store the option KEY as the answer. Here the stored answers are the words ('prescriptivists','rules','descriptivists','popular speech/usage') with correctKeys null, so a learner who picks H, F, A, C from the list (the paper's answer format) would be marked wrong, and 'usage' is not even in the word list. Content itself is right (H, F, A, C). | Store answers as H, F, A, C (keys) for Q9-12, matching the other summary-with-options groups. |
| ielts-11-test-1 | listening-2 | 15-20 | invented-options | medium | Map-labelling options A-I are made-up sentence descriptions ('In the farmyard, next to the New Barn', 'Beside the main path, just before the bridge', ...) instead of just the letters on the map image. Several are inconsistent with the audio: Q19 key C is described as 'just before the bridge' but the speaker says the covered picnic spot is 'just after you cross the bridge' near the farmyard; B 'in the farmyard, next to the New Barn' is odd since the New Barn is by the entrance/car park. Descriptions also copy transcript phrases (Q15 'in the car park, in the corner beside the main path'), turning a map task into a text-matching task. Keys F,G,D,H,C,A match the Cambridge key. | use plain letter options A-I tied to the map image (drop invented descriptions) and verify that letters on the image match the keys |
| ielts-11-test-2 | listening-2 | 17-20 | invented-options | medium | Plan-labelling options A-G are invented sentence descriptions of room positions (e.g. 'Second room along the top corridor, next to room A') rather than just the plan's letters. They conflict with the audio: Q20 artistic director's office is 'through the double doors, turn right, the first room on the right-hand side', which is literally the stored description of option C ('first on the right-hand side'), yet the key is F ('Small room between the foyer and room G'). A learner who follows the descriptions picks C. Keys G,D,B,F agree with my memory of the Cambridge key. | replace descriptions with plain letters A-G on the plan image (verify letters on the image) |
| ielts-11-test-4 | listening-1 | 8-10 | structure | high | Matching group 'Who is each play suitable for?' has no question stems: Q8, Q9, Q10 have empty prompts and the group body is empty, so the learner sees only options A-C and never the play names. The audio asks about 'The Mystery of Muldoon' (Q8, A), 'Fire and Flood' (Q9, B) and 'Silly Sailor' (Q10, C) (names only appear in the explanations). Cannot be answered as displayed. Keys A,B,C are correct. | set prompts to 'The Mystery of Muldoon', 'Fire and Flood', 'Silly Sailor' |
| ielts-11-test-4 | listening-2 | 17-20 | invented-options | medium | Plan-labelling options A-H are invented position descriptions ('Top-left corner room, beside the sitting area entrance', 'Middle room on the left side of the corridor, next to the toilets', ...) instead of the letters printed on the plan. They are inconsistent with the audio in places: Q20 cloakroom is 'on the left-hand side of the sitting area, through the last door before the corridor' but key B is described as a room 'on the left side of the corridor'; Q19 baby-changing facilities are 'along the corridor on the left' but key C is described as a corner room beside the sitting-area entrance. Keys F,H,C,B match the Cambridge key as I remember it. | use plain letters A-H tied to the plan image; drop invented descriptions |
| ielts-12-test-2 | reading-3 | 37-40 | structure | high | matching-information asks 'which paragraph A-G' but all 7 passage paragraphs have an empty label, so PassagePane renders no A-G letters and the learner cannot tell which paragraph is which (the options A..G map to unlabelled paragraphs). In the paper the seven paragraphs are labelled A-G (D=brain stem/noise, G=seven-month-old babies, B=word recognition, C=negative consequences; the stored keys D,G,B,C are consistent with paragraph order 4,7,2,3). | set paragraph labels A,B,C,D,E,F,G on reading-3 paragraphs |
| ielts-12-test-4 | listening-1 | 8 | missing-variant | medium | Stored answer is only 'DG74PH'. normalizeIeltsAnswer collapses whitespace but does not remove it, so the standard written form 'DG7 4PH' (UK postcode, and the form in the Cambridge key) is marked wrong. The audio gives it as a spelled-out code. | answers: ["DG7 4PH", "DG74PH"] |
| ielts-14-test-4 | listening-1 | 8-10 | structure | high | Matching group 'What is said about using each of the following hotel facilities?' has empty prompts and empty body for Q8-10, so the learner sees only options A-C with no facility to match. From the explanations the facilities are Q8 swimming pool (closed, C), Q9 gym (A), Q10 tennis courts (B). | set prompts: Q8 'swimming pool', Q9 'gym', Q10 'tennis courts' (confirm wording against transcript line 29-31) |
| ielts-16-test-2 | reading-2 | 14-16 | text-error | high | The three multiple-choice questions have an empty stem (prompt is blank, shown as '(slot in body)'). The learner sees only options A-D with no question (the paper asks e.g. what the writer says about microbes in paragraph 1/2 and the purpose of the van Leeuwenhoek paragraph). Answers D, C, A agree with the Cambridge key. | add the original stems for Q14-16 |
| ielts-16-test-2 | reading-3 | 27-30 | text-error | high | Same problem: four MC questions with empty stems (prompt blank). Options alone cannot be answered without the question. Answers B, C, B, D match the Cambridge key. | add the original stems for Q27-30 |
| ielts-16-test-4 | reading-1 | 1-6 | missing-visual | high | Task is 'Label the diagrams below' (the paper shows two labelled diagrams: the Persian qanat method and a cross-section of a Roman qanat shaft). Stored as bullet-point notes with no image (imageUrl empty); the bullet wording ('vertical shafts to remove earth and for ___') is reconstructed text, not the diagram labels. Answers (posts, canal, ventilation, lid, weight, climbing) match the key. | attach the two diagrams and place the blanks on them (or keep bullets but mark as reconstructed) |
| ielts-18-test-4 | reading-2 | 14-16 | text-error | high | Three multiple-choice questions have an empty stem (prompt blank, shown as '(slot in body)'). The learner sees only options A-D with no question text (the paper asks e.g. what the writer is doing in the first paragraph, what the studies show about students, etc.). Answers B, C, D agree with the Cambridge key. | add the original stems for Q14-16 |
| ielts-18-test-4 | reading-3 | 37-40 | text-error | high | Four multiple-choice questions have an empty stem (prompt blank). Options alone cannot be answered. Answers B, A, D, C agree with the Cambridge key. | add the original stems for Q37-40 |
| ielts-20-test-3 | listening-4 | 33,34 | wrong-answer | high | Body slot text does not match stored answers. Q33 slot is 'Office desks that can be adjusted to suit wheelchair users or a person's {{q33}}' but stored answer is 'desks' (transcript: 'people of different heights' -> 'height'/'heights'). Q34 slot is 'Taps in public toilets that work by sensor: easier to use and more {{q34}}' but stored answer is 'taps' (transcript: 'more hygienic'). A learner typing the correct word for the slot is marked wrong. ✔︎ | Either rewrite the notes so the blanks replace 'desks' and 'taps' (e.g. 'Office {{q33}} that can be adjusted...', '{{q34}} in public toilets that work by sensor') or change answers to height/heights and hygienic |
| ielts-20-test-3 | listening-4 | 37-40 | wrong-answer | high | Answers are shifted against the body slots. Q37 slot: 'transport that is not wheelchair-friendly limits disabled people's {{q37}}' stored 'pregnant' (transcript: independence); Q38 slot 'women who are {{q38}}' stored 'shoulders' (should be pregnant); Q39 slot 'women with smaller {{q39}}' stored 'police' (should be shoulders; 'police' has no slot at all); Q40 slot 'offices waste {{q40}}' stored 'temperature' (transcript: 'wasting energy'). Whole tail of Part 4 is marked wrong for correct answers. ✔︎ | Set Q37=independence, Q38=pregnant, Q39=shoulders, Q40=energy to match the notes (or restore the original note layout that matches desks/taps/blue/voice/pregnant/shoulders/police/temperature and re-number slots) |
| ielts-21-test-2 | all | 1-40 | other | high | ielts-21-test-2 has the same content as ielts-21-test-3 in every section (see 21-3 finding); at most one of them can be the true paper. | Confirm which test number the Shetland ferry / saiga / Rethinking the Past content belongs to and replace the other |
| ielts-21-test-3 | all | 1-40 | other | high | ielts-21-test-3 is a duplicate of ielts-21-test-2: all 4 listening parts (Shetland ferry, street food Jon/Veg Out, sustainable fashion Maddy/Ryan, invasive species), all 3 reading passages (Saving the saiga, Dar es Salaam, Rethinking the Past) and both writing tasks (rain-shadow desert diagram, study abroad/work placement) are the same text and answers (similarity 0.95-1.0 per section). One of the two is not the real Cambridge 21 paper it claims to be, so a genuine Test 2 or Test 3 is missing. | Replace ielts-21-test-3 (or test-2, whichever is wrong) with the real Cambridge IELTS 21 content; check which of the two matches the book |

## Per-test summary

| Test | AI high | AI medium | AI low | Script items | No evidence / bad quote | Visual flags |
| --- | --- | --- | --- | --- | --- | --- |
| ielts-1-test-1 | 1 | 1 | 4 | 10 | 2 | 0 |
| ielts-1-test-2 | 5 | 2 | 4 | 27 | 3 | 2 |
| ielts-1-test-3 | 0 | 2 | 6 | 23 | 2 | 1 |
| ielts-1-test-4 | 1 | 3 | 2 | 18 | 1 | 2 |
| ielts-2-test-1 | 1 | 2 | 3 | 8 | 3 | 1 |
| ielts-2-test-2 | 2 | 1 | 2 | 4 | 1 | 0 |
| ielts-2-test-3 | 0 | 1 | 4 | 10 | 3 | 0 |
| ielts-2-test-4 | 2 | 1 | 3 | 16 | 3 | 3 |
| ielts-3-test-1 | 3 | 1 | 3 | 12 | 3 | 2 |
| ielts-3-test-2 | 3 | 3 | 4 | 18 | 3 | 3 |
| ielts-3-test-3 | 1 | 0 | 3 | 7 | 4 | 0 |
| ielts-3-test-4 | 0 | 3 | 4 | 5 | 1 | 0 |
| ielts-4-test-1 | 0 | 5 | 0 | 10 | 2 | 3 |
| ielts-4-test-2 | 0 | 2 | 2 | 6 | 2 | 1 |
| ielts-4-test-3 | 2 | 1 | 2 | 7 | 1 | 0 |
| ielts-4-test-4 | 0 | 2 | 3 | 8 | 7 | 1 |
| ielts-5-test-1 | 0 | 1 | 2 | 6 | 4 | 0 |
| ielts-5-test-2 | 0 | 1 | 3 | 6 | 3 | 2 |
| ielts-5-test-3 | 0 | 2 | 0 | 6 | 5 | 0 |
| ielts-5-test-4 | 0 | 1 | 2 | 13 | 3 | 0 |
| ielts-6-test-1 | 0 | 2 | 3 | 7 | 2 | 0 |
| ielts-6-test-2 | 0 | 2 | 1 | 4 | 3 | 0 |
| ielts-6-test-3 | 2 | 1 | 3 | 10 | 5 | 2 |
| ielts-6-test-4 | 0 | 0 | 3 | 4 | 3 | 1 |
| ielts-7-test-1 | 0 | 1 | 2 | 7 | 4 | 0 |
| ielts-7-test-2 | 0 | 4 | 3 | 7 | 3 | 1 |
| ielts-7-test-3 | 0 | 4 | 1 | 8 | 3 | 1 |
| ielts-7-test-4 | 0 | 2 | 4 | 8 | 4 | 1 |
| ielts-8-test-1 | 0 | 1 | 2 | 3 | 1 | 1 |
| ielts-8-test-2 | 1 | 2 | 3 | 3 | 1 | 1 |
| ielts-8-test-3 | 0 | 2 | 0 | 5 | 4 | 0 |
| ielts-8-test-4 | 0 | 4 | 2 | 8 | 3 | 1 |
| ielts-9-test-1 | 0 | 3 | 4 | 11 | 6 | 0 |
| ielts-9-test-2 | 2 | 1 | 2 | 7 | 3 | 1 |
| ielts-9-test-3 | 1 | 1 | 3 | 4 | 1 | 1 |
| ielts-9-test-4 | 0 | 2 | 3 | 5 | 3 | 1 |
| ielts-10-test-1 | 0 | 0 | 3 | 7 | 6 | 0 |
| ielts-10-test-2 | 0 | 0 | 3 | 4 | 4 | 0 |
| ielts-10-test-3 | 0 | 0 | 3 | 7 | 6 | 0 |
| ielts-10-test-4 | 0 | 2 | 1 | 3 | 2 | 0 |
| ielts-11-test-1 | 1 | 1 | 2 | 7 | 3 | 1 |
| ielts-11-test-2 | 1 | 2 | 2 | 7 | 3 | 3 |
| ielts-11-test-3 | 0 | 1 | 2 | 5 | 2 | 1 |
| ielts-11-test-4 | 2 | 1 | 1 | 4 | 4 | 0 |
| ielts-12-test-1 | 0 | 0 | 3 | 5 | 4 | 0 |
| ielts-12-test-2 | 1 | 0 | 1 | 3 | 3 | 0 |
| ielts-12-test-3 | 0 | 0 | 3 | 3 | 0 | 1 |
| ielts-12-test-4 | 1 | 2 | 1 | 3 | 3 | 0 |
| ielts-13-test-1 | 0 | 4 | 1 | 5 | 3 | 1 |
| ielts-13-test-2 | 0 | 1 | 1 | 3 | 1 | 0 |
| ielts-13-test-3 | 0 | 1 | 1 | 4 | 2 | 0 |
| ielts-13-test-4 | 0 | 1 | 3 | 4 | 3 | 0 |
| ielts-14-test-1 | 0 | 0 | 3 | 3 | 2 | 0 |
| ielts-14-test-2 | 0 | 2 | 3 | 5 | 3 | 1 |
| ielts-14-test-3 | 0 | 0 | 3 | 2 | 2 | 0 |
| ielts-14-test-4 | 1 | 0 | 0 | 6 | 5 | 1 |
| ielts-15-test-1 | 0 | 0 | 3 | 3 | 1 | 0 |
| ielts-15-test-2 | 0 | 1 | 4 | 3 | 1 | 0 |
| ielts-15-test-3 | 0 | 0 | 2 | 3 | 2 | 0 |
| ielts-15-test-4 | 0 | 1 | 2 | 5 | 5 | 0 |
| ielts-16-test-1 | 0 | 1 | 4 | 3 | 1 | 1 |
| ielts-16-test-2 | 2 | 1 | 1 | 8 | 6 | 1 |
| ielts-16-test-3 | 0 | 0 | 3 | 3 | 3 | 0 |
| ielts-16-test-4 | 1 | 1 | 3 | 6 | 3 | 1 |
| ielts-17-test-1 | 0 | 0 | 0 | 5 | 3 | 0 |
| ielts-17-test-2 | 0 | 0 | 3 | 4 | 4 | 0 |
| ielts-17-test-3 | 0 | 0 | 2 | 4 | 4 | 0 |
| ielts-17-test-4 | 0 | 0 | 2 | 8 | 4 | 0 |
| ielts-18-test-1 | 0 | 1 | 5 | 2 | 2 | 0 |
| ielts-18-test-2 | 0 | 1 | 3 | 5 | 5 | 0 |
| ielts-18-test-3 | 0 | 2 | 3 | 4 | 2 | 0 |
| ielts-18-test-4 | 2 | 0 | 2 | 4 | 2 | 0 |
| ielts-19-test-1 | 0 | 1 | 0 | 4 | 4 | 0 |
| ielts-19-test-2 | 0 | 0 | 3 | 5 | 5 | 0 |
| ielts-19-test-3 | 0 | 0 | 4 | 6 | 4 | 0 |
| ielts-19-test-4 | 0 | 0 | 2 | 3 | 3 | 0 |
| ielts-20-test-1 | 0 | 0 | 2 | 3 | 0 | 1 |
| ielts-20-test-2 | 0 | 0 | 1 | 0 | 0 | 0 |
| ielts-20-test-3 | 2 | 1 | 1 | 3 | 2 | 1 |
| ielts-20-test-4 | 0 | 0 | 0 | 2 | 2 | 0 |
| ielts-21-test-1 | 0 | 0 | 2 | 3 | 3 | 0 |
| ielts-21-test-2 | 1 | 0 | 0 | 7 | 6 | 1 |
| ielts-21-test-3 | 1 | 0 | 1 | 1 | 0 | 1 |
| ielts-21-test-4 | 0 | 0 | 0 | 4 | 0 | 1 |

## Medium and low findings by test

Script findings are listed under each test too, except evidence items (counted in the table above; full list in the JSON).

### ielts-1-test-1

- **medium** · wrong-answer · listening-1 Q10 (medium): Stored answer 85 (65 + 20) but line 27 says 'contents are worth about 20 or 25 pounds at least', which gives 85 or 90 and never states a total. The original paper has a single unambiguous total; the transcript wording seems altered. Accept 85 and 90, or restore the original line ('at least 20 pounds'). → _add variant 90 or edit transcript line 27 so the contents are worth 20 pounds_
- **low** · structure · listening-1 Q3 (medium): The Example (What has the woman lost? A - a briefcase) is embedded as body text inside the Q3 group, so Q3 appears to be preceded by an example and the real Q1-2 pictures group has no example before it. On the paper the Example sits before Q1 and Q1-Q5 are one run of picture/text MC questions. → _move the example to the start of the Q1 group (or a separate example block)_
- **low** · invented-options · listening-1 Q1,2,4,5 (low): Picture questions carry text descriptions as option labels (e.g. 'A soft case with two buckles at the front', 'Sagi at the bottom left, scratch directly above it'). Images are present, but option text may be author-written descriptions of the original pictures A-D; verify that the letter order matches the image order, otherwise stored letters (A, C, A, C) are wrong. → _confirm option letters correspond to the image panels_
- **low** · missing-variant · listening-2 Q17,19 (medium): Q17 accepts 'school children' but not the one-word form 'schoolchildren'; Q19 does not accept 'boats and pleasure craft' (the exact phrase in line 11). → _add variants schoolchildren; boats and pleasure craft_
- **low** · other · listening-3 Q26 (low): Q26 slot reads '{{q26}} to the lecturer' with stored answer 'write up work', which does not fit grammatically ('write up work to the lecturer'). The transcript says 'write up your piece of work, and give it to the lecturer'. Likely a mangled note template; the original probably expects 'write up' / 'hand in'. → _reword the note (e.g. '{{q26}} and give to the lecturer') and keep 'write up'_
- **script** · word-limit · listening-1/l1-g6 Q6-10: instruction number=false, allowNumber=true
- **script** · word-limit · listening-2/l2-g2 Q14-20: instruction number=false, allowNumber=true

### ielts-1-test-2

- **medium** · wrong-type · reading-2 Q24-27 (medium): Statements about facts in the text ('Do the following statements agree with the information...' with TRUE/FALSE/NOT GIVEN on the paper) are stored as yes-no-not-given with the writer-claims instruction. Q24-27 are factual information statements, so type should be TFNG. → _change group to true-false-not-given with TRUE/FALSE/NOT GIVEN instruction (answers NG, TRUE, TRUE, FALSE)_
- **medium** · missing-visual · listening-4 Q40 (medium): 'Complete the diagram' (healthy diet pyramid) was flattened into three bullet lines with the Top level as an 'Example' and Bottom given away; the original shows a pyramid diagram with the middle band blank. Only Q40 is a question; no image. → _restore the pyramid image or at least present it as a labelled diagram_
- **low** · structure · listening-3 Q31-32 (medium): The multi-choice group has instruction 'Choose TWO letters, A-E.' with no question stem (the shared stem is only in each question prompt 'Consumption of Australian bananas'). The learner is not told what to pick; the transcript question is 'do we export bananas overseas ...' i.e. which TWO places consume Australian bananas. Answers C,D are consistent with the transcript. → _add stem e.g. 'Which TWO places consume Australian bananas?'_
- **low** · text-error · listening-1 Q1-10 (high): Both note groups are titled 'Job enquiry notes: Kate/Luki', which is wrong; the paper has notes on overseas students' experiences of Cambridge (Counsellor interview). → _retitle e.g. 'Student interview notes: Kate / Luki'_
- **low** · wrong-type · reading-3 Q38-40 (medium): Sentence-ending task ('Choose one phrase (A-H) to complete each key point') is stored as matching-features; it is a matching-sentence-endings task. Answers D, B, F match the passage. → _relabel type if a sentence-endings type exists_
- **low** · missing-variant · listening-2 Q13 (medium): Template reads 'Prices range from $50.00 to {{q13}}'; stored 2,000 / 2000 only. Learners may write $2,000 or $2000.00. → _add variants $2,000, $2000, 2,000.00_
- **script** · word-limit · listening-1/l1-g1 Q1-5: instruction number=false, allowNumber=true
- **script** · word-limit · listening-1/l1-g2 Q6-10: instruction number=false, allowNumber=true
- **script** · count · listening-3: 12 questions (listening parts have 10)
- **script** · word-limit · listening-3/l3-g5 Q25-30: instruction number=false, allowNumber=true
- **script** · count · listening-4: 8 questions (listening parts have 10)
- **script** · word-limit · listening-4/l4-g4 Q36-39: instruction number=false, allowNumber=true
- **script** · word-limit · listening-4/l4-g5 Q40-40: instruction number=false, allowNumber=true
- **script** · visual? · listening-4/l4-g5 Q40-40: mentions a picture/map/diagram but has no image: "Complete the diagram. Write NO MORE THAN THREE WORDS for each answer." / ""
- **script** · word-limit · reading-1/r1-g2 Q8-10: instruction number=false, allowNumber=true
- **script** · visual? · reading-2/r2-g2 Q20-23: mentions a picture/map/diagram but has no image: "Label the diagram below. Choose ONE OR TWO WORDS from the passage for each answe" / ""

### ielts-1-test-3

- **medium** · missing-visual · listening-4 Q37-40 (low): Title 'Customer movement around the supermarket aisle' with ENTRANCE / AISLE / EXIT lines suggests the paper shows a labelled diagram/flow of the aisle (Complete the diagram), here flattened into notes with no image. Q40 is also ambiguous: transcript says 'many new products are launched in these positions' and 'may be used for promoting special offers'; only 'special offers' is stored. → _restore diagram image; add variant 'new products' for Q40 if kept_
- **medium** · missing-visual · reading-1 Q7-11 (high): Instruction says 'The diagram below illustrates ... Complete the labels on the diagram' but it is stored as note-completion text lines with no image (flow-chart/diagram boxes were turned into a list with an Example line). Q11 stores 'noise / pauses / noises and pauses / pauses and noises' but not plain 'noises' (passage: 'the pauses and noises'); Q9 accepts 'forms', which is not supported by the passage. → _restore the diagram image; add variant 'noises'; drop 'forms' from Q9_
- **low** · missing-example · listening-1 Q1-11 (medium): The Part 1 example (lines 1-5: 'How do you come to the university each day?' -> walks, C) is not shown in the question groups. Also the announcer lines say 'questions 1 to 4', 'spaces numbered 5 to 10' and 'questions 11 to 12', but the stored numbering is MC 1-3, form 4-9, MC 10, short answer 11, so the audio and on-screen numbering disagree by one. → _add the example block; align announcer lines (or restore the missing 4th MC question from the paper if it was dropped)_
- **low** · missing-variant · listening-1 Q8 (medium): Registration number stored as 'LJX 058K' (with a space) while the transcript writes it 'LJX058K'. If checking is not whitespace-insensitive, the natural answer LJX058K is marked wrong. → _add variant LJX058K_
- **low** · structure · reading-1 Q1-6 (medium): Headings task skips Paragraph C with no example shown (questions go A, B, D, E, F, G); the paper marks one paragraph as the done example. The instruction says nothing about an example, so the learner sees an unexplained gap. → _add 'Paragraph C has been done for you as an example (iii)' to the instruction_
- **low** · structure · reading-2 Q13-20 (medium): Headings task skips Paragraph A with no example shown (questions B-I); paper has Paragraph A done as an example (xii 'An underground home is discovered' is not used by any question). → _add example line for Paragraph A (xii) to the instruction_
- **low** · missing-variant · reading-2 Q26 (medium): Stored 'his bakery business / a cool room'. 'a cool room' does not fit 'first underground room was used for ...' and the natural short answers 'bakery business', 'bakery', 'a bakery business' are not accepted. → _answer 'bakery business' with variants his bakery business, a bakery business, bakery_
- **low** · missing-variant · listening-3 Q30 (low): Q30 accepts 'hotels beds / hotels rooms / hotel beds / hotel rooms' but not 'hotels' / 'hotel prices' etc.; 'hotels beds' is ungrammatical. Transcript: 'big hotel groups are doing it ... price of a bed in a hotel'. → _add variants hotels, hotel, hotel accommodation_
- **script** · checkTest:warning · reading-1 reading: passage_length: The passage has 619 words; 700-1000 is typical.
- **script** · count · listening-1: 11 questions (listening parts have 10)
- **script** · word-limit · listening-1/l1-g4 Q4-9: instruction number=false, allowNumber=true
- **script** · count · listening-2: 11 questions (listening parts have 10)
- **script** · word-limit · listening-2/l2-g1 Q12-22: instruction number=false, allowNumber=true
- **script** · count · listening-3: 9 questions (listening parts have 10)
- **script** · word-limit · listening-3/l3-g5 Q27-31: instruction says max 3 words but wordLimit is null
- **script** · count · listening-4: 9 questions (listening parts have 10)
- **script** · word-limit · listening-4/l4-g1 Q32-36: instruction says max 3 words but wordLimit is null
- **script** · word-limit · listening-4/l4-g2 Q37-40: instruction says max 3 words but wordLimit is null
- **script** · visual? · reading-1/r1-g2 Q7-11: mentions a picture/map/diagram but has no image: "The diagram below illustrates the information provided in paragraphs B-F of Read" / ""

### ielts-1-test-4

- **medium** · missing-visual · listening-3 Q25-30 (medium): Audio says 'Now look at the diagram of the aluminium can... label the can', but the task is stored as bullet notes with no image; the learner cannot see which part (body, base, lid, rim, opening) each blank belongs to, and the bullets already give most of the structure. The answers themselves (thicker, label, dome, flange, 25%, scored opening) match the transcript. → _add the can diagram image and number the label points 25-30_
- **medium** · missing-visual · reading-1 Q6-8 (medium): Instruction 'The diagram below shows the principle of Corning's ribbon machine' but no diagram exists; replaced with two rewritten sentences ('A narrow ribbon of {{q6}} travels over a {{q7}} with holes') copied from the passage, which makes the task trivial versus the labelled diagram on the paper. → _restore diagram image with labels 6-8_
- **medium** · missing-variant · reading-3 Q39 (medium): Q39 'The likelihood that animals which live in forests will become extinct is increased when {{q39}}' accepts only 'logging takes place / logging occurs / forests are logged'. The passage's concluding sentence says 'increasing the area that is logged ... will increase the probability' -> answer is about the area logged increasing (e.g. 'the area logged increases'). Learners writing the passage-based answer are marked wrong. Q37 also lacks 'die out' / 'become extinct' base forms beyond modal variants, and its evidence quote is not the sentence that answers it. → _add variants: the area logged increases / logged area increases / more forest is logged / the area that is logged increases_
- **low** · missing-variant · listening-3 Q23 (medium): Q23 answer list starts with 'magazine pages' (not in the audio) while the audio says 'thinner than two pieces of paper'; 'pages' is a loose variant. → _keep 'pieces of paper' as primary; drop 'magazine pages'_
- **low** · invented-options · listening-1 Q1-4 (low): Q1-4 are plain text multiple choice (queue size, food, drink, money). On the paper the Part 1 questions are pictures/number options; the options here may be paraphrased. Q1 has a distractor: the man says 'hundreds of other people' but the woman says 'at least 50'; the stored A (50) is defensible but relies on option text 50/100/200/300 that looks author-made. → _verify against paper; if images exist, attach them_
- **script** · checkTest:warning · reading-2 reading: passage_length: The passage has 602 words; 700-1000 is typical.
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 639 words; 700-1000 is typical.
- **script** · count · listening-1: 11 questions (listening parts have 10)
- **script** · count · listening-2: 9 questions (listening parts have 10)
- **script** · word-limit · listening-2/l2-g2 Q13-20: instruction says 4, wordLimit.maxWords=5
- **script** · visual? · listening-3/l3-g2 Q25-30: mentions a picture/map/diagram but has no image: "Label the aluminium can. Write NO MORE THAN THREE WORDS for each answer." / ""
- **script** · visual? · reading-1/r1-g2 Q6-8: mentions a picture/map/diagram but has no image: "The diagram below shows the principle of Corning's ribbon machine. Choose NO MOR" / ""

### ielts-2-test-1

- **medium** · wrong-answer · reading-3 Q39 (low): Stored YES for 'All Hewson's experiments used marbles of the same size.' Evidence is a rhetorical question ('any other marble of similar size will do just as well?') and the passage says Hewson 'made the functional equivalence of different marbles clear' via a swapping game, i.e. he used different marbles. The passage never states that all his experiments used same-size marbles, so NOT GIVEN (or NO) is better supported than YES. → _re-check against the paper; likely NOT GIVEN_
- **medium** · missing-variant · reading-2 Q21 (medium): Q21 accepts 'social, economic, environmental' and 'social economic environmental' only. The passage wording is 'social, economic and environmental', which the learner will naturally copy, and 'social, economic and environmental' is 5 words (limit 3 words) so the only strict answer is the list form; accept 'social economic and environmental' and 'social, economic and environmental' if the checker does not strip 'and'. → _add variants with 'and'_
- **low** · evidence-wrong · reading-3 Q34 (low): Q34 (answer B, Kendlers) quotes paragraph 6 about Hewson, which supports D, not B. The statement 'compared five-year-olds with college students using the same apparatus' is only inferable for the Kendlers from 'college students did in the Kendlers' own experiments'; evidence block should point there and the learner could reasonably choose D. → _set evidence to the 'Kendlers' own experiments' sentence and double-check key B_
- **low** · missing-variant · listening-1 Q3,4 (medium): Q3 is stored 94561309 while the form shows the home number as '9835 6712' (spaced); learners will type '9456 1309'. Q4 '2020BD' may be typed '2020 BD'. → _add spaced variants 9456 1309 and 2020 BD (or normalise whitespace)_
- **low** · text-error · listening-4 Q31-35 (high): Table group title is 'Course / Type of course: duration and level / Entry requirements' - a garbled concatenation of the column headers; the paper title is the table caption (e.g. Physical education training courses). → _retitle the table_
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 682 words; 700-1000 is typical.
- **script** · visual · reading-1/r1-g2 Q6-9: plan/map labelling without an image

### ielts-2-test-2

- **medium** · missing-variant · listening-2 Q15 (medium): Q15 'Students need a front door key between {{q15}}' stores only '8pm and 7am'. Learners may write '8 pm and 7 am', '8.00 pm and 7.00 am', '8 p.m. and 7 a.m.' or the reverse order '7 am and 8 pm' (the door is locked 8 pm and reopened 7 am). → _add spaced and reversed variants_
- **low** · missing-variant · listening-2 Q12 (low): Q12 stores only 'north' for 'The first letter shows the wing - for example {{q12}}'. The president says the room number begins with N, S or W; a learner answering 'N' or 'west'/'south' (any wing) is marked wrong. → _accept N, S, W and the full direction words_
- **low** · wrong-answer · listening-4 Q40 (low): Q40 stem 'Farmers have a strong sense of solidarity because' is ambiguous against the audio: three causes are given (need to present a united front to government and the media, cooperation between training colleges, national Farmers' Union). Stored B (strong Union) matches only the third; the first factor mentions the media (option A is a distractor) and 'right across the country' (option C). The original question stem is probably more specific. → _verify stem/options against the paper_

### ielts-2-test-3

- **medium** · structure · listening-1 Q5,6,7 (high): Q5, Q6 and Q7 are stored as three single-answer MC questions with instruction 'Choose TWO letters, A-E (both are accepted as correct here)' and answers 'A / E', 'A / C', 'C / E'. On the paper each of these items needs two ticks (two boxes on the questionnaire). As built, a learner who ticks only one of the two correct letters is marked fully right, and the instruction contradicts itself. Correct sets are plausible from the audio (A+E, A+C, C+E). → _convert to multi-select items requiring both letters (correctKeys), one mark each, or split into two questions per item_
- **low** · missing-example · listening-1 Q1-10 (low): Announcer lines 1-3 and the opening dialogue play an Example conversation (market-research opening), but no example is shown in the question groups; Part 1 numbering starts at Q1 directly. → _add the example item_
- **low** · missing-variant · listening-3 Q22 (medium): Q22 accepts '18,000 to 20,000 / 18000 to 20000 / 18,000-20,000'. The tutor says '18 to 20,000'; learners will write '18-20,000', '18 to 20,000', '18,000 - 20,000' or '18 000 to 20 000'. → _add variants 18 to 20,000, 18-20,000, 18,000 - 20,000_
- **low** · structure · listening-3 Q21-26 (low): The 'Complete the table below' task (hand-in date, length, extra programme, timetable) is split into four separate one- to three-question note groups with the same title and instruction, and the timetable is flattened to 'Date: ... Action: ...' lines. The paper shows a single form/table for Q21-26. → _merge into one table group with a header row_
- **low** · instruction-mismatch · listening-3 Q24-26 (low): Group instruction reads 'Write WORDS AND/OR NUMBERS for each answer' (wordLimit 4) instead of the usual 'NO MORE THAN THREE WORDS AND/OR A NUMBER'. Q26 stores 'March to May' (3 words) with variants 'March & May', which is not a real answer form. → _normalise instruction wording; replace 'March & May' with 'March to May'/'March-May' only_
- **script** · checkTest:warning · reading-2 reading: passage_length: The passage has 678 words; 700-1000 is typical.
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 625 words; 700-1000 is typical.
- **script** · word-limit · listening-3/l3-g2 Q22-22: instruction number=true, allowNumber=false
- **script** · listening · listening-4: no audio

### ielts-2-test-4

- **medium** · instruction-mismatch · listening-1 Q10 (high): Instruction says 'Write A NUMBER for each answer' (wordLimit 3) but the answer is a pair of times; stored only '1 & 5' / '1 and 5'. Transcript: best time about 1 o'clock, 'Any time up to 5 pm'. Learners writing '1 and 5 pm', '1-5', '1 pm and 5 pm' or '1.00 and 5.00' are marked wrong; the ampersand form is the primary answer. → _reword instruction (e.g. between ... pm) and add variants 1-5, 1 to 5, 1 pm and 5 pm, 1.00-5.00_
- **low** · structure · listening-2 Q16-18 (medium): Q16-18 (and Q19-20) are three free slots that each accept any of 'walking boots / socks / long trousers'. A learner can type the same item in all three slots and get 3 marks; the slots are order-independent but not duplicate-protected. → _mark as an unordered set (no repeats) or use multiple-choice-multi_
- **low** · evidence-wrong · reading-1 Q1 (low): Q1 ('The research findings report commercial rather than political trends.', stored YES) cites only the sentence about politicians misjudging the public mood, which does not itself state that the findings are commercial rather than political. The judgement is defensible but the evidence is weak and a NOT GIVEN/NO key cannot be ruled out; please compare with the paper. → _verify key against the Cambridge answer sheet_
- **low** · other · writing-1 Q (high): Writing Task 1 prompt is a single paragraph with 'Write at least 150 words' merged in, and image alt text is only 'Writing Task 1 visual' (no description of the bar graph of imprisonment figures 1930-1980). The whole test is also in draft status, not published. → _separate prompt and word-count line, improve alt text, publish when reviewed_
- **script** · checkTest:error · reading-1 reading: passage_length: The passage has 584 words; it needs 600-1100.
- **script** · word-limit · listening-1/l1-g2 Q3-9: instruction number=false, allowNumber=true
- **script** · word-limit · listening-1/l1-g3 Q10-10: instruction number=true, allowNumber=false
- **script** · visual? · listening-4/l4-g3 Q33-33: mentions a picture/map/diagram but has no image: "Choose the correct letter, A-C, which best shows the proportion of men and women" / "Which pie chart shows the proportion of men and women respondents?"
- **script** · visual? · reading-2/r2-g5 Q18-21: mentions a picture/map/diagram but has no image: "Do the following statements agree with the claims of the writer in Reading Passa" / "It is traditionally accepted that children's books should contain few pictures."
- **script** · visual? · reading-2/r2-g6 Q22-25: mentions a picture/map/diagram but has no image: "Reading Passage 2 has ten paragraphs, A-J. Which paragraphs state the following " / "The decline of literacy is seen in groups of differing ages and abilities."

### ielts-3-test-1

- **medium** · wrong-type · listening-2 Q19 (medium): 'Choose TWO letters, A-E' is stored as short-answer with the option list pasted into the instruction text and a free-text slot (answers 'B & E', 'B and E', ...). It should be multiple-choice-multi with real options. Also option D 'people over 60 years old' versus audio 'unemployed or retired, or if you're pregnant' makes retired (~over 60) arguably a third correct group; the key B,E should be checked against the paper's option wording. → _convert to multiple-choice-multi (correctKeys B,E) and verify option D wording_
- **low** · text-error · listening-1 Q1-10 (high): Note title is 'Job Enquiry' although the call is an enquiry about renting a house (Flagstone letting agency). → _retitle e.g. 'House rental enquiry'_
- **low** · missing-variant · listening-1 Q9 (medium): Q9 'give {{q9}} notice of moving in' accepts '2 weeks'' / 'two weeks'' (with apostrophe) and hyphen forms but not plain '2 weeks' / 'two weeks' (as learners type). → _add variants 2 weeks, two weeks_
- **low** · structure · reading-1 Q1-4 (medium): Instruction says 'Choose the most suitable headings for each paragraph' for paragraphs A-F but only B-E are asked (Q1-4); A and F have no example heading shown. Q22-24 of reading-2 and Q22-24 style 'choose ONE phrase' sentence-endings task is typed summary-completion rather than a sentence-endings match. → _state which paragraphs are examples; relabel Q22-24 type_
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 679 words; 700-1000 is typical.
- **script** · word-limit · listening-3/l3-g1 Q21-30: instruction says 3, wordLimit.maxWords=4
- **script** · visual? · listening-4/l4-g1 Q31-31: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C, to represent the bar chart column for the " / "Which column of the bar chart represents the figures quoted?"
- **script** · visual? · reading-1/r1-g5 Q11-14: mentions a picture/map/diagram but has no image: "Look at the drawings of different projectiles below, A-H, and the names of types" / "The Chinese 'basket of fire'"

### ielts-3-test-2

- **medium** · missing-visual · listening-4 Q33-34 (high): 'Label the diagrams' (conical hat and pillbox hat) was rewritten as two sentences ('Conical hat: cut into centre and {{q33}} the cut', 'Pillbox hat: stick flaps to {{q34}} of circle') with no diagrams; the original labels point at parts of the drawings. → _add the hat diagrams with labels 33-34_
- **medium** · missing-variant · listening-1 Q5 (medium): Q5 (11.00, Classroom 5, event) accepts only 'placement' or 'English'. The audio says 'a placement test ... find your level of English'; the natural answers 'placement test' and 'English test' are not in the list. → _add variants placement test, English test, a test, test_
- **medium** · wrong-answer · reading-3 Q40 (low): Stored C ('a critical study of the importance of role signs in modern society') with evidence about role signs only. The passage is a neutral explanatory text on role theory (focal person, role set, role signs, ambiguity, conflict), which fits B ('a textbook analysis of behaviour in organisations'); the Cambridge key is very likely B, not C. Evidence quote covers only one of the passage's several themes. → _verify against the paper; likely B_
- **low** · wrong-answer · reading-3 Q33 (low): Q33 'Today furniture operates as a role sign in the same way as dress has always done' is stored YES, but the passage only says furniture 'is often used as a role sign' while dress is noted as a declining role sign ('current trend towards blurring these role signs in dress'); 'in the same way as dress has always done' is not supported. NO or NOT GIVEN is possible. → _check against the paper key_
- **low** · structure · reading-2 Q14-18 (medium): Heading task skips Section E with no example shown (A, B, C, D, F asked); instruction does not mention an example. Q19-22 'Complete the table' is typed matching-information with the table flattened to prompts ('Agricultural practice causing: Deforestation'). → _show the example heading for E; present Q19-22 as a table_
- **low** · missing-variant · listening-4 Q37 (low): Q37 stores 'white, gray, brown' / 'white, grey, brown' but learners will write 'white, grey and brown' or 'white grey brown'. → _add 'and' and no-comma variants_
- **low** · other · writing-1 Q (low): Writing Task 1 chart is a generated 'bar' visual with numeric series (e.g. Germany 145,148,150,...) rather than the original image; the values may not reproduce the original Cambridge chart exactly. → _compare the plotted values with the original bar chart_
- **script** · checkTest:warning · reading-1 reading: passage_length: The passage has 676 words; 700-1000 is typical.
- **script** · word-limit · listening-1/l1-g1 Q1-5: instruction says max 3 words but wordLimit is null
- **script** · visual · listening-1/l1-g2 Q6-10: plan/map labelling without an image
- **script** · word-limit · listening-2/l2-g1 Q11-15: instruction says max 3 words but wordLimit is null
- **script** · word-limit · listening-2/l2-g2 Q16-20: instruction says max 3 words but wordLimit is null
- **script** · word-limit · listening-3/l3-g2 Q25-29: instruction says max 3 words but wordLimit is null
- **script** · word-limit · listening-4/l4-g1 Q31-32: instruction says max 3 words but wordLimit is null
- **script** · word-limit · listening-4/l4-g2 Q33-34: instruction says max 3 words but wordLimit is null
- **script** · visual? · listening-4/l4-g2 Q33-34: mentions a picture/map/diagram but has no image: "Label the diagrams. Write NO MORE THAN THREE WORDS for each answer." / ""
- **script** · word-limit · listening-4/l4-g3 Q35-37: instruction says max 3 words but wordLimit is null
- **script** · visual · reading-1/r1-g2 Q6-8: plan/map labelling without an image
- **script** · word-limit · reading-1/r1-g3 Q9-13: instruction says max 3 words but wordLimit is null

### ielts-3-test-3

- **low** · text-error · reading-1 Q1-12 (high): OCR typos in the passage: 'offer 140 years of gradual development' (should be 'after'), 'survive and adapt In spire of partial integration' (should be 'In spite of'), 'if nor the earliest' (should be 'if not the earliest'). Meaning is not changed for any question. → _correct the three typos_
- **low** · missing-variant · listening-3 Q24 (low): Q24 stores '20 & 50 & 2.5 / 2.5': the first variant is a leftover of the whole dimension line (width, length, depth) and is not an answer. Depth is 2.5 cm; learners may write '2.5 cm' or '2.5cm'. → _remove '20 & 50 & 2.5'; add '2.5 cm'_
- **low** · other · listening-2 Q17-20 (low): Map image is present (ielts-3-test-3-l2.jpg) but I could not verify that letters F, D, G, E match the building positions; the stored evidence for Q17 only restates 'reception' from the registration sentence, and the option list uses room names with letters that may differ from the letters printed on the real map. → _verify option letters against the map image_
- **script** · word-limit · listening-3/l3-g1 Q21-30: instruction says max 3 words but wordLimit is null

### ielts-3-test-4

- **medium** · missing-visual · reading-3 Q37-40 (medium): 'Look at Figures 1, 2, 3 and 4 in Reading Passage 3' - the passage has no figure images (no image anywhere in the reading section) and the figures' captions are replaced by a list of invented heading options A-I. The learner has to infer the figures only from the surrounding text, which already names what each figure shows. Stored C, D, G, F follow the text but cannot be checked against the real figure titles. → _insert Figures 1-4 into the passage and use the real caption list_
- **medium** · invented-options · listening-4 Q39,40 (medium): Q39 (acoustic double glazing) and Q40 (best layout of the houses) are plain text choices full of exact measurements ('Inner pane 8mm, outer pane 6mm, gap 5cm', 'Bedrooms at the front, garage at the back'). On the paper these are diagram/picture choices (A-C). The wordings look author-made, e.g. Q39 option D is built to match the audio line exactly, so the stored letters D and C will not match the paper's picture letters. → _restore the original diagrams and re-derive the letters_
- **medium** · wrong-type · reading-2 Q16 (high): 'Choose TWO letters, A-E' (years women's suffrage laws were passed) is stored as a single multiple-choice with answers 'D / E', i.e. either D or E alone is marked correct. The paper needs both D (1918) and E (1928). Should be multiple-choice-multi with correctKeys D,E. → _convert to multiple-choice-multi D,E (two marks or one, as on the paper)_
- **low** · text-error · reading-1 Q1-13 (medium): Passage title is 'The effects of light' but the text (subtitle 'Air Pollution: Global Solutions') is about air pollution in megacities; title does not match the content. Paragraphs 7-10 are unlabelled while A-F are labelled. → _retitle the passage 'Air Pollution: Global Solutions' (or the paper's title)_
- **low** · structure · listening-3 Q24-26 (medium): Q24-26 (keep / rewrite / remove) are typed multiple-choice but are a matching task; the instruction text contains the legend 'A. KEEP UNCHANGED, B. REWRITE, C. REMOVE COMPLETELY' and the Example ('Section headings: B') pasted inline. Q36-38 of listening-4 likewise embed the Example in the instruction. → _move the example to a dedicated example row; use matching type_
- **low** · missing-variant · listening-1 Q1 (low): Q1 accepts only '4.25' for 'Weight: {{q1}} kgs'; audio says 'four and a quarter kilos'. Learners may write '4 1/4', '4¼', '4.25 kg' or 'four and a quarter'. → _add variants 4 1/4, four and a quarter, 4.25 kg_
- **low** · missing-variant · listening-2 Q12 (low): Q12 accepts '18 hours' only; 'eighteen hours' and '18' are likely learner answers (slot is 'keeps warm for {{q12}}'). → _add 18, eighteen hours, 18 hrs_
- **script** · word-limit · listening-4/l4-g1 Q31-34: instruction says 4, wordLimit.maxWords=5

### ielts-4-test-1

- **medium** · missing-visual · listening-2 Q14-20 (high): Plan-labelling task (original has a site plan with labelled positions) was stored as a note-completion group whose body is a set of invented sentences ('Woodside Road runs along the bottom', 'The ticket office is immediately to the right of the entrance'...). The sentences leak the transcript and replace the plan; type is note-completion instead of plan-map-labelling and no image. → _Add the Riverside Industrial Village plan image and use plan-map-labelling (or at least keep the original labels from the plan)._
- **medium** · missing-visual · listening-3 Q28-30 (high): Bar-chart 'Reasons for moving house' (bars 1-6, options A-H) is stored as matching-features with prompts 'Bar 2/4/6' but no chart image; the instruction says 'Label the chart below' with nothing to look at. → _Attach the bar chart image (bars numbered 1-6)._
- **medium** · structure · reading-1 Q9-13 (medium): Instruction says responses A-P but only 11 options (A-K) are stored; the original box lists A-P, so options L-P are missing (e.g. items about acid rain/pollution mentioned in the passage). → _Add the missing options L-P to the response list._
- **medium** · wrong-answer · reading-1 Q4 (low): Stored TRUE. Passage says the framework makes the ideas 'more robust but also accessible to modification'; statement says it is EASIER to change them. I recall the Cambridge key as FALSE (robust = harder to change) but am not certain. → _Check against the book key; likely FALSE._
- **medium** · invented-options · reading-3 Q30-32 (high): Original asks to match wheel DIAGRAMS to movement types; stored prompts are invented text descriptions ('Wheel diagram with spokes extending beyond the perimeter', 'dashed spokes', 'curved spokes') which give the answer away; no images. Options A-E include two unused items (jerky, wobbling) which is consistent with the paper. → _Attach the three wheel drawings and use image-based prompts._
- **script** · checkTest:warning · reading-2 reading: passage_length: The passage has 659 words; 700-1000 is typical.
- **script** · visual? · listening-2/l2-g2 Q14-20: mentions a picture/map/diagram but has no image: "Label the plan below. Write NO MORE THAN TWO WORDS for each answer." / ""
- **script** · visual? · listening-3/l3-g4 Q28-30: mentions a picture/map/diagram but has no image: "Label the chart below. Choose the correct letter, A-H, next to Questions 28-30." / "Bar 2"
- **script** · visual? · reading-3/r3-g4 Q30-32: mentions a picture/map/diagram but has no image: "Match each diagram to the type of movement, A-E, generally assigned to it in the" / "Wheel diagram with spokes extending beyond the perimeter"

### ielts-4-test-2

- **medium** · instruction-mismatch · reading-3 Q27-32 (medium): Q27 and Q30 both have answer H, but the instruction ('Write the correct letter, A-I') does not say letters may be used more than once (paper normally has an NB line). A learner may assume each paragraph is used once and reject H for one of them. → _Add 'NB You may use any letter more than once' or recheck whether Q27 should be G/H._
- **medium** · missing-visual · reading-2 Q24-26 (medium): The original is a bar chart ('Reasons patients visit alternative therapists') whose vertical axis is to be completed; it is stored as a one-column table of complaint names with blanks and no bars/percentages. Learner must infer bar order from the passage percentages (18,12,11,7,7,6,5,4), which the paper allows via bar lengths. → _Add the chart image or reproduce the percentage bars._
- **low** · structure · listening-1 Q6-8 (low): Matching prompts are odd half-sentences ('Tourist attractions open all day: ___ and Gardens', 'NOT open on Mondays: ___ and Castle', 'free entry: ___ and Markets') mapped to a single A-E letter, probably a flattened table/grid from the paper. Q6 Cathedral is 'open morning and afternoon' (not explicitly all day) so the answer depends on the missing layout. → _Check against paper layout; restore the original table/grid._
- **low** · wrong-answer · reading-1 Q13 (low): Stored YES for 'The loss of linguistic diversity is inevitable'. Passage says many languages will disappear but a growing interest in cultural identity 'may prevent the direst predictions'; I am not sure the Cambridge key is YES (could be NOT GIVEN/NO). → _Verify against the book key._
- **script** · checkTest:warning · reading-2 reading: passage_length: The passage has 699 words; 700-1000 is typical.
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 1001 words; 700-1000 is typical.
- **script** · visual? · listening-1/l1-g4 Q4-4: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "Henry gave Peter a map of"

### ielts-4-test-3

- **medium** · missing-variant · listening-4 Q35 (high): Only accepted answer is 'traffic & parking'; the natural answer 'traffic and parking' (also 'traffic' / 'parking problems') is not listed, unless the checker normalises & to and. → _add 'traffic and parking', 'traffic', 'parking'_
- **low** · missing-variant · listening-1 Q1 (medium): Answers '1.5 years / 18 months' only; 'a year and a half', 'one and a half years', '18 months' variants with words are missing (transcript: 'A year in Adelaide and 6 months in Sydney'). → _add 'a year and a half', 'one and a half years', '1 1/2 years', '1.5 years'_
- **low** · missing-variant · listening-2 Q18,20 (low): Q18 accepted: the whole family / all the family / families (not 'family'); Q19 variants allow 'outdoors' which is not the stated place; Q20 'children' accepted. Minor. → _add 'family', 'whole family'_
- **script** · word-limit · listening-1/l1-g1 Q1-4: instruction number=false, allowNumber=true

### ielts-4-test-4

- **medium** · missing-example · reading-3 Q28-31 (high): Instruction says 'Section B has been done for you as an example' but the group has no example row/answer, so the learner cannot see which heading is already used (likely vii 'The end of an illusion' for section B) and may pick it for another section. → _Add an example line 'Section B: vii' (verify against the paper) and remove vii from candidates or mark it used._
- **medium** · structure · listening-3 Q27-30 (medium): Q30 asks about 'Experiment 5' but the table of experiments in Q21-26 only has rows for experiments 1-4 (experiment 5, the home-made record player, is never shown). Meanwhile the speakers clearly give a problem for Experiment 4 (lines 44-49: 'a bit elementary... babyish' = F too easy) and option F is otherwise unused. I suspect the paper's Q30 is Experiment 4 (F) or the table has a 5th row; as stored the learner has no way to know what experiment 5 is. → _Check the paper; either make Q30 'Experiment 4' => F or add the experiment 5 row to the table._
- **low** · wrong-type · reading-3 Q32-35 (medium): Classification task (A: 1945-50, B: 1950-80, C: after 1980) is stored as matching-information; it is a matching-features/classification style task. Answers B,B,A,B never use C which is unusual - worth re-checking Q33 (rise in health costs, 3.8% in 1960 to 7% in 1980; passage places the 'doomsday scenario' in the 1980s). → _Check key for Q33 (B vs C) and type._
- **low** · missing-variant · reading-2 Q25-26 (medium): Q25 'humanistic study' and Q26 'historical discipline' are interchangeable ('both a ___ and a ___'); if the checker is per-slot a learner entering them in the reverse order is marked wrong for both. → _accept either answer in either slot_
- **low** · missing-variant · listening-4 Q34 (low): Q34 only 'sense of smell'; 'smell' alone (sentence 'locate food by using their ___') is the obvious short answer. → _add 'smell'_
- **script** · visual? · reading-2/r2-g1 Q14-19: mentions a picture/map/diagram but has no image: "Do the following statements agree with the claims of the writer in Reading Passa" / "Archaeology involves creativity as well as careful investigative work."

### ielts-5-test-1

- **medium** · missing-variant · listening-1 Q3 (high): Only 'April 18th' is accepted. Transcript says 'April the 18th'; learners will naturally write '18 April', '18th April', 'April 18', 'April the 18th' (the paper's key is a date in any normal format). → _accept 18 April / 18th April / April 18 / April 18th / April the 18th / 18th of April_
- **low** · missing-variant · listening-1 Q4 (medium): Only 'Pallisades' (spelling in the transcript/paper) is accepted; the correct English spelling 'Palisades' is not listed. → _add 'Palisades'_
- **low** · wrong-answer · reading-1 Q1-3 (low): Stored D,E,G. E (deadline) and G (shades of meaning) are well supported. D 'focused mainly on language from contemporary texts' is not clearly supported: the passage says quotations were drawn 'from the Elizabethans to his own time'. Evidence for Q1 quotes that sentence, which actually argues against 'mainly contemporary'. The option wording or key may differ from the paper. → _Check option D wording / key against the book (nothing else in the list fits better except possibly a differently worded option)._

### ielts-5-test-2

- **medium** · invented-options · reading-2 Q21-23 (medium): The paper shows a labelled brain diagram (areas activated by jokes) to be completed. The stored version replaces it with invented bullet sentences ('Right prefrontal cortex lights up - area of brain linked to ___', 'Orbital prefrontal cortex is activated - involved with ___') and type note-completion; the instruction still says 'The diagram below shows...' with no diagram. → _Attach the brain diagram image and use diagram-label completion with the original labels._
- **low** · structure · listening-1 Q1-10 (medium): Body starts with '## Library Information (Example)', so the whole form is labelled 'Example'; the paper's example is a single line (minimum joining age: 18 years). Learner cannot tell which line is the example. → _Mark only 'Minimum joining age: 18 years' as the example._
- **low** · missing-variant · listening-3 Q25-26 (low): Transcript lists three skills 'cooperating, compromising, persuading'; table has two slots (learning about ___, ___ people who have different views). Only 'cooperating' (Q25) and 'persuading' (Q26) are accepted; 'compromising' fits Q25 equally by the transcript and is not accepted. Also table text has a typo 'dont make the film too' (Q30 stem). → _Accept 'compromising' for Q25 (verify key); fix 'don't'._
- **low** · structure · reading-1 Q4-8 (medium): Flow chart (boxes with arrows in the paper) is flattened to a numbered list, so the step-by-step structure shown in the original is lost; content and answers (Novalak, fillers, hexa, raw, pressure) are consistent with the passage. → _Render as a flow chart or at least arrow-separated steps._
- **script** · visual? · reading-1/r1-g2 Q4-8: mentions a picture/map/diagram but has no image: "Complete the flow-chart below. Choose ONE WORD ONLY from the passage for each an" / ""
- **script** · visual? · reading-2/r2-g2 Q21-23: mentions a picture/map/diagram but has no image: "The diagram below shows the areas of the brain activated by jokes. Complete the " / ""

### ielts-5-test-3

- **medium** · structure · reading-2 Q24-26 (high): Instruction says 'Complete the summary of paragraphs E and F with the list of words below' but the group has no word list/options stored, and it is typed as plain-text summary-completion with wordLimit 3. Learner has no list to choose from; answers (pollutants, artificial floods, desalination) are also not marked as list items. → _Add the word list from the paper (or change instruction to 'Choose NO MORE THAN TWO WORDS from the passage')._
- **medium** · structure · reading-2 Q14-17 (medium): Instruction says 'six paragraphs, A-F. Choose the correct heading for each paragraph' but only B, D, E, F are asked. Paragraphs A and C are presumably examples in the paper (headings vii 'Egypt's disappearing coastline' and vi 'Less valuable sediment than before' fit A and C) but no example rows are stored, so learners may try vi/vii for the asked paragraphs; distractors ii and iii are fine. → _Add examples 'Paragraph A: vii' and 'Paragraph C: vi' (verify) and reword the instruction to 'paragraphs B and D-F'._

### ielts-5-test-4

- **medium** · missing-variant · listening-1 Q2 (high): Time-range answer accepted only as '9-9.30' / '9-9:30'. Natural correct entries such as '9 to 9.30', '9.00-9.30', '9am-9.30am', 'between 9 and 9.30', '9 - 9.30 a.m.' are not listed (transcript: 'between 9 and, let me see, half past'). → _add '9 to 9.30', '9.00-9.30', '9 to half past', '9 and 9.30', '9am-9.30am', '9:00-9:30'_
- **low** · missing-variant · listening-1 Q5 (medium): Q5 accepts 'North-West' / 'northwest' only; 'north west', 'north-west' (lowercase variants may be normalised) and 'the north west' are not listed, though the form text says 'in the ___'. → _add 'north west', 'north-west', 'the northwest'_
- **low** · other · reading-2 Q18-23 (low): Summary-completion word bank is embedded as a plain 'Word bank:' line of 16 words in the body rather than as an options list; answers are free-typed words (e.g. 'sharp', 'unexpectedly'), so a learner can type a word not in the box. Contents and answers are consistent with the passage. → _Store the word box as options with letter keys (A-P) like other word-box groups, or keep and accept as is._
- **script** · word-limit · listening-1/l1-g1 Q1-10: instruction number=false, allowNumber=true

### ielts-6-test-1

- **medium** · missing-variant · listening-1 Q1 (medium): Stored answers are 'keep-fit' / 'keep-fit studio' / 'a keep-fit studio' but the transcript (line 8) says 'keep fit studio' with no hyphen; the plain 'keep fit' (the usual Cambridge key) is not listed, so a learner typing exactly what is heard may be marked wrong (mechanical 'answer-not-in-evidence' is this hyphen mismatch). → _add variants 'keep fit', 'keep fit studio', 'a keep fit studio'_
- **medium** · instruction-mismatch · listening-2 Q17-20 (high): Instruction says NO MORE THAN TWO WORDS AND/OR A NUMBER but Q19 answer 'Monday and Thursday' is 3 words (and Q17 '19th'/Q18 '7'/Q20 '18' are numbers); wordLimit.maxWords=3 and allowNumber=false in data. Original paper wording is almost certainly 'NO MORE THAN THREE WORDS AND/OR A NUMBER'. Confirms the mechanical word-limit flag. → _set instruction to THREE WORDS AND/OR A NUMBER, maxWords 3, allowNumber true_
- **low** · missing-example · reading-3 Q27-32 (medium): Seven paragraphs A-G but only B-G are asked; the paper gives Paragraph A as the worked example (heading viii 'Alarm caused by unprecedented events in the Arctic', which matches paragraph A) and the example is not shown. Heading list otherwise fine (ix headings, 6 used + example, 2 distractors). → _add example row 'Paragraph A -> viii' to the group_
- **low** · instruction-mismatch · listening-1 Q5-8 (low): Instruction says NO MORE THAN TWO NUMBERS but data wordLimit max=3; Q7 ('10 to 4.30') is the only 2-number answer. Q7 variants omit forms like '10am-4.30pm' / '10.00 to 4.30'. → _align wordLimit with instruction; add Q7 variants '10am - 4.30pm', '10.00 to 4.30', '10 to 4:30'_
- **low** · missing-variant · listening-3 Q26-27 (medium): Q26 laptops / Q27 printers (and reading-3 Q34 sea mammals / Q35 fish) are interchangeable pairs in the original; if the checker is order-strict a learner who gives them in the other order is marked wrong. → _accept either order for these paired slots (or add each other's answer as a variant)_
- **script** · word-limit · listening-2/l2-g2 Q17-20: instruction says 2, wordLimit.maxWords=3
- **script** · word-limit · listening-2/l2-g2 Q17-20: instruction number=true, allowNumber=false

### ielts-6-test-2

- **medium** · structure · reading-2 Q14-22 (high): Word bank is incomplete: instruction says 'A-Q' (17 words) but only 12 options are stored (A,B,D,F,G,H,I,J,K,M,N,Q); letters C, E, L, O, P are missing, so the lettering has gaps and the learner has far fewer distractors than the paper. All nine stored answers (B,I,F,M,J,N,K,G,A) are consistent with the passage. → _restore the full A-Q word list from the paper (with the missing 5 words)_
- **medium** · wrong-type · reading-2 Q14-22 (medium): This is a summary-completion with a word bank, but it is stored as matching-features with the group body empty and the summary broken into nine prompts ending '___'. The learner never sees the summary as one continuous text with numbered gaps as in the paper; title 'Word bank' hides the summary. → _convert to summary-completion with the word list as options and the summary in the body with {{q14}}..{{q22}}_
- **low** · missing-variant · listening-2 Q13 (medium): Speaker says 'every half hour'. Stored variants are 'half hour' and '30 minutes'; 'half an hour', 'half-hour', '30 mins' are not listed (original key allows 'half an hour'). → _add 'half an hour', 'half-hour', '30 mins', '30 minutes'_

### ielts-6-test-3

- **medium** · wrong-answer · listening-4 Q36 (high): Sentence is '{{q36}} and sand were necessary for grinding and polishing'. Stored variants 'water / sand' wrongly accept 'sand' (already printed in the sentence); the only correct answer is 'water'. → _remove 'sand' as an accepted answer for Q36_
- **low** · missing-variant · listening-1 Q4 (medium): Speaker says 'just two weeks actually'; only '2 weeks' is stored. Spelled-out 'two weeks' (equally valid under 'ONE WORD AND/OR A NUMBER') is not accepted. Same for Q2 (DOB 'The 27th of the 1st, 1973'): '27 January 1973' / '27th January 1973' / '1.27.1973' style variants are not listed. → _add 'two weeks' to Q4; add '27 January 1973' and '27th January 1973' to Q2_
- **low** · missing-example · reading-2 Q14-18 (medium): Passage contains six Key Points (ONE-SIX) but only Two-Six are asked; Key Point One is the paper's worked example (matching 'viii Ensure employees are suited to their jobs') and is not shown in the group. → _add example 'Key Point One -> viii'_
- **low** · missing-variant · listening-3 Q27 (medium): Transcript answer is 'live music' (Lucy line 29); primary stored answer is 'concerts' (mechanical flag: not in evidence). 'Concerts' is Jack's word (line 28) but the intended key is 'live music'; keep both but make sure 'live music' is the main answer. → _make 'live music' primary, keep 'concerts' as variant_
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 691 words; 700-1000 is typical.
- **script** · visual · listening-2/l2-g4 Q14-17: plan/map labelling without an image
- **script** · visual? · reading-3/r3-g3 Q38-40: mentions a picture/map/diagram but has no image: "Complete the flow chart below. Choose NO MORE THAN TWO WORDS from the passage fo" / ""

### ielts-6-test-4

- **low** · evidence-wrong · reading-2 Q14 (medium): Q14 (illiterate ___ taught by the Crusade => B 'men and women') points at evidence block 3 ('interviewed nearly 3,000 women'), which does not support it. The relevant sentence is paragraph 2 ('about 300,000 illiterate adults from all over the country ... had learnt how to read'). Answer B matches the paper's key as I remember it (medium confidence) but the evidence link is wrong. → _change evidence blockIndex to 2 ('300,000 illiterate adults')_
- **low** · missing-variant · listening-3 Q26-27 (medium): Q27 only '7 working days' is accepted although the speaker says 'within 7 working days' and 'seven working days' / '7 days' style spelled forms are common input; Q26 'overdue books/overdue ones' lacks 'overdue items'. → _add 'seven working days' for Q27 and 'overdue items' for Q26_
- **low** · missing-variant · listening-4 Q39 (medium): Speaker: 'they've even been known to attack humans'. Only 'attack humans' is stored; 'attack people' / 'attack human beings' (paper key is 'attack humans') is a likely learner variant but is borderline; also Q37 stores 'prince' / 'wealthy prince' but not 'a prince'. → _add 'attack people' and 'a prince' as variants_
- **script** · visual? · listening-4/l4-g32 Q32-32: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "Pictures of Asiatic lions can be seen on ancient coins from"

### ielts-7-test-1

- **medium** · missing-variant · listening-1 Q6 (high): Only '17 October' is stored. The speaker says 'the 17th' (month given earlier as 'the 16th of October'), and the usual written forms '17th October', 'October 17', 'October 17th', '17th Oct' are not accepted, so a correctly heard answer in a different date format would be marked wrong. → _add variants '17th October', 'October 17', 'October 17th', '17 Oct', '17th Oct'_
- **low** · missing-example · reading-2 Q14-20 (high): Instruction says 'Paragraph B has been done for you as an example' but no example row is shown (the group lists only A, C-H) and the example's heading is not given, so the learner cannot see the worked example the instruction refers to. Heading list has 11 items for 7 questions + 1 example (i-xi), which is right. → _add the example row 'Paragraph B' with its heading (most likely iii or viii) to the group_
- **low** · missing-variant · listening-1 Q10 (low): Credit card number is stored as 16 contiguous digits (3303845020456837); learners may type it grouped in fours ('3303 8450 2045 6837'), which is not listed. → _make sure the checker ignores spaces, or add the grouped form as a variant_

### ielts-7-test-2

- **medium** · missing-visual · listening-2 Q11-18 (high): Instruction is 'Label the map and complete the table' (the real paper shows a map of the river with boat stops A-D) but the group has no image (imageUrl empty) and the map was flattened into a bullet list 'Stop A: Green Banks / Stop B: __ / Stop C: Roman Landing / Stop D: __' titled 'Boat trip stops (west to east)' (the title and list are invented text; the 'west to east' wording is borrowed from the speaker). Q11/Q12 can still be answered from the audio but the map task is not reproduced. → _add the map image with stops A-D and keep Q11-12 as map labels, table as separate table group_
- **medium** · missing-variant · listening-3 Q27 (high): Speaker: 'Over two years from 1882 to 1883'. Only '1882 & 1883' is stored; the common correct forms '1882 and 1883', '1882-1883', '1882-83', '1882 to 1883' are not accepted (original key is 1882-83 / 1882-1883). → _add variants '1882 and 1883', '1882-1883', '1882-83', '1882 to 1883', '1882/1883'_
- **medium** · missing-variant · reading-2 Q26 (high): Passage: 'shifting consumers as well as farmers'. Only 'farmers & consumers' is stored (mechanical flag is the '&' vs 'and' mismatch); 'farmers and consumers' and 'consumers and farmers' (3 words, within limit) are not accepted. → _add 'farmers and consumers', 'consumers and farmers', 'consumers & farmers'_
- **medium** · text-error · reading-3 Q28 (medium): Paragraph C reads 'During Phase II, from January to February 1991' - years appear dropped. Phase I ended December 1987 and Phase III starts March 1991, so the original must be 'from January 1988 to February 1991'. As stored the date range makes no sense. → _restore 'from January 1988 to February 1991'_
- **low** · wrong-type · listening-2 Q19-20 (medium): Instruction is 'Answer the questions below' with two direct questions, but the group is typed note-completion; it should be short-answer. Q19 variants only 'every 20 minutes' - the bare '20 minutes' and 'every twenty minutes' are not accepted. → _change type to short-answer; add '20 minutes' and 'every twenty minutes' variants_
- **low** · missing-variant · listening-2 Q18 (medium): Q18 blank precedes 'cinema' (speaker: 'seven-screen cinema'). Stored '7 screen / seven-screen / seven screen' lacks '7-screen' (hyphenated numeral), the form most learners would type. → _add '7-screen', '7 screens'_
- **low** · missing-example · reading-3 Q27-30 (high): Instruction says 'Sections A and D are given as examples' but no example rows are shown; the examples' headings (A -> vi 'Request for improved transport in Makete', D -> ix 'Effects of initial MIRTP measures') are not displayed, so learners do not know vi and ix are used. → _add example rows for Section A (vi) and Section D (ix)_
- **script** · checkTest:warning · reading-1 reading: passage_length: The passage has 1024 words; 700-1000 is typical.
- **script** · checkTest:warning · reading-3 reading: passage_length: The passage has 1056 words; 700-1000 is typical.
- **script** · visual? · listening-2/l2-g1 Q11-18: mentions a picture/map/diagram but has no image: "Label the map and complete the table below. Write NO MORE THAN TWO WORDS AND/OR " / ""

### ielts-7-test-3

- **medium** · missing-variant · listening-1 Q2 (high): Speaker says 'I'm in the 3rd year'. Only 'third' is stored (mechanical flag: not in evidence). The numeral forms '3rd' (the word actually heard) and '3' / 'year 3' / 'third year' are not accepted, so a correct '3rd' would be marked wrong. → _add variants '3rd', '3', 'third year', '3rd year'_
- **medium** · missing-visual · listening-3 Q23-25 (high): Instruction is 'Complete the diagram below' (original shows a diagram of the float's operating cycle) but there is no image (imageUrl empty); the diagram was replaced by three invented bullet lines ('Float dropped into ocean and __ by satellite', 'Average distance travelled: __', 'Float records changes in salinity and __') typed as table-completion. Lines and order are paraphrased from the transcript, not the paper. Also both note groups say 'ONE WORD AND/OR A NUMBER' while wordLimit.maxWords=3. → _add the diagram image and use a diagram-completion presentation; align wordLimit with the instruction_
- **medium** · wrong-type · reading-1 Q7-13 (medium): Summary-completion with a word list is stored as matching-features: the summary is in the group body with literal '(7)'...'(13)' markers instead of {{q7}} slots and each question has an empty prompt, so the learner is shown seven blank rows instead of gaps inside the summary. → _convert to summary-completion with {{q7}}..{{q13}} slots in the body and the word list as options_
- **medium** · structure · reading-1 Q7-13 (high): Word list is incomplete: instruction says 'A-O' (15 words) but only 10 options are stored (A,B,C,D,E,F,H,M,N,O); letters G, I, J, K, L are missing so the lettering has gaps and distractors are removed. Correct answers (C,M,F,D,N,O,E) are all supported by the passage. → _restore the full A-O word list from the paper_
- **low** · missing-example · reading-2 Q14-19 (high): Instruction says 'Section G has been done for you as an example' but the example row is not shown (and its heading, probably viii 'Conflicting views of the three-wave theory...' or iii, is not stated), so the learner cannot see the worked example. → _add example row 'Section G' with its heading_
- **script** · visual? · listening-3/l3-g2 Q23-25: mentions a picture/map/diagram but has no image: "Complete the diagram below. Write ONE WORD AND/OR A NUMBER for each answer." / ""

### ielts-7-test-4

- **medium** · missing-variant · listening-1 Q3 (high): Speaker says 'About four months'. Only '4 months' is stored; the spelled-out 'four months' (the exact words heard) and bare '4'/'four' are not accepted, so a correct answer typed as heard would be marked wrong. → _add variants 'four months', 'about 4 months', 'about four months'_
- **medium** · missing-visual · listening-2 Q15-17 (high): Instruction is 'Label the plan below' (the paper shows a plan with the park features marked) but there is no image and the plan was replaced by three invented bullet lines ('East (towards the Olympic site): __', 'West: __', 'North (across the lake): __') typed as note-completion. These directions are paraphrased from the guide's commentary and give away the structure of the task; the paper's plan and its labelled positions are not reproduced (mechanical flagged 'no image'). → _add the plan image and label positions on it; keep Q15-17 as plan labels_
- **low** · missing-variant · listening-1 Q2 (medium): Passport number is read as 'JO6337' (letter O, as in the paper key). Learners may type 'J06337' (zero) or with a space ('JO 6337'); only 'JO6337' is stored. → _add 'J06337' and make the checker ignore spaces_
- **low** · wrong-type · listening-2 Q18-20 (high): Instruction says 'Complete the table below' and the body is a table, but the group is typed summary-completion; should be table-completion. → _change group type to table-completion_
- **low** · missing-example · listening-3 Q23-26 (medium): The students first reject 'historical background' ('definitely not'), which is the paper's worked example (answer C); it is not shown, so topic list starts at Geographical Location. Group is typed multiple-choice but is a matching task (four topics against shared options A-C). → _add example row 'Historical Background -> C' and type as matching-features_
- **low** · missing-variant · listening-4 Q35-36 (medium): Q35 meat / Q36 cheese are an interchangeable pair ('food such as meat and cheese'); if the checker is order-strict, giving 'cheese' then 'meat' is marked wrong. → _accept either order for Q35/Q36_
- **script** · visual? · listening-2/l2-g5 Q15-17: mentions a picture/map/diagram but has no image: "Label the plan below. Write NO MORE THAN TWO WORDS for each answer." / ""

### ielts-8-test-1

- **medium** · missing-visual · reading-1 Q9-13 (high): Original paper shows a labelled diagram of the anchor escapement (anchor/escape wheel/tooth/pendulum labels). Stored group is a note-completion with a short flattened text list ('escapement (resembling a __)', 'the __', 'the __', 'a __', 'which beats each __') and no image, so the learner cannot tell what each blank labels. Answers (anchor, escape wheel/wheel, tooth, pendulum, second) match passage para G. → _Add the diagram image (type diagram-labelling) or rewrite as a clear flow of descriptions; keep type consistent with 'Label the diagram' instruction._
- **low** · text-error · listening-3 Q29 (low): Sentence 'Sandra suggests that they share the ___ for transport' does not match line 25 ('I think the best way ... would be to hire horses instead'); nothing about sharing. Answer horses is right but the stem wording looks altered (paper wording likely 'Sandra suggests hiring ___' / similar). → _Check against paper; probably reword stem to 'Sandra recommends that they hire ___ for transport'._
- **low** · text-error · reading-1 Qall (high): Passage text has stray spaces in numbers: '5, 000 years', '2, 500 years', '1, 300 years' (para A, F, ...); also 5, 490m etc. in reading-2 para G ('5, 490m'). → _Remove the space after the comma in thousands._
- **script** · visual? · reading-1/r1-g3 Q9-13: mentions a picture/map/diagram but has no image: "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each" / ""

### ielts-8-test-2

- **medium** · missing-variant · reading-2 Q18-19 (medium): Summary-completion with a word list: 'main sources of knowledge ... are {{q18}} and {{q19}}'. Stored C (tree rings) for 18 and B (ice cores) for 19, but the two are interchangeable (passage: 'tree rings and ice cores'); the Cambridge key accepts B and C in either order. A learner who answers B for 18 and C for 19 is marked wrong. → _Accept either order for Q18/Q19 (B/C), as per the official key._
- **medium** · missing-visual · reading-1 Q6-8 (low): I recall the original Q6-8 being a labelled diagram of the float process (labels pointing to the molten glass/tin bath and the rollers), not the two bullet sentences stored here ('Molten __ is poured onto a bed of molten __ ... by __'). Stored text is plausibly a rewrite of the diagram labels; answers glass/tin/rollers do match the passage. → _Check against paper; add the diagram if it was a diagram-label task._
- **low** · wrong-type · reading-2 Q23-26 (medium): 'Classify the following events as occurring during the periods below... A, B or C' (options reused) is a matching-features task, stored as matching-information. → _type matching-features_
- **low** · wrong-type · reading-1 Q1-5 (low): Body is a Method/Advantage/Disadvantage table but group type is note-completion (instruction 'Complete the notes'); original is a table-completion task ('Complete the table'). → _type table-completion, instruction 'Complete the table below'._
- **low** · text-error · reading-3 Q36 (low): Stem reads 'What does the writer suggest about the study of smell in the atmosphere in paragraph E?' - 'in the atmosphere' looks like an insertion; paragraph E is about research on smell in general. → _Reword to 'What does the writer suggest about the study of smell in paragraph E?' if the paper has no 'in the atmosphere'._
- **script** · visual · listening-2/l2-g2 Q12-14: plan/map labelling without an image

### ielts-8-test-3

- **medium** · missing-variant · listening-1 Q3 (medium): Speaker says 'two years' (line 15) and the form asks for ONE WORD AND/OR A NUMBER. Stored variants are '2 year / 2 years' only; 'two years' (a perfectly valid transcription of what is heard) may be marked wrong, also 'two year'. → _Add 'two years' (and '2 yrs' if desired) as accepted variants._
- **medium** · missing-example · reading-3 Q27-32 (medium): Passage has seven paragraphs A-G but only six headings are tested (B-G). The original gives paragraph A as a worked example (heading v 'Limitations of life span', which is the unused heading in the list). Stored instruction has no example and heading v appears as an unexplained distractor. → _Add '(Paragraph A has been done for you as an example: v.)' to the instruction (as done in 8-test-1/8-test-2)._
- **script** · checkTest:warning · reading-2 reading: passage_length: The passage has 1007 words; 700-1000 is typical.

### ielts-8-test-4

- **medium** · missing-example · reading-1 Q1-5 (medium): Passage has six sections A-F but only B-F are tested. The paper gives Section A as a worked example (heading iv 'Research findings concerning achievements in maths'); heading iv is the unused one in the stored list and the instruction mentions no example. → _Add 'Section A has been done for you as an example: iv.' to the instruction._
- **medium** · missing-visual · reading-3 Q37-40 (high): Instruction says 'Label the diagram below' (original is a labelled funnel-extraction diagram) but the stored group is a flow-chart-completion with four invented numbered steps and no image. The steps are also listed out of question order (step 1 holds {{q38}}/{{q39}}, step 2 holds {{q37}}), so slot numbers appear as 38, 39, 37, 40. → _Add the diagram image (or rewrite to an honest description/summary task) and order slots so numbers ascend._
- **medium** · invented-options · listening-2 Q14-20 (low): Map has an image, but the option list A-H is a set of text location descriptions (e.g. 'Building on Hill Street, opposite the supermarket', 'Between Thomas Street and Days Road') that are not on the original paper, which just shows letters A-H on the map. Option H is an invented distractor. Letter-to-description mapping was inferred from the transcript, so it can disagree with the letters printed on the image. → _Show only letters A-H over the map image and verify each answer letter against the real image._
- **medium** · text-error · listening-1 Qall (high): Transcript lines 0-3 duplicate lines 5-8 (opening 'Hello, West Bay Hotel...' appears twice, the first copy before the announcer's 'Now we shall begin'), and every line has no space after full stops ('moment.There was', 'in the Evening Gazette.Um.') across all of listening-1..4 of this test. Example is shown as 'staff (example)' although the announcer says 'temporary' was written in (answer should read 'temporary staff'). → _Remove the duplicate lines, restore spacing after punctuation, show 'temporary staff' as the example._
- **low** · wrong-type · listening-3 Q27-30 (medium): Instruction is 'Complete the flowchart below' and the body is a sequence of steps, but the type is note-completion; the bank has a flow-chart-completion type (used elsewhere). → _type flow-chart-completion_
- **low** · text-error · reading-2 Q26 (high): Passage para text has 'About 30, 000 hectares of rice fields in Kerala' (stray space in number). → _30,000_
- **script** · listening · listening-1: no audio
- **script** · listening · listening-2: no audio
- **script** · listening · listening-3: no audio
- **script** · listening · listening-4: no audio
- **script** · visual? · reading-3/r3-g3 Q37-40: mentions a picture/map/diagram but has no image: "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each" / ""

### ielts-9-test-1

- **medium** · missing-example · reading-2 Q14-17 (medium): Five paragraphs A-E but only B-E are tested. The paper gives Paragraph A as the worked example (heading v 'Reasons for the search for extra-terrestrial intelligence'); stored instruction does not mention an example and heading v is simply an unused option. → _Add 'Paragraph A has been done for you as an example: v.' to the instruction._
- **medium** · missing-variant · reading-3 Q38,39 (high): Q38 accepts only 'half way'; the very common one-word spelling 'halfway' (and 'half-way') is missing. Q39 accepts only 'dry-land tortoises'; 'dry land tortoises' (hyphen dropped) and 'land tortoises' are not accepted. → _Add 'halfway','half-way' to Q38; 'dry land tortoises','land tortoises' to Q39._
- **medium** · missing-variant · listening-4 Q33 (high): Speaker says 'originate from plants or animals' (line 5). Stored variants are 'plants & animals / plants and animals' only; the heard wording 'plants or animals' and 'plants/animals', 'animals and plants' would be marked wrong. → _Add 'plants or animals','plants/animals','animals or plants'._
- **low** · wrong-type · reading-3 Q27-30 (high): Group is sentence-completion but the body is four direct questions ('What had to transfer from sea to land...?', 'Which TWO processes are mentioned...?'), i.e. a short-answer group with instruction 'Answer the questions below'. → _type short-answer_
- **low** · wrong-type · reading-3 Q34-39 (medium): Instruction 'Complete the flowchart below' with Step 1-4 body, stored as summary-completion; the bank has flow-chart-completion. → _type flow-chart-completion_
- **low** · missing-variant · listening-1 Q1 (medium): Q1 variants 'answer the phone / answering the phone / answer phone' miss 'answering phones', 'answering telephone(s)', 'phone answering', 'answering calls'. → _Add a few common variants (answering phones/calls, telephone)._
- **low** · text-error · listening-2 Q17-18 (medium): Q17/Q18 options each repeat the whole sentence ('A champion athlete will be in the shop on Saturday morning only', 'The first person to answer all 20 quiz questions correctly will win gym membership...') instead of short option text, so every option shares a long common stem; looks like a transcription artefact rather than the paper's wording. → _Trim to 'on Saturday morning only / all day Saturday / the whole weekend' and 'gym membership / a video / a calendar'._
- **script** · checkTest:warning · reading-1 reading: passage_length: The passage has 683 words; 700-1000 is typical.
- **script** · checkTest:warning · reading-2 reading: passage_length: The passage has 690 words; 700-1000 is typical.

### ielts-9-test-2

- **medium** · missing-variant · listening-1 Q2 (high): Speaker says 'March 31st, 1972.' Stored variants are only numeric (31/3/1972, 31/03/1972, 31.3.1972); typing the date as heard ('31 March 1972', '31st March 1972', 'March 31st 1972', '31 Mar 1972') would be marked wrong. → _Accept written-out forms and ordinal/month-first variants._
- **low** · missing-variant · reading-1 Q7 (medium): Q7 accepts only 'two decades'; '20 years' / 'twenty years' / '2 decades' (equivalent, within the 2-words-and/or-number limit) are missing. → _Add '20 years','twenty years','2 decades'._
- **low** · missing-variant · listening-3 Q26 (low): 'Update the {{q26}} collection' accepts only 'CD'; speaker says 'The CD section'; 'CDs' (plural) and 'CD-ROM/CD ROM' would be marked wrong. → _Add 'CDs'._
- **script** · visual · listening-2/l2-g5 Q17-20: plan/map labelling without an image

### ielts-9-test-3

- **medium** · missing-visual · reading-2 Q23-26 (medium): Instruction 'Label the diagram below' (marine turbine diagram in the paper) but the group is a text note-completion of three sentences with no image. The sentences ('Whole tower can be raised for __', 'Sea life not in danger due to ... comparatively __', 'Air bubbles result from the __ behind blades. This is known as __') look like diagram captions, so the learner cannot see which part each blank labels. Answers (maintenance, slow, low pressure, cavitation) match paras D and F. Mechanical check only flagged a possible visual. → _Attach the turbine diagram image or reword the instruction to 'Complete the notes'._
- **low** · instruction-mismatch · reading-3 Q33-37 (high): Confirms the mechanical word-limit finding: answers 'Jupiter and Saturn' (Q33) and 'sensors and circuits' (Q35) are three words, so the printed instruction 'NO MORE THAN TWO WORDS' is the wrong part (paper says THREE WORDS); wordLimit 3 is right. → _Change instruction text to NO MORE THAN THREE WORDS._
- **low** · instruction-mismatch · listening-2 Q19-20 (medium): Instruction 'ONE WORD AND/OR NUMBERS' but wordLimit max 3; table title is the column headings ('Feature, Size, Biggest challenge, Target age group') instead of a real title; Q20 answer '5 to 12' is 3 tokens vs the instruction. Original likely 'ONE WORD AND/OR A NUMBER' with answer 5-12. → _Align instruction and wordLimit (accept 5-12 / 5 to 12 / 5 - 12), give the table a proper title._
- **low** · missing-variant · listening-4 Q40 (medium): 'within {{q40}}': answer '15 years' only; 'fifteen years' and 'fifteen' are not accepted although 'ONE WORD AND/OR A NUMBER' is the limit. → _Add 'fifteen years'._
- **script** · checkTest:warning · reading-1 reading: passage_length: The passage has 611 words; 700-1000 is typical.
- **script** · visual? · reading-2/r2-g3 Q23-26: mentions a picture/map/diagram but has no image: "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each" / ""
- **script** · word-limit · reading-3/r3-g2 Q33-37: instruction says 2, wordLimit.maxWords=3

### ielts-9-test-4

- **medium** · missing-variant · listening-3 Q26 (high): Q26 'How did the students do their practical sessions?' accepts 'groups / in groups / in small groups' but not 'small groups', the most natural answer (transcript: 'We did these in small groups'). → _Add 'small groups'._
- **medium** · missing-visual · writing-1 Q1 (medium): Task 1 visual is a regenerated line chart (kind 'line', 6 series with integer values per 5-year step, invented title 'U.S. Energy Consumption by Fuel (1980-2030)') rather than the original paper graph image used in the other 7 tests of this batch. Values are eyeballed approximations (e.g. coal 16 to 31, gas flat 25), so the data candidates will differ slightly from the real 2008-report graph; the paper has no such title. → _Replace with the original graph image (or at least verify the plotted values and drop the invented chart title)._
- **low** · missing-variant · listening-3 Q27,30 (medium): Q27 accepts 'every 2 days / every second day / every 2nd day' but not 'every two days' or 'every other day'; Q30 accepts only 'education system' ('educational system', 'the education system' not accepted). Mechanical check flagged Q27's evidence only. → _Add 'every two days','every other day','educational system','the education system'._
- **low** · wrong-type · listening-1 Q1-4,7-10 (medium): Instruction says 'Complete the table below' and the bodies are tables, but both groups are note-completion (Q1-4 and Q7-10); table-completion type exists. → _type table-completion_
- **low** · wrong-type · listening-4 Q37-40 (medium): Q37-40 'Complete the table below' stored as note-completion. → _type table-completion_
- **script** · visual? · listening-2/l2-g2 Q14-18: mentions a picture/map/diagram but has no image: "Where can each of the following items be found? Choose the correct letter, A-G, " / "pillows"

### ielts-10-test-1

- **low** · missing-variant · reading-1 Q10 (medium): Stored only '4 sides'; the Cambridge key for Surya Kund steps is 'four sides' (passage text says 'four sides of steps'). A learner typing 'four sides' would be marked wrong. → _add accepted variants 'four sides' (and '4 sides')_
- **low** · missing-example · reading-2 Q14-21 (medium): Matching-headings group has no worked example; the original paper gives Paragraph F as the example (heading 'The need to achieve transport rebalance', which is why that heading is not an answer). Headings are lettered A-K instead of i-xi (cosmetic). → _add example 'Paragraph F - The need to achieve transport rebalance' to the group_
- **low** · evidence-wrong · listening-3 Q28 (high): Evidence blockIndex 35 does not contain 'material'; the cue 'is it the materials?' is in line 34 (Professor). Answer 'material(s)' is correct. → _point evidence to line 34_

### ielts-10-test-2

- **low** · missing-variant · listening-1 Q3 (medium): Postcode stored only as 'GT82LC'; a learner writing 'GT8 2LC' (the normal postcode format, and how it is usually spelled out) would be marked wrong unless the checker strips spaces. → _add variant 'GT8 2LC'_
- **low** · missing-variant · listening-4 Q40 (low): Only 'self-employed' accepted; 'self employed' (no hyphen) is a common spelling. → _add variant 'self employed'_
- **low** · missing-variant · reading-2 Q23-24 (low): Q23 stored only 'books and activities' (passage: 'number of books and activities'); Q24 accepts 'self-regulation' which is not the passage phrase for this gap (key 'internal regulation'). Answer sets otherwise match the Cambridge key as I remember it. → _consider accepting 'books' for Q23; consider dropping 'self-regulation' for Q24 (low confidence)_

### ielts-10-test-3

- **low** · missing-example · reading-1 Q1-4 (medium): Headings task covers only paragraphs B-E; paragraph A ('Travel has existed since the beginning of time...') is the worked example in the original (heading 'The history of travel') but the group has no example shown, so heading H looks like an unused distractor. → _add example 'Paragraph A - The history of travel' to the group_
- **low** · wrong-answer · reading-1 Q11 (medium): Accepted variant 'industry' is not supported by the passage ('tourism is the major source of income in ... Greece'); key is 'source of income'. → _remove 'industry' variant; optionally accept 'major source of income'_
- **low** · missing-variant · listening-1 Q1 (low): Age stored only as '4'; the speaker says 'four' and a learner may type the word (form allows a word or a number). → _add variant 'four'_
- **script** · word-limit · reading-1/r1-g3 Q11-13: instruction number=false, allowNumber=true

### ielts-10-test-4

- **medium** · missing-variant · listening-1 Q5 (high): Stored only 'postbox' but the transcript (line 26) says 'post box' (two words); a learner who writes what they hear ('post box') is marked wrong. Cambridge key is 'postbox'. Mechanical check flagged the spelling mismatch. → _accept 'post box' (and 'post-box')_
- **medium** · wrong-type · reading-3 Q32-36 (high): Instruction is 'Complete each sentence with the correct ending, A-G' (stems 'For a long time biologists rejected...'), i.e. matching-sentence-endings, but the group is typed matching-features (Test 1 reading-3 uses matching-sentence-endings for the same task). → _change type to matching-sentence-endings_
- **low** · missing-variant · reading-1 Q2 (low): Stored only '10 times' while the group word limit is 'ONE WORD AND/OR A NUMBER' (so '10 times' is two words) and 'ten times' is not accepted. → _add 'ten times'; consider changing instruction limit to NO MORE THAN TWO WORDS AND/OR A NUMBER or accept '10'_

### ielts-11-test-1

- **medium** · missing-visual · reading-2 Q20-26 (high): Original is 'Label the diagram below' (a picture of the Falkirk Wheel with callout labels). The stored group is a bullet list of sentences with gaps and no image (mechanical check confirms no image). Answers (gates, clamp, axle, cogs, aqueduct, wall, locks) match the key. → _attach the diagram image and keep gaps as labels on it, or at least add the image_
- **low** · evidence-wrong · listening-1 Q4, 9, 10 (high): Evidence blockIndex points at the reply line (15, 36, 38) which does not contain the answer word; the cue is in the preceding speaker line (14 'what about parking?', 35 'Sweep the floors', 37 'decorations'). Answers parking/floor/decoration are correct. → _point evidence to lines 14, 35, 37 (or quote both lines)_
- **low** · missing-variant · reading-1 Q4 (low): Only 'fossil fuel' accepted; plural 'fossil fuels' is a natural answer. → _add 'fossil fuels'_
- **script** · visual? · reading-2/r2-g2 Q20-26: mentions a picture/map/diagram but has no image: "Label the diagram below. Choose ONE WORD from the passage for each answer." / ""

### ielts-11-test-2

- **medium** · wrong-type · reading-2 Q14-20 (high): Task is 'Choose the correct heading for each paragraph from the list of headings' (a matching-headings task, with a 9-item headings list) but the group is typed matching-information with options 'Paragraph A..' style keys. Answers B,I,H,A,D,G,F (ii,ix,viii,i,iv,vii,vi) match the Cambridge key. → _change type to matching-headings (headings list as options, answers keep their letters)_
- **medium** · missing-visual · reading-1 Q9-13 (high): Instruction says 'Label the diagram below' (the lifting-operation diagram of the Mary Rose) but there is no image; the diagram labels were flattened into a bullet list with gaps. Answers (lifting frame, hydraulic jacks, stabbing guides, lifting cradle, air bags) are consistent with the key. → _attach the diagram image or reword as notes completion_
- **low** · missing-variant · listening-1 Q3, 10 (low): Postcode stored only as 'PE97QT' (no 'PE9 7QT') and the mobile number only as '07788136711' (no spaced version, e.g. '07788 136711'); both are written with spaces by many learners unless the checker normalises whitespace. → _add spaced variants or confirm whitespace normalisation_
- **low** · other · listening-3 Q25-26 (high): Mechanical 'visual?' flag is a false positive: Q25/Q26 are ordinary multiple-choice questions that merely contain the word 'map'; no picture exists in the original. → _none_
- **script** · visual? · listening-3/l3-q25 Q25-25: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "What mistake did Helen make when first drawing the map?"
- **script** · visual? · listening-3/l3-q26 Q26-26: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "What do they decide to do next with their map?"
- **script** · visual? · reading-1/r1-g3 Q9-13: mentions a picture/map/diagram but has no image: "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each" / ""

### ielts-11-test-3

- **medium** · wrong-type · reading-2 Q19-22 (high): Task is 'Complete each sentence with the correct ending, A-G' (sentence stems + a lettered endings list), but the group is typed summary-completion and the instruction is a merged hybrid ('Complete each sentence with the correct ending, A-G, below. Choose the correct letter, A-G, next to Questions 19-22'). Keys G,C,A,E match the Cambridge key. → _change type to matching-sentence-endings and clean up instruction_
- **low** · evidence-wrong · listening-1 Q10 (high): Evidence blockIndex 24 does not contain 'river' (mechanical flag); the word 'river' is in Sue's question on line 23 ('is it possible for children to swim in the river?'). Answer 'river' is correct. → _point evidence to line 23_
- **low** · other · listening-3 Q21-26 (high): Mechanical 'visual?' flag is a false positive: the original table (Subject of drawing / Change to be made) has no image; the stored table is text-only and complete. Answers cave, tiger, dancing, crying, grass, scarf match the key. → _none_
- **script** · visual? · listening-3/l3-g1 Q21-26: mentions a picture/map/diagram but has no image: "Complete the table below. Write ONE WORD ONLY for each answer." / ""
- **script** · word-limit · reading-2/r2-g3 Q23-26: instruction says max 1 words but wordLimit is null

### ielts-11-test-4

- **medium** · wrong-type · reading-2 Q24-26 (high): Task is 'Complete each sentence with the correct ending, A-E' (sentence stems with an endings list) but typed summary-completion with a hybrid instruction ('...Choose the correct letter, A-E, next to Questions 24-26'). Keys C,A,E match the Cambridge key. → _change type to matching-sentence-endings_
- **low** · other · listening-3 Q21-22 (low): Evidence for Q21 (recordings) is in line 4 but the stored key B,D relies on two separate lines (recordings line 4, tours line 2); evidence mapping is reversed between Q21 and Q22 (Q21 shows the recordings line, Q22 the tours line) which is harmless because correctKeys is a set. → _none needed_

### ielts-12-test-1

- **low** · wrong-type · reading-2 Q14-21 (medium): Instruction says 'Complete the sentences below' and the body is a list of stand-alone sentences, but the group type is note-completion; the app has a sentence-completion type. → _change type to sentence-completion_
- **low** · missing-variant · reading-2 Q17,18,19 (medium): Extra accepted variants look too lenient / semantically wrong: Q17 'meetings' (sentence needs 'contact'), Q18 'desire' (sentence is 'life-long hunt'), Q19 'empty' (passage 'empty' describes the feeling after finding the item, not the life; key is 'aimless'). 'desire'/'empty' would mark wrong answers correct. → _Q17 contact; Q18 hunt; Q19 aimless (drop the extra variants)_
- **low** · evidence-wrong · listening-1 Q4 (high): Evidence points at transcript line 21 but the word 'lunch' is in the preceding visitor line 20 ('can we get lunch there?'). Answer 'lunch' itself is right (matches Cambridge key). → _set evidence blockIndex to 20 (or include both lines)_

### ielts-12-test-2

- **low** · instruction-mismatch · listening-1 Q1-10 (medium): Instruction is 'ONE WORD AND/OR A NUMBER' but wordLimit is stored as 'max 2 +number' (test 12-1 uses max 1 +number). Answers are all single words/number so no learner is marked wrong, but the limit metadata disagrees with the instruction. → _wordLimit max 1 +number_

### ielts-12-test-3

- **low** · wrong-type · listening-2 Q18-20 (medium): Instruction says 'Complete the table below' and the body is a 3-column Markdown table (Location / Main focus / Other comments), but the group type is note-completion; the app has table-completion. All three answers (stress, weight, families) match the audio. → _change type to table-completion_
- **low** · structure · reading-1 Q1-7 (medium): Headings are stored and shown as options lettered A-H, while the passage paragraphs are also labelled A-G (e.g. 'Paragraph A' => heading E). The paper uses roman numerals i-viii for headings; the lettered list is easily confused with the paragraph letters (12-1 and 12-2 use i-viii). → _label the headings i-viii as in the paper_
- **low** · evidence-wrong · listening-1 Q10 (high): Evidence points at line 31 ('Yes, and it's free in the evening and at weekends.') but 'parking' is only in the preceding line 30 ('Is there parking available?'). Answer 'parking' is correct. → _evidence blockIndex 30_
- **script** · visual? · listening-2/l2-q15 Q15-15: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "How does BC Travel plan to expand the painting holidays?"

### ielts-12-test-4

- **medium** · invented-options · listening-2 Q15-20 (high): plan-map-labelling has the map image but the A-I options are stored as invented sentence descriptions ('On Hill Road, east of the Bank, where the road is still mostly straight', 'On the bend of Hill Road as it curves north-east...', etc.). The paper shows the map with the locations marked A-I and the learner picks the letter only; here the text options replace/duplicate the visual, turn it into a reading task, and may not match the real map positions. → _options should be bare letters A-I tied to the map labels (or at most 'A'..'I'); verify keys H,C,F,G,I,B against the map image_
- **medium** · wrong-type · reading-3 Q27-33 (high): Instruction says 'Choose the correct heading for each paragraph from the list of headings... Choose the correct number, i-viii' and a List of Headings is given, but the group type is matching-information (options are letters A-H mapped onto i-viii). Should be matching-headings like 12-1/12-2/12-3. Keys iv,ii,vi,viii,vii,i,iii match the Cambridge key. → _change type to matching-headings (options i-viii)_
- **low** · wrong-type · listening-3 Q21-24 (medium): Instruction 'Complete the table below' and body is a 2-column table but type is note-completion; table-completion exists in the app. → _change type to table-completion_

### ielts-13-test-1

- **medium** · invented-options · listening-2 Q14-20 (high): plan-map-labelling has the map image but options A-I are invented location descriptions ('High Street junction with School Road, by the Chemist', 'School Road, just south of the High Street junction', 'Supermarket on School Road', ...). The paper labels positions A-I on the map and the learner picks letters. The descriptions are not in the original and the Q20 answer option literally repeats the audio ('supermarket on School Road'). Several are inconsistent with the audio (Q15 crossing is 'on the High Street in front of the supermarket' but key D is 'junction with School Road, by the Chemist'; Q14 lights 'at the School Road junction' mapped to 'School Road, just south of the junction'). → _use bare letters A-I on the map image; re-verify keys E,D,B,G,C,H,I against the map_
- **medium** · wrong-type · listening-3 Q26-30 (high): Instruction is 'Complete the flowchart below' but the group is type matching-features with empty body; the flowchart shape is lost (5 detached sentences labelled 'Select seeds of different ___ and sizes.' etc). The app has flow-chart-completion (used in 12-2/12-3) which stores the flow with {{qN}} slots and an options list. → _change to flow-chart-completion with a body of boxes and slots_
- **medium** · wrong-type · reading-2 Q14-19 (high): Instruction asks to choose the correct heading from a List of Headings (i-viii) but the type is matching-features; should be matching-headings. Keys iv,vi,i,v,viii,iii match the Cambridge key. → _change type to matching-headings_
- **medium** · wrong-type · reading-3 Q32-37 (high): Instruction 'Complete each sentence with the correct ending, A-G below' but type is matching-features and the options box is titled 'List of Ideas'; should be matching-sentence-endings (the app has this type, used in 12-3). Keys D,A,E,C,G,B are right. → _change type to matching-sentence-endings; title 'List of Endings' or none_
- **low** · wrong-type · reading-1 Q1-7 (medium): Instruction 'Complete the table below' and body is a Markdown table, type is note-completion (table-completion exists). Same for listening-1 Q1-10 ('Complete the table below', 3-column table) and reading-2 Q24-26 ('Complete the summary below' typed note-completion instead of summary-completion). → _table-completion / summary-completion types_
- **script** · visual? · listening-3/l3-g26 Q26-30: mentions a picture/map/diagram but has no image: "Complete the flowchart below. Choose the correct letter, A-H, next to Questions " / "Select seeds of different ___ and sizes."

### ielts-13-test-2

- **medium** · wrong-type · reading-3 Q38-40 (high): Three sentence-ending items ('Complete each sentence with the correct ending, A-D below') are stored as three separate single-question multiple-choice groups, each repeating the same 4 endings and each with the same instruction 'Complete each sentence...'. They should be one matching-sentence-endings group Q38-40 so the learner sees one shared list. Keys B,C,D match the Cambridge key. → _merge into one matching-sentence-endings group 38-40_
- **low** · evidence-wrong · listening-1 Q8 (high): Evidence is the reply 'Sometimes, but not always. But you don't really need one.' (line 30); the word 'leader' only appears in the preceding question line 29. Answer 'leader' is correct. → _evidence blockIndex 29_

### ielts-13-test-3

- **medium** · text-error · listening-4 Q35-37 (high): A note heading reads '**What people want**' before 'Possible reasons: to improve the survival of their young... to provide {{q37}} for female lizards'. The same heading appears in ielts-12-test-4 listening-4 (a lecture on noise in cities) and looks copy-pasted; here the lecture is about the sleepy lizard's monogamous mating habits, so the heading is meaningless/misleading (the paper has no such heading for this part). → _remove the heading or replace with e.g. 'Mating habits'_
- **low** · wrong-type · reading-1 Q1-8 (medium): Instruction 'Complete the table below' with a 3-column table body but type note-completion (table-completion exists). Likewise reading-2 Q18-23 and reading-3 Q32-36 are 'Complete the summary below' paragraphs typed note-completion rather than summary-completion. Answers are all correct (furniture, sugar, ropes, charcoal, bowls, hormones, cosmetics, dynamite; recording devices, fathers, bridge hypothesis, repertoire, vests, vocabulary; shells, lake, rainfall, grains, pottery). → _use table-completion / summary-completion_

### ielts-13-test-4

- **medium** · wrong-type · reading-2 Q18-21 (high): Instruction is 'Complete each sentence with the correct ending, A-F, below' but group type is matching-features with the options box titled 'Sentence endings'; this is matching-sentence-endings (type exists). Keys C,E,A,D match the Cambridge key. → _change type to matching-sentence-endings_
- **low** · wrong-type · reading-2 Q14-17 (medium): 'Complete the summary below' stored as note-completion (summary-completion exists) and wordLimit is null although the instruction says ONE WORD ONLY (mechanical check already flagged the word limit). Answers minerals, carbon, water, agriculture are right. → _summary-completion with wordLimit max 1_
- **low** · evidence-wrong · listening-3 Q27 (medium): Q27 key B ('voluntary for supermarkets') cites 'it's not been adopted universally, and not on all products' (line 25), which does not say voluntary; the supporting line is Jack's 'I'd have thought it would have been compulsory. It seems ridiculous it isn't.' (line 27). Key B,C itself is consistent with the Cambridge key (C = brought in without enough consultation, line 28). → _evidence blockIndex 27_
- **low** · wrong-type · reading-1 Q9-13 (medium): Instruction 'Complete the sentences below' and body is stand-alone sentences, but type is note-completion (sentence-completion exists, used in 12-3).. → _sentence-completion_
- **script** · word-limit · reading-2/r2-g1 Q14-17: instruction says max 1 words but wordLimit is null

### ielts-14-test-1

- **low** · missing-variant · listening-1 Q6 (medium): Date answer stored only as '10 September'; transcript says 'September the 10th'. Common accepted forms 'September 10', '10th September', '10 Sept' not listed. → _add variants 'September 10', '10th September', 'September 10th'_
- **low** · evidence-wrong · reading-1 Q8 (high): Answer 'life' is in paragraph 7 ('impact it has on the child's later life'); stored evidence points at paragraph 6 which lacks the word. → _evidence blockIndex 7, quote 'the impact it has on the child's later life'_
- **low** · wrong-type · listening-1 Q1-10 (medium): Crime Report Form is a form in the paper (title 'Crime Report Form', labelled fields) but is typed note-completion; app has a form-completion type. → _type form-completion_

### ielts-14-test-2

- **medium** · wrong-type · reading-3 Q27-34 (high): Heading-matching task (instruction says 'Choose the correct number, i-ix', title 'List of Headings') is typed matching-information and the headings are keyed A-I instead of i-ix; learner sees letters while the instruction asks for roman numerals. Answers themselves are consistent with the passage. → _type matching-headings with keys i-ix (A->i ... I->ix)_
- **medium** · invented-options · listening-2 Q16-20 (medium): Plan-labelling group has the map image but the A-H options are prose location descriptions ('By the river, north-east of the castle, beyond where the entrance path crosses', 'Just south of the south gate...') that do not exist in the paper, where A-H are just letters marked on the plan. The descriptions can also leak/contradict the image. → _options should be bare letters A-H matching the lettered image (verify the image shows letters A-H)_
- **low** · missing-variant · listening-1 Q2,6 (medium): Q2 stored only '10 October' (transcript 'October 10th, 1992'); Q6 only '3 weeks' (transcript 'it's 3 weeks since'). Variants 'October 10th/October 10/10th October' and 'three weeks' not listed. → _add variants 'October 10th','October 10','10th October'; 'three weeks'_
- **low** · instruction-mismatch · reading-2 Q19-26 (high): Instruction says ONE WORD ONLY but wordLimit is null (also flagged mechanically); also Q19 accepts 'design / designs' which is fine. → _set wordLimit max 1_
- **low** · wrong-type · reading-3 Q35-37 (medium): 'Complete the sentences below' group typed note-completion; app has sentence-completion type. → _type sentence-completion_
- **script** · visual? · listening-3/l3-q23 Q23-23: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "The students will use an animated diagram to demonstrate how the mammoths"
- **script** · word-limit · reading-2/r2-g2 Q19-26: instruction says max 1 words but wordLimit is null

### ielts-14-test-3

- **low** · missing-variant · listening-1 Q4 (medium): Answer 'wifi' only; learners commonly type 'Wi-Fi' / 'wi-fi' / 'WiFi'. Check that matching is case/hyphen tolerant. → _add variants 'Wi-Fi','wi-fi','WiFi'_
- **low** · wrong-type · reading-2 Q23-26 (high): Instruction says 'Complete the summary below' with a flowing paragraph body, but type is note-completion; should be summary-completion. → _type summary-completion_
- **low** · wrong-type · reading-3 Q37-40 (high): 'Complete the summary below' paragraph typed as note-completion; should be summary-completion. → _type summary-completion_

### ielts-14-test-4

- **script** · visual? · listening-3/l3-q23 Q23-23: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "Stephanie is interested in the Pictures module because"

### ielts-15-test-1

- **low** · wrong-type · listening-2 Q15-20 (high): Instruction 'Complete the table below' with a Markdown table body, but typed note-completion; table-completion type exists. → _type table-completion_
- **low** · wrong-type · reading-1 Q8-13 (high): 'Complete the table below' typed note-completion; should be table-completion. → _type table-completion_
- **low** · missing-variant · reading-3 Q38-40 (low): Q39 accepts 'uncontacted / isolated'; Q38 'expeditions / unique expeditions'. 'isolated' is not the passage's word (text says 'uncontacted tribes') and is harmless but Q38 should also accept 'expeditions' only (it does). No error; noted for review of accepted variants. → _none required_

### ielts-15-test-2

- **medium** · invented-options · listening-2 Q15-20 (medium): Map-labelling group has the map image but options A-I are prose location descriptions ('North-west, on the path leading from the west gate towards the river', 'West of the lily pond', ...) invented by the transcriber. The paper only shows letters A-I on the map; the descriptions replace/duplicate the visual and could contradict it. → _options should be bare letters A-I as printed on the map image_
- **low** · wrong-type · listening-1 Q1-4 (high): 'Complete the table below' typed note-completion; table-completion type exists. → _type table-completion_
- **low** · wrong-type · reading-1 Q7-13 (high): Instruction 'Complete the summary below' with paragraph body typed note-completion. → _type summary-completion_
- **low** · wrong-type · reading-2 Q18-22 (high): 'Complete the summary below' typed note-completion. → _type summary-completion_
- **low** · structure · reading-3 Q32-36 (medium): summary-completion with word list: the body Markdown already prints the A-H list as bullets and the same list is also in the options field, so the list may render twice. → _remove the bullet list from body and keep options only_

### ielts-15-test-3

- **low** · missing-variant · listening-1 Q5 (medium): Answer stored only as '1 year'; transcript says 'at least one year'. Learners will type 'one year', 'a year' or '1 years'. → _add variants 'one year','a year'_
- **low** · structure · reading-3 Q32-36 (medium): summary-completion with word list A-I: body Markdown already lists A-I as bullets and the same list is also in options, so the list may display twice. → _remove the bullet list from body_

### ielts-15-test-4

- **medium** · invented-options · listening-2 Q11-16 (medium): Map-labelling group has the map image but options A-H are invented prose location descriptions ('Hidden in the trees, next to the glass houses', 'Next to the adventure playground, by the north gate', ...). The paper shows only letters A-H on the map; the prose also gives away or contradicts the visual. → _options should be bare letters A-H as printed on the map image_
- **low** · wrong-type · reading-1 Q6-8 (high): 'Complete the table below' typed note-completion; table-completion type exists. → _type table-completion_
- **low** · structure · reading-3 Q27-31 (medium): summary-completion with word list A-I: body already lists A-I as bullets and the same list is also in options, so it may render twice. → _remove the bullet list from body_

### ielts-16-test-1

- **medium** · wrong-type · reading-2 Q14-20 (high): Group is a heading-matching task (List of Headings i-ix, 'Choose the correct heading for each paragraph') but stored as matching-information; the app has a matching-headings type. → _change type to matching-headings (answers iv, vii, ii, v, i, viii, vi match the Cambridge key)_
- **low** · text-error · listening-4 Q35 (medium): Note line 'George Washington organised a {{q35}} about Cato to motivate' is truncated; the audio says he put on a play about Cato 'to inspire his men'. → _complete the line, e.g. 'to motivate his soldiers'_
- **low** · missing-variant · listening-1 Q8 (medium): Only 'Wednesdays' stored; singular 'Wednesday' is a normal accepted answer for 'Held on __ from 10 am to 11 am'. → _add variant Wednesday_
- **low** · evidence-wrong · listening-3 Q24 (high): Q24 (option E, notes more evaluative) evidence points at line 11 ('I'll have to look at that too'); the actual statement is line 10 (Tom: 'I haven't actually evaluated anything, so I'll have to fix that'). Q22 evidence line 4 is also only weakly about E (handouts). → _Q24 evidenceBlock 10; Q22 evidence line 3 (handouts) or 6_
- **low** · invented-options · listening-2 Q15-20 (low): Map has an image but the options A-J are replaced by invented prose descriptions of rooms ('Top-left room, next to the factory, nearest the trees'); the paper just shows lettered rooms on the plan. Answers (H,C,G,B,I,A) agree with the Cambridge key as I remember it and with the transcript. → _keep letters tied to the image; verify descriptions match the plan or drop them_
- **script** · visual? · listening-3/l3-g25 Q25-30: mentions a picture/map/diagram but has no image: "Which personal meaning do the students decide to give to each of the following p" / "Falcon (Landseer)"

### ielts-16-test-2

- **medium** · wrong-type · listening-3 Q25-30 (high): Instruction says 'Complete the flowchart below' and the body is a flow of boxes with arrows, but type is note-completion; the app has flow-chart-completion. → _change type to flow-chart-completion_
- **low** · instruction-mismatch · listening-1 Q9 (medium): Answer stored as '10 days' (two words) under 'ONE WORD AND/OR A NUMBER'; the note reads 'within {{q9}}.'. Either the note should be 'within {{q9}} days' with answer 10, or accept 'ten days' too. → _restructure to '{{q9}} days' with answer 10 (variants 10 / ten) or add variant '10'/'ten days'_
- **script** · visual? · listening-3/l3-g25 Q25-30: mentions a picture/map/diagram but has no image: "Complete the flowchart below. Write ONE WORD ONLY for each answer." / ""

### ielts-16-test-3

- **low** · wrong-type · reading-1 Q6-13 (high): Instruction says 'Complete the summary below' and the body is a running paragraph, but type is note-completion; should be summary-completion (all answers check out: lightweight, bronze, levels, hull, triangular, music, grain, towboats). → _change type to summary-completion_
- **low** · wrong-type · reading-2 Q20-22 (high): 'Complete the summary below' with a paragraph body stored as note-completion. → _change type to summary-completion_
- **low** · wrong-type · reading-3 Q38-40 (high): 'Complete the sentences below' with three stand-alone sentences stored as note-completion. → _change type to sentence-completion_

### ielts-16-test-4

- **medium** · wrong-type · reading-3 Q27-32 (high): List-of-headings task ('Choose the correct heading for each section ... i-viii') stored as matching-information; should be matching-headings. Answers iii, vi, ii, i, vii, v match the key. → _change type to matching-headings_
- **low** · wrong-type · reading-1 Q11-13 (high): 'Answer the questions below' with three direct questions stored as note-completion; should be short-answer (also affects how the questions are rendered). → _change type to short-answer_
- **low** · missing-variant · listening-1 Q1 (medium): Only '28th' stored; the note reads 'week beginning {{q1}} May' so '28' is an equally valid answer. → _add variant 28_
- **low** · invented-options · listening-2 Q15-20 (low): Map has an image but options A-I are invented prose descriptions of plots ('Isolated plot near the river, west of the row of trees'); the paper shows only letters on the map. Answers (C,F,A,I,E,H) agree with the transcript. → _verify descriptions match the image or drop them_
- **script** · visual? · reading-1/r1-g1 Q1-6: mentions a picture/map/diagram but has no image: "Label the diagrams below. Choose ONE WORD ONLY from the passage for each answer." / ""

### ielts-17-test-1

- **script** · word-limit · reading-2/r2-g2 Q18-22: instruction says max 1 words but wordLimit is null

### ielts-17-test-2

- **low** · wrong-type · listening-1 Q8-10 (high): Instruction says 'Complete the table below' and the body is a Markdown table, but type is note-completion; should be table-completion. Answers quiz, tickets, poster are correct. → _change type to table-completion_
- **low** · wrong-type · reading-2 Q24-26 (high): 'Complete the sentences below' with stand-alone sentences stored as note-completion; should be sentence-completion. Answers flavour/size/salt correct. → _change type to sentence-completion_
- **low** · other · all Q1-40 (medium): All other answers (MC, matching, TFNG/YNNG, summary letters) re-checked against the transcript/passages and agree with the Cambridge 17 Test 2 key as remembered; writing prompts and visuals match the paper (police budget table + pie charts; smartphones essay).

### ielts-17-test-3

- **low** · wrong-type · reading-2 Q23-26 (high): 'Complete the sentences below' with four stand-alone sentences stored as note-completion; should be sentence-completion. Answers solid, Sumatran orangutan, carbon stocks, biodiversity correct. → _change type to sentence-completion_
- **low** · other · all Q1-40 (medium): No wrong answers found: every question was re-checked against transcript/passage and matches the Cambridge 17 Test 3 key as remembered. Writing visuals/prompts match the paper (family spending bar chart 1968/2018; professionals working abroad essay).

### ielts-17-test-4

- **low** · structure · reading-1 Q7-13 (medium): Instruction says 'Complete the table below' but the group is note-completion and the body is flattened into Aim / Method / Findings / Recommendation lines (a table layout in the paper). Answers (droppings, coffee, mosquitoes, protein, unclean, culture, houses) are right. → _restore as table-completion with Aim/Method/Findings/Recommendation rows_
- **low** · other · all Q1-40 (medium): No wrong answers found in any section; all answers agree with transcript/passages and with my memory of the Cambridge 17 Test 4 key. Writing prompts match the paper (shops closing/opening line graph; alternative medicine essay). Word-limit nulls on reading-2 Q19-22 and reading-3 Q37-40 (instruction says ONE WORD ONLY) are already in mechanical.
- **script** · word-limit · reading-2/r2-g2 Q19-22: instruction says max 1 words but wordLimit is null
- **script** · word-limit · reading-3/r3-g3 Q37-40: instruction says max 1 words but wordLimit is null

### ielts-18-test-1

- **medium** · missing-variant · listening-1 Q2 (high): Date answer stored only as '24 April'. The speaker says 'the 24th of April', so '24th April', 'April 24', 'April 24th', '24th of April' are equally correct and a learner is likely to type one of them. → _add variants: 24th April, April 24, April 24th, 24th of April_
- **low** · missing-variant · listening-1 Q1 (medium): Postcode stored only as 'DW307YZ' (no space); a learner may type 'DW30 7YZ' (standard UK format) or lowercase. → _add variant 'DW30 7YZ' (or normalise whitespace/case)_
- **low** · wrong-type · listening-1 Q1-10 (medium): The paper shows a survey form (Name / Year of birth / Postcode ...) but it is stored as note-completion; form-completion fits better. → _change type to form-completion_
- **low** · wrong-type · reading-1 Q4-7 (high): 'Complete the table below' with a Markdown table body stored as note-completion; should be table-completion. → _change type to table-completion_
- **low** · wrong-type · reading-2 Q22-26 (high): 'Complete the sentences below' with stand-alone sentences stored as note-completion; should be sentence-completion. → _change type to sentence-completion_
- **low** · other · all Q1-40 (medium): All answers re-checked and agree with the Cambridge 18 Test 1 key as remembered; writing prompts (urban population line graph; aim of science essay) match the paper.

### ielts-18-test-2

- **medium** · invented-options · listening-2 Q15-20 (high): Map has an image, but the options A-I were replaced by prose descriptions copied from the transcript wording (G 'On the road from the South Entrance, at the corner of the second turning to the left', C 'On the western side, just below the road branching off London Road', D 'Just below the lake, to the right of a row of houses', A 'In the bend of the road near the lake...'). This turns the map task into text matching and gives the answers away; the paper shows only lettered positions on the plan. Answers G,C,D,B,H,A are correct. → _show only the letters tied to the image (or neutral labels) so the learner must read the map_
- **low** · wrong-type · listening-1 Q6-10 (high): 'Complete the table below' with a Markdown table stored as note-completion; should be table-completion. → _change type to table-completion_
- **low** · wrong-type · reading-3 Q34-40 (high): 'Complete the summary below' with a running-text body stored as note-completion; should be summary-completion. → _change type to summary-completion_
- **low** · other · all Q1-40 (medium): All answers re-checked and agree with the Cambridge 18 Test 2 key as remembered; writing prompts match the paper (US household income column chart; extra subjects essay).

### ielts-18-test-3

- **medium** · text-error · listening-1 Q3 (medium): Form line reads 'Reason for joining: to enter competitions to {{q3}}', with answer 'socialise'. In the audio Dan gives two separate reasons (he enjoys entering competitions; he also likes to socialise with other photographers), so 'to enter competitions to socialise' is a garbled sentence that misleads the learner. The paper's line is of the form 'to enter competitions and to ___ with other photographers'. → _reword to 'to enter competitions and to {{q3}} with other photographers'_
- **medium** · wrong-type · reading-2 Q14-20 (high): List-of-headings task ('Choose the correct heading for each paragraph from the list of headings below') stored as matching-information, and the headings are keyed with letters A-H although the paragraphs themselves are labelled A-G (the paper uses roman numerals i-viii). Learners must answer with a letter that collides with the paragraph labels. Answers C,H,F,E,G,A,D fit the passage. → _change type to matching-headings and key the headings i-viii_
- **low** · wrong-type · listening-1 Q1-10 (high): Q1-4 'Complete the form below' and Q5-10 'Complete the table below' are both stored as note-completion; should be form-completion and table-completion. → _change types to form-completion (Q1-4) and table-completion (Q5-10)_
- **low** · wrong-type · reading-1 Q5-8 (high): 'Complete the summary below' with a running-text body stored as note-completion; should be summary-completion. → _change type to summary-completion_
- **low** · instruction-mismatch · reading-2 Q24-26 (high): Instruction says 'Choose ONE WORD AND/OR A NUMBER' but wordLimit is 'max 2 +number'; type is note-completion although the task is a summary ('Complete the summary below'). Answers speed / fifty (50) / strict are single words. → _set wordLimit to 1 +number and type to summary-completion_

### ielts-18-test-4

- **low** · missing-variant · listening-1 Q9 (medium): Time answer stored as '1.15 / 1:15'; learners may also write '1.15pm', '1:15 pm', 'quarter past one' or '13.15' (the audio says 'One fifteen'). → _add variants 1.15pm, 1:15pm, 13.15 or normalise time format_
- **low** · other · all Q1-40 (medium): Apart from the empty MC stems, all answers (including matching, YNNG and summary letters) agree with the transcript/passages and the Cambridge 18 Test 4 key as remembered; writing prompts match the paper (metal prices line graph; ageing population essay).
- **script** · word-limit · reading-1/r1-g2 Q6-9: instruction says max 1 words but wordLimit is null

### ielts-19-test-1

- **medium** · invented-options · listening-2 Q16-20 (medium): Map-labelling options A-H are stored as invented prose descriptions (e.g. 'Rectangle north-east of the house, near the small lake'); the paper shows a map with letters marked on it. Learner cannot verify against letter positions unless the image carries the letters; answers G,C,B,D,A are consistent with the transcript wording but Q17 (C 'North-east corner of the house' for 'far side of house from car park') is an interpretation. → _Ensure the map image shows letters A-H and options list is just letters (or verify descriptions against the real map)_

### ielts-19-test-2

- **low** · wrong-type · listening-1 Q1-6 (high): Instruction says 'Complete the form' but group type is note-completion (form-completion type exists in the app). → _type form-completion_
- **low** · wrong-type · listening-1 Q7-10 (high): Instruction says 'Complete the table' and body is a markdown table but type is note-completion (table-completion exists). → _type table-completion_
- **low** · wrong-type · reading-2 Q19-22 (high): Instruction 'Complete the sentences below' but type is note-completion (sentence-completion exists). → _type sentence-completion_

### ielts-19-test-3

- **low** · wrong-type · listening-3 Q26-30 (high): Instruction 'Complete the flowchart below' with slots in the body, but group type is matching-features (flow-chart-completion type exists). Answers C,H,E,B,F are correct per transcript. → _type flow-chart-completion_
- **low** · wrong-type · listening-1 Q7-10 (high): 'Complete the table below' stored as note-completion. → _type table-completion_
- **low** · wrong-type · reading-3 Q31-34 (high): 'Complete each sentence with the correct ending, A-F' stored as matching-features; should be matching-sentence-endings. Answers C,E,F,B are fine. → _type matching-sentence-endings_
- **low** · wrong-type · reading-2 Q18-22 (high): 'Complete the sentences below' stored as note-completion. → _type sentence-completion_

### ielts-19-test-4

- **low** · wrong-type · listening-1 Q7-10 (high): 'Complete the table below' stored as note-completion. → _type table-completion_
- **low** · missing-variant · listening-1 Q6 (low): Phone number stored only as 0412665903; learners may type it spaced (0412 665 903) or with 'oh'. Check the checker normalises spaces. → _add '0412 665 903' variant_

### ielts-20-test-1

- **low** · evidence-wrong · listening-3 Q24 (high): Answer C (cancer) but evidence points to line 16 whose content is about dementia (the distractor). The cancer claim and 'supported by other studies' is line 15; line 16 only opens 'You're right about that one'. → _evidence blockIndex 15, quote 'loneliness increased the risk of cancer by about 10 percent, and those findings have been supported by other studies too'_
- **low** · evidence-wrong · listening-1 Q4,5 (high): Q4 evidence is line 20 ('selection of those would be quite limited') but the answer word 'vegetarian' is on line 19; Q5 evidence is the spelling on line 24 while 'the Audley' is on line 22. Answers themselves are right (mechanical flags are evidence pointers only). → _point Q4 evidence to line 19 and Q5 to line 22_
- **script** · visual? · reading-1/r1-g1 Q1-6: mentions a picture/map/diagram but has no image: "Do the following statements agree with the information given in Reading Passage " / "There are other parrots that share the kakapo's inability to fly."

### ielts-20-test-2

- **low** · missing-variant · reading-1 Q4 (medium): Only 'seagrasses' stored; the passage's plural is used, but the singular 'seagrass' ('such as seagrass') is an equally natural learner answer for 'such as {{q4}}' (Cambridge normally accepts both). → _add variant 'seagrass'_

### ielts-20-test-3

- **medium** · invented-options · listening-2 Q17-20 (medium): Map-labelling options A-G are invented prose descriptions of locations (e.g. 'Large square inside the loop, west of the current dig'); the paper shows a site plan with letters. Answers B,A,G,E fit the spoken directions only via these descriptions, Q17 evidence ('path bends left... smaller track to the right... river') is not obviously 'Top of the path loop, on the river bank'. → _Ensure the map image carries letters A-G and options are letters only; verify Q17-20 against the real plan_
- **low** · missing-variant · listening-1 Q10 (medium): Only 'exchanges' stored for '{{q10}} are allowed within 7 days'; singular 'exchange' is a natural learner answer. → _add variant 'exchange'_
- **script** · visual? · listening-2/l2-q16 Q16-16: mentions a picture/map/diagram but has no image: "Choose the correct letter, A, B or C." / "What do the team plan to do after work ends this summer?"

### ielts-21-test-1

- **low** · structure · listening-1 Q1-6 (low): Table-completion slot order is odd: Q6 ({{q6}} certificate) sits in the first Level 1 row before Q2-Q5, whereas the audio gives dictionary (Q5) then certificate (Q6). Table rows also leave Name/What-you-learn cells blank for the second and third rows, so the layout may have been flattened from the real table. Answers themselves are correct. → _Check against the paper layout; keep Q-numbers in reading order_
- **low** · missing-visual · writing-1 Q (low): Visual description for the line graph (jobs in four sectors, US 1960-2020) has no data values unlike other tests' Writing 1 entries; confirm the actual image is present and legible. → _verify imageUrl for writing-1_

### ielts-21-test-2

- **script** · visual? · reading-2/r2-g1 Q14-18: mentions a picture/map/diagram but has no image: "Do the following statements agree with the information given in Reading Passage " / "The population of Dar es Salaam is rising more rapidly than was previously predi"

### ielts-21-test-3

- **low** · evidence-wrong · listening-3 Q26 (low): Answers themselves match transcript (answers identical to 21-2, checked there). No additional answer problems found beyond the duplication.
- **script** · visual? · reading-2/r2-g1 Q14-18: mentions a picture/map/diagram but has no image: "Do the following statements agree with the information given in Reading Passage " / "The population of Dar es Salaam is rising more rapidly than was previously predi"

### ielts-21-test-4

- **script** · visual? · reading-1/r1-g2 Q8-10: mentions a picture/map/diagram but has no image: "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS from the passage fo" / ""
