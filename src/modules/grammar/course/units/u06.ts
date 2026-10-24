import type { GrammarUnit } from '../types'

export const UNIT_06: GrammarUnit = {
  id: 'u06',
  order: 6,
  level: 'B1',
  title: 'Hiện tại hoàn thành',
  summary:
    'have/has + V3, ever/never, already/yet/just, for/since và khi nào dùng quá khứ đơn.',
  lessons: [
    {
      id: 'u06-l01',
      title: 'have/has + V3',
      titleEn: 'Present perfect form',
      summary: 'Cấu trúc và các V3 bất quy tắc thường gặp.',
      cards: [
        {
          kind: 'explain',
          id: 'u06-l01-c01',
          title: 'Quá khứ nối với hiện tại',
          body: 'Hiện tại hoàn thành nói về việc đã xảy ra mà kết quả vẫn liên quan đến bây giờ. I, you, we, they đi với have. He, she, it đi với has.',
          formula: 'Chủ ngữ + have/has + V3',
          examples: [
            {
              en: 'I have lost my keys.',
              vi: 'Tôi làm mất chìa khóa rồi (giờ không vào nhà được).',
            },
            {
              en: 'She has finished her report.',
              vi: 'Cô ấy làm xong báo cáo rồi.',
            },
          ],
          pitfall: {
            wrong: 'I have saw this film.',
            right: 'I have seen this film.',
            note: 'Sau have/has là V3 (cột thứ ba), không phải V2 của quá khứ đơn.',
          },
        },
        {
          kind: 'choice',
          id: 'u06-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'My sister ___ found a new job.',
          options: ['has', 'have', 'is'],
          answer: 0,
          explain: 'My sister là số ít, giống she, nên dùng has.',
        },
        {
          kind: 'fill',
          id: 'u06-l01-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'They ___ moved to a bigger flat.',
          answers: ['have'],
          bank: ['have', 'has', 'are'],
          explain: 'They đi với have: They have moved.',
        },
        {
          kind: 'explain',
          id: 'u06-l01-c04',
          title: 'V3 thường gặp',
          body: 'Động từ có quy tắc thêm -ed (worked, played). Động từ bất quy tắc phải học thuộc, và V3 nhiều khi khác V2.',
          examples: [
            { en: 'go - went - gone', vi: 'đi' },
            { en: 'see - saw - seen', vi: 'nhìn thấy' },
            { en: 'eat - ate - eaten', vi: 'ăn' },
            { en: 'write - wrote - written', vi: 'viết' },
            { en: 'do - did - done', vi: 'làm' },
          ],
        },
        {
          kind: 'fill',
          id: 'u06-l01-c05',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'I have ___ (eat) too much today.',
          answers: ['eaten'],
          explain: 'Sau have là V3. V3 của eat là eaten (V2 là ate).',
        },
        {
          kind: 'fix',
          id: 'u06-l01-c06',
          prompt: 'Chạm vào từ sai',
          tokens: ['Have', 'you', 'wrote', 'the', 'email', 'yet?'],
          wrongIndex: 2,
          correction: 'written',
          explain: 'Sau have cần V3. Wrote là V2, V3 của write là written.',
        },
        {
          kind: 'choice',
          id: 'u06-l01-c07',
          prompt: 'Chọn từ đúng',
          sentence: 'Nam has ___ to the bank.',
          options: ['gone', 'went', 'go'],
          answer: 0,
          explain: 'Sau has là V3. V3 của go là gone.',
        },
        {
          kind: 'explain',
          id: 'u06-l01-c08',
          title: 'Phủ định và câu hỏi',
          body: "Phủ định: have not (haven't), has not (hasn't). Câu hỏi: đưa Have/Has lên trước chủ ngữ. Không dùng do/does.",
          examples: [
            {
              en: "I haven't seen him today.",
              vi: 'Hôm nay tôi chưa gặp anh ấy.',
            },
            { en: 'Has she called you?', vi: 'Cô ấy gọi cho bạn chưa?' },
          ],
        },
        {
          kind: 'order',
          id: 'u06-l01-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Has your brother bought a car?',
          explain: 'Has đứng đầu, rồi chủ ngữ your brother, rồi V3 bought.',
        },
        {
          kind: 'fill',
          id: 'u06-l01-c10',
          prompt: 'Chọn từ đúng để điền',
          sentence: "He ___ done his homework, so he can't go out.",
          answers: ["hasn't", 'has not'],
          bank: ["hasn't", "haven't", "didn't"],
          explain:
            "He đi với has, phủ định là hasn't. Didn't không đi với V3 done.",
        },
        {
          kind: 'fix',
          id: 'u06-l01-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['My', 'parents', 'has', 'bought', 'a', 'new', 'TV.'],
          wrongIndex: 2,
          correction: 'have',
          explain: 'My parents là số nhiều, giống they, nên dùng have.',
        },
        {
          kind: 'choice',
          id: 'u06-l01-c12',
          prompt: 'Chọn V3 đúng của "take"',
          options: ['took', 'taken', 'taked'],
          answer: 1,
          explain: 'Take - took - taken. Took là V2, V3 là taken.',
        },
      ],
    },
    {
      id: 'u06-l02',
      title: 'ever và never',
      titleEn: 'Experiences with ever and never',
      summary: 'Kể và hỏi về trải nghiệm trong đời.',
      cards: [
        {
          kind: 'explain',
          id: 'u06-l02-c01',
          title: 'Đã bao giờ... chưa?',
          body: 'Khi nói về trải nghiệm trong đời mà không nói rõ lúc nào, dùng hiện tại hoàn thành. Ever là "đã bao giờ", never là "chưa bao giờ".',
          formula: 'Have you ever + V3? / Chủ ngữ + have never + V3',
          examples: [
            {
              en: 'Have you ever been to Japan?',
              vi: 'Bạn đã bao giờ đến Nhật chưa?',
            },
            {
              en: 'I have never eaten durian.',
              vi: 'Tôi chưa bao giờ ăn sầu riêng.',
            },
          ],
          pitfall: {
            wrong: 'I never eat sushi before.',
            right: 'I have never eaten sushi before.',
            note: '"Chưa từng... trước đây" là trải nghiệm, phải dùng have never + V3.',
          },
        },
        {
          kind: 'choice',
          id: 'u06-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence: '___ you ever tried Vietnamese coffee?',
          options: ['Have', 'Did', 'Are'],
          answer: 0,
          explain:
            'Tried là V3 và câu hỏi về trải nghiệm, nên dùng Have you ever + V3.',
        },
        {
          kind: 'fill',
          id: 'u06-l02-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'I have ___ seen snow in my life.',
          answers: ['never'],
          bank: ['never', 'ever', 'already'],
          explain:
            'Câu khẳng định nói "chưa bao giờ" thì dùng never. Ever chủ yếu dùng trong câu hỏi.',
        },
        {
          kind: 'explain',
          id: 'u06-l02-c04',
          title: 'been to hay gone to',
          body: 'Been to: đã đến đó và đã quay về. Gone to: đã đi và hiện vẫn đang ở đó hoặc đang trên đường.',
          examples: [
            {
              en: 'She has been to Paris twice.',
              vi: 'Cô ấy đã đến Paris hai lần (giờ đã về).',
            },
            {
              en: 'He has gone to Hanoi. He will be back on Monday.',
              vi: 'Anh ấy đi Hà Nội rồi. Thứ Hai anh ấy về.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u06-l02-c05',
          prompt: 'Chọn từ đúng',
          sentence: "Lan isn't here. She has ___ to the supermarket.",
          options: ['gone', 'been', 'went'],
          answer: 0,
          explain:
            'Lan không có ở đây, tức là vẫn đang ở siêu thị, nên dùng gone.',
        },
        {
          kind: 'fill',
          id: 'u06-l02-c06',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'Have you ever ___ (be) to Singapore?',
          answers: ['been'],
          explain:
            'Hỏi về trải nghiệm đã từng đến một nơi: Have you ever been to...?',
        },
        {
          kind: 'fix',
          id: 'u06-l02-c07',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'have', 'never', 'drove', 'a', 'car.'],
          wrongIndex: 3,
          correction: 'driven',
          explain: 'Sau have never là V3. V3 của drive là driven.',
        },
        {
          kind: 'explain',
          id: 'u06-l02-c08',
          title: 'Vị trí của ever và never',
          body: 'Ever và never đứng giữa have/has và V3. Never đã mang nghĩa phủ định nên không thêm not nữa.',
          examples: [
            {
              en: 'She has never met my parents.',
              vi: 'Cô ấy chưa bao giờ gặp bố mẹ tôi.',
            },
            {
              en: "This is the best film I've ever seen.",
              vi: 'Đây là bộ phim hay nhất tôi từng xem.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u06-l02-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Have you ever met a famous person?',
          explain: 'Have + chủ ngữ you + ever + V3 met.',
        },
        {
          kind: 'fix',
          id: 'u06-l02-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['Has', 'your', 'parents', 'ever', 'visited', 'Da', 'Lat?'],
          wrongIndex: 0,
          correction: 'Have',
          explain:
            'Your parents là số nhiều nên câu hỏi phải bắt đầu bằng Have.',
        },
        {
          kind: 'choice',
          id: 'u06-l02-c11',
          prompt: 'Chọn câu đúng',
          options: [
            "I haven't never seen it.",
            'I have never seen it.',
            'I have never saw it.',
          ],
          answer: 1,
          explain: 'Never đã là phủ định, không thêm not. Sau have là V3 seen.',
        },
        {
          kind: 'fill',
          id: 'u06-l02-c12',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'This is the most beautiful beach I have ___ seen.',
          answers: ['ever'],
          bank: ['ever', 'never', 'yet'],
          explain:
            'Sau so sánh nhất, dùng I have ever + V3 để nói "từng... trong đời".',
        },
      ],
    },
    {
      id: 'u06-l03',
      title: 'already, yet, just',
      titleEn: 'already, yet and just',
      summary: 'Rồi, chưa và vừa mới: nghĩa và vị trí.',
      cards: [
        {
          kind: 'explain',
          id: 'u06-l03-c01',
          title: 'just và already',
          body: 'Just là "vừa mới". Already là "rồi", thường hàm ý sớm hơn mong đợi. Cả hai đứng giữa have/has và V3.',
          formula: 'have/has + just/already + V3',
          examples: [
            { en: "I've just had lunch.", vi: 'Tôi vừa ăn trưa xong.' },
            { en: 'She has already left.', vi: 'Cô ấy đi rồi.' },
          ],
          pitfall: {
            wrong: 'I have already finish my work.',
            right: 'I have already finished my work.',
            note: 'Có already chen vào giữa thì vẫn phải dùng V3.',
          },
        },
        {
          kind: 'choice',
          id: 'u06-l03-c02',
          prompt: 'Chọn từ đúng',
          sentence: "A: Do you want some cake? B: No, thanks. I've ___ eaten.",
          options: ['just', 'yet', 'ever'],
          answer: 0,
          explain:
            'B vừa mới ăn xong nên không muốn ăn thêm: just. Yet không dùng trong câu khẳng định.',
        },
        {
          kind: 'order',
          id: 'u06-l03-c03',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I have just sent you an email.',
          explain: 'Just đứng giữa have và V3 sent.',
        },
        {
          kind: 'explain',
          id: 'u06-l03-c04',
          title: 'yet: chưa',
          body: 'Yet dùng trong câu phủ định (chưa) và câu hỏi (... chưa?). Yet thường đứng cuối câu.',
          examples: [
            {
              en: "I haven't decided yet.",
              vi: 'Tôi chưa quyết định.',
            },
            {
              en: 'Has the bus arrived yet?',
              vi: 'Xe buýt đến chưa?',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u06-l03-c05',
          prompt: 'Chọn từ đúng để điền',
          sentence: "I haven't packed my bag ___.",
          answers: ['yet'],
          bank: ['yet', 'already', 'just'],
          explain: 'Câu phủ định với nghĩa "chưa" dùng yet ở cuối câu.',
        },
        {
          kind: 'fill',
          id: 'u06-l03-c06',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: "We haven't ___ (decide) where to go yet.",
          answers: ['decided'],
          explain: "Sau haven't là V3. Decide có quy tắc nên V3 là decided.",
        },
        {
          kind: 'fix',
          id: 'u06-l03-c07',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'has', 'just', 'call', 'me.'],
          wrongIndex: 3,
          correction: 'called',
          explain: 'Sau has just vẫn cần V3: has just called.',
        },
        {
          kind: 'explain',
          id: 'u06-l03-c08',
          title: 'already trong câu hỏi',
          body: 'Hỏi bình thường "xong chưa?" thì dùng yet. Dùng already trong câu hỏi là để tỏ ra ngạc nhiên vì việc xong sớm quá.',
          examples: [
            {
              en: 'Have you finished yet?',
              vi: 'Bạn xong chưa?',
            },
            {
              en: 'Have you finished already? That was quick!',
              vi: 'Bạn xong rồi à? Nhanh thế!',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u06-l03-c09',
          prompt: 'Chọn cụm đúng',
          sentence: 'A: Is Minh still at work? B: No, he ___ gone home.',
          options: ['has just', 'has yet', "hasn't just"],
          answer: 0,
          explain:
            'Câu khẳng định "anh ấy vừa về nhà" dùng has just. Yet chỉ dùng trong câu phủ định và câu hỏi.',
        },
        {
          kind: 'fix',
          id: 'u06-l03-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'We',
            "haven't",
            'already',
            'received',
            'the',
            'package',
            'yet.',
          ],
          wrongIndex: 2,
          correction: '',
          explain:
            'Câu phủ định "chưa nhận" chỉ cần yet ở cuối. Already không dùng ở đây.',
        },
        {
          kind: 'order',
          id: 'u06-l03-c11',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Have you read the news yet?',
          explain:
            'Câu hỏi "đã... chưa?": Have + you + V3 read, yet ở cuối câu.',
        },
        {
          kind: 'choice',
          id: 'u06-l03-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'I have seen that film yet.',
            "I haven't seen that film yet.",
            "I didn't seen that film yet.",
          ],
          answer: 1,
          explain: "Yet đi với câu phủ định: haven't + V3 seen + yet.",
        },
      ],
    },
    {
      id: 'u06-l04',
      title: 'for hay since',
      titleEn: 'for and since',
      summary: 'Việc bắt đầu từ trước và vẫn còn đến bây giờ.',
      cards: [
        {
          kind: 'explain',
          id: 'u06-l04-c01',
          title: 'Kéo dài đến bây giờ',
          body: 'Việc bắt đầu trong quá khứ và vẫn còn đến hiện tại dùng hiện tại hoàn thành. For + khoảng thời gian, since + mốc bắt đầu.',
          formula: 'have/has + V3 + for (khoảng) / since (mốc)',
          examples: [
            {
              en: 'I have lived here for five years.',
              vi: 'Tôi sống ở đây được năm năm rồi.',
            },
            {
              en: 'She has worked here since 2020.',
              vi: 'Cô ấy làm ở đây từ năm 2020.',
            },
          ],
          pitfall: {
            wrong: 'I live here for five years.',
            right: 'I have lived here for five years.',
            note: 'Tiếng Việt nói "Tôi sống ở đây 5 năm rồi" nên dễ dùng hiện tại đơn. Việc kéo dài đến nay cần have + V3.',
          },
        },
        {
          kind: 'choice',
          id: 'u06-l04-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'We have known each other ___ ten years.',
          options: ['for', 'since', 'in'],
          answer: 0,
          explain: 'Ten years là một khoảng thời gian nên dùng for.',
        },
        {
          kind: 'fill',
          id: 'u06-l04-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'He has been sick ___ Monday.',
          answers: ['since'],
          bank: ['since', 'for', 'from'],
          explain: 'Monday là mốc bắt đầu nên dùng since.',
        },
        {
          kind: 'explain',
          id: 'u06-l04-c04',
          title: 'Mốc hay khoảng?',
          body: "Since + mốc: 2019, Monday, last week, 9 o'clock, I was a child. For + khoảng: two hours, three days, a long time.",
          examples: [
            {
              en: 'I have studied English since I was ten.',
              vi: 'Tôi học tiếng Anh từ năm mười tuổi.',
            },
            {
              en: 'We have waited for two hours.',
              vi: 'Chúng tôi đợi hai tiếng rồi.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u06-l04-c05',
          prompt: 'Chọn cụm đi được với since',
          options: ['three weeks', 'last summer', 'a long time'],
          answer: 1,
          explain:
            'Last summer là một mốc thời gian, nên đi với since. Hai cụm còn lại là khoảng thời gian, đi với for.',
        },
        {
          kind: 'fill',
          id: 'u06-l04-c06',
          prompt: 'Gõ từ còn thiếu (for hoặc since)',
          sentence: "I haven't seen her ___ we left school.",
          answers: ['since'],
          explain:
            'We left school là mốc trong quá khứ (lúc ra trường), nên dùng since.',
        },
        {
          kind: 'fix',
          id: 'u06-l04-c07',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'They',
            'have',
            'lived',
            'in',
            'Hanoi',
            'since',
            'ten',
            'years.',
          ],
          wrongIndex: 5,
          correction: 'for',
          explain: 'Ten years là khoảng thời gian, phải dùng for.',
        },
        {
          kind: 'explain',
          id: 'u06-l04-c08',
          title: 'Hỏi "bao lâu rồi?"',
          body: 'Muốn hỏi việc gì đã kéo dài bao lâu đến giờ, dùng How long + have/has + chủ ngữ + V3.',
          formula: 'How long + have/has + chủ ngữ + V3?',
          examples: [
            {
              en: 'How long have you studied English?',
              vi: 'Bạn học tiếng Anh bao lâu rồi?',
            },
            {
              en: 'How long has she worked here?',
              vi: 'Cô ấy làm ở đây bao lâu rồi?',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u06-l04-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'How long have you lived in this city?',
          explain: 'How long đứng đầu, rồi have + you + V3 lived.',
        },
        {
          kind: 'fill',
          id: 'u06-l04-c10',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'She ___ (work) at this hospital since 2018.',
          answers: ['has worked', 'has been working'],
          explain:
            'Since 2018 cho thấy việc kéo dài đến bây giờ, nên dùng has worked (has been working cũng đúng).',
        },
        {
          kind: 'fix',
          id: 'u06-l04-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'am', 'here', 'since', '8', "o'clock."],
          wrongIndex: 1,
          correction: 'have been',
          explain:
            "Ở đây từ 8 giờ đến giờ là việc kéo dài, cần hiện tại hoàn thành: I have been here since 8 o'clock.",
        },
        {
          kind: 'choice',
          id: 'u06-l04-c12',
          prompt: 'Chọn từ đúng',
          sentence: 'How long ___ your brother had that car?',
          options: ['has', 'does', 'is'],
          answer: 0,
          explain:
            'Had ở đây là V3 của have, và your brother là số ít, nên dùng How long has...?',
        },
      ],
    },
    {
      id: 'u06-l05',
      title: 'Hiện tại hoàn thành hay quá khứ đơn',
      titleEn: 'Present perfect or past simple',
      summary: 'Có mốc thời gian đã qua thì dùng quá khứ đơn.',
      cards: [
        {
          kind: 'explain',
          id: 'u06-l05-c01',
          title: 'Có nói "khi nào" không?',
          body: 'Có mốc thời gian đã qua (yesterday, last week, in 2019, two days ago) thì bắt buộc dùng quá khứ đơn. Không nói khi nào, chỉ quan tâm kết quả hay trải nghiệm, thì dùng hiện tại hoàn thành.',
          examples: [
            {
              en: 'I have visited Hue.',
              vi: 'Tôi từng đến Huế rồi (không nói khi nào).',
            },
            {
              en: 'I visited Hue in 2019.',
              vi: 'Tôi đến Huế năm 2019.',
            },
          ],
          pitfall: {
            wrong: 'I have visited Hue last year.',
            right: 'I visited Hue last year.',
            note: 'Có last year (mốc đã qua) thì không được dùng have + V3.',
          },
        },
        {
          kind: 'choice',
          id: 'u06-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'I ___ my keys yesterday.',
          options: ['lost', 'have lost', 'have lose'],
          answer: 0,
          explain: 'Yesterday là mốc đã qua nên dùng quá khứ đơn: lost.',
        },
        {
          kind: 'fill',
          id: 'u06-l05-c03',
          prompt: 'Chọn cụm đúng để điền',
          sentence: 'So far, she ___ to Korea three times.',
          answers: ['has been'],
          bank: ['has been', 'went', 'is'],
          explain:
            'So far (tính đến giờ) nối quá khứ với hiện tại, nên dùng hiện tại hoàn thành: has been.',
        },
        {
          kind: 'fix',
          id: 'u06-l05-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['We', 'have', 'met', 'two', 'years', 'ago.'],
          wrongIndex: 1,
          correction: '',
          explain:
            'Two years ago là mốc đã qua, nên dùng quá khứ đơn: We met two years ago. Bỏ have.',
        },
        {
          kind: 'explain',
          id: 'u06-l05-c05',
          title: 'Từ tín hiệu',
          body: 'Hiện tại hoàn thành hay đi với ever, never, already, yet, just, so far, recently, for, since. Quá khứ đơn đi với yesterday, last..., ... ago, in 2019 và câu hỏi When...?',
          examples: [
            {
              en: 'Have you seen Minh recently?',
              vi: 'Dạo này bạn có gặp Minh không?',
            },
            {
              en: 'I saw Minh last weekend.',
              vi: 'Tôi gặp Minh cuối tuần trước.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u06-l05-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'When ___ you start learning English?',
          options: ['did', 'have', 'has'],
          answer: 0,
          explain:
            'Câu hỏi When hỏi về một thời điểm cụ thể trong quá khứ, nên dùng quá khứ đơn: When did you start...?',
        },
        {
          kind: 'fill',
          id: 'u06-l05-c07',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'I ___ (see) that film last weekend.',
          answers: ['saw'],
          explain:
            'Last weekend là mốc đã qua nên dùng quá khứ đơn. V2 của see là saw.',
        },
        {
          kind: 'order',
          id: 'u06-l05-c08',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I have never been to Phu Quoc.',
          explain: 'Trải nghiệm không nói khi nào: have never + V3 been.',
        },
        {
          kind: 'explain',
          id: 'u06-l05-c09',
          title: 'Mở đầu và kể chi tiết',
          body: 'Thường mở đầu bằng hiện tại hoàn thành để đưa tin hay hỏi trải nghiệm. Khi kể chi tiết lúc nào, ở đâu thì chuyển sang quá khứ đơn.',
          examples: [
            {
              en: "I've lost my phone. I left it on the bus this morning.",
              vi: 'Tôi mất điện thoại rồi. Sáng nay tôi để quên trên xe buýt.',
            },
            {
              en: 'Have you ever been to Japan? Yes, I went there in 2022.',
              vi: 'Bạn từng đến Nhật chưa? Rồi, tôi đi năm 2022.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u06-l05-c10',
          prompt: 'Chọn từ đúng',
          sentence:
            'A: Have you ever eaten pho in Hanoi? B: Yes, I ___ it there last summer.',
          options: ['ate', 'have eaten', 'have ate'],
          answer: 0,
          explain:
            'B kể chi tiết có mốc last summer, nên chuyển sang quá khứ đơn: ate.',
        },
        {
          kind: 'fix',
          id: 'u06-l05-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'has', 'graduated', 'in', '2021.'],
          wrongIndex: 1,
          correction: '',
          explain:
            'In 2021 là mốc đã qua, nên dùng quá khứ đơn: She graduated in 2021. Bỏ has.',
        },
        {
          kind: 'fill',
          id: 'u06-l05-c12',
          prompt: 'Chọn cụm đúng để điền',
          sentence: 'I ___ five films so far this month.',
          answers: ['have watched'],
          bank: ['have watched', 'watched', 'watch'],
          explain:
            'So far this month: tháng này chưa hết, tính đến giờ. Dùng hiện tại hoàn thành: have watched.',
        },
        {
          kind: 'order',
          id: 'u06-l05-c13',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'When did you move to Ho Chi Minh City?',
          explain:
            'Hỏi When (lúc nào) dùng quá khứ đơn: When + did + you + V nguyên mẫu move.',
        },
      ],
    },
  ],
}
