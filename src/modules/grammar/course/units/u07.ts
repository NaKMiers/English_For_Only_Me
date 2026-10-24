import type { GrammarUnit } from '../types'

export const UNIT_07: GrammarUnit = {
  id: 'u07',
  order: 7,
  level: 'B1',
  title: 'Tính từ, trạng từ và so sánh',
  summary:
    'Tính từ hay trạng từ, so sánh hơn, so sánh nhất, as...as và -ed hay -ing.',
  lessons: [
    {
      id: 'u07-l01',
      title: 'Tính từ hay trạng từ',
      titleEn: 'Adjectives and adverbs',
      summary: 'careful hay carefully, good hay well, hard hay hardly.',
      cards: [
        {
          kind: 'explain',
          id: 'u07-l01-c01',
          title: 'Bổ nghĩa cho cái gì?',
          body: 'Tính từ bổ nghĩa cho danh từ (a careful driver). Trạng từ bổ nghĩa cho động từ (drive carefully), thường được tạo bằng tính từ + -ly.',
          formula: 'tính từ + danh từ / động từ + trạng từ',
          examples: [
            {
              en: 'She is a quiet student.',
              vi: 'Cô ấy là một học sinh trầm tính.',
            },
            { en: 'She speaks quietly.', vi: 'Cô ấy nói nhỏ nhẹ.' },
          ],
          pitfall: {
            wrong: 'He drives very careful.',
            right: 'He drives very carefully.',
            note: 'Tiếng Việt không đổi dạng từ ("lái cẩn thận"), nhưng tiếng Anh bổ nghĩa cho động từ drives phải dùng trạng từ.',
          },
        },
        {
          kind: 'choice',
          id: 'u07-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'Please drive ___. The road is wet.',
          options: ['careful', 'carefully', 'care'],
          answer: 1,
          explain:
            'Từ cần điền bổ nghĩa cho động từ drive, nên dùng trạng từ carefully.',
        },
        {
          kind: 'fill',
          id: 'u07-l01-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'He answered the question ___.',
          answers: ['correctly'],
          bank: ['correctly', 'correct', 'correction'],
          explain:
            'Bổ nghĩa cho động từ answered (trả lời thế nào?) nên dùng trạng từ correctly.',
        },
        {
          kind: 'explain',
          id: 'u07-l01-c04',
          title: 'Sau be, look, feel... dùng tính từ',
          body: 'Sau be và các động từ chỉ trạng thái như look, feel, seem, sound, taste, smell, ta dùng tính từ, không dùng trạng từ.',
          examples: [
            { en: 'You look tired.', vi: 'Trông bạn mệt đấy.' },
            {
              en: 'This soup tastes delicious.',
              vi: 'Món súp này ngon quá.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u07-l01-c05',
          prompt: 'Chọn từ đúng',
          sentence: 'This cake tastes ___.',
          options: ['wonderful', 'wonderfully', 'wonder'],
          answer: 0,
          explain:
            'Sau taste (có vị) dùng tính từ, vì nó mô tả cái bánh chứ không mô tả hành động.',
        },
        {
          kind: 'fix',
          id: 'u07-l01-c06',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'sang', 'beautiful', 'at', 'the', 'concert.'],
          wrongIndex: 2,
          correction: 'beautifully',
          explain:
            'Bổ nghĩa cho động từ sang (hát thế nào?) nên dùng trạng từ beautifully.',
        },
        {
          kind: 'explain',
          id: 'u07-l01-c07',
          title: 'good/well, hard/hardly, fast',
          body: "Trạng từ của good là well. Hard và fast vừa là tính từ vừa là trạng từ, không thêm -ly. Hardly có nghĩa khác hẳn: 'hầu như không'.",
          examples: [
            {
              en: 'She plays the piano well.',
              vi: 'Cô ấy chơi piano giỏi.',
            },
            {
              en: 'He works hard, but he hardly sleeps.',
              vi: 'Anh ấy làm việc chăm chỉ nhưng hầu như không ngủ.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u07-l01-c08',
          prompt: 'Điền trạng từ của tính từ trong ngoặc',
          sentence: 'My brother is a good swimmer. He swims very ___ (good).',
          answers: ['well'],
          explain:
            'Bổ nghĩa cho động từ swims cần trạng từ. Trạng từ của good là well.',
        },
        {
          kind: 'choice',
          id: 'u07-l01-c09',
          prompt: 'Chọn câu có nghĩa "Anh ấy làm việc rất chăm chỉ"',
          options: [
            'He works very hard.',
            'He works very hardly.',
            'He hardly works.',
          ],
          answer: 0,
          explain:
            'Hard vừa là tính từ vừa là trạng từ. He hardly works lại có nghĩa là anh ấy hầu như không làm việc.',
        },
        {
          kind: 'fix',
          id: 'u07-l01-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'runs', 'fastly', 'every', 'morning.'],
          wrongIndex: 2,
          correction: 'fast',
          explain: 'Không có từ fastly. Trạng từ của fast vẫn là fast.',
        },
        {
          kind: 'order',
          id: 'u07-l01-c11',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'She speaks English very well.',
          explain:
            'Tân ngữ English đứng ngay sau động từ speaks, trạng từ very well đứng cuối câu.',
        },
        {
          kind: 'fill',
          id: 'u07-l01-c12',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Lan is a ___ driver. She never has accidents.',
          answers: ['careful'],
          bank: ['careful', 'carefully', 'care'],
          explain:
            'Từ cần điền đứng trước danh từ driver, nên dùng tính từ careful.',
        },
      ],
    },
    {
      id: 'u07-l02',
      title: 'So sánh hơn',
      titleEn: 'Comparatives',
      summary: '-er hay more, than, và better, worse, further.',
      cards: [
        {
          kind: 'explain',
          id: 'u07-l02-c01',
          title: '-er hay more',
          body: 'Tính từ ngắn (một âm tiết) thêm -er. Tính từ dài (từ hai âm tiết trở lên, trừ đuôi -y) dùng more. Sau đó dùng than để so với đối tượng kia.',
          formula: 'tính từ-er / more + tính từ + than',
          examples: [
            {
              en: 'Hanoi is colder than Saigon in winter.',
              vi: 'Mùa đông Hà Nội lạnh hơn Sài Gòn.',
            },
            {
              en: 'This phone is more expensive than that one.',
              vi: 'Cái điện thoại này đắt hơn cái kia.',
            },
          ],
          pitfall: {
            wrong: 'She is more taller than me.',
            right: 'She is taller than me.',
            note: 'Không dùng more và -er cùng lúc.',
          },
        },
        {
          kind: 'choice',
          id: 'u07-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'My room is ___ than yours.',
          options: ['bigger', 'more big', 'biger'],
          answer: 0,
          explain:
            'Big là tính từ ngắn nên thêm -er, và gấp đôi chữ g: bigger.',
        },
        {
          kind: 'fill',
          id: 'u07-l02-c03',
          prompt: 'Điền dạng so sánh hơn của tính từ trong ngoặc',
          sentence: 'For me, English is ___ (easy) than Chinese.',
          answers: ['easier'],
          explain: 'Tính từ tận cùng -y đổi y thành i rồi thêm -er: easier.',
        },
        {
          kind: 'explain',
          id: 'u07-l02-c04',
          title: 'Chính tả khi thêm -er',
          body: 'Tận cùng -y đổi thành -ier (happy, happier). Một nguyên âm + một phụ âm thì gấp đôi phụ âm (hot, hotter). Tận cùng -e chỉ thêm -r (nice, nicer).',
          examples: [
            {
              en: 'I feel happier today.',
              vi: 'Hôm nay tôi thấy vui hơn.',
            },
            {
              en: 'This café is nicer than the old one.',
              vi: 'Quán cà phê này đẹp hơn quán cũ.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u07-l02-c05',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Today is ___ than yesterday.',
          answers: ['hotter'],
          bank: ['hotter', 'hoter', 'more hot'],
          explain:
            'Hot có một nguyên âm và một phụ âm cuối, nên gấp đôi t: hotter.',
        },
        {
          kind: 'fix',
          id: 'u07-l02-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'This',
            'test',
            'is',
            'more',
            'difficult',
            'that',
            'the',
            'last',
            'one.',
          ],
          wrongIndex: 5,
          correction: 'than',
          explain: 'So sánh hơn dùng than (hơn), không phải that.',
        },
        {
          kind: 'explain',
          id: 'u07-l02-c07',
          title: 'Ba dạng bất quy tắc',
          body: 'Good thành better, bad thành worse, far thành further (hoặc farther). Không thêm -er hay more cho ba từ này.',
          examples: [
            {
              en: 'Your English is better than mine.',
              vi: 'Tiếng Anh của bạn giỏi hơn của tôi.',
            },
            {
              en: 'The traffic is worse today.',
              vi: 'Hôm nay kẹt xe tệ hơn.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u07-l02-c08',
          prompt: 'Chọn từ đúng',
          sentence: "The weather is ___ than yesterday. It's raining heavily.",
          options: ['worse', 'badder', 'more bad'],
          answer: 0,
          explain:
            'So sánh hơn của bad là worse, không có badder hay more bad.',
        },
        {
          kind: 'fill',
          id: 'u07-l02-c09',
          prompt: 'Điền dạng so sánh hơn của tính từ trong ngoặc',
          sentence: 'My new job is much ___ (good) than my old one.',
          answers: ['better'],
          explain: 'So sánh hơn của good là better.',
        },
        {
          kind: 'order',
          id: 'u07-l02-c10',
          prompt: 'Sắp xếp thành câu "Lan tự tin hơn chị gái mình"',
          sentence: 'Lan is more confident than her sister.',
          explain:
            'Confident là tính từ dài nên dùng more confident, rồi than + đối tượng so sánh.',
        },
        {
          kind: 'fix',
          id: 'u07-l02-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'runs', 'more', 'faster', 'than', 'me.'],
          wrongIndex: 2,
          correction: '',
          explain:
            'Faster đã là so sánh hơn rồi, không thêm more: He runs faster than me.',
        },
        {
          kind: 'choice',
          id: 'u07-l02-c12',
          prompt: 'Chọn từ đúng',
          sentence: 'The station is ___ than I thought.',
          options: ['further', 'more far', 'farer'],
          answer: 0,
          explain:
            'Far là tính từ bất quy tắc: further (hoặc farther). Không có more far hay farer.',
        },
      ],
    },
    {
      id: 'u07-l03',
      title: 'So sánh nhất',
      titleEn: 'Superlatives',
      summary: 'the -est, the most và the best, the worst.',
      cards: [
        {
          kind: 'explain',
          id: 'u07-l03-c01',
          title: 'Nhất trong một nhóm',
          body: 'Tính từ ngắn: the + tính từ-est. Tính từ dài: the most + tính từ. Chữ the luôn đi kèm.',
          formula: 'the + tính từ-est / the most + tính từ',
          examples: [
            {
              en: 'Everest is the highest mountain in the world.',
              vi: 'Everest là ngọn núi cao nhất thế giới.',
            },
            {
              en: 'This is the most interesting book on the list.',
              vi: 'Đây là cuốn sách thú vị nhất trong danh sách.',
            },
          ],
          pitfall: {
            wrong: 'He is tallest student in my class.',
            right: 'He is the tallest student in my class.',
            note: 'Tiếng Việt chỉ nói "cao nhất", nhưng tiếng Anh phải có the trước so sánh nhất.',
          },
        },
        {
          kind: 'choice',
          id: 'u07-l03-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'This is one of ___ streets in Hanoi.',
          options: ['the busiest', 'the busier', 'busiest'],
          answer: 0,
          explain:
            'One of + so sánh nhất (một trong những... nhất). Busy đổi y thành i: the busiest, và cần có the.',
        },
        {
          kind: 'fill',
          id: 'u07-l03-c03',
          prompt: 'Điền dạng so sánh nhất của tính từ trong ngoặc',
          sentence:
            'This is ___ (expensive) restaurant in town. One meal costs five million dong!',
          answers: ['the most expensive'],
          explain:
            'Expensive là tính từ dài, nên so sánh nhất là the most expensive.',
        },
        {
          kind: 'explain',
          id: 'u07-l03-c04',
          title: 'Bất quy tắc: the best, the worst',
          body: 'Good thành the best, bad thành the worst, far thành the furthest (hoặc the farthest).',
          examples: [
            {
              en: 'She is the best player on the team.',
              vi: 'Cô ấy là cầu thủ giỏi nhất đội.',
            },
            {
              en: 'That was the worst day of my life.',
              vi: 'Đó là ngày tệ nhất đời tôi.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u07-l03-c05',
          prompt: 'Chọn cụm đúng để điền',
          sentence: 'It was ___ film I have ever seen. I loved it!',
          answers: ['the best'],
          bank: ['the best', 'the worst', 'the better'],
          explain:
            'I loved it cho thấy đây là phim hay nhất: the best. The better không dùng cho so sánh nhất.',
        },
        {
          kind: 'fix',
          id: 'u07-l03-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'This',
            'is',
            'the',
            'most',
            'cheapest',
            'hotel',
            'in',
            'the',
            'area.',
          ],
          wrongIndex: 3,
          correction: '',
          explain:
            'Cheapest đã là so sánh nhất, không thêm most: the cheapest hotel.',
        },
        {
          kind: 'explain',
          id: 'u07-l03-c07',
          title: 'in hay of sau so sánh nhất',
          body: 'Sau so sánh nhất, dùng in với nơi chốn hoặc một nhóm (in the world, in my class). Dùng of với một khoảng thời gian (of the year, of my life).',
          examples: [
            {
              en: 'He is the best student in the class.',
              vi: 'Cậu ấy là học sinh giỏi nhất lớp.',
            },
            {
              en: 'It was the hottest day of the year.',
              vi: 'Đó là ngày nóng nhất trong năm.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u07-l03-c08',
          prompt: 'Chọn từ đúng',
          sentence: 'Ho Chi Minh City is the largest city ___ Vietnam.',
          options: ['in', 'of', 'than'],
          answer: 0,
          explain:
            'Vietnam là nơi chốn, nên dùng in sau so sánh nhất. Than chỉ dùng cho so sánh hơn.',
        },
        {
          kind: 'order',
          id: 'u07-l03-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'What is the tallest building in Vietnam?',
          alternatives: ['What building is the tallest in Vietnam?'],
          explain:
            'What is đứng đầu, rồi the tallest building, nơi chốn in Vietnam ở cuối.',
        },
        {
          kind: 'fill',
          id: 'u07-l03-c10',
          prompt: 'Điền dạng so sánh nhất của tính từ trong ngoặc',
          sentence:
            'Friday is ___ (busy) day of the week for me. I have six meetings.',
          answers: ['the busiest'],
          explain:
            'Busy là tính từ tận cùng -y, đổi thành the busiest. Nhớ có the.',
        },
        {
          kind: 'choice',
          id: 'u07-l03-c11',
          prompt: 'Chọn câu đúng',
          options: [
            'She is the most intelligent person I know.',
            'She is the intelligentest person I know.',
            'She is most intelligent person I know.',
          ],
          answer: 0,
          explain:
            'Intelligent là tính từ dài nên dùng the most intelligent, và không được bỏ the.',
        },
        {
          kind: 'fix',
          id: 'u07-l03-c12',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Who',
            'is',
            'the',
            'more',
            'famous',
            'singer',
            'in',
            'Vietnam?',
          ],
          wrongIndex: 3,
          correction: 'most',
          explain:
            'So với cả nước (in Vietnam) là so sánh nhất, nên dùng the most famous.',
        },
      ],
    },
    {
      id: 'u07-l04',
      title: 'as...as và not as...as',
      titleEn: 'as...as comparisons',
      summary: 'Bằng nhau và không bằng.',
      cards: [
        {
          kind: 'explain',
          id: 'u07-l04-c01',
          title: 'Bằng nhau: as...as',
          body: 'Muốn nói hai thứ ngang nhau, đặt tính từ ở dạng thường giữa hai chữ as.',
          formula: 'as + tính từ/trạng từ + as',
          examples: [
            {
              en: 'My brother is as tall as my father.',
              vi: 'Em trai tôi cao bằng bố tôi.',
            },
            {
              en: 'This bag is as light as a feather.',
              vi: 'Cái túi này nhẹ như lông hồng.',
            },
          ],
          pitfall: {
            wrong: 'She is as tall than me.',
            right: 'She is as tall as me.',
            note: 'Đã mở bằng as thì phải đóng bằng as, không dùng than.',
          },
        },
        {
          kind: 'choice',
          id: 'u07-l04-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'This room is as big ___ the living room.',
          options: ['as', 'than', 'like'],
          answer: 0,
          explain: 'Cấu trúc bằng nhau là as big as.',
        },
        {
          kind: 'fill',
          id: 'u07-l04-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Bananas are ___ cheap as apples here.',
          answers: ['as'],
          bank: ['as', 'so', 'more'],
          explain:
            'Câu khẳng định so sánh bằng dùng as cheap as. More không đi với as.',
        },
        {
          kind: 'fix',
          id: 'u07-l04-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'is', 'as', 'taller', 'as', 'his', 'brother.'],
          wrongIndex: 3,
          correction: 'tall',
          explain: 'Giữa hai chữ as dùng tính từ ở dạng thường: as tall as.',
        },
        {
          kind: 'explain',
          id: 'u07-l04-c05',
          title: 'Không bằng: not as...as',
          body: 'Not as ... as nghĩa là "không bằng", tức là kém hơn. Đây là cách nói lịch sự hơn khi so sánh.',
          examples: [
            {
              en: 'Hue is not as big as Hanoi.',
              vi: 'Huế không lớn bằng Hà Nội.',
            },
            {
              en: "This phone isn't as expensive as that one.",
              vi: 'Cái điện thoại này không đắt bằng cái kia.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u07-l04-c06',
          prompt: 'Chọn câu cùng nghĩa',
          sentence: 'My car is faster than yours.',
          options: [
            'Your car is not as fast as mine.',
            'My car is not as fast as yours.',
            'Your car is as fast as mine.',
          ],
          answer: 0,
          explain: 'Xe tôi nhanh hơn, tức là xe bạn không nhanh bằng xe tôi.',
        },
        {
          kind: 'fill',
          id: 'u07-l04-c07',
          prompt: 'Điền dạng đúng của tính từ trong ngoặc',
          sentence: "The exam wasn't as ___ (difficult) as I expected.",
          answers: ['difficult'],
          explain:
            'Giữa hai chữ as giữ nguyên tính từ, không thêm more: as difficult as.',
        },
        {
          kind: 'explain',
          id: 'u07-l04-c08',
          title: 'Dùng với trạng từ',
          body: 'As...as cũng đi được với trạng từ: as fast as, as well as. Cụm rất hay gặp: as soon as possible (càng sớm càng tốt).',
          examples: [
            {
              en: 'Please reply as soon as possible.',
              vi: 'Vui lòng trả lời càng sớm càng tốt.',
            },
            {
              en: "She can't run as fast as her sister.",
              vi: 'Cô ấy không chạy nhanh bằng chị mình.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u07-l04-c09',
          prompt: 'Sắp xếp thành câu "Tôi nấu ăn không ngon bằng mẹ tôi"',
          sentence: "I can't cook as well as my mother.",
          explain:
            "Can't cook, rồi trạng từ đặt giữa hai chữ as: as well as my mother.",
        },
        {
          kind: 'fix',
          id: 'u07-l04-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'film',
            "wasn't",
            'as',
            'good',
            'than',
            'the',
            'book.',
          ],
          wrongIndex: 5,
          correction: 'as',
          explain:
            'Not as ... as: đã mở bằng as thì đóng bằng as, không dùng than.',
        },
        {
          kind: 'choice',
          id: 'u07-l04-c11',
          prompt: 'Chọn câu đúng',
          options: [
            'Call me as soon as possible.',
            'Call me as soon than possible.',
            'Call me as sooner as possible.',
          ],
          answer: 0,
          explain:
            'Cụm cố định as soon as possible: trạng từ soon giữ nguyên giữa hai chữ as.',
        },
        {
          kind: 'fill',
          id: 'u07-l04-c12',
          prompt: 'Chọn từ đúng để điền',
          sentence: "My English isn't ___ good as yours.",
          answers: ['as', 'so'],
          bank: ['as', 'more', 'than'],
          explain: "Cấu trúc không bằng: isn't as good as.",
        },
      ],
    },
    {
      id: 'u07-l05',
      title: 'Tính từ -ed hay -ing',
      titleEn: '-ed and -ing adjectives',
      summary: 'bored hay boring, interested hay interesting.',
      cards: [
        {
          kind: 'explain',
          id: 'u07-l05-c01',
          title: 'Cảm thấy hay gây ra?',
          body: 'Tính từ -ed nói một người cảm thấy thế nào (I am bored: tôi thấy chán). Tính từ -ing nói cái gì gây ra cảm giác đó (The film is boring: bộ phim chán).',
          examples: [
            { en: "I'm bored.", vi: 'Tôi thấy chán.' },
            { en: 'This lesson is boring.', vi: 'Bài học này chán.' },
          ],
          pitfall: {
            wrong: 'I am boring.',
            right: 'I am bored.',
            note: 'I am boring nghĩa là "Tôi là người nhạt nhẽo", không phải "Tôi thấy chán".',
          },
        },
        {
          kind: 'choice',
          id: 'u07-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'I was very ___ by the news.',
          options: ['surprised', 'surprising', 'surprise'],
          answer: 0,
          explain:
            'Tôi là người cảm thấy ngạc nhiên, nên dùng tính từ -ed: surprised.',
        },
        {
          kind: 'fill',
          id: 'u07-l05-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'The football match was really ___. I loved it.',
          answers: ['exciting'],
          bank: ['exciting', 'excited', 'excite'],
          explain:
            'Trận đấu là thứ gây ra cảm giác hào hứng, nên dùng -ing: exciting.',
        },
        {
          kind: 'explain',
          id: 'u07-l05-c04',
          title: 'Những cặp hay gặp',
          body: 'interested/interesting, tired/tiring, confused/confusing, worried/worrying, embarrassed/embarrassing. Người cảm thấy: -ed. Sự việc gây ra: -ing.',
          examples: [
            {
              en: "I'm interested in history.",
              vi: 'Tôi thích (quan tâm đến) lịch sử.',
            },
            {
              en: 'History is interesting.',
              vi: 'Lịch sử thú vị.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u07-l05-c05',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'am', 'very', 'interesting', 'in', 'music.'],
          wrongIndex: 3,
          correction: 'interested',
          explain: 'Tôi là người cảm thấy hứng thú, nên dùng interested in.',
        },
        {
          kind: 'fill',
          id: 'u07-l05-c06',
          prompt: 'Điền dạng tính từ đúng của từ trong ngoặc',
          sentence: 'After a long day at work, I always feel ___ (tire).',
          answers: ['tired'],
          explain: 'Tôi là người cảm thấy mệt, nên dùng tính từ -ed: tired.',
        },
        {
          kind: 'choice',
          id: 'u07-l05-c07',
          prompt: 'Chọn từ đúng',
          sentence: "This map is very ___. I don't know where we are.",
          options: ['confusing', 'confused', 'confuse'],
          answer: 0,
          explain: 'Tấm bản đồ là thứ gây ra sự rối, nên dùng -ing: confusing.',
        },
        {
          kind: 'explain',
          id: 'u07-l05-c08',
          title: 'Người cũng có thể -ing',
          body: 'Người cũng dùng được tính từ -ing khi họ làm người khác có cảm giác đó.',
          examples: [
            {
              en: 'My teacher is very interesting.',
              vi: 'Thầy tôi rất thú vị (nghe thầy nói không chán).',
            },
            {
              en: 'My teacher is interested in my ideas.',
              vi: 'Thầy tôi quan tâm đến ý tưởng của tôi.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u07-l05-c09',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I find grammar very confusing.',
          explain:
            'Ngữ pháp là thứ gây rối, nên dùng confusing. Cấu trúc: find + vật + tính từ.',
        },
        {
          kind: 'choice',
          id: 'u07-l05-c10',
          prompt: 'Chọn câu có nghĩa "Anh ấy thấy xấu hổ"',
          options: [
            'He was embarrassed.',
            'He was embarrassing.',
            'He was embarrass.',
          ],
          answer: 0,
          explain:
            'Anh ấy là người cảm thấy xấu hổ, nên dùng -ed. He was embarrassing nghĩa là anh ấy làm người khác thấy xấu hổ.',
        },
        {
          kind: 'fix',
          id: 'u07-l05-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['The', 'news', 'was', 'very', 'shocked', 'to', 'everyone.'],
          wrongIndex: 4,
          correction: 'shocking',
          explain: 'Tin tức là thứ gây ra cú sốc, nên dùng -ing: shocking.',
        },
        {
          kind: 'fill',
          id: 'u07-l05-c12',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Are you ___ about the job interview tomorrow?',
          answers: ['worried'],
          bank: ['worried', 'worrying', 'worry'],
          explain: 'Hỏi bạn có cảm thấy lo không, nên dùng -ed: worried about.',
        },
      ],
    },
  ],
}
