import type { GrammarUnit } from '../types'

export const UNIT_08: GrammarUnit = {
  id: 'u08',
  order: 8,
  level: 'B1',
  title: 'Động từ khuyết thiếu',
  summary:
    "can, could, must, have to, should, may, might và cách phân biệt mustn't với don't have to.",
  lessons: [
    {
      id: 'u08-l01',
      title: 'can, could, be able to',
      titleEn: 'Ability: can, could, be able to',
      summary: 'Nói về khả năng ở hiện tại, quá khứ và tương lai.',
      cards: [
        {
          kind: 'explain',
          id: 'u08-l01-c01',
          title: 'Can là "có thể, biết"',
          body: 'Can nói về khả năng ở hiện tại. Sau can (và mọi động từ khuyết thiếu) dùng động từ nguyên mẫu: không to, không thêm -s, kể cả với he/she/it.',
          formula: "Chủ ngữ + can / can't + V nguyên mẫu",
          examples: [
            {
              en: 'She can speak three languages.',
              vi: 'Cô ấy nói được ba thứ tiếng.',
            },
            { en: "I can't swim.", vi: 'Tôi không biết bơi.' },
          ],
          pitfall: {
            wrong: 'She can speaks English.',
            right: 'She can speak English.',
            note: 'Sau can, động từ giữ nguyên mẫu, không thêm -s hay to.',
          },
        },
        {
          kind: 'choice',
          id: 'u08-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'My brother can ___ the guitar.',
          options: ['play', 'plays', 'to play'],
          answer: 0,
          explain: 'Sau can luôn dùng động từ nguyên mẫu: can play.',
        },
        {
          kind: 'fix',
          id: 'u08-l01-c03',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'can', 'to', 'swim', 'very', 'well.'],
          wrongIndex: 2,
          correction: '',
          explain: 'Sau can không có to. Câu đúng: He can swim very well.',
        },
        {
          kind: 'explain',
          id: 'u08-l01-c04',
          title: 'Could: khả năng trong quá khứ',
          body: "Could là quá khứ của can, dùng cho khả năng chung trong quá khứ. Phủ định là couldn't (could not).",
          examples: [
            {
              en: 'I could read when I was five.',
              vi: 'Tôi biết đọc từ năm năm tuổi.',
            },
            {
              en: "She couldn't sleep last night.",
              vi: 'Tối qua cô ấy không ngủ được.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u08-l01-c05',
          prompt: 'Chọn từ đúng',
          sentence: 'When I was a child, I ___ climb trees very fast.',
          answers: ['could'],
          bank: ['can', 'could', 'must'],
          explain:
            'When I was a child là quá khứ, nên dùng could, không dùng can.',
        },
        {
          kind: 'fill',
          id: 'u08-l01-c06',
          prompt: 'Gõ dạng phủ định quá khứ của can',
          sentence: 'Sorry, I ___ hear you. The music was too loud.',
          answers: ["couldn't", 'could not'],
          explain:
            "Việc xảy ra lúc nãy (the music was) nên dùng quá khứ: couldn't hear.",
        },
        {
          kind: 'explain',
          id: 'u08-l01-c07',
          title: 'Khi can không dùng được: be able to',
          body: 'Can không đứng sau will hay to được. Khi đó dùng be able to: will be able to, want to be able to. Với một việc cụ thể đã xoay xở làm được trong quá khứ, dùng was/were able to.',
          formula: 'will be able to / was able to + V nguyên mẫu',
          examples: [
            {
              en: 'I will be able to drive next year.',
              vi: 'Năm sau tôi sẽ lái xe được.',
            },
            {
              en: 'The road was closed, but we were able to find another way.',
              vi: 'Đường bị chặn, nhưng chúng tôi đã tìm được lối khác.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u08-l01-c08',
          prompt: 'Chọn từ đúng',
          sentence: 'After a few lessons, you will ___ swim.',
          options: ['can', 'be able to', 'could'],
          answer: 1,
          explain:
            'Sau will không dùng được can hay could, phải dùng be able to.',
        },
        {
          kind: 'fix',
          id: 'u08-l01-c09',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'want', 'to', 'can', 'speak', 'English', 'fluently.'],
          wrongIndex: 3,
          correction: 'be able to',
          explain:
            'Can không đứng sau to. Muốn nói "muốn có thể" thì dùng want to be able to.',
        },
        {
          kind: 'order',
          id: 'u08-l01-c10',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Will you be able to come tomorrow?',
          explain:
            'Câu hỏi tương lai: Will đứng đầu, rồi chủ ngữ you, rồi be able to + come.',
        },
        {
          kind: 'choice',
          id: 'u08-l01-c11',
          prompt: 'Chọn từ đúng',
          sentence:
            'The fire spread quickly, but everyone ___ get out of the building.',
          options: ['could', 'was able to', 'can'],
          answer: 1,
          explain:
            'Đây là một lần cụ thể đã xoay xở thoát ra được, nên dùng was able to. Ở câu khẳng định, could chỉ dùng cho khả năng chung trong quá khứ.',
        },
        {
          kind: 'fill',
          id: 'u08-l01-c12',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            'Lan ___ (not / can) come to the party yesterday because she was sick.',
          answers: [
            "couldn't",
            'could not',
            "wasn't able to",
            'was not able to',
          ],
          explain:
            "Yesterday là quá khứ nên phủ định của can là couldn't (hoặc wasn't able to).",
        },
        {
          kind: 'order',
          id: 'u08-l01-c13',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "My grandmother can't use a smartphone.",
          explain:
            "Can't đứng ngay sau chủ ngữ, rồi đến động từ nguyên mẫu use.",
        },
      ],
    },
    {
      id: 'u08-l02',
      title: 'must và have to',
      titleEn: 'Obligation: must and have to',
      summary: 'Nói "phải" ở hiện tại và quá khứ cho đúng.',
      cards: [
        {
          kind: 'explain',
          id: 'u08-l02-c01',
          title: 'Must và have to đều là "phải"',
          body: 'Must thường là người nói thấy cần, hoặc quy định ghi trên biển báo. Have to thường là bắt buộc từ bên ngoài như luật, lịch làm việc. Sau must dùng động từ nguyên mẫu, không có to.',
          formula: 'must + V / have to + V',
          examples: [
            {
              en: 'I must call my mum tonight.',
              vi: 'Tối nay tôi phải gọi cho mẹ.',
            },
            {
              en: 'We have to wear a uniform at school.',
              vi: 'Ở trường chúng tôi phải mặc đồng phục.',
            },
          ],
          pitfall: {
            wrong: 'You must to wear a helmet.',
            right: 'You must wear a helmet.',
            note: 'Must không đi với to. Chỉ have to mới có to.',
          },
        },
        {
          kind: 'choice',
          id: 'u08-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'All drivers must ___ a licence.',
          options: ['have', 'to have', 'has'],
          answer: 0,
          explain: 'Sau must dùng động từ nguyên mẫu: must have.',
        },
        {
          kind: 'fix',
          id: 'u08-l02-c03',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'must', 'finishes', 'the', 'report', 'today.'],
          wrongIndex: 2,
          correction: 'finish',
          explain: 'Sau must, động từ không thêm -s dù chủ ngữ là she.',
        },
        {
          kind: 'explain',
          id: 'u08-l02-c04',
          title: 'Have to chia theo chủ ngữ và thì',
          body: 'Have to đổi thành has to với he/she/it. Must không có dạng quá khứ, nên muốn nói "đã phải" thì dùng had to.',
          formula: 'has to / had to / will have to + V',
          examples: [
            {
              en: 'He has to get up at six.',
              vi: 'Anh ấy phải dậy lúc sáu giờ.',
            },
            {
              en: 'We had to wait for an hour.',
              vi: 'Chúng tôi đã phải chờ một tiếng.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u08-l02-c05',
          prompt: 'Chọn từ đúng',
          sentence: 'Yesterday I ___ work late because of a meeting.',
          answers: ['had to'],
          bank: ['must', 'had to', 'have to'],
          explain:
            'Yesterday là quá khứ. Must không có quá khứ, nên dùng had to.',
        },
        {
          kind: 'fill',
          id: 'u08-l02-c06',
          prompt: 'Điền dạng đúng của have to',
          sentence: 'My father ___ take his medicine every morning.',
          answers: ['has to'],
          explain:
            'My father là ngôi thứ ba số ít, việc lặp lại mỗi sáng, nên dùng has to.',
        },
        {
          kind: 'fix',
          id: 'u08-l02-c07',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'have', 'to', 'wear', 'a', 'suit', 'at', 'work.'],
          wrongIndex: 1,
          correction: 'has',
          explain: 'Chủ ngữ he nên have to phải đổi thành has to.',
        },
        {
          kind: 'explain',
          id: 'u08-l02-c08',
          title: 'Hỏi và phủ định với have to',
          body: 'Have to là động từ thường, nên câu hỏi và phủ định cần do, does hoặc did.',
          formula: 'Do/Does/Did + chủ ngữ + have to + V?',
          examples: [
            {
              en: 'Do you have to work today?',
              vi: 'Hôm nay bạn có phải đi làm không?',
            },
            { en: 'Did she have to pay?', vi: 'Cô ấy có phải trả tiền không?' },
          ],
        },
        {
          kind: 'order',
          id: 'u08-l02-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Do you have to work on Saturdays?',
          explain:
            'Câu hỏi với have to: Do đứng đầu, rồi chủ ngữ you, rồi have to + work.',
        },
        {
          kind: 'choice',
          id: 'u08-l02-c10',
          prompt: 'Chọn từ đúng',
          sentence: '___ she have to pay for the tickets?',
          options: ['Does', 'Has', 'Must'],
          answer: 0,
          explain: 'Have to hỏi bằng does với she: Does she have to...?',
        },
        {
          kind: 'fix',
          id: 'u08-l02-c11',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Last',
            'night',
            'I',
            'must',
            'walk',
            'home',
            'in',
            'the',
            'rain.',
          ],
          wrongIndex: 3,
          correction: 'had to',
          explain:
            'Last night là quá khứ. Must không có quá khứ, phải dùng had to.',
        },
        {
          kind: 'order',
          id: 'u08-l02-c12',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'We had to cancel our trip.',
          explain:
            'Had to (đã phải) đứng sau chủ ngữ, rồi đến động từ nguyên mẫu cancel.',
        },
        {
          kind: 'choice',
          id: 'u08-l02-c13',
          prompt: 'Chọn câu đúng',
          options: [
            "She doesn't have to cook tonight.",
            "She doesn't has to cook tonight.",
            "She don't have to cook tonight.",
          ],
          answer: 0,
          explain:
            "Với she dùng doesn't, và sau doesn't động từ về nguyên mẫu: have to.",
        },
      ],
    },
    {
      id: 'u08-l03',
      title: 'should và ought to',
      titleEn: 'Advice: should and ought to',
      summary: 'Đưa lời khuyên nhẹ nhàng, tự nhiên.',
      cards: [
        {
          kind: 'explain',
          id: 'u08-l03-c01',
          title: 'Should là "nên"',
          body: 'Dùng should để khuyên ai đó hoặc nói điều đúng đắn nên làm. Sau should là động từ nguyên mẫu.',
          formula: 'Chủ ngữ + should + V nguyên mẫu',
          examples: [
            { en: 'You should see a doctor.', vi: 'Bạn nên đi khám bác sĩ.' },
            { en: 'We should leave early.', vi: 'Chúng ta nên đi sớm.' },
          ],
          pitfall: {
            wrong: 'You should to rest.',
            right: 'You should rest.',
            note: 'Should không đi với to. Chỉ ought mới cần to.',
          },
        },
        {
          kind: 'choice',
          id: 'u08-l03-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'You look tired. You should ___ to bed early.',
          options: ['go', 'to go', 'going'],
          answer: 0,
          explain: 'Sau should dùng động từ nguyên mẫu: should go.',
        },
        {
          kind: 'fix',
          id: 'u08-l03-c03',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', "shouldn't", 'to', 'stay', 'up', 'so', 'late.'],
          wrongIndex: 2,
          correction: '',
          explain:
            "Sau shouldn't không có to. Câu đúng: He shouldn't stay up so late.",
        },
        {
          kind: 'explain',
          id: 'u08-l03-c04',
          title: "Shouldn't và Should I...?",
          body: 'Shouldn\'t nghĩa là "không nên". Muốn xin lời khuyên, đảo should lên đầu: Should I...?',
          examples: [
            {
              en: "You shouldn't eat so much sugar.",
              vi: 'Bạn không nên ăn nhiều đường như vậy.',
            },
            {
              en: 'Should I take the job?',
              vi: 'Tôi có nên nhận công việc đó không?',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u08-l03-c05',
          prompt: 'Chọn từ đúng',
          sentence: "It's very late. You ___ drink coffee now.",
          answers: ["shouldn't", 'should not'],
          bank: ['should', "shouldn't", 'must'],
          explain:
            "Đã khuya, uống cà phê sẽ khó ngủ, nên lời khuyên là shouldn't (không nên).",
        },
        {
          kind: 'order',
          id: 'u08-l03-c06',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Should I bring anything to the party?',
          explain:
            'Xin lời khuyên: Should đứng đầu, rồi chủ ngữ I, rồi động từ bring.',
        },
        {
          kind: 'explain',
          id: 'u08-l03-c07',
          title: 'Ought to: giống should',
          body: 'Ought to có nghĩa như should, nghe hơi trang trọng hơn. Khác should, ought luôn đi kèm to.',
          formula: 'ought to + V nguyên mẫu',
          examples: [
            { en: 'You ought to apologise.', vi: 'Bạn nên xin lỗi.' },
            {
              en: 'We ought to save more money.',
              vi: 'Chúng ta nên tiết kiệm nhiều hơn.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u08-l03-c08',
          prompt: 'Gõ từ còn thiếu',
          sentence: 'You ought ___ call your parents more often.',
          answers: ['to'],
          explain: 'Ought luôn đi với to: ought to call.',
        },
        {
          kind: 'fix',
          id: 'u08-l03-c09',
          prompt: 'Chạm vào từ sai',
          tokens: ['You', 'ought', 'to', 'telling', 'her', 'the', 'truth.'],
          wrongIndex: 3,
          correction: 'tell',
          explain: 'Sau ought to dùng động từ nguyên mẫu: ought to tell.',
        },
        {
          kind: 'choice',
          id: 'u08-l03-c10',
          prompt: 'Chọn lời khuyên đúng',
          sentence: 'My tooth hurts.',
          options: [
            'You should see a dentist.',
            'You should seeing a dentist.',
            'You ought see a dentist.',
          ],
          answer: 0,
          explain:
            'Should + động từ nguyên mẫu. Ought thì phải có to: ought to see.',
        },
        {
          kind: 'explain',
          id: 'u08-l03-c11',
          title: 'Should nhẹ hơn must',
          body: 'Should chỉ là lời khuyên, người nghe có thể không làm. Must và have to là bắt buộc. Khi chỉ góp ý, dùng should cho lịch sự.',
          examples: [
            {
              en: 'I think you should try again.',
              vi: 'Tôi nghĩ bạn nên thử lại.',
            },
            {
              en: 'You must show your passport.',
              vi: 'Bạn bắt buộc phải xuất trình hộ chiếu.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u08-l03-c12',
          prompt: 'Chọn từ đúng',
          sentence:
            "It isn't a rule, just my opinion: I think you ___ ask your teacher.",
          options: ['should', 'have to', 'must'],
          answer: 0,
          explain:
            'Người nói chỉ góp ý, không phải quy định, nên dùng should. Have to và must là bắt buộc.',
        },
        {
          kind: 'fill',
          id: 'u08-l03-c13',
          prompt: 'Chọn từ đúng',
          sentence: 'In my opinion, the city ___ build more parks.',
          answers: ['should'],
          bank: ['should', 'ought', 'should to'],
          explain:
            'Nêu ý kiến "nên làm gì": should + V. Ought thiếu to, còn should to là sai.',
        },
      ],
    },
    {
      id: 'u08-l04',
      title: 'may, might, could (khả năng)',
      titleEn: 'Possibility: may, might, could',
      summary: 'Nói "có lẽ, có thể" khi không chắc chắn.',
      cards: [
        {
          kind: 'explain',
          id: 'u08-l04-c01',
          title: 'Có lẽ: may, might, could',
          body: 'Khi không chắc một việc có xảy ra hay không, dùng may, might hoặc could. Might thường nghe ít chắc hơn may. Sau chúng là động từ nguyên mẫu.',
          formula: 'Chủ ngữ + may / might / could + V nguyên mẫu',
          examples: [
            {
              en: 'It might rain this afternoon.',
              vi: 'Chiều nay có thể trời mưa.',
            },
            { en: 'She may be at home.', vi: 'Có lẽ cô ấy đang ở nhà.' },
          ],
          pitfall: {
            wrong: 'It might rains tomorrow.',
            right: 'It might rain tomorrow.',
            note: 'Sau might, may, could không thêm -s.',
          },
        },
        {
          kind: 'choice',
          id: 'u08-l04-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'Take an umbrella. It ___ later.',
          options: ['might rain', 'might rains', 'might to rain'],
          answer: 0,
          explain:
            'Might + động từ nguyên mẫu, không -s, không to: might rain.',
        },
        {
          kind: 'fill',
          id: 'u08-l04-c03',
          prompt: 'Chọn từ đúng',
          sentence: "I'm not sure, but Nam ___ be at the library.",
          answers: ['may', 'might', 'could'],
          bank: ['may', 'must', 'can'],
          explain:
            "I'm not sure nên dùng may (có lẽ). Must là chắc chắn, còn can không dùng để đoán một việc cụ thể.",
        },
        {
          kind: 'explain',
          id: 'u08-l04-c04',
          title: 'Có lẽ không: may not, might not',
          body: 'Thêm not sau may hoặc might để nói "có lẽ không". Cẩn thận: couldn\'t lại nghĩa là "không thể nào", mạnh hơn nhiều.',
          examples: [
            { en: 'He might not come.', vi: 'Có lẽ anh ấy không đến.' },
            {
              en: 'She may not know the answer.',
              vi: 'Có lẽ cô ấy không biết câu trả lời.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u08-l04-c05',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'might', 'not', 'comes', 'to', 'the', 'meeting.'],
          wrongIndex: 3,
          correction: 'come',
          explain: 'Sau might not vẫn là động từ nguyên mẫu: might not come.',
        },
        {
          kind: 'fill',
          id: 'u08-l04-c06',
          prompt: 'Gõ might hoặc may ở dạng phủ định (có lẽ không)',
          sentence: "Don't wait for me. I ___ be back before ten.",
          answers: ['might not', 'may not', "mightn't"],
          explain:
            'Người nói không chắc mình về kịp, nên dùng might not hoặc may not (có lẽ không).',
        },
        {
          kind: 'explain',
          id: 'u08-l04-c07',
          title: 'Maybe hay may be?',
          body: 'Maybe (viết liền) là trạng từ "có lẽ", thường đứng đầu câu. May be (tách rời) là động từ may + be, đứng sau chủ ngữ.',
          examples: [
            { en: 'Maybe he is busy.', vi: 'Có lẽ anh ấy bận.' },
            { en: 'He may be busy.', vi: 'Anh ấy có lẽ đang bận.' },
          ],
        },
        {
          kind: 'choice',
          id: 'u08-l04-c08',
          prompt: 'Chọn từ đúng',
          sentence: '___ she is stuck in traffic.',
          options: ['Maybe', 'May be', 'Might'],
          answer: 0,
          explain:
            'Câu đã có động từ is, nên đầu câu cần trạng từ Maybe (viết liền).',
        },
        {
          kind: 'fix',
          id: 'u08-l04-c09',
          prompt: 'Chạm vào từ sai',
          tokens: ['The', 'answer', 'maybe', 'wrong.'],
          wrongIndex: 2,
          correction: 'may be',
          explain:
            'Câu thiếu động từ. Sau chủ ngữ phải dùng may be (tách rời), không phải maybe.',
        },
        {
          kind: 'order',
          id: 'u08-l04-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'They might move to Da Nang next year.',
          alternatives: ['Next year they might move to Da Nang.'],
          explain:
            'Might đứng sau chủ ngữ They, rồi đến động từ nguyên mẫu move.',
        },
        {
          kind: 'choice',
          id: 'u08-l04-c11',
          prompt: 'Chọn từ đúng',
          sentence: "Where is Mai? - I don't know. She ___ in her room.",
          options: ['might be', 'might is', 'might being'],
          answer: 0,
          explain: 'Sau might dùng động từ nguyên mẫu be, không dùng is.',
        },
        {
          kind: 'fill',
          id: 'u08-l04-c12',
          prompt: 'Chọn từ đúng',
          sentence: 'Prices ___ go up next month, so buy now.',
          answers: ['could', 'may', 'might'],
          bank: ['could', "can't", 'must'],
          explain:
            "Giá có thể tăng (chưa chắc) nên khuyên mua ngay: could. Can't (không thể nào) làm câu mất logic.",
        },
      ],
    },
    {
      id: 'u08-l05',
      title: "mustn't hay don't have to",
      titleEn: "mustn't vs don't have to",
      summary: 'Phân biệt "cấm" với "không cần".',
      cards: [
        {
          kind: 'explain',
          id: 'u08-l05-c01',
          title: 'Cấm hay không cần?',
          body: 'Mustn\'t là "không được, cấm". Don\'t have to là "không cần, không bắt buộc": làm cũng được, không làm cũng được.',
          examples: [
            { en: "You mustn't park here.", vi: 'Bạn không được đỗ xe ở đây.' },
            {
              en: "You don't have to come early.",
              vi: 'Bạn không cần đến sớm.',
            },
          ],
          pitfall: {
            wrong: "It's a holiday tomorrow, so you mustn't come to work.",
            right:
              "It's a holiday tomorrow, so you don't have to come to work.",
            note: 'Muốn nói "không cần" thì dùng don\'t have to. Mustn\'t là cấm.',
          },
        },
        {
          kind: 'choice',
          id: 'u08-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: "You ___ smoke in the hospital. It's not allowed.",
          options: ["mustn't", "don't have to", "doesn't have to"],
          answer: 0,
          explain: "It's not allowed (bị cấm) nên dùng mustn't.",
        },
        {
          kind: 'choice',
          id: 'u08-l05-c03',
          prompt: 'Chọn từ đúng',
          sentence: 'Tomorrow is Sunday, so I ___ get up early.',
          options: ["mustn't", "don't have to", "haven't to"],
          answer: 1,
          explain:
            "Chủ nhật thì không cần dậy sớm, chứ không phải bị cấm, nên dùng don't have to.",
        },
        {
          kind: 'fill',
          id: 'u08-l05-c04',
          prompt: 'Chọn từ đúng',
          sentence: 'The museum is free. You ___ pay.',
          answers: ["don't have to", 'do not have to'],
          bank: ["mustn't", "don't have to", "haven't"],
          explain:
            "Bảo tàng miễn phí nên không cần trả tiền: don't have to. Mustn't nghĩa là cấm trả, không hợp lý.",
        },
        {
          kind: 'explain',
          id: 'u08-l05-c05',
          title: "Chia don't have to",
          body: "Don't have to đổi theo chủ ngữ và thì: doesn't have to (he/she/it), didn't have to (quá khứ). Mustn't thì không đổi.",
          examples: [
            {
              en: "She doesn't have to work on Fridays.",
              vi: 'Cô ấy không phải làm việc vào thứ Sáu.',
            },
            {
              en: "We didn't have to wait.",
              vi: 'Chúng tôi đã không phải chờ.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u08-l05-c06',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', "don't", 'have', 'to', 'work', 'on', 'Sundays.'],
          wrongIndex: 1,
          correction: "doesn't",
          explain: "Chủ ngữ she nên phải dùng doesn't have to.",
        },
        {
          kind: 'fill',
          id: 'u08-l05-c07',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            'The teacher cancelled the test, so we ___ (not / have to) study last night.',
          answers: ["didn't have to", 'did not have to'],
          explain:
            'Last night là quá khứ và nghĩa là "không cần", nên dùng didn\'t have to.',
        },
        {
          kind: 'explain',
          id: 'u08-l05-c08',
          title: "Don't need to và needn't",
          body: "Don't need to và needn't cũng nghĩa là \"không cần\", giống don't have to. Sau needn't không có to.",
          examples: [
            {
              en: "You don't need to bring food.",
              vi: 'Bạn không cần mang đồ ăn.',
            },
            { en: "You needn't hurry.", vi: 'Bạn không cần vội.' },
          ],
        },
        {
          kind: 'fill',
          id: 'u08-l05-c09',
          prompt: 'Chọn từ đúng',
          sentence: 'Passengers ___ open the doors while the train is moving.',
          answers: ["mustn't", 'must not'],
          bank: ["mustn't", "don't have to", "needn't"],
          explain:
            "Mở cửa khi tàu đang chạy là nguy hiểm, bị cấm, nên dùng mustn't.",
        },
        {
          kind: 'order',
          id: 'u08-l05-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "You don't have to bring anything.",
          explain: "Don't have to đứng sau chủ ngữ, rồi đến động từ bring.",
        },
        {
          kind: 'fix',
          id: 'u08-l05-c11',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'You',
            "needn't",
            'touch',
            'that',
            'wire.',
            "It's",
            'dangerous.',
          ],
          wrongIndex: 1,
          correction: "mustn't",
          explain:
            'Sợi dây nguy hiểm nên là cấm chạm: mustn\'t. Needn\'t chỉ là "không cần".',
        },
        {
          kind: 'choice',
          id: 'u08-l05-c12',
          prompt: 'Chọn câu có nghĩa "Bạn không được kể với ai"',
          options: [
            "You mustn't tell anyone.",
            "You don't have to tell anyone.",
            "You needn't tell anyone.",
          ],
          answer: 0,
          explain:
            'Không được (cấm) là mustn\'t. Hai câu kia nghĩa là "không cần kể".',
        },
        {
          kind: 'order',
          id: 'u08-l05-c13',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "Visitors mustn't feed the animals.",
          explain:
            "Mustn't đứng sau chủ ngữ Visitors, rồi đến động từ nguyên mẫu feed.",
        },
      ],
    },
  ],
}
