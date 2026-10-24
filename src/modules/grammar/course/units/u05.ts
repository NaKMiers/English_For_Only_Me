import type { GrammarUnit } from '../types'

export const UNIT_05: GrammarUnit = {
  id: 'u05',
  order: 5,
  level: 'A2',
  title: 'Tương lai',
  summary:
    'will, be going to, hiện tại tiếp diễn cho lịch hẹn và mệnh đề thời gian.',
  lessons: [
    {
      id: 'u05-l01',
      title: 'will',
      titleEn: 'The future with will',
      summary: 'Quyết định tức thì, dự đoán và lời hứa.',
      cards: [
        {
          kind: 'explain',
          id: 'u05-l01-c01',
          title: 'will + động từ nguyên mẫu',
          body: 'Will dùng cho mọi chủ ngữ và không bao giờ đổi dạng. Ngay sau will là động từ nguyên mẫu, không có to, không thêm -s.',
          formula: 'Chủ ngữ + will + V nguyên mẫu',
          examples: [
            {
              en: 'I will call you tonight.',
              vi: 'Tối nay tôi sẽ gọi cho bạn.',
            },
            {
              en: 'It will be sunny tomorrow.',
              vi: 'Ngày mai trời sẽ nắng.',
            },
          ],
          pitfall: {
            wrong: 'He will comes back tomorrow.',
            right: 'He will come back tomorrow.',
            note: 'Sau will luôn là động từ nguyên mẫu, kể cả với he, she, it.',
          },
        },
        {
          kind: 'choice',
          id: 'u05-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'She will ___ you at the station.',
          options: ['meets', 'meet', 'meeting'],
          answer: 1,
          explain: 'Sau will là động từ nguyên mẫu: will meet.',
        },
        {
          kind: 'fix',
          id: 'u05-l01-c03',
          prompt: 'Chạm vào từ sai',
          tokens: ['My', 'brother', 'will', 'helps', 'you', 'tomorrow.'],
          wrongIndex: 3,
          correction: 'help',
          explain: 'Sau will không thêm -s dù chủ ngữ là số ít: will help.',
        },
        {
          kind: 'explain',
          id: 'u05-l01-c04',
          title: 'Quyết định ngay lúc nói',
          body: 'Khi bạn vừa nghĩ ra và quyết định ngay lúc đang nói, chưa hề có kế hoạch trước, hãy dùng will. Lời đề nghị giúp đỡ cũng thuộc loại này.',
          examples: [
            {
              en: "It's cold in here. I'll close the window.",
              vi: 'Trong này lạnh quá. Để tôi đóng cửa sổ.',
            },
            {
              en: "The phone is ringing. I'll answer it.",
              vi: 'Điện thoại reo kìa. Để tôi nghe.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l01-c05',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'A: This bag is so heavy. B: Wait, I ___ carry it for you.',
          answers: ['will'],
          bank: ['will', 'am', 'was'],
          explain:
            'B vừa quyết định giúp ngay lúc nói, đây là lời đề nghị nên dùng will.',
        },
        {
          kind: 'order',
          id: 'u05-l01-c06',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I will carry your bag.',
          explain:
            'Chủ ngữ I, rồi will, rồi động từ nguyên mẫu carry và tân ngữ your bag.',
        },
        {
          kind: 'explain',
          id: 'u05-l01-c07',
          title: 'Dự đoán theo ý kiến',
          body: "Khi đoán về tương lai dựa trên suy nghĩ hay cảm nhận của mình, dùng will. Thường đi kèm I think, I'm sure, probably.",
          examples: [
            {
              en: 'I think it will rain tonight.',
              vi: 'Tôi nghĩ tối nay trời sẽ mưa.',
            },
            {
              en: 'You will probably like this film.',
              vi: 'Chắc bạn sẽ thích bộ phim này.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l01-c08',
          prompt: 'Chọn cụm đúng để điền',
          sentence: "I'm sure you ___ the test.",
          answers: ['will pass'],
          bank: ['will pass', 'passing', 'passes'],
          explain:
            "I'm sure cho thấy đây là dự đoán theo ý kiến, nên dùng will + động từ nguyên mẫu.",
        },
        {
          kind: 'fix',
          id: 'u05-l01-c09',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'think', 'it', 'rains', 'tomorrow.'],
          wrongIndex: 3,
          correction: 'will rain',
          explain:
            'Tomorrow là tương lai, và đây là dự đoán theo ý kiến (I think), nên dùng will rain chứ không dùng hiện tại đơn.',
        },
        {
          kind: 'explain',
          id: 'u05-l01-c10',
          title: "Lời hứa và won't",
          body: "Will cũng dùng để hứa hẹn. Phủ định là will not, viết gọn là won't. Not đứng sau will, không dùng don't.",
          examples: [
            {
              en: "I won't tell anyone.",
              vi: 'Tôi sẽ không nói với ai đâu.',
            },
            {
              en: "I promise I'll be on time.",
              vi: 'Tôi hứa sẽ đến đúng giờ.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l01-c11',
          prompt: 'Gõ dạng phủ định của động từ trong ngoặc',
          sentence: 'I promise I ___ (not / forget) your birthday this year.',
          answers: [
            "won't forget",
            'will not forget',
            'am not going to forget',
          ],
          explain:
            "Đây là lời hứa nên dùng will. Phủ định: will not forget, viết gọn won't forget.",
        },
        {
          kind: 'order',
          id: 'u05-l01-c12',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "I won't be late again.",
          explain:
            "Won't đứng ngay sau chủ ngữ, sau đó là động từ nguyên mẫu be.",
        },
        {
          kind: 'choice',
          id: 'u05-l01-c13',
          prompt: 'Chọn câu đúng',
          options: [
            "I won't tell anyone.",
            'I not will tell anyone.',
            "I will don't tell anyone.",
          ],
          answer: 0,
          explain:
            "Phủ định của will là will not (won't). Not đứng sau will, không thêm don't.",
        },
      ],
    },
    {
      id: 'u05-l02',
      title: 'be going to',
      titleEn: 'The future with be going to',
      summary: 'Kế hoạch đã định và dự đoán có dấu hiệu.',
      cards: [
        {
          kind: 'explain',
          id: 'u05-l02-c01',
          title: 'Kế hoạch đã quyết từ trước',
          body: 'Khi bạn đã quyết định làm gì đó từ trước lúc nói, dùng be going to. Be chia theo chủ ngữ: am, is hoặc are.',
          formula: 'Chủ ngữ + am/is/are + going to + V nguyên mẫu',
          examples: [
            {
              en: "We're going to move to Da Nang next year.",
              vi: 'Năm sau chúng tôi sẽ chuyển vào Đà Nẵng.',
            },
            {
              en: "I'm going to study abroad after graduation.",
              vi: 'Tốt nghiệp xong tôi sẽ đi du học.',
            },
          ],
          pitfall: {
            wrong: 'I going to visit my grandma.',
            right: 'I am going to visit my grandma.',
            note: 'Không được bỏ am/is/are trước going to.',
          },
        },
        {
          kind: 'choice',
          id: 'u05-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'She ___ going to start a new job next month.',
          options: ['is', 'are', 'am'],
          answer: 0,
          explain: 'She là số ít nên dùng is going to.',
        },
        {
          kind: 'fill',
          id: 'u05-l02-c03',
          prompt: 'Chọn cụm đúng để điền',
          sentence: 'They ___ to get married in June.',
          answers: ['are going'],
          bank: ['are going', 'going', 'will'],
          explain:
            'They đi với are: They are going to get married. Will không đi với to.',
        },
        {
          kind: 'fix',
          id: 'u05-l02-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'am', 'going', 'to', 'buying', 'a', 'new', 'laptop.'],
          wrongIndex: 4,
          correction: 'buy',
          explain: 'Sau going to là động từ nguyên mẫu: going to buy.',
        },
        {
          kind: 'explain',
          id: 'u05-l02-c05',
          title: 'Phủ định và câu hỏi',
          body: 'Phủ định: thêm not sau am/is/are. Câu hỏi: đưa am/is/are lên trước chủ ngữ, going to giữ nguyên.',
          examples: [
            {
              en: "I'm not going to watch TV tonight.",
              vi: 'Tối nay tôi sẽ không xem TV.',
            },
            {
              en: 'Are you going to cook dinner?',
              vi: 'Bạn có định nấu bữa tối không?',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u05-l02-c06',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'What are you going to do this weekend?',
          explain:
            'What đứng đầu, rồi are, rồi chủ ngữ you, sau đó là going to do.',
        },
        {
          kind: 'fill',
          id: 'u05-l02-c07',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'We are ___ (go) to visit our grandparents this weekend.',
          answers: ['going'],
          explain:
            'Cấu trúc be going to + V: We are going to visit, nên go phải thành going.',
        },
        {
          kind: 'explain',
          id: 'u05-l02-c08',
          title: 'Dự đoán có dấu hiệu',
          body: 'Khi nhìn thấy bằng chứng ngay trước mắt rằng việc gì sắp xảy ra, dùng be going to.',
          examples: [
            {
              en: "Look at those dark clouds. It's going to rain.",
              vi: 'Nhìn mây đen kìa. Trời sắp mưa rồi.',
            },
            {
              en: "Watch out! You're going to fall.",
              vi: 'Cẩn thận! Bạn sắp ngã đấy.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u05-l02-c09',
          prompt: 'Chọn cụm đúng',
          sentence: 'Look at those black clouds! It ___.',
          options: ['is going to rain', 'rains', 'going to rain'],
          answer: 0,
          explain:
            'Mây đen là dấu hiệu nhìn thấy được, nên dùng is going to rain. Không được bỏ is.',
        },
        {
          kind: 'fix',
          id: 'u05-l02-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Look!',
            'That',
            'car',
            'is',
            'going',
            'to',
            'hits',
            'the',
            'tree.',
          ],
          wrongIndex: 6,
          correction: 'hit',
          explain: 'Sau going to là động từ nguyên mẫu: going to hit.',
        },
        {
          kind: 'order',
          id: 'u05-l02-c11',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'She is going to have a baby.',
          explain: 'Chủ ngữ She, rồi is going to, rồi động từ nguyên mẫu have.',
        },
        {
          kind: 'choice',
          id: 'u05-l02-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'Is she going to call you later?',
            'Does she going to call you later?',
            'Is going she to call you later?',
          ],
          answer: 0,
          explain:
            'Câu hỏi với be going to: đưa Is lên đầu, rồi chủ ngữ she, rồi going to. Không dùng does.',
        },
      ],
    },
    {
      id: 'u05-l03',
      title: 'Hiện tại tiếp diễn cho lịch hẹn',
      titleEn: 'Present continuous for arrangements',
      summary: 'Nói về cuộc hẹn đã sắp xếp với giờ giấc cụ thể.',
      cards: [
        {
          kind: 'explain',
          id: 'u05-l03-c01',
          title: 'Lịch hẹn đã sắp xếp',
          body: 'Khi đã hẹn với ai, đã đặt vé hay đã chốt thời gian, người bản xứ rất hay dùng hiện tại tiếp diễn kèm một mốc thời gian tương lai.',
          formula: 'am/is/are + V-ing + thời gian tương lai',
          examples: [
            {
              en: "I'm meeting Lan at 7 tonight.",
              vi: 'Tối nay 7 giờ tôi gặp Lan.',
            },
            {
              en: "We're flying to Bangkok on Friday.",
              vi: 'Thứ Sáu chúng tôi bay sang Bangkok.',
            },
          ],
          pitfall: {
            wrong: 'I see the dentist tomorrow at 9.',
            right: "I'm seeing the dentist tomorrow at 9.",
            note: 'Cuộc hẹn cá nhân đã sắp xếp thì dùng hiện tại tiếp diễn, không dùng hiện tại đơn.',
          },
        },
        {
          kind: 'choice',
          id: 'u05-l03-c02',
          prompt: 'Chọn câu đúng',
          options: [
            "I'm having dinner with my boss tomorrow.",
            'I am have dinner with my boss tomorrow.',
            'I having dinner with my boss tomorrow.',
          ],
          answer: 0,
          explain: 'Hiện tại tiếp diễn cần đủ hai phần: am + having.',
        },
        {
          kind: 'fill',
          id: 'u05-l03-c03',
          prompt: 'Chọn cụm đúng để điền',
          sentence:
            'We ___ to Japan next Friday. The tickets are already booked.',
          answers: ['are flying'],
          bank: ['are flying', 'flying', 'were flying'],
          explain:
            'Vé đã đặt, đây là lịch đã sắp xếp nên dùng hiện tại tiếp diễn: are flying.',
        },
        {
          kind: 'explain',
          id: 'u05-l03-c04',
          title: 'Lịch trình chung dùng hiện tại đơn',
          body: 'Giờ tàu xe, giờ chiếu phim, lịch học cố định là thời khóa biểu chung, dùng hiện tại đơn. Cuộc hẹn của riêng bạn dùng hiện tại tiếp diễn.',
          examples: [
            {
              en: 'The train leaves at 6:30.',
              vi: 'Tàu chạy lúc 6 giờ 30.',
            },
            {
              en: "I'm meeting Nam at the station.",
              vi: 'Tôi hẹn gặp Nam ở ga.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u05-l03-c05',
          prompt: 'Chọn từ đúng',
          sentence: "The film ___ at 8 p.m., so let's meet at 7:30.",
          options: ['starts', 'is start', 'starting'],
          answer: 0,
          explain:
            'Giờ chiếu phim là lịch trình chung nên dùng hiện tại đơn: starts.',
        },
        {
          kind: 'fix',
          id: 'u05-l03-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Nam',
            'is',
            'plays',
            'tennis',
            'with',
            'Hoa',
            'this',
            'Sunday.',
          ],
          wrongIndex: 2,
          correction: 'playing',
          explain:
            'Lịch hẹn đã sắp xếp dùng hiện tại tiếp diễn is + V-ing: Nam is playing tennis. Sau is không dùng plays.',
        },
        {
          kind: 'order',
          id: 'u05-l03-c07',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "I'm meeting my friends after work.",
          alternatives: ["After work I'm meeting my friends."],
          explain:
            "Hẹn gặp bạn bè sau giờ làm là lịch đã sắp xếp: I'm meeting.",
        },
        {
          kind: 'explain',
          id: 'u05-l03-c08',
          title: 'Hỏi về kế hoạch',
          body: 'Muốn hỏi ai đó đã có hẹn gì chưa, người bản xứ thường hỏi bằng hiện tại tiếp diễn.',
          examples: [
            {
              en: 'What are you doing this weekend?',
              vi: 'Cuối tuần này bạn làm gì?',
            },
            {
              en: 'Are you coming to the party on Saturday?',
              vi: 'Thứ Bảy bạn có đến bữa tiệc không?',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l03-c09',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'What are you ___ (do) on Saturday evening?',
          answers: ['doing', 'going to do'],
          explain:
            'Có are ở trước, nên dùng V-ing: What are you doing? Đây là cách hỏi kế hoạch rất tự nhiên. Going to do cũng đúng.',
        },
        {
          kind: 'choice',
          id: 'u05-l03-c10',
          prompt: 'Chọn câu trả lời đúng',
          sentence:
            'A: Are you free on Friday? B: Sorry, ___ my parents in Hai Phong.',
          options: ["I'm visiting", 'I visit', 'I visiting'],
          answer: 0,
          explain:
            "B đã có lịch về thăm bố mẹ, nên dùng hiện tại tiếp diễn: I'm visiting.",
        },
        {
          kind: 'fix',
          id: 'u05-l03-c11',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Is',
            'Nam',
            'comes',
            'to',
            'your',
            'party',
            'on',
            'Saturday?',
          ],
          wrongIndex: 2,
          correction: 'coming',
          explain:
            'Câu hỏi về lịch hẹn dùng Is + chủ ngữ + V-ing: Is Nam coming? Sau is không dùng comes.',
        },
        {
          kind: 'order',
          id: 'u05-l03-c12',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Where are you going this summer?',
          explain:
            'Where đứng đầu, rồi are, rồi chủ ngữ you, rồi going. Câu hỏi về kế hoạch hè.',
        },
      ],
    },
    {
      id: 'u05-l04',
      title: 'will hay going to',
      titleEn: 'will or going to',
      summary: 'Mới quyết hay đã quyết, ý kiến hay bằng chứng.',
      cards: [
        {
          kind: 'explain',
          id: 'u05-l04-c01',
          title: 'Mới quyết hay đã quyết?',
          body: 'Will: quyết định ngay lúc nói. Going to: đã quyết định từ trước, thường đã có chuẩn bị.',
          examples: [
            {
              en: "A: The bin is full. B: OK, I'll take it out.",
              vi: 'A: Thùng rác đầy rồi. B: Ừ, để tôi đi đổ.',
            },
            {
              en: "I'm going to learn Japanese. I've already bought the books.",
              vi: 'Tôi sẽ học tiếng Nhật. Tôi mua sách rồi.',
            },
          ],
          pitfall: {
            wrong: "I've bought some paint. I'll paint my room.",
            right: "I've bought some paint. I'm going to paint my room.",
            note: 'Đã chuẩn bị, đã quyết từ trước thì dùng going to.',
          },
        },
        {
          kind: 'choice',
          id: 'u05-l04-c02',
          prompt: 'Chọn câu trả lời đúng',
          sentence:
            "A: We don't have any bread. B: Really? ___ some on my way home.",
          options: ["I'll buy", "I'm going to buy", 'I buy'],
          answer: 0,
          explain:
            'Really? cho thấy B mới biết chuyện và quyết định ngay lúc nói, nên dùng will.',
        },
        {
          kind: 'choice',
          id: 'u05-l04-c03',
          prompt: 'Chọn câu trả lời đúng',
          sentence:
            'A: Why are you wearing running shoes? B: ___ for a run in the park.',
          options: ["I'm going to go", "I'll go", 'I go'],
          answer: 0,
          explain:
            'B đã thay giày chạy, tức là đã quyết từ trước, nên dùng going to.',
        },
        {
          kind: 'explain',
          id: 'u05-l04-c04',
          title: 'Ý kiến hay bằng chứng?',
          body: 'Đoán theo ý kiến riêng: will. Đoán dựa trên dấu hiệu đang thấy trước mắt: going to.',
          examples: [
            {
              en: 'I think Vietnam will win the match.',
              vi: 'Tôi nghĩ Việt Nam sẽ thắng trận này.',
            },
            {
              en: "Look at the score! They're going to win.",
              vi: 'Nhìn tỉ số kìa! Họ sắp thắng rồi.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l04-c05',
          prompt: 'Chọn cụm đúng để điền',
          sentence:
            'Look at that man on the ladder! He has lost his balance. He ___ fall.',
          answers: ['is going to'],
          bank: ['is going to', 'will', 'is'],
          explain:
            'Người đó đã mất thăng bằng, đây là dấu hiệu nhìn thấy được, nên dùng is going to.',
        },
        {
          kind: 'fix',
          id: 'u05-l04-c06',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'will', 'to', 'help', 'you', 'with', 'your', 'bags.'],
          wrongIndex: 2,
          correction: '',
          explain:
            'Will đi thẳng với động từ nguyên mẫu, không có to. Chỉ going to mới cần to.',
        },
        {
          kind: 'explain',
          id: 'u05-l04-c07',
          title: 'Mẹo chọn nhanh',
          body: 'Có kế hoạch sẵn hoặc có dấu hiệu rõ ràng: going to. Mới nghĩ ra, đề nghị giúp, hứa, hoặc đoán theo ý kiến: will.',
          examples: [
            {
              en: "I'll help you with your homework.",
              vi: 'Để tôi giúp bạn làm bài tập.',
            },
            {
              en: "She's going to study medicine. She's already applied.",
              vi: 'Cô ấy sẽ học ngành y. Cô ấy nộp hồ sơ rồi.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u05-l04-c08',
          prompt:
            'Bạn đã đặt phòng khách sạn ở Đà Lạt cho tuần sau. Chọn câu đúng',
          options: [
            "We're going to stay in Da Lat next week.",
            "We'll probably stay in Da Lat next week.",
            'We going to stay in Da Lat next week.',
          ],
          answer: 0,
          explain:
            'Phòng đã đặt, kế hoạch đã chắc chắn, nên dùng going to. Probably (có lẽ) không hợp với một việc đã chốt.',
        },
        {
          kind: 'fill',
          id: 'u05-l04-c09',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: "A: It's cold in here. B: OK, I ___ (close) the window.",
          answers: ['will close'],
          explain: 'B quyết định ngay khi nghe A nói, nên dùng will close.',
        },
        {
          kind: 'order',
          id: 'u05-l04-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "I'm going to visit my aunt next weekend.",
          alternatives: ["Next weekend I'm going to visit my aunt."],
          explain:
            "I'm going to + động từ nguyên mẫu visit. Đây là kế hoạch đã định.",
        },
        {
          kind: 'choice',
          id: 'u05-l04-c11',
          prompt: 'Chọn câu trả lời đúng',
          sentence:
            'A: Do you have any plans for the summer? B: Yes, ___ a cooking course.',
          options: ["I'm going to take", "I'll take", 'I take'],
          answer: 0,
          explain:
            'B trả lời Yes, tức là đã có kế hoạch từ trước, nên dùng going to.',
        },
        {
          kind: 'fix',
          id: 'u05-l04-c12',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'is', 'go', 'to', 'study', 'abroad', 'next', 'year.'],
          wrongIndex: 2,
          correction: 'going',
          explain: 'Cấu trúc là is going to + V: She is going to study abroad.',
        },
        {
          kind: 'fill',
          id: 'u05-l04-c13',
          prompt: 'Chọn cụm đúng để điền',
          sentence:
            "A: I can't open this jar. B: Give it to me. I ___ open it for you.",
          answers: ['will'],
          bank: ['will', 'am going to', 'am'],
          explain: 'B đề nghị giúp ngay lúc đó, nên dùng will.',
        },
      ],
    },
    {
      id: 'u05-l05',
      title: 'Mệnh đề thời gian',
      titleEn: 'Future time clauses',
      summary: 'Sau when, as soon as, before, after, until dùng hiện tại đơn.',
      cards: [
        {
          kind: 'explain',
          id: 'u05-l05-c01',
          title: 'Sau when không dùng will',
          body: 'Nói về tương lai, sau when, as soon as, before, after, until ta dùng hiện tại đơn. Will chỉ nằm ở vế chính.',
          formula: 'will + V ... + when/as soon as + hiện tại đơn',
          examples: [
            {
              en: "I'll call you when I get home.",
              vi: 'Khi nào về đến nhà tôi sẽ gọi cho bạn.',
            },
            {
              en: "We'll start as soon as everyone arrives.",
              vi: 'Mọi người đến đủ là chúng ta bắt đầu ngay.',
            },
          ],
          pitfall: {
            wrong: "I'll call you when I will arrive.",
            right: "I'll call you when I arrive.",
            note: 'Thấy nghĩa tương lai nên người học hay thêm will vào sau when. Vế sau when chỉ dùng hiện tại đơn.',
          },
        },
        {
          kind: 'choice',
          id: 'u05-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'I will text you when I ___ at the airport.',
          options: ['arrive', 'will arrive', 'arrived'],
          answer: 0,
          explain:
            'Sau when nói về tương lai, dùng hiện tại đơn: when I arrive.',
        },
        {
          kind: 'fill',
          id: 'u05-l05-c03',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'She will be happy when she ___ the news.',
          answers: ['hears'],
          bank: ['hears', 'will hear', 'heard'],
          explain:
            'Vế sau when dùng hiện tại đơn, she là số ít nên thêm -s: hears.',
        },
        {
          kind: 'fix',
          id: 'u05-l05-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'We',
            'will',
            'start',
            'the',
            'meeting',
            'when',
            'all',
            'the',
            'managers',
            'will',
            'arrive.',
          ],
          wrongIndex: 9,
          correction: '',
          explain:
            'Will ở vế chính thì đúng, nhưng sau when phải bỏ will: when all the managers arrive.',
        },
        {
          kind: 'explain',
          id: 'u05-l05-c05',
          title: 'before, after, until',
          body: 'Before (trước khi), after (sau khi) và until (cho đến khi) cũng theo đúng luật này: vế đi sau chúng dùng hiện tại đơn.',
          examples: [
            {
              en: 'Please turn off the lights before you leave.',
              vi: 'Trước khi đi nhớ tắt đèn nhé.',
            },
            {
              en: "I'll wait here until you come back.",
              vi: 'Tôi sẽ đợi ở đây cho đến khi bạn quay lại.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l05-c06',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: "Don't go out until you ___ (finish) your homework.",
          answers: ['finish', 'have finished'],
          explain:
            'Sau until nói về tương lai, dùng hiện tại đơn: until you finish. Không dùng will.',
        },
        {
          kind: 'choice',
          id: 'u05-l05-c07',
          prompt: 'Chọn câu đúng',
          options: [
            'After I will finish work, I will go to the gym.',
            'After I finish work, I will go to the gym.',
            'After I finished work, I will go to the gym.',
          ],
          answer: 1,
          explain:
            'Vế sau after dùng hiện tại đơn (I finish), will chỉ nằm ở vế chính (I will go).',
        },
        {
          kind: 'order',
          id: 'u05-l05-c08',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'We will start when everyone arrives.',
          alternatives: ['When everyone arrives we will start.'],
          explain:
            'Vế chính dùng will start, vế sau when dùng hiện tại đơn arrives.',
        },
        {
          kind: 'explain',
          id: 'u05-l05-c09',
          title: 'Vế thời gian có thể đứng đầu',
          body: 'Vế có when, as soon as... có thể đứng đầu câu, khi đó thêm dấu phẩy. Dù đứng ở đâu, nó vẫn dùng hiện tại đơn.',
          examples: [
            {
              en: "As soon as I hear anything, I'll let you know.",
              vi: 'Có tin gì là tôi báo bạn ngay.',
            },
            {
              en: 'When you see Lan, tell her to call me.',
              vi: 'Khi nào gặp Lan, bảo cô ấy gọi cho tôi nhé.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u05-l05-c10',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'As soon as the shop ___, I will buy that phone.',
          answers: ['opens'],
          bank: ['opens', 'will open', 'open'],
          explain:
            'Sau as soon as dùng hiện tại đơn, the shop là số ít nên dùng opens.',
        },
        {
          kind: 'fix',
          id: 'u05-l05-c11',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'When',
            'I',
            'will',
            'finish',
            'university,',
            "I'm",
            'going',
            'to',
            'travel.',
          ],
          wrongIndex: 2,
          correction: '',
          explain:
            'Vế bắt đầu bằng When dùng hiện tại đơn: When I finish university. Vế chính mới nói về kế hoạch.',
        },
        {
          kind: 'choice',
          id: 'u05-l05-c12',
          prompt: 'Chọn từ đúng',
          sentence: 'Wait here ___ I come back.',
          options: ['until', 'before', 'after'],
          answer: 0,
          explain:
            'Until là "cho đến khi": đợi ở đây cho đến khi tôi quay lại. Before và after không hợp nghĩa.',
        },
      ],
    },
  ],
}
