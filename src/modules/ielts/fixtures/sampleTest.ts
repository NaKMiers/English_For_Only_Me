import type {
  IeltsEvidence,
  IeltsOption,
  IeltsQuestion,
  IeltsQuestionGroup,
  IeltsSection,
  IeltsTestContent,
  IeltsWordLimit,
} from '../schema'

/*
 * An original IELTS Academic practice test, written from scratch for seeding
 * and tests. Every topic, person, place and number is invented. It passes
 * `checkTest` with no errors: evidence quotes are copied verbatim from the
 * block they point at (a script line or a passage paragraph, 0-based).
 */

const ev = (quote: string, blockIndex: number): IeltsEvidence => ({
  quote,
  blockIndex,
})

const q = (
  number: number,
  prompt: string,
  answers: string[],
  evidence: IeltsEvidence | null,
  explanation: string
): IeltsQuestion => ({ number, prompt, answers, evidence, explanation })

const opts = (...pairs: [string, string][]): IeltsOption[] =>
  pairs.map(([key, text]) => ({ key, text }))

const limit = (maxWords: number, allowNumber: boolean): IeltsWordLimit => ({
  maxWords,
  allowNumber,
})

type GroupInput = Pick<
  IeltsQuestionGroup,
  'id' | 'type' | 'from' | 'to' | 'instruction' | 'questions'
> &
  Partial<IeltsQuestionGroup>

const group = (input: GroupInput): IeltsQuestionGroup => ({
  wordLimit: null,
  title: '',
  body: '',
  options: [],
  correctKeys: [],
  imageUrl: '',
  ...input,
})

const sectionBase = {
  revision: 0,
  genStatus: 'manual',
  genStartedAt: null,
  genError: '',
} as const

const ABC = 'Choose the correct letter, A, B or C.'
const ABCD = 'Choose the correct letter, A, B, C or D.'

/* ------------------------------------------------------------------------ */
/* Listening                                                                 */
/* ------------------------------------------------------------------------ */

const listening1: IeltsSection = {
  ...sectionBase,
  key: 'listening-1',
  skill: 'listening',
  order: 1,
  title: 'Part 1: Bicycle workshop enrolment',
  listening: {
    context:
      'A man phones a community workshop to enrol on an evening bicycle maintenance course.',
    audio: null,
    lines: [
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'Good morning, Millbrook Community Workshop, Priya speaking. How can I help you?',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: 'Hello. I saw a poster about your bicycle maintenance course and wondered if there are still places left.',
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'There are a few, yes. I can enrol you now if you like. Could I start with your name?',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: "Sure, it's Daniel Ferrow. That's F-E-R-R-O-W.",
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'Thank you. And your home address, please?',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: "It's 27 Kestrel Road, here in Millbrook. Kestrel is spelled K-E-S-T-R-E-L.",
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'Lovely. The course covers most kinds of bike. What sort do you ride?',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: "I used to have a mountain bike, but these days I ride a folding bike to the station, so that's the one I'd bring.",
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: "That's fine. Now, we run the course on Tuesday, Thursday and Saturday evenings, although Saturday is already full, I'm afraid.",
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: 'I often work late on Tuesdays, so Thursday would suit me best.',
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'Thursday it is. Can I ask how you found out about us? We like to know which adverts work.',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: "I didn't see anything online, actually. There was a poster on the noticeboard at the library.",
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'Good to know. Now, the full fee is 60 pounds, but people who live in Millbrook pay 45 pounds instead.',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: "Great, so as a local I'll pay the lower amount.",
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'Exactly. A few practical things. The work gets quite oily, so please bring an apron to keep your clothes clean.',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: 'OK. Do I need to bring any tools?',
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'No, we provide all the tools. But do bring a pair of gloves, because chain grease is very hard to wash off your hands.',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: 'Right. And is there anywhere to park near the workshop?',
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'The street outside is for permit holders only, so use the free car park behind the bakery on Mill Street.',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: 'Perfect. And what time does it start?',
      },
      {
        speaker: 'Priya',
        voice: 'coral',
        text: 'The first session begins at 6.30 pm, but please arrive ten minutes early to fill in a safety form.',
      },
      {
        speaker: 'Daniel',
        voice: 'ash',
        text: 'Brilliant. Thanks very much for your help, Priya.',
      },
    ],
  },
  reading: null,
  writing: null,
  groups: [
    group({
      id: 'l1-g1',
      type: 'form-completion',
      from: 1,
      to: 6,
      instruction:
        'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
      wordLimit: limit(2, true),
      title: 'Millbrook Community Workshop',
      body: [
        '## Course enrolment form',
        '',
        '- Name: Daniel {{q1}}',
        '- Address: 27 {{q2}} Road, Millbrook',
        '- Type of bicycle: {{q3}} bike',
        '- Course day chosen: {{q4}}',
        '- Saw a poster at the: {{q5}}',
        '- Fee to pay: £{{q6}}',
      ].join('\n'),
      questions: [
        q(
          1,
          '',
          ['Ferrow'],
          ev("it's Daniel Ferrow. That's F-E-R-R-O-W.", 3),
          'Daniel gives his surname and spells it out letter by letter.'
        ),
        q(
          2,
          '',
          ['Kestrel'],
          ev("It's 27 Kestrel Road", 5),
          'He lives at 27 Kestrel Road and spells the street name.'
        ),
        q(
          3,
          '',
          ['folding'],
          ev('these days I ride a folding bike to the station', 7),
          'He no longer has the mountain bike; he will bring the folding bike he rides now.'
        ),
        q(
          4,
          '',
          ['Thursday', 'Thursdays'],
          ev('Thursday would suit me best', 9),
          'Saturday is full and he works late on Tuesdays, so he chooses Thursday.'
        ),
        q(
          5,
          '',
          ['library', 'the library'],
          ev('a poster on the noticeboard at the library', 11),
          'He did not see an online advert; he saw a poster at the library.'
        ),
        q(
          6,
          '',
          ['45'],
          ev('people who live in Millbrook pay 45 pounds instead', 12),
          'He lives in Millbrook, so he pays the lower local fee of 45 pounds, not 60.'
        ),
      ],
    }),
    group({
      id: 'l1-g2',
      type: 'note-completion',
      from: 7,
      to: 10,
      instruction:
        'Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.',
      wordLimit: limit(1, true),
      title: 'Practical information',
      body: [
        '- Bring an {{q7}} to keep clothes clean',
        '- Also bring a pair of {{q8}}',
        '- Tools: provided by the workshop',
        '- Park in the free car park behind the {{q9}}',
        '- First session starts at {{q10}} (arrive ten minutes early)',
      ].join('\n'),
      questions: [
        q(
          7,
          '',
          ['apron'],
          ev('please bring an apron to keep your clothes clean', 14),
          'Priya asks him to bring an apron because the work is oily.'
        ),
        q(
          8,
          '',
          ['gloves'],
          ev('do bring a pair of gloves', 16),
          'Tools are provided, but he should bring gloves to keep grease off his hands.'
        ),
        q(
          9,
          '',
          ['bakery'],
          ev('use the free car park behind the bakery', 18),
          'The street is permit only, so he should use the car park behind the bakery.'
        ),
        q(
          10,
          '',
          ['6.30', '6:30', '6.30 pm', '6:30 pm', '6.30pm', '6:30pm'],
          ev('The first session begins at 6.30 pm', 20),
          'The first session begins at 6.30 pm; arriving ten minutes early is only a request.'
        ),
      ],
    }),
  ],
}

const listening2: IeltsSection = {
  ...sectionBase,
  key: 'listening-2',
  skill: 'listening',
  order: 2,
  title: 'Part 2: Volunteering at Hollin Mill',
  listening: {
    context:
      'A volunteer coordinator gives a welcome talk to new volunteers at a restored riverside mill that is now a heritage centre.',
    audio: null,
    lines: [
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "Good morning, everyone, and welcome to Hollin Mill. I'm Graham, the volunteer coordinator, and I'll give you a quick overview before you start your first shifts next week.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: 'First, a little background. The mill ground flour here for almost two hundred years, but it stood empty from 1961 until a local trust bought it in 2009.',
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: 'Restoration took eleven years. People often assume that was because of money, but in fact grants covered most of the cost. The real reason was that the trust insisted on keeping the original oak beams wherever possible rather than replacing them with steel.',
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: 'Now, about your role. Most of you will be guiding visitors, and the thing we value most is not historical knowledge. We can teach you dates. What matters most is that you keep groups safe around the machinery.',
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "We'll give you a green fleece and a name badge, but you'll need to provide your own sturdy shoes, because the floors upstairs are uneven.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "As a thank-you, volunteers get free entry for up to two guests and a ten per cent discount in the café. Sadly, we can't offer free parking, as the car park belongs to the council.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "Right, let's look at the site plan you've each been given. You'll see the main gate at the bottom of the page, with the car park on the right as you come in.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "As you enter through the main gate, the small building immediately on your left is the ticket office. That's where visitors pay and pick up their audio guides.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: 'Straight ahead of you is the mill itself. The café is on the ground floor of the mill, at the front, so visitors can sit at the windows and look out over the courtyard.',
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "If you walk around the right-hand side of the mill, you come to the river. The viewing platform for the water wheel is built out over the water behind the mill, and it's our most popular spot.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "The first aid room is a little hard to find. It's in the old stable block, the long building on the left side of the courtyard, and it's the door nearest the mill.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "In the same stable block, at the far end nearest the main gate, you'll find the children's workshop, where families can try grinding grain by hand.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "And finally, the volunteer lounge. It's on the top floor of the mill, at the top of the spiral staircase. It's a bit of a climb, but there's a kettle and lockers for your belongings.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "You might notice a wooden hut beside the car park. That's only a store for garden tools, so please don't send visitors there.",
      },
      {
        speaker: 'Graham',
        voice: 'onyx',
        text: "And the room next to the café on the ground floor is our office, which isn't open to the public. Right, any questions? No? Then let's start at the gate.",
      },
    ],
  },
  reading: null,
  writing: null,
  groups: [
    group({
      id: 'l2-g1',
      type: 'multiple-choice',
      from: 11,
      to: 11,
      instruction: ABC,
      options: opts(
        ['A', 'a shortage of money'],
        ['B', 'a decision to keep the original timber'],
        ['C', 'disagreements with the local council']
      ),
      questions: [
        q(
          11,
          'Why did the restoration of the mill take eleven years?',
          ['B'],
          ev(
            'the trust insisted on keeping the original oak beams wherever possible',
            2
          ),
          'Graham says grants covered the cost; the delay came from keeping the original oak beams.'
        ),
      ],
    }),
    group({
      id: 'l2-g2',
      type: 'multiple-choice',
      from: 12,
      to: 12,
      instruction: ABC,
      options: opts(
        ['A', 'a good knowledge of local history'],
        ['B', 'a friendly manner with visitors'],
        ['C', 'attention to the safety of groups']
      ),
      questions: [
        q(
          12,
          'According to Graham, what matters most for guides?',
          ['C'],
          ev(
            'What matters most is that you keep groups safe around the machinery.',
            3
          ),
          'He says history can be taught and that keeping groups safe is what matters most.'
        ),
      ],
    }),
    group({
      id: 'l2-g3',
      type: 'multiple-choice',
      from: 13,
      to: 13,
      instruction: ABC,
      options: opts(
        ['A', 'a fleece'],
        ['B', 'a name badge'],
        ['C', 'suitable shoes']
      ),
      questions: [
        q(
          13,
          'What do volunteers have to provide for themselves?',
          ['C'],
          ev("you'll need to provide your own sturdy shoes", 4),
          'The fleece and badge are given to them; only sturdy shoes are their own responsibility.'
        ),
      ],
    }),
    group({
      id: 'l2-g4',
      type: 'multiple-choice',
      from: 14,
      to: 14,
      instruction: ABC,
      options: opts(
        ['A', 'free parking'],
        ['B', 'cheaper food and drink'],
        ['C', 'free entry for their whole family']
      ),
      questions: [
        q(
          14,
          'Which benefit do volunteers receive?',
          ['B'],
          ev('a ten per cent discount in the café', 5),
          'Volunteers get a café discount; parking is not free and guest entry is limited to two people.'
        ),
      ],
    }),
    group({
      id: 'l2-g5',
      type: 'plan-map-labelling',
      from: 15,
      to: 20,
      instruction:
        'Label the site plan of Hollin Mill. Choose the correct letter, A-H, next to Questions 15-20.',
      title: 'Hollin Mill site plan',
      options: opts(
        ['A', 'Small building to the left of the main gate'],
        ['B', 'Ground floor at the front of the mill'],
        ['C', 'Platform over the river behind the mill'],
        ['D', 'Stable block, door closest to the mill'],
        ['E', 'Stable block, end nearest the main gate'],
        ['F', 'Top floor of the mill, up the spiral staircase'],
        ['G', 'Wooden hut beside the car park'],
        ['H', 'Room next to the café on the ground floor']
      ),
      questions: [
        q(
          15,
          'Ticket office',
          ['A'],
          ev(
            'the small building immediately on your left is the ticket office',
            7
          ),
          'The ticket office is the small building on the left as you come through the main gate.'
        ),
        q(
          16,
          'Café',
          ['B'],
          ev('The café is on the ground floor of the mill, at the front', 8),
          'The café is at the front of the mill on the ground floor, facing the courtyard.'
        ),
        q(
          17,
          'Water wheel viewing platform',
          ['C'],
          ev('built out over the water behind the mill', 9),
          'The viewing platform is built out over the river behind the mill.'
        ),
        q(
          18,
          'First aid room',
          ['D'],
          ev("it's the door nearest the mill", 10),
          'The first aid room is in the stable block, at the door nearest the mill.'
        ),
        q(
          19,
          "Children's workshop",
          ['E'],
          ev('at the far end nearest the main gate', 11),
          "The children's workshop is at the end of the stable block nearest the gate."
        ),
        q(
          20,
          'Volunteer lounge',
          ['F'],
          ev(
            "It's on the top floor of the mill, at the top of the spiral staircase.",
            12
          ),
          'The lounge is on the top floor, reached by the spiral staircase.'
        ),
      ],
    }),
  ],
}

const listening3: IeltsSection = {
  ...sectionBase,
  key: 'listening-3',
  skill: 'listening',
  order: 3,
  title: 'Part 3: Canteen food waste project',
  listening: {
    context:
      'Two students, Leah and Marcus, discuss their research project on food waste in the university canteen with their tutor, Dr Brennan.',
    audio: null,
    lines: [
      {
        speaker: 'Dr Brennan',
        voice: 'fable',
        text: 'Come in, Leah, Marcus. So, how is the canteen waste project going?',
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: "Slowly, to be honest. Our first survey didn't work as well as we'd hoped. We actually got plenty of replies, over three hundred, so numbers weren't the issue.",
      },
      {
        speaker: 'Marcus',
        voice: 'echo',
        text: "The trouble was that a lot of people misunderstood the questions. When we asked how much food they usually leave, some answered in grams and others just wrote 'not much'.",
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: 'And it was far too long. Twenty-five questions was a mistake. Lots of people gave up halfway, so the later sections are almost empty.',
      },
      {
        speaker: 'Marcus',
        voice: 'echo',
        text: 'At least the online link worked, and we reached students as well as staff, which is what we wanted.',
      },
      {
        speaker: 'Dr Brennan',
        voice: 'fable',
        text: 'Those are common problems. Self-reported data on waste is rarely reliable anyway. Rather than asking people, I suggest you weigh what is left on the plates when they come back to the kitchen.',
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: 'The kitchen manager might allow that. Should we interview the kitchen staff as well?',
      },
      {
        speaker: 'Dr Brennan',
        voice: 'fable',
        text: "You could, but I don't think it's necessary at this stage. What I would recommend is taking photographs of a sample of plates. Pictures are very persuasive in a final presentation. And please don't ask for an extension; the deadline stays as it is.",
      },
      {
        speaker: 'Marcus',
        voice: 'echo',
        text: 'OK. Shall we go through our ideas for reducing waste? The first one is using smaller plates.',
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: "We like that one because it wouldn't cost much at all. The canteen already has a stock of side plates that hardly ever get used.",
      },
      {
        speaker: 'Marcus',
        voice: 'echo',
        text: 'Then there is getting rid of trays. People take more food when they have a tray to fill. Apparently a college in Dunmore did this and cut its waste by almost a third.',
      },
      {
        speaker: 'Dr Brennan',
        voice: 'fable',
        text: 'And the posters you mentioned in your email?',
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: "The idea is to put up posters showing how many kilos are thrown away each week. The problem is that we'd never really know whether a drop in waste was because of the posters or something else.",
      },
      {
        speaker: 'Marcus',
        voice: 'echo',
        text: 'Our fourth idea is selling any leftover hot food at half price for the last half hour before closing. That would bring in some income instead of the food going in the bin.',
      },
      {
        speaker: 'Dr Brennan',
        voice: 'fable',
        text: 'What about pre-ordering?',
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: 'Students would order their lunch on an app the day before, so the kitchen cooks the right amount. But we suspect a lot of students would resent having to plan their meals that far ahead.',
      },
      {
        speaker: 'Marcus',
        voice: 'echo',
        text: "And finally, composting. The university gardens could use it, but someone would have to collect the food bins every day, and the canteen says it simply doesn't have the people for that.",
      },
      {
        speaker: 'Dr Brennan',
        voice: 'fable',
        text: "That's a good range. Write up each idea with its main advantage or drawback, and we'll meet again next week.",
      },
      {
        speaker: 'Leah',
        voice: 'shimmer',
        text: 'Thanks, Dr Brennan. We will.',
      },
    ],
  },
  reading: null,
  writing: null,
  groups: [
    group({
      id: 'l3-g1',
      type: 'multiple-choice-multi',
      from: 21,
      to: 22,
      instruction: 'Choose TWO letters, A-E.',
      options: opts(
        ['A', 'Too few people replied.'],
        ['B', 'Some questions were misunderstood.'],
        ['C', 'The survey had too many questions.'],
        ['D', 'Only staff completed it.'],
        ['E', 'The online link did not work.']
      ),
      correctKeys: ['B', 'C'],
      questions: [
        q(
          21,
          'Which TWO problems did the students have with their first survey?',
          [],
          ev('a lot of people misunderstood the questions', 2),
          'Marcus says many people misunderstood the questions, so B is one correct answer.'
        ),
        q(
          22,
          'Which TWO problems did the students have with their first survey?',
          [],
          ev('it was far too long', 3),
          'Leah says the survey was far too long, so C is the other correct answer; replies, reach and the link were fine.'
        ),
      ],
    }),
    group({
      id: 'l3-g2',
      type: 'multiple-choice-multi',
      from: 23,
      to: 24,
      instruction: 'Choose TWO letters, A-E.',
      options: opts(
        ['A', 'interviewing the kitchen staff'],
        ['B', 'weighing the food left on plates'],
        ['C', 'asking for more time'],
        ['D', 'comparing results with another university'],
        ['E', 'photographing some of the plates']
      ),
      correctKeys: ['B', 'E'],
      questions: [
        q(
          23,
          'Which TWO things does Dr Brennan recommend?',
          [],
          ev('I suggest you weigh what is left on the plates', 5),
          'Dr Brennan suggests weighing leftover food instead of asking people, so B is correct.'
        ),
        q(
          24,
          'Which TWO things does Dr Brennan recommend?',
          [],
          ev('taking photographs of a sample of plates', 7),
          'He recommends photographs of plates, so E is correct; he rejects interviews as unnecessary and refuses an extension.'
        ),
      ],
    }),
    group({
      id: 'l3-g3',
      type: 'matching-features',
      from: 25,
      to: 30,
      instruction:
        'What comment do the students make about each idea for reducing waste? Choose SIX answers from the box and write the correct letter, A-F, next to Questions 25-30.',
      title: 'Comments',
      options: opts(
        ['A', 'It would be cheap to introduce.'],
        ['B', 'Students might object to it.'],
        ['C', 'It has succeeded at another institution.'],
        ['D', 'It would require extra staff.'],
        ['E', 'Its effect would be hard to measure.'],
        ['F', 'It could raise money for the canteen.']
      ),
      questions: [
        q(
          25,
          'Using smaller plates',
          ['A'],
          ev("it wouldn't cost much at all", 9),
          'The canteen already owns side plates, so the idea would cost very little.'
        ),
        q(
          26,
          'Removing trays',
          ['C'],
          ev(
            'a college in Dunmore did this and cut its waste by almost a third',
            10
          ),
          'Another college has already removed trays and reduced its waste.'
        ),
        q(
          27,
          'Posters about waste',
          ['E'],
          ev(
            "we'd never really know whether a drop in waste was because of the posters or something else",
            12
          ),
          'Leah says they could not tell whether any fall in waste was caused by the posters.'
        ),
        q(
          28,
          'Half-price leftovers',
          ['F'],
          ev('That would bring in some income', 13),
          'Selling leftovers cheaply would earn the canteen some money.'
        ),
        q(
          29,
          'Pre-ordering by app',
          ['B'],
          ev(
            'a lot of students would resent having to plan their meals that far ahead',
            15
          ),
          'They expect students to dislike planning meals a day in advance.'
        ),
        q(
          30,
          'Composting',
          ['D'],
          ev("it simply doesn't have the people for that", 16),
          'Daily bin collection would need staff the canteen does not have.'
        ),
      ],
    }),
  ],
}

const listening4: IeltsSection = {
  ...sectionBase,
  key: 'listening-4',
  skill: 'listening',
  order: 4,
  title: 'Part 4: Packaging grown from fungi',
  listening: {
    context:
      'A lecturer in materials science gives a talk about protective packaging made from mycelium.',
    audio: null,
    lines: [
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Good afternoon. Today I want to look at a material that is beginning to change how goods are protected during transport: packaging that is grown rather than manufactured.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Let us begin with the problem. If you have ever bought a television or a computer, it probably arrived surrounded by blocks of white foam. Most of this protective packaging is made from expanded polystyrene.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Polystyrene is light and cheap, but it can take hundreds of years to break down. In theory it can be processed again, but in practice it is very rarely recycled, because it is so bulky to transport.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'So what is the alternative? The answer lies in mycelium. Mycelium is the root-like network of a fungus, the part that grows underground and that most of us never see.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'As it grows, the mycelium sends out millions of fine threads. These threads wrap around whatever material they are growing in, and they act like a natural glue, binding loose material together into a solid mass.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'The advantages are considerable. Unlike polystyrene, mycelium packaging is fully compostable. In an industrial composting plant it disappears within days, and even in an ordinary garden it breaks down in about six weeks.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Production is also cleaner. Growing the material uses far less energy than manufacturing plastic foam, because the fungus does most of the work at room temperature.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Now let us look at how it is made. The first stage is to collect farm waste. Manufacturers use material that has no other value, such as hemp stalks or oat husks, which are cleaned and chopped into small pieces.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Next, this material is mixed with mycelium and packed into moulds. The shape of the mould decides the final product, whether that is a corner protector or a tray for wine bottles.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'The moulds are then left in a dark, warm room. Over about five days, the mycelium grows through the material and fills every gap.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'At this point the growth has to be stopped, otherwise the fungus would keep spreading. So the pieces are removed from the moulds and heated in an oven, which dries them and kills the fungus.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Finally, before anything is shipped to customers, a sample from each batch is tested for strength, to check that it can survive being dropped.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Of course, there are limitations. Mycelium packaging is somewhat heavier than polystyrene, which raises transport costs slightly.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'It also takes days to grow rather than seconds to mould, so factories need more floor space to produce the same number of pieces.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'Even so, several large furniture companies have started trials, and costs are falling as production grows.',
      },
      {
        speaker: 'Lecturer',
        voice: 'nova',
        text: 'In the next lecture, we will look at other materials grown from living organisms, including a kind of leather made from fungi.',
      },
    ],
  },
  reading: null,
  writing: null,
  groups: [
    group({
      id: 'l4-g1',
      type: 'note-completion',
      from: 31,
      to: 36,
      instruction:
        'Complete the notes below. Write ONE WORD ONLY for each answer.',
      wordLimit: limit(1, false),
      title: 'Mycelium packaging',
      body: [
        '## The problem',
        '',
        '- Most protective packaging is made from expanded {{q31}}',
        '- It takes hundreds of years to break down and is rarely {{q32}}',
        '',
        '## What mycelium is',
        '',
        '- The root-like network of a {{q33}}',
        '- Its threads act like a natural {{q34}}, binding loose material together',
        '',
        '## Advantages',
        '',
        '- Breaks down in an ordinary garden in about {{q35}} weeks',
        '- Uses far less {{q36}} to produce than plastic foam',
      ].join('\n'),
      questions: [
        q(
          31,
          '',
          ['polystyrene'],
          ev(
            'Most of this protective packaging is made from expanded polystyrene.',
            1
          ),
          'The lecturer says most protective packaging is expanded polystyrene.'
        ),
        q(
          32,
          '',
          ['recycled'],
          ev('in practice it is very rarely recycled', 2),
          'Polystyrene can in theory be processed again but is rarely recycled.'
        ),
        q(
          33,
          '',
          ['fungus'],
          ev('Mycelium is the root-like network of a fungus', 3),
          'Mycelium is defined as the root-like network of a fungus.'
        ),
        q(
          34,
          '',
          ['glue'],
          ev('they act like a natural glue', 4),
          'The threads act like a natural glue that binds material together.'
        ),
        q(
          35,
          '',
          ['six', '6'],
          ev('even in an ordinary garden it breaks down in about six weeks', 5),
          'In a garden it breaks down in about six weeks; the "days" figure refers to industrial plants.'
        ),
        q(
          36,
          '',
          ['energy'],
          ev('uses far less energy than manufacturing plastic foam', 6),
          'Growing the material needs far less energy than making plastic foam.'
        ),
      ],
    }),
    group({
      id: 'l4-g2',
      type: 'flow-chart-completion',
      from: 37,
      to: 40,
      instruction:
        'Complete the flow-chart below. Write ONE WORD ONLY for each answer.',
      wordLimit: limit(1, false),
      title: 'How mycelium packaging is made',
      body: [
        '1. Farm waste such as hemp stalks or {{q37}} husks is cleaned and chopped',
        '2. The waste is mixed with mycelium and packed into {{q38}}',
        '3. The mycelium grows for about five days in a dark, warm room',
        '4. The pieces are heated in an {{q39}} to stop the growth',
        '5. A sample from each batch is tested for {{q40}} before shipping',
      ].join('\n'),
      questions: [
        q(
          37,
          '',
          ['oat', 'oats'],
          ev('such as hemp stalks or oat husks', 7),
          'The examples of farm waste are hemp stalks and oat husks.'
        ),
        q(
          38,
          '',
          ['moulds', 'molds'],
          ev('this material is mixed with mycelium and packed into moulds', 8),
          'After mixing, the material is packed into moulds that decide its shape.'
        ),
        q(
          39,
          '',
          ['oven'],
          ev('heated in an oven, which dries them and kills the fungus', 10),
          'Heating in an oven stops the growth by drying the pieces and killing the fungus.'
        ),
        q(
          40,
          '',
          ['strength'],
          ev('a sample from each batch is tested for strength', 11),
          'Before shipping, samples are tested for strength.'
        ),
      ],
    }),
  ],
}

/* ------------------------------------------------------------------------ */
/* Reading                                                                   */
/* ------------------------------------------------------------------------ */

const TFNG_INSTRUCTION =
  'Do the following statements agree with the information given in the passage? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.'

const reading1: IeltsSection = {
  ...sectionBase,
  key: 'reading-1',
  skill: 'reading',
  order: 1,
  title: 'Reading Passage 1',
  listening: null,
  reading: {
    title: 'Reading the Weather in Old Logbooks',
    subtitle:
      'How the daily notes of lighthouse keepers are helping scientists rebuild the climate history of a coastline',
    paragraphs: [
      {
        label: '',
        text: 'From 1851 until 1987, the keepers of the lighthouses along the rocky coast of Elsmere Bay recorded the weather several times a day. They noted the direction and strength of the wind, the state of the sea, the visibility and, from the 1880s onwards, the air temperature and pressure. The entries were made in heavy leather-bound logbooks, partly because the lighthouse authority required them and partly because a keeper who could show that fog had been thick on a particular night was protected if a ship ran aground. When the last lighthouse on the bay was automated, around four hundred of these logbooks were packed into crates and sent to a regional archive, where they remained largely untouched for more than thirty years.',
      },
      {
        label: '',
        text: 'Their rediscovery owes much to a retired schoolteacher, Marguerite Olsby, who began volunteering at the archive in 2016. While cataloguing a box of maintenance records, she found a logbook from the Varrow Point light and noticed that its weather columns had been filled in with remarkable consistency. Olsby contacted the climate research group at the nearby University of Harlen, and within a year the group had secured funding to photograph every surviving logbook. The scanning alone took fourteen months, as many of the volumes were too fragile to be opened flat and had to be photographed one page at a time from an angle.',
      },
      {
        label: '',
        text: 'Why should scientists care about the weather observations of lighthouse keepers? The main reason is that reliable records from the late nineteenth century are scarce, especially along coasts and at sea. Official weather stations of that era were mostly located in towns, where buildings and chimney smoke affected the readings. Ships kept logs too, but a moving vessel cannot provide a continuous record for one place. Lighthouses, in contrast, stood in exposed positions, far from the warming influence of towns, and they stayed in the same spot for decades. A single lighthouse with a complete set of logbooks can therefore show how conditions at one location changed over a very long period.',
      },
      {
        label: '',
        text: 'Turning handwritten entries into usable data, however, is slow work. Computer programs that read printed text cope poorly with the varied handwriting of dozens of different keepers, so the Harlen team decided to rely on people instead. They set up a website on which members of the public can view a page and type the figures into a simple form. Each page is transcribed by three different volunteers, and if their versions do not match, the page is passed to a member of staff to decide. Since the website opened, more than 6,000 volunteers have taken part, and around 70 percent of the pages have now been completed.',
      },
      {
        label: '',
        text: 'The records are not without problems. Keepers sometimes moved their thermometers, for example from a north-facing wall to a sheltered porch, which could raise the readings by a degree or more. Instruments were replaced when they broke, and the new ones were not always checked against the old. To deal with this, the researchers compare each lighthouse with its neighbours. If one station suddenly becomes warmer than the stations on either side while they show no change, the jump is probably caused by a change in equipment rather than a change in the weather, and the figures can be adjusted accordingly.',
      },
      {
        label: '',
        text: 'Early results have already proved valuable. The reconstructed records show that violent storms in the 1890s were more frequent than computer models had suggested, and that the bay experienced an unusually calm decade during the 1920s. The data on sea fog has attracted particular interest. Keepers judged visibility by noting whether they could see a set of marker posts placed at fixed distances, and this simple method has produced the longest continuous record of coastal fog anywhere in the region. It suggests that foggy days in summer have fallen by roughly a quarter since the 1950s, a change that may be linked to warmer water offshore.',
      },
      {
        label: '',
        text: "The project has also had effects that its organisers did not expect. Many volunteers began reading the notes written in the margins of the logbooks, which describe shipwrecks, rescues and the daily lives of the keepers and their families. A local museum is now planning an exhibition based on these notes, and a group of volunteers has started tracing the keepers' descendants. Olsby herself remains modest about her role. 'I only opened a box,' she says. 'The keepers did the real work, every day, in all weathers. It just took us a long time to listen to them.'",
      },
    ],
  },
  writing: null,
  groups: [
    group({
      id: 'r1-g1',
      type: 'true-false-not-given',
      from: 1,
      to: 6,
      instruction: TFNG_INSTRUCTION,
      questions: [
        q(
          1,
          'The lighthouse authority required keepers to record the weather.',
          ['TRUE'],
          ev('partly because the lighthouse authority required them', 0),
          'The passage says the entries were made partly because the lighthouse authority required them.'
        ),
        q(
          2,
          'Air temperature was recorded in the logbooks from 1851.',
          ['FALSE'],
          ev('from the 1880s onwards, the air temperature and pressure', 0),
          'Records began in 1851, but temperature was only noted from the 1880s onwards.'
        ),
        q(
          3,
          'Olsby found the Varrow Point logbook among records of repairs and upkeep.',
          ['TRUE'],
          ev(
            'While cataloguing a box of maintenance records, she found a logbook',
            1
          ),
          'Maintenance records are records of repairs and upkeep, and that is where she found it.'
        ),
        q(
          4,
          'The University of Harlen paid Olsby for her work at the archive.',
          ['NOT GIVEN'],
          null,
          'The passage says she volunteered and that the university got funding for scanning, but not whether she was paid.'
        ),
        q(
          5,
          'All of the logbooks were in good enough condition to be opened flat.',
          ['FALSE'],
          ev('many of the volumes were too fragile to be opened flat', 1),
          'Many volumes were too fragile to open flat, so not all of them could be.'
        ),
        q(
          6,
          'Some website volunteers have each transcribed more than a thousand pages.',
          ['NOT GIVEN'],
          null,
          'The passage gives the total number of volunteers and the share of pages completed, but nothing about individual totals.'
        ),
      ],
    }),
    group({
      id: 'r1-g2',
      type: 'table-completion',
      from: 7,
      to: 10,
      instruction:
        'Complete the table below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
      wordLimit: limit(2, false),
      title: 'Weaknesses of historical weather data',
      body: [
        '| Source | Weakness |',
        '| --- | --- |',
        '| Town weather stations | Readings affected by buildings and {{q7}} |',
        "| Ships' logs | A moving vessel cannot give a {{q8}} record for one place |",
        '| Lighthouse thermometers | Sometimes moved, for example to a sheltered {{q9}} |',
        '| Replacement instruments | Not always {{q10}} against the old ones |',
      ].join('\n'),
      questions: [
        q(
          7,
          '',
          ['chimney smoke', 'smoke'],
          ev('where buildings and chimney smoke affected the readings', 2),
          'Town stations were affected by buildings and chimney smoke.'
        ),
        q(
          8,
          '',
          ['continuous'],
          ev(
            'a moving vessel cannot provide a continuous record for one place',
            2
          ),
          'A ship moves, so it cannot keep a continuous record for a single place.'
        ),
        q(
          9,
          '',
          ['porch'],
          ev('from a north-facing wall to a sheltered porch', 4),
          'Thermometers were sometimes moved to a sheltered porch, raising the readings.'
        ),
        q(
          10,
          '',
          ['checked'],
          ev('the new ones were not always checked against the old', 4),
          'New instruments were not always checked against the ones they replaced.'
        ),
      ],
    }),
    group({
      id: 'r1-g3',
      type: 'short-answer',
      from: 11,
      to: 13,
      instruction:
        'Answer the questions below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer.',
      wordLimit: limit(3, true),
      body: [
        '- How many volunteers transcribe each page on the website? {{q11}}',
        '- What did keepers look for to judge visibility? {{q12}}',
        '- What may explain the fall in summer fog since the 1950s? {{q13}}',
      ].join('\n'),
      questions: [
        q(
          11,
          '',
          ['three', '3', 'three volunteers', '3 volunteers'],
          ev('Each page is transcribed by three different volunteers', 3),
          'Every page is typed in by three volunteers before it is compared.'
        ),
        q(
          12,
          '',
          ['marker posts', 'posts'],
          ev('whether they could see a set of marker posts', 5),
          'Keepers checked whether marker posts at fixed distances were visible.'
        ),
        q(
          13,
          '',
          ['warmer water', 'warmer water offshore'],
          ev('a change that may be linked to warmer water offshore', 5),
          'The passage links the drop in summer fog to warmer water offshore.'
        ),
      ],
    }),
  ],
}

const reading2: IeltsSection = {
  ...sectionBase,
  key: 'reading-2',
  skill: 'reading',
  order: 2,
  title: 'Reading Passage 2',
  listening: null,
  reading: {
    title: 'Seeds on Loan',
    subtitle:
      'A small-town library has become a living store of rare vegetable varieties',
    paragraphs: [
      {
        label: 'A',
        text: 'In the entrance hall of the public library in the river town of Calloway, between the returns desk and the newspaper rack, stands an old wooden card catalogue. Its drawers no longer hold index cards. Instead, they are filled with paper envelopes of seeds: runner beans, pumpkins, lettuces, sunflowers and dozens of varieties of tomato. Anyone with a library card can take up to five packets a season, free of charge. The only request is that, at the end of the summer, borrowers let a few of their best plants go to seed and bring some of those seeds back. This is the Tidewater Seed Library, one of several hundred similar projects that have appeared in towns and cities over the past two decades.',
      },
      {
        label: 'B',
        text: 'The idea of sharing seeds is, of course, far older than libraries. For most of the history of farming, growers saved seed from their own harvest and swapped it with neighbours. Over generations, this process produced thousands of local varieties, each adapted to a particular soil and climate. During the twentieth century, however, the practice declined sharply. Commercial seed companies offered varieties that produced higher and more uniform yields, and many of these were hybrids, whose seeds do not grow true to type, so saving them is pointless. By the 1980s, most home gardeners bought new seed every year, and many old varieties had quietly disappeared.',
      },
      {
        label: 'C',
        text: "The founder of the Tidewater library, a former nurse named Ines Halvorsen, became aware of this loss almost by accident. In 2011 she inherited a jar of bean seeds from an elderly neighbour, who told her that his family had grown the same climbing bean for over a century. Curious, Halvorsen tried to find the variety in seed catalogues and discovered that it was not sold anywhere. 'It struck me that if I failed to grow them, that bean would simply be gone,' she recalls. She planted the seeds, saved far more than she needed, and began giving them away. Within two years, she had persuaded the town library to give her a corner of the entrance hall.",
      },
      {
        label: 'D',
        text: "Running a seed library turns out to be more complicated than lending books. A returned book is the same book that went out, but a returned packet of seed may be quite different from the one that was borrowed. Many vegetables, such as squash and sweetcorn, are pollinated by insects or wind and cross readily with other varieties growing nearby. A borrower who grows two kinds of pumpkin side by side may return seeds that produce something entirely unexpected. For this reason, Tidewater sorts its seeds into three categories, from 'easy' crops such as peas and lettuce, which rarely cross, to 'advanced' crops that require careful separation, and it asks new members to start with the easy group.",
      },
      {
        label: 'E',
        text: "Education has therefore become central to the library's work. Volunteers run free workshops each spring on sowing and transplanting, and each autumn on harvesting, drying and storing seed. The most popular session teaches children how to save tomato seeds by leaving them to ferment in a jar of water for a few days, a process that removes the jelly-like coating that would otherwise stop them from germinating. Halvorsen believes these classes matter as much as the seeds themselves. 'A packet lasts one season,' she says. 'Knowing how to save seed lasts a lifetime.'",
      },
      {
        label: 'F',
        text: 'Not everyone is convinced that seed libraries make a significant contribution to conservation. Some plant scientists point out that national seed banks, which store samples at very low temperatures, can keep seeds alive for decades and keep detailed records of where each sample came from. Community collections, by comparison, are small, and their records are often incomplete. Supporters respond that the two approaches do different jobs. A frozen seed cannot adapt to a changing climate, whereas a variety grown every year in local gardens continues to evolve alongside local conditions. In their view, the best protection for crop diversity combines both kinds of collection.',
      },
      {
        label: 'G',
        text: "The Tidewater library now holds around 340 varieties, 60 of which appear in no commercial catalogue. Its success has inspired libraries in four neighbouring towns, and the five collections now exchange seeds each winter. Halvorsen's inherited bean, which the library has named Calloway Climber, is grown in more than 200 gardens. Asked about the future, she says she would like every library in the region to have a seed drawer. 'We spent a century forgetting how to do this,' she says. 'It will not take us a century to remember.'",
      },
    ],
  },
  writing: null,
  groups: [
    group({
      id: 'r2-g1',
      type: 'matching-headings',
      from: 14,
      to: 20,
      instruction:
        'The passage has seven paragraphs, A-G. Choose the correct heading for each paragraph from the list of headings below. Write the correct number, i-x, next to Questions 14-20.',
      title: 'List of Headings',
      options: opts(
        ['i', 'Spreading beyond the original town'],
        ['ii', 'The financial cost of running the library'],
        ['iii', 'An unusual use for library furniture'],
        ['iv', 'How a traditional practice almost vanished'],
        ['v', 'Government support for seed saving'],
        ['vi', 'A personal discovery leads to a project'],
        ['vii', 'Why seeds cannot be treated like books'],
        ['viii', 'A debate about scientific value'],
        ['ix', 'Teaching the skills behind the collection'],
        ['x', 'The best vegetables for beginners']
      ),
      questions: [
        q(
          14,
          'Paragraph A',
          ['iii'],
          ev('Its drawers no longer hold index cards.', 0),
          'Paragraph A describes an old card catalogue now used to store seed packets.'
        ),
        q(
          15,
          'Paragraph B',
          ['iv'],
          ev(
            'During the twentieth century, however, the practice declined sharply.',
            1
          ),
          'Paragraph B explains how traditional seed saving nearly disappeared.'
        ),
        q(
          16,
          'Paragraph C',
          ['vi'],
          ev('she inherited a jar of bean seeds from an elderly neighbour', 2),
          'Paragraph C tells how an inherited bean led Halvorsen to start the library.'
        ),
        q(
          17,
          'Paragraph D',
          ['vii'],
          ev(
            'Running a seed library turns out to be more complicated than lending books.',
            3
          ),
          'Paragraph D contrasts returned seeds with returned books; the beginner crops are only a detail.'
        ),
        q(
          18,
          'Paragraph E',
          ['ix'],
          ev(
            "Education has therefore become central to the library's work.",
            4
          ),
          'Paragraph E is about workshops that teach seed-saving skills.'
        ),
        q(
          19,
          'Paragraph F',
          ['viii'],
          ev(
            'Not everyone is convinced that seed libraries make a significant contribution to conservation.',
            5
          ),
          "Paragraph F sets scientists' doubts against the replies of supporters."
        ),
        q(
          20,
          'Paragraph G',
          ['i'],
          ev(
            'Its success has inspired libraries in four neighbouring towns',
            6
          ),
          'Paragraph G describes the idea spreading to neighbouring towns.'
        ),
      ],
    }),
    group({
      id: 'r2-g2',
      type: 'sentence-completion',
      from: 21,
      to: 23,
      instruction:
        'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
      wordLimit: limit(2, false),
      body: [
        '- Borrowers are asked to return seeds taken from their {{q21}}.',
        '- Many commercial varieties were {{q22}}, so there was no point in saving their seed.',
        '- Halvorsen looked for the inherited bean in {{q23}} but could not find it on sale.',
      ].join('\n'),
      questions: [
        q(
          21,
          '',
          ['best plants'],
          ev('borrowers let a few of their best plants go to seed', 0),
          'Borrowers let their best plants go to seed and bring some of those seeds back.'
        ),
        q(
          22,
          '',
          ['hybrids'],
          ev(
            'many of these were hybrids, whose seeds do not grow true to type',
            1
          ),
          'Hybrid seeds do not grow true to type, so saving them is pointless.'
        ),
        q(
          23,
          '',
          ['seed catalogues', 'catalogues', 'seed catalogs', 'catalogs'],
          ev('tried to find the variety in seed catalogues', 2),
          'She searched seed catalogues and found the bean was not sold anywhere.'
        ),
      ],
    }),
    group({
      id: 'r2-g3',
      type: 'summary-completion',
      from: 24,
      to: 26,
      instruction:
        'Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.',
      wordLimit: limit(1, false),
      title: 'Learning to save seed',
      body: [
        'Tidewater divides its seeds into three groups. New members start with crops such as peas and {{q24}}, which rarely cross with other varieties. In the most popular workshop, children save tomato seeds by leaving them to {{q25}} in water for a few days. This removes a coating that would otherwise stop the seeds from {{q26}}.',
      ].join('\n'),
      questions: [
        q(
          24,
          '',
          ['lettuce', 'lettuces'],
          ev("'easy' crops such as peas and lettuce, which rarely cross", 3),
          'Peas and lettuce are the easy crops that rarely cross.'
        ),
        q(
          25,
          '',
          ['ferment'],
          ev('leaving them to ferment in a jar of water for a few days', 4),
          'The seeds are left to ferment in water for a few days.'
        ),
        q(
          26,
          '',
          ['germinating'],
          ev('would otherwise stop them from germinating', 4),
          'The jelly-like coating would otherwise stop the seeds from germinating.'
        ),
      ],
    }),
  ],
}

const reading3: IeltsSection = {
  ...sectionBase,
  key: 'reading-3',
  skill: 'reading',
  order: 3,
  title: 'Reading Passage 3',
  listening: null,
  reading: {
    title: 'The Case for Slow Looking',
    subtitle:
      'A gallery educator argues that museums should help visitors spend longer with fewer works',
    paragraphs: [
      {
        label: 'A',
        text: 'Anyone who has spent an afternoon in a large art museum will recognise the pattern. Visitors drift from room to room, pause briefly in front of a painting, read the label, perhaps take a photograph, and move on. Researchers who have timed this behaviour with stopwatches have produced figures that are, frankly, depressing. In one study at a national gallery, the median time spent in front of an individual work was under thirty seconds, and a good part of that time was spent reading the label rather than looking at the work itself. I do not believe that these visitors are lazy or uninterested. I believe that museums, by their very design, encourage them to hurry.',
      },
      {
        label: 'B',
        text: "Consider the way most collections are displayed. A typical gallery contains dozens of objects, arranged so that a visitor can see as many as possible on a single route. The message is that a museum's worth lies in the quantity and fame of what it owns, and that a visit is successful if the visitor has seen the highlights. Audio guides and maps reinforce this message by directing people efficiently from one masterpiece to the next. The result is a kind of cultural sightseeing, in which the aim is to confirm that something has been witnessed rather than to experience it.",
      },
      {
        label: 'C',
        text: "A small but growing movement argues for the opposite approach. Its supporters, many of them teachers and gallery educators, promote what they call 'slow looking': spending ten, twenty or even thirty minutes with a single object. Their method is simple. Visitors are asked to describe what they see in plain words before they are told anything about the artist or the historical context. Only after this period of close observation are they given background information. Practitioners report that people notice details they would never have seen otherwise, such as a reflection in a window or a figure half hidden in shadow, and that they remember the work for far longer.",
      },
      {
        label: 'D',
        text: 'There is some research evidence to support these claims, although it is less extensive than enthusiasts sometimes suggest. A study carried out with secondary school pupils compared two groups who visited the same exhibition. One group followed a standard guided tour of fifteen works; the other spent the same time looking closely at just three. Six weeks later, the second group could describe their three works in far greater detail, and, perhaps more surprisingly, they also reported a stronger wish to return to the museum. The study was small, however, and it involved a single exhibition, so we should be careful not to draw too many conclusions from it.',
      },
      {
        label: 'E',
        text: 'Critics of slow looking raise a fair objection. Many visitors travel long distances and may visit a famous museum only once in their lives. To tell them that they should spend their single afternoon in front of three paintings, ignoring the rest of the collection, seems unreasonable and even a little arrogant. I accept this point, but I think it misunderstands what the movement is asking for. Nobody is proposing that museums should force visitors to slow down. The argument is that museums should make slowness possible and attractive, rather than designing every aspect of the visit around speed.',
      },
      {
        label: 'F',
        text: 'What would that look like in practice? Some changes are inexpensive. Museums could provide more seating, positioned in front of the works rather than in the middle of the room, where benches tend to face nothing in particular. They could reduce the number of objects on display, rotating items from storage more often so that regular visitors still see something new. They could offer short guided sessions focused on one object instead of tours that cover twenty. One regional gallery I visited recently has gone further, setting aside a quiet room containing a single painting, with a soft chair and no label at all. Visitors can ask for information at the door as they leave.',
      },
      {
        label: 'G',
        text: 'None of this will appeal to museums whose funding depends on visitor numbers and on an impression of abundance. A gallery that displays fewer works may be accused of hiding its treasures. Yet the purpose of a public collection is surely not to be seen as quickly as possible by as many people as possible. It is to offer an experience that cannot be found elsewhere: an encounter between a person and an object made by another human being, perhaps centuries ago. That encounter needs time. If museums are serious about their visitors, they should be brave enough to give it to them.',
      },
    ],
  },
  writing: null,
  groups: [
    group({
      id: 'r3-g1',
      type: 'yes-no-not-given',
      from: 27,
      to: 31,
      instruction:
        'Do the following statements agree with the views of the writer? Write YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this.',
      questions: [
        q(
          27,
          'Visitors who spend little time in front of artworks are generally not interested in art.',
          ['NO'],
          ev(
            'I do not believe that these visitors are lazy or uninterested.',
            0
          ),
          'The writer explicitly rejects the idea that hurried visitors are uninterested.'
        ),
        q(
          28,
          'The design of museums encourages visitors to move quickly.',
          ['YES'],
          ev('museums, by their very design, encourage them to hurry', 0),
          'The writer blames museum design for making visitors hurry.'
        ),
        q(
          29,
          'Museums with free entry attract more visitors than those that charge.',
          ['NOT GIVEN'],
          null,
          'The writer never discusses entry charges.'
        ),
        q(
          30,
          'The findings of the school study should be treated with caution.',
          ['YES'],
          ev(
            'we should be careful not to draw too many conclusions from it',
            3
          ),
          'The writer notes the study was small and warns against drawing too many conclusions.'
        ),
        q(
          31,
          'The objection raised by critics of slow looking has no merit.',
          ['NO'],
          ev('Critics of slow looking raise a fair objection.', 4),
          'The writer calls the objection fair and accepts the point.'
        ),
      ],
    }),
    group({
      id: 'r3-g2',
      type: 'matching-information',
      from: 32,
      to: 35,
      instruction:
        'The passage has seven paragraphs, A-G. Which paragraph contains the following information? Write the correct letter, A-G, next to Questions 32-35.',
      options: opts(
        ['A', 'Paragraph A'],
        ['B', 'Paragraph B'],
        ['C', 'Paragraph C'],
        ['D', 'Paragraph D'],
        ['E', 'Paragraph E'],
        ['F', 'Paragraph F'],
        ['G', 'Paragraph G']
      ),
      questions: [
        q(
          32,
          'a description of the order in which a slow-looking session is carried out',
          ['C'],
          ev(
            'Visitors are asked to describe what they see in plain words before they are told anything',
            2
          ),
          'Paragraph C explains that description comes first and background information afterwards.'
        ),
        q(
          33,
          'a suggestion about where benches should be placed',
          ['F'],
          ev(
            'positioned in front of the works rather than in the middle of the room',
            5
          ),
          'Paragraph F proposes placing seating in front of the works.'
        ),
        q(
          34,
          'a reference to a measurement of how long people look at artworks',
          ['A'],
          ev(
            'the median time spent in front of an individual work was under thirty seconds',
            0
          ),
          'Paragraph A reports timed observations of visitors.'
        ),
        q(
          35,
          'a financial reason why some museums may resist change',
          ['G'],
          ev('museums whose funding depends on visitor numbers', 6),
          'Paragraph G notes that funding linked to visitor numbers makes change unattractive.'
        ),
      ],
    }),
    group({
      id: 'r3-g3',
      type: 'matching-sentence-endings',
      from: 36,
      to: 38,
      instruction:
        'Complete each sentence with the correct ending, A-F, below. Write the correct letter, A-F, next to Questions 36-38.',
      options: opts(
        ['A', 'expressed a greater desire to visit the museum again.'],
        ['B', 'helps people notice details and remember the work longer.'],
        ['C', 'is available only to visitors who ask for it on their way out.'],
        ['D', 'could not recall the names of the artists.'],
        ['E', 'is mainly found in large national collections.'],
        ['F', 'is changed every few weeks to attract regular visitors.']
      ),
      questions: [
        q(
          36,
          'In the school study, the pupils who looked closely at three works',
          ['A'],
          ev('they also reported a stronger wish to return to the museum', 3),
          'The close-looking group reported a stronger wish to return.'
        ),
        q(
          37,
          'According to its practitioners, a period of close observation',
          ['B'],
          ev('people notice details they would never have seen otherwise', 2),
          'Practitioners say people notice hidden details and remember the work for longer.'
        ),
        q(
          38,
          "In the regional gallery's quiet room, information about the painting",
          ['C'],
          ev('Visitors can ask for information at the door as they leave.', 5),
          'There is no label; information is given only on request at the door when leaving.'
        ),
      ],
    }),
    group({
      id: 'r3-g4',
      type: 'multiple-choice',
      from: 39,
      to: 39,
      instruction: ABCD,
      options: opts(
        ['A', 'a school lesson'],
        ['B', 'sightseeing'],
        ['C', 'a shopping trip'],
        ['D', 'a race']
      ),
      questions: [
        q(
          39,
          'In paragraph B, the writer compares a typical museum visit to',
          ['B'],
          ev('The result is a kind of cultural sightseeing', 1),
          'The writer calls the typical visit a kind of cultural sightseeing.'
        ),
      ],
    }),
    group({
      id: 'r3-g5',
      type: 'multiple-choice',
      from: 40,
      to: 40,
      instruction: ABCD,
      options: opts(
        ['A', 'to report new research on visitor behaviour'],
        ['B', 'to criticise visitors for rushing through museums'],
        ['C', 'to argue that museums should make slower visits possible'],
        ['D', 'to explain how paintings should be arranged by date']
      ),
      questions: [
        q(
          40,
          "What is the writer's main purpose in the passage?",
          ['C'],
          ev('museums should make slowness possible and attractive', 4),
          'The whole passage builds the argument that museums should enable slower looking, not force or blame visitors.'
        ),
      ],
    }),
  ],
}

/* ------------------------------------------------------------------------ */
/* Writing                                                                   */
/* ------------------------------------------------------------------------ */

const writing1: IeltsSection = {
  ...sectionBase,
  key: 'writing-1',
  skill: 'writing',
  order: 1,
  title: 'Writing Task 1',
  listening: null,
  reading: null,
  writing: {
    task: 1,
    minWords: 150,
    prompt: [
      'You should spend about 20 minutes on this task.',
      '',
      '> The line graph shows the number of passengers, in thousands, who used three ferry routes in the Harlow Islands every two years between 2016 and 2024.',
      '>',
      '> Describe the main trends shown in the graph and compare the three routes where relevant.',
      '',
      'Write at least 150 words.',
    ].join('\n'),
    visual: {
      kind: 'line',
      title: 'Ferry passengers on three Harlow Islands routes, 2016-2024',
      xLabel: 'Year',
      yLabel: 'Passengers (thousands)',
      unit: 'thousand passengers',
      categories: ['2016', '2018', '2020', '2022', '2024'],
      series: [
        { name: 'North Sound', values: [420, 450, 310, 480, 530] },
        { name: 'Eastgate', values: [260, 240, 150, 200, 190] },
        { name: 'Pell Island', values: [90, 130, 120, 210, 300] },
      ],
    },
    sampleAnswer: [
      'The line graph compares how many passengers travelled on three ferry routes in the Harlow Islands, at two-year intervals from 2016 to 2024.',
      '',
      'Overall, North Sound was by far the busiest route throughout the period, while Pell Island showed the strongest growth. All three routes lost passengers in 2020, but only Eastgate failed to recover.',
      '',
      'In 2016, North Sound carried 420,000 passengers, rising slightly to 450,000 in 2018. After falling sharply to 310,000 in 2020, the figure rebounded to 480,000 in 2022 and reached a peak of 530,000 in 2024.',
      '',
      'Eastgate began the period with 260,000 passengers, but numbers declined steadily to a low of 150,000 in 2020. Despite a partial recovery to 200,000 two years later, the route ended at 190,000, well below its starting level.',
      '',
      'Pell Island, by contrast, was the least used route in 2016, with only 90,000 passengers. Apart from a minor dip to 120,000 in 2020, its traffic grew consistently, overtaking Eastgate in 2022 and more than tripling to 300,000 by 2024.',
    ].join('\n'),
  },
  groups: [],
}

const writing2: IeltsSection = {
  ...sectionBase,
  key: 'writing-2',
  skill: 'writing',
  order: 2,
  title: 'Writing Task 2',
  listening: null,
  reading: null,
  writing: {
    task: 2,
    minWords: 250,
    visual: null,
    prompt: [
      'You should spend about 40 minutes on this task.',
      '',
      'Write about the following topic:',
      '',
      '> Some cities now close their historic centres to private cars at weekends, leaving the streets to pedestrians, cyclists and public transport.',
      '>',
      '> To what extent do you agree or disagree that this is a positive development?',
      '',
      'Support your view with reasons and relevant examples from your own knowledge or experience.',
      '',
      'Write at least 250 words.',
    ].join('\n'),
    sampleAnswer: [
      'In a growing number of cities, the old centre becomes car-free at weekends, leaving the streets to people on foot, on bicycles and on buses. While this policy creates some genuine difficulties, I strongly agree that it is a positive development overall.',
      '',
      'The most obvious benefit is to the quality of urban life. Historic centres were usually built long before the motor car, with narrow streets and small squares that quickly become congested and noisy when traffic is allowed in. Removing cars for two days a week makes these areas safer for children and older people, reduces air pollution in places where crowds gather, and allows residents to enjoy their architecture rather than simply drive past it. In my own city, a weekend closure of the riverside district has turned a busy road into a space for street markets and musicians.',
      '',
      'There is also an economic argument. Shop owners often fear that fewer cars will mean fewer customers, but people who walk tend to stop more often and stay longer in an area than those who drive through it. Cafés and independent shops can therefore benefit from greater numbers of passers-by.',
      '',
      'Admittedly, such schemes can disadvantage certain groups. Disabled people, delivery drivers and residents who need to carry heavy goods may find the restrictions inconvenient. However, these problems can be addressed with exemptions, reliable public transport and parking areas just outside the closed zone, rather than by abandoning the idea altogether.',
      '',
      'In conclusion, although car-free weekends must be planned carefully to protect people with special needs, I believe the benefits for health, safety and local business clearly outweigh the drawbacks.',
    ].join('\n'),
  },
  groups: [],
}

export const IELTS_SAMPLE_TEST: IeltsTestContent = {
  slug: 'sample-academic-1',
  version: 1,
  status: 'published',
  source: 'manual',
  title: 'Sample Academic Test 1',
  series: '',
  track: 'academic',
  targetBand: 6.5,
  tags: ['sample'],
  description:
    'A complete, original IELTS Academic practice test with four listening parts, three reading passages and two writing tasks.',
  sections: [
    listening1,
    listening2,
    listening3,
    listening4,
    reading1,
    reading2,
    reading3,
    writing1,
    writing2,
  ],
}
