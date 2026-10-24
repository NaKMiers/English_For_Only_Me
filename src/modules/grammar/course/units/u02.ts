import type { GrammarUnit } from '../types'

export const UNIT_02: GrammarUnit = {
  id: 'u02',
  order: 2,
  level: 'A1',
  title: 'Hiện tại đơn và tiếp diễn',
  summary:
    'Thêm -s/-es, do/does, trạng từ tần suất, am/is/are + V-ing và cách chọn thì.',
  lessons: [
    {
      id: 'u02-l01',
      title: 'Thêm -s/-es với he, she, it',
      titleEn: 'Third person -s',
      summary: 'Động từ đổi dạng khi chủ ngữ là ngôi thứ ba số ít.',
      cards: [
        {
          kind: 'explain',
          id: 'u02-l01-c01',
          title: 'He, she, it: động từ thêm -s',
          body: 'Tiếng Việt không đổi động từ theo người ("tôi làm", "cô ấy làm"). Tiếng Anh thì có: ở hiện tại đơn, khi chủ ngữ là he, she, it hoặc một danh từ số ít, động từ thêm -s.',
          formula: 'He / She / It + V-s',
          examples: [
            { en: 'She works in a bank.', vi: 'Cô ấy làm việc ở ngân hàng.' },
            {
              en: 'My brother plays football.',
              vi: 'Anh trai tôi chơi bóng đá.',
            },
          ],
          pitfall: {
            wrong: 'She work in a bank.',
            right: 'She works in a bank.',
            note: 'Quên -s với he/she/it là lỗi người Việt mắc nhiều nhất.',
          },
        },
        {
          kind: 'choice',
          id: 'u02-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'My father ___ coffee every morning.',
          options: ['drink', 'drinks', 'drinking'],
          answer: 1,
          explain:
            'My father là số ít (giống he), nên động từ thêm -s: drinks.',
        },
        {
          kind: 'fill',
          id: 'u02-l01-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'They ___ (live) near the river.',
          answers: ['live'],
          bank: ['live', 'lives'],
          explain: 'They là số nhiều nên động từ giữ nguyên, không thêm -s.',
        },
        {
          kind: 'explain',
          id: 'u02-l01-c04',
          title: 'Khi nào thêm -es',
          body: 'Động từ tận cùng bằng -s, -sh, -ch, -x, -o thì thêm -es: watches, goes. Phụ âm + y thì đổi y thành i rồi thêm -es: study thành studies. Nhưng nguyên âm + y thì chỉ thêm -s: play thành plays.',
          examples: [
            {
              en: 'He watches TV after dinner.',
              vi: 'Anh ấy xem TV sau bữa tối.',
            },
            {
              en: 'She studies English at night.',
              vi: 'Cô ấy học tiếng Anh vào buổi tối.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u02-l01-c05',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'She ___ (wash) her hair every day.',
          answers: ['washes'],
          explain: 'Wash tận cùng bằng -sh nên thêm -es: washes.',
        },
        {
          kind: 'choice',
          id: 'u02-l01-c06',
          prompt: 'Chọn cách viết đúng',
          sentence: 'Nam ___ hard for his exams.',
          options: ['studys', 'studies', 'studyes'],
          answer: 1,
          explain:
            'Study tận cùng bằng phụ âm + y, nên đổi y thành i rồi thêm -es: studies.',
        },
        {
          kind: 'fix',
          id: 'u02-l01-c07',
          prompt: 'Chạm vào từ sai',
          tokens: ['Lan', 'go', 'to', 'work', 'by', 'bus.'],
          wrongIndex: 1,
          correction: 'goes',
          explain: 'Lan là một người (như she), nên go phải thêm -es: goes.',
        },
        {
          kind: 'explain',
          id: 'u02-l01-c08',
          title: 'have thành has',
          body: 'Have là động từ bất quy tắc: với he, she, it ta dùng has, không phải haves. Còn do và go tận cùng bằng -o nên thêm -es: does, goes.',
          examples: [
            { en: 'He has two cats.', vi: 'Anh ấy có hai con mèo.' },
            { en: 'My mom does the cooking.', vi: 'Mẹ tôi lo việc nấu nướng.' },
          ],
        },
        {
          kind: 'fill',
          id: 'u02-l01-c09',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Linh ___ a new laptop.',
          answers: ['has'],
          bank: ['have', 'has', 'haves'],
          explain: 'Linh là số ít, nên have đổi thành has.',
        },
        {
          kind: 'order',
          id: 'u02-l01-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'Our teacher speaks three languages.',
          distractors: ['speak'],
          explain: 'Our teacher là số ít nên dùng speaks, không dùng speak.',
        },
        {
          kind: 'fix',
          id: 'u02-l01-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['This', 'shop', 'open', 'at', 'eight', 'every', 'morning.'],
          wrongIndex: 2,
          correction: 'opens',
          explain: 'This shop là số ít, nên động từ phải thêm -s: opens.',
        },
        {
          kind: 'choice',
          id: 'u02-l01-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'She fixs computers.',
            'She fixes computers.',
            'She fixies computers.',
          ],
          answer: 1,
          explain: 'Fix tận cùng bằng -x nên thêm -es: fixes.',
        },
        {
          kind: 'fill',
          id: 'u02-l01-c13',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'The first train ___ (leave) at six every morning.',
          answers: ['leaves'],
          explain:
            'The first train là số ít, và đây là lịch chạy lặp lại mỗi ngày, nên dùng leaves.',
        },
      ],
    },
    {
      id: 'u02-l02',
      title: 'do/does trong phủ định và câu hỏi',
      titleEn: 'Negatives and questions with do',
      summary: "Dùng don't/doesn't và Do/Does với động từ thường.",
      cards: [
        {
          kind: 'explain',
          id: 'u02-l02-c01',
          title: "Phủ định: don't / doesn't + V",
          body: "Với động từ thường, không đặt not thẳng trước động từ. Dùng don't cho I, you, we, they và doesn't cho he, she, it. Sau doesn't, động từ trở về nguyên mẫu.",
          formula: "S + don't / doesn't + V",
          examples: [
            { en: "I don't eat meat.", vi: 'Tôi không ăn thịt.' },
            { en: "He doesn't like coffee.", vi: 'Anh ấy không thích cà phê.' },
          ],
          pitfall: {
            wrong: 'She not like tea.',
            right: "She doesn't like tea.",
            note: 'Không dịch thẳng "không" thành not. Và đã có doesn\'t thì bỏ -s: không viết doesn\'t likes.',
          },
        },
        {
          kind: 'fill',
          id: 'u02-l02-c02',
          prompt: 'Điền dạng phủ định',
          sentence: 'My parents ___ watch TV in the morning.',
          answers: ["don't", 'do not'],
          bank: ["don't", "doesn't", "isn't"],
          explain: "My parents là số nhiều nên dùng don't.",
        },
        {
          kind: 'choice',
          id: 'u02-l02-c03',
          prompt: 'Chọn câu đúng',
          options: [
            "He doesn't plays tennis.",
            "He doesn't play tennis.",
            "He don't play tennis.",
          ],
          answer: 1,
          explain:
            "He đi với doesn't, và sau doesn't động từ ở dạng nguyên mẫu: play.",
        },
        {
          kind: 'fix',
          id: 'u02-l02-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['Mai', "doesn't", 'speaks', 'French', 'at', 'all.'],
          wrongIndex: 2,
          correction: 'speak',
          explain:
            "Sau doesn't, động từ trở về nguyên mẫu: speak, không thêm -s nữa.",
        },
        {
          kind: 'explain',
          id: 'u02-l02-c05',
          title: 'Câu hỏi: Do / Does lên đầu',
          body: 'Để hỏi Yes/No, đặt Do hoặc Does trước chủ ngữ, động từ giữ nguyên mẫu. Trả lời ngắn cũng dùng do/does.',
          formula: 'Do / Does + S + V...?',
          examples: [
            { en: 'Do you like music?', vi: 'Bạn có thích nhạc không?' },
            {
              en: 'Does she live here? - Yes, she does.',
              vi: 'Cô ấy sống ở đây à? - Đúng vậy.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u02-l02-c06',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Does your brother work in Hanoi?',
          distractors: ['works'],
          explain:
            'Does đứng đầu vì your brother là số ít, sau đó là động từ nguyên mẫu work.',
        },
        {
          kind: 'choice',
          id: 'u02-l02-c07',
          prompt: 'Chọn câu trả lời đúng',
          sentence: 'Does Minh drive to work?',
          options: ['Yes, he does.', 'Yes, he is.', 'Yes, he do.'],
          answer: 0,
          explain:
            'Hỏi bằng Does thì trả lời ngắn cũng dùng does: Yes, he does.',
        },
        {
          kind: 'explain',
          id: 'u02-l02-c08',
          title: 'Câu hỏi có từ để hỏi',
          body: 'Với What, Where, When, How often..., từ để hỏi đứng đầu, rồi đến do/does, chủ ngữ và động từ nguyên mẫu.',
          formula: 'Wh- + do/does + S + V?',
          examples: [
            { en: 'Where do you live?', vi: 'Bạn sống ở đâu?' },
            {
              en: 'What time does the class start?',
              vi: 'Lớp học bắt đầu lúc mấy giờ?',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u02-l02-c09',
          prompt: 'Gõ do hoặc does',
          sentence: 'Where ___ your sister work?',
          answers: ['does'],
          explain:
            'Your sister là số ít nên dùng does, còn work giữ nguyên mẫu.',
        },
        {
          kind: 'fix',
          id: 'u02-l02-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['Where', 'do', 'Lan', 'live?'],
          wrongIndex: 1,
          correction: 'does',
          explain: 'Lan là một người (như she), nên câu hỏi dùng does.',
        },
        {
          kind: 'order',
          id: 'u02-l02-c11',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'How often do you go to the gym?',
          distractors: ['does'],
          explain:
            'How often đứng đầu, rồi do, chủ ngữ you và động từ nguyên mẫu go.',
        },
        {
          kind: 'fill',
          id: 'u02-l02-c12',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'This bus ___ stop at the airport.',
          answers: ["doesn't", 'does not'],
          bank: ["don't", "doesn't", "isn't"],
          explain:
            "This bus là số ít nên dùng doesn't, còn stop giữ nguyên mẫu.",
        },
        {
          kind: 'choice',
          id: 'u02-l02-c13',
          prompt: 'Chọn câu đúng',
          options: [
            'Do she speak English?',
            'Does she speak English?',
            'Does she speaks English?',
          ],
          answer: 1,
          explain:
            'She đi với Does, và sau Does động từ giữ nguyên mẫu: speak.',
        },
      ],
    },
    {
      id: 'u02-l03',
      title: 'Trạng từ tần suất',
      titleEn: 'Adverbs of frequency',
      summary: 'always, usually, often, sometimes, never đứng ở đâu.',
      cards: [
        {
          kind: 'explain',
          id: 'u02-l03-c01',
          title: 'Bao lâu một lần?',
          body: 'Always (luôn luôn), usually (thường), often (hay), sometimes (thỉnh thoảng), never (không bao giờ) cho biết việc xảy ra bao lâu một lần. Với động từ thường, chúng đứng ngay trước động từ.',
          formula: 'S + always / usually / often / sometimes / never + V',
          examples: [
            {
              en: 'I usually get up at six.',
              vi: 'Tôi thường dậy lúc sáu giờ.',
            },
            {
              en: 'She never eats breakfast.',
              vi: 'Cô ấy không bao giờ ăn sáng.',
            },
          ],
          pitfall: {
            wrong: 'I go always to school by bike.',
            right: 'I always go to school by bike.',
            note: 'Không đặt trạng từ tần suất sau động từ thường.',
          },
        },
        {
          kind: 'choice',
          id: 'u02-l03-c02',
          prompt: 'Chọn câu đúng',
          options: [
            'He drinks often tea.',
            'He often drinks tea.',
            'He often tea drinks.',
          ],
          answer: 1,
          explain: 'Often đứng ngay trước động từ thường drinks.',
        },
        {
          kind: 'order',
          id: 'u02-l03-c03',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'My mother never drinks coffee.',
          explain: 'Never đứng giữa chủ ngữ My mother và động từ drinks.',
        },
        {
          kind: 'fix',
          id: 'u02-l03-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['Lan', 'usually', 'take', 'the', 'bus', 'to', 'work.'],
          wrongIndex: 2,
          correction: 'takes',
          explain:
            'Trạng từ tần suất không làm mất -s: Lan là số ít nên vẫn phải là takes.',
        },
        {
          kind: 'explain',
          id: 'u02-l03-c05',
          title: 'Với to be: đứng SAU be',
          body: 'Nếu câu dùng am/is/are, trạng từ tần suất đứng sau be, không đứng trước.',
          formula: 'S + am / is / are + always / often / never...',
          examples: [
            { en: 'He is always late.', vi: 'Anh ấy lúc nào cũng trễ.' },
            { en: 'The bus is often full.', vi: 'Xe buýt hay bị đầy.' },
          ],
        },
        {
          kind: 'choice',
          id: 'u02-l03-c06',
          prompt: 'Chọn câu đúng',
          options: [
            'My boss always is busy.',
            'My boss is always busy.',
            'Always my boss is busy.',
          ],
          answer: 1,
          explain: 'Với be, trạng từ tần suất đứng sau is: is always.',
        },
        {
          kind: 'fix',
          id: 'u02-l03-c07',
          prompt: 'Chạm vào từ thừa',
          tokens: ['I', 'usually', 'am', 'go', 'to', 'bed', 'at', 'eleven.'],
          wrongIndex: 2,
          correction: '',
          explain:
            'Go là động từ thường nên không cần am. Bỏ am đi: I usually go to bed at eleven.',
        },
        {
          kind: 'fill',
          id: 'u02-l03-c08',
          prompt: 'Chọn trạng từ hợp nghĩa',
          sentence: 'Tom hates fish. He ___ eats it.',
          answers: ['never'],
          bank: ['always', 'never', 'usually'],
          explain: 'Tom ghét cá nên anh ấy không bao giờ ăn: never.',
        },
        {
          kind: 'explain',
          id: 'u02-l03-c09',
          title: 'Sometimes và usually linh hoạt hơn',
          body: 'Sometimes và usually có thể đứng đầu câu để nhấn mạnh. Always và never thì không đứng đầu câu kiểu này.',
          examples: [
            {
              en: 'Sometimes I walk to work.',
              vi: 'Thỉnh thoảng tôi đi bộ đi làm.',
            },
            {
              en: 'I sometimes walk to work.',
              vi: 'Tôi thỉnh thoảng đi bộ đi làm.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u02-l03-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I sometimes cook for my family.',
          alternatives: [
            'Sometimes I cook for my family.',
            'I cook for my family sometimes.',
          ],
          explain:
            'Sometimes thường đứng trước động từ cook, nhưng cũng có thể đứng đầu hoặc cuối câu.',
        },
        {
          kind: 'fill',
          id: 'u02-l03-c11',
          prompt: 'Gõ trạng từ tần suất phù hợp',
          sentence: 'The sun ___ rises in the east.',
          answers: ['always'],
          explain:
            'Mặt trời ngày nào cũng mọc ở hướng đông, không có ngoại lệ, nên dùng always.',
        },
        {
          kind: 'choice',
          id: 'u02-l03-c12',
          prompt: 'Chọn câu trả lời phù hợp',
          sentence: 'How often do you cook?',
          options: [
            'Yes, I cook.',
            'I usually cook on weekends.',
            'I am cooking now.',
          ],
          answer: 1,
          explain:
            'How often hỏi bao lâu một lần, nên trả lời bằng trạng từ tần suất như usually.',
        },
      ],
    },
    {
      id: 'u02-l04',
      title: 'Hiện tại tiếp diễn',
      titleEn: 'Present continuous',
      summary: 'am/is/are + V-ing cho việc đang xảy ra.',
      cards: [
        {
          kind: 'explain',
          id: 'u02-l04-c01',
          title: 'Đang xảy ra: am/is/are + V-ing',
          body: 'Để nói việc đang diễn ra ngay lúc nói, dùng am/is/are + V-ing. Tiếng Việt chỉ cần thêm chữ "đang", nhưng tiếng Anh cần cả be lẫn -ing.',
          formula: 'S + am / is / are + V-ing',
          examples: [
            { en: 'I am reading a book.', vi: 'Tôi đang đọc sách.' },
            {
              en: "She's talking on the phone.",
              vi: 'Cô ấy đang nói chuyện điện thoại.',
            },
          ],
          pitfall: {
            wrong: 'She cooking dinner now.',
            right: 'She is cooking dinner now.',
            note: 'Không được bỏ am/is/are, chỉ có -ing là chưa đủ.',
          },
        },
        {
          kind: 'fill',
          id: 'u02-l04-c02',
          prompt: 'Điền am, is hoặc are',
          sentence: 'The kids ___ playing in the garden.',
          answers: ['are'],
          bank: ['am', 'is', 'are'],
          explain: 'The kids là số nhiều nên dùng are + playing.',
        },
        {
          kind: 'choice',
          id: 'u02-l04-c03',
          prompt: 'Chọn câu đúng',
          options: [
            'I watching TV now.',
            'I am watching TV now.',
            'I am watch TV now.',
          ],
          answer: 1,
          explain: 'Cần đủ hai phần: am + V-ing (watching).',
        },
        {
          kind: 'explain',
          id: 'u02-l04-c04',
          title: 'Chính tả -ing',
          body: 'Thường chỉ thêm -ing: read thành reading. Tận cùng bằng -e thì bỏ e: make thành making. Một nguyên âm + một phụ âm cuối (từ ngắn) thì gấp đôi phụ âm: run thành running, sit thành sitting.',
          examples: [
            { en: 'He is writing an email.', vi: 'Anh ấy đang viết email.' },
            {
              en: 'We are swimming in the sea.',
              vi: 'Chúng tôi đang bơi ở biển.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u02-l04-c05',
          prompt: 'Điền dạng -ing của động từ trong ngoặc',
          sentence: 'Look! The bus is ___ (come).',
          answers: ['coming'],
          explain: 'Come tận cùng bằng -e nên bỏ e rồi thêm -ing: coming.',
        },
        {
          kind: 'choice',
          id: 'u02-l04-c06',
          prompt: 'Chọn cách viết đúng',
          sentence: 'They are ___ in the park.',
          options: ['runing', 'running', 'runnig'],
          answer: 1,
          explain:
            'Run có một nguyên âm + một phụ âm cuối, nên gấp đôi n: running.',
        },
        {
          kind: 'fix',
          id: 'u02-l04-c07',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'is', 'siting', 'next', 'to', 'me.'],
          wrongIndex: 2,
          correction: 'sitting',
          explain:
            'Sit có một nguyên âm + một phụ âm cuối, nên gấp đôi t: sitting.',
        },
        {
          kind: 'explain',
          id: 'u02-l04-c08',
          title: 'Phủ định và câu hỏi',
          body: 'Phủ định: thêm not sau am/is/are. Câu hỏi: đảo am/is/are lên trước chủ ngữ. Không dùng do/does ở thì này.',
          examples: [
            {
              en: "He isn't working today.",
              vi: 'Hôm nay anh ấy không làm việc.',
            },
            {
              en: 'Are you listening to me?',
              vi: 'Bạn có đang nghe tôi nói không?',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u02-l04-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'What are you cooking for dinner?',
          distractors: ['do'],
          explain:
            'What đứng đầu, rồi are, chủ ngữ you và V-ing cooking. Không dùng do.',
        },
        {
          kind: 'fix',
          id: 'u02-l04-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['Shh!', 'The', 'baby', 'is', 'sleep', 'upstairs.'],
          wrongIndex: 4,
          correction: 'sleeping',
          explain:
            'Shh! cho thấy em bé đang ngủ ngay lúc này. Sau is cần V-ing: sleeping.',
        },
        {
          kind: 'fill',
          id: 'u02-l04-c11',
          prompt: 'Chọn dạng đúng của động từ trong ngoặc',
          sentence: 'My phone ___ (ring). Can you answer it?',
          answers: ['is ringing'],
          bank: ['is ringing', 'rings', 'ringing'],
          explain:
            'Điện thoại đang reo ngay lúc nói (nhờ người khác nghe máy), nên dùng is ringing.',
        },
        {
          kind: 'choice',
          id: 'u02-l04-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'Is it raining outside?',
            'Does it raining outside?',
            'Is it rain outside?',
          ],
          answer: 0,
          explain:
            'Câu hỏi tiếp diễn đảo Is lên đầu và giữ V-ing: Is it raining?',
        },
        {
          kind: 'fill',
          id: 'u02-l04-c13',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'Be quiet! The students ___ (take) a test.',
          answers: ['are taking'],
          explain:
            'Be quiet! cho thấy việc đang diễn ra. Students số nhiều nên dùng are, và take bỏ e thành taking.',
        },
      ],
    },
    {
      id: 'u02-l05',
      title: 'Hiện tại đơn hay tiếp diễn?',
      titleEn: 'Present simple or continuous',
      summary: 'Thói quen hay đang xảy ra, và những động từ không dùng -ing.',
      cards: [
        {
          kind: 'explain',
          id: 'u02-l05-c01',
          title: 'Thói quen hay đang xảy ra?',
          body: 'Hiện tại đơn nói về thói quen, sự thật, việc lặp lại. Hiện tại tiếp diễn nói về việc đang diễn ra lúc nói, hoặc tạm thời trong khoảng thời gian này.',
          examples: [
            {
              en: 'I walk to work every day.',
              vi: 'Ngày nào tôi cũng đi bộ đi làm.',
            },
            { en: 'Today I am taking a taxi.', vi: 'Hôm nay tôi đi taxi.' },
          ],
          pitfall: {
            wrong: 'I am going to school every day.',
            right: 'I go to school every day.',
            note: 'Every day là thói quen, nên dùng hiện tại đơn, không dùng V-ing.',
          },
        },
        {
          kind: 'choice',
          id: 'u02-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'My dad ___ to work by motorbike every day.',
          options: ['goes', 'is going', 'go'],
          answer: 0,
          explain: 'Every day là thói quen nên dùng hiện tại đơn: goes.',
        },
        {
          kind: 'fill',
          id: 'u02-l05-c03',
          prompt: 'Chọn dạng đúng của động từ trong ngoặc',
          sentence: 'Listen! Someone ___ (knock) at the door.',
          answers: ['is knocking'],
          bank: ['knocks', 'is knocking', 'knocking'],
          explain:
            'Listen! cho thấy việc đang xảy ra ngay lúc nói, nên dùng is knocking.',
        },
        {
          kind: 'explain',
          id: 'u02-l05-c04',
          title: 'Từ tín hiệu',
          body: 'Every day, usually, on Mondays... thường đi với hiện tại đơn. Now, right now, at the moment, this week, Look!, Listen! thường đi với hiện tại tiếp diễn.',
          examples: [
            { en: 'She usually drinks tea.', vi: 'Cô ấy thường uống trà.' },
            {
              en: 'Right now she is drinking coffee.',
              vi: 'Lúc này cô ấy đang uống cà phê.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u02-l05-c05',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'At the moment, Hoa ___ (cook) dinner.',
          answers: ['is cooking'],
          explain:
            'At the moment nghĩa là ngay lúc này, nên dùng hiện tại tiếp diễn: is cooking.',
        },
        {
          kind: 'order',
          id: 'u02-l05-c06',
          prompt: 'Sắp xếp thành câu khẳng định',
          sentence: 'She is working from home this week.',
          alternatives: ['This week she is working from home.'],
          explain:
            'This week là việc tạm thời, chỉ trong tuần này, nên dùng is working.',
        },
        {
          kind: 'explain',
          id: 'u02-l05-c07',
          title: 'Động từ trạng thái không dùng -ing',
          body: 'Các động từ chỉ suy nghĩ, cảm xúc, mong muốn như know, like, love, want, need, understand, believe thường không dùng dạng tiếp diễn, kể cả khi nói về "bây giờ".',
          examples: [
            { en: 'I know the answer.', vi: 'Tôi biết câu trả lời.' },
            {
              en: 'He wants a new phone.',
              vi: 'Anh ấy muốn một chiếc điện thoại mới.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u02-l05-c08',
          prompt: 'Chạm vào từ thừa',
          tokens: ['I', 'am', 'understand', 'you', 'now.'],
          wrongIndex: 1,
          correction: '',
          explain:
            'Understand là động từ trạng thái, không dùng tiếp diễn kể cả khi có now. Bỏ am: I understand you now.',
        },
        {
          kind: 'choice',
          id: 'u02-l05-c09',
          prompt: 'Chọn câu đúng',
          options: [
            'Is he knowing the answer?',
            'Does he know the answer?',
            'Does he knows the answer?',
          ],
          answer: 1,
          explain:
            'Know là động từ trạng thái nên dùng hiện tại đơn: Does he know...?',
        },
        {
          kind: 'order',
          id: 'u02-l05-c10',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Do you understand this word?',
          distractors: ['understanding'],
          explain:
            'Understand không dùng -ing, nên câu hỏi dùng Do + you + understand.',
        },
        {
          kind: 'fill',
          id: 'u02-l05-c11',
          prompt: 'Chọn dạng đúng',
          sentence: 'I usually ___ jeans, but today I am wearing a suit.',
          answers: ['wear'],
          bank: ['wear', 'am wearing', 'wears'],
          explain:
            'Usually chỉ thói quen nên dùng hiện tại đơn wear. Today mới là việc tạm thời.',
        },
        {
          kind: 'fix',
          id: 'u02-l05-c12',
          prompt: 'Chạm vào từ sai',
          tokens: ['Look!', 'It', 'rains', 'again.'],
          wrongIndex: 2,
          correction: 'is raining',
          explain:
            'Look! cho thấy trời đang mưa ngay lúc nói, nên dùng is raining.',
        },
        {
          kind: 'choice',
          id: 'u02-l05-c13',
          prompt: 'Chọn từ đúng',
          sentence: 'I ___ you. You are telling the truth.',
          options: ['believe', 'am believing', 'believing'],
          answer: 0,
          explain:
            'Believe là động từ trạng thái, không dùng -ing, nên dùng hiện tại đơn: I believe you.',
        },
      ],
    },
  ],
}
