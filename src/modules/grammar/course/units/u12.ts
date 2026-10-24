import type { GrammarUnit } from '../types'

export const UNIT_12: GrammarUnit = {
  id: 'u12',
  order: 12,
  level: 'C1',
  title: 'Ngữ pháp IELTS nâng cao',
  summary:
    'Quá khứ hoàn thành, câu điều kiện hỗn hợp, đảo ngữ, mệnh đề phân từ và câu chẻ cho band điểm cao.',
  lessons: [
    {
      id: 'u12-l01',
      title: 'Quá khứ hoàn thành',
      titleEn: 'The past perfect',
      summary: 'had + V3 cho việc xảy ra trước một việc khác trong quá khứ.',
      cards: [
        {
          kind: 'explain',
          id: 'u12-l01-c01',
          title: 'Việc nào xảy ra trước?',
          body: 'Khi kể hai việc trong quá khứ, việc xảy ra TRƯỚC dùng had + V3. Tiếng Việt dùng "đã" cho cả hai việc, nên người Việt hay dùng quá khứ đơn cho tất cả.',
          formula: 'S + had + V3',
          examples: [
            {
              en: 'When I arrived, the train had left.',
              vi: 'Khi tôi đến thì tàu đã chạy rồi.',
            },
            {
              en: 'She had never flown before she moved to Australia.',
              vi: 'Trước khi chuyển sang Úc, cô ấy chưa từng đi máy bay.',
            },
          ],
          pitfall: {
            wrong: 'When we got to the cinema, the film already started.',
            right: 'When we got to the cinema, the film had already started.',
            note: 'Phim bắt đầu trước khi chúng tôi đến, nên dùng had started.',
          },
        },
        {
          kind: 'choice',
          id: 'u12-l01-c02',
          prompt: 'Chọn dạng đúng',
          sentence: 'By the time the police arrived, the thief ___.',
          options: ['escaped', 'had escaped', 'has escaped'],
          answer: 1,
          explain:
            'Tên trộm chạy thoát trước khi cảnh sát đến. By the time + quá khứ đi với quá khứ hoàn thành had escaped.',
        },
        {
          kind: 'fill',
          id: 'u12-l01-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'By the time we arrived, the film ___ (start).',
          answers: ['had started', 'had already started'],
          explain:
            'Phim bắt đầu trước lúc chúng tôi đến, nên dùng had started.',
        },
        {
          kind: 'explain',
          id: 'u12-l01-c04',
          title: 'Dấu hiệu hay gặp',
          body: 'By the time, when, already, never... before thường báo hiệu quá khứ hoàn thành. Với after và before, thứ tự đã rõ nên quá khứ đơn đôi khi cũng được chấp nhận.',
          examples: [
            {
              en: 'By the time I graduated, I had worked for three companies.',
              vi: 'Đến lúc tốt nghiệp, tôi đã làm cho ba công ty.',
            },
            {
              en: 'After she had finished her degree, she moved to Singapore.',
              vi: 'Sau khi học xong, cô ấy chuyển sang Singapore.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u12-l01-c05',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'At',
            'the',
            'airport,',
            'I',
            'realised',
            'that',
            'I',
            'have',
            'left',
            'my',
            'passport',
            'at',
            'home.',
          ],
          wrongIndex: 7,
          correction: 'had',
          explain:
            'Việc quên hộ chiếu xảy ra trước lúc nhận ra (realised), nên dùng had left.',
        },
        {
          kind: 'fill',
          id: 'u12-l01-c06',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence:
            'She was nervous because she ___ never given a presentation in English before.',
          answers: ['had'],
          bank: ['has', 'had', 'was'],
          explain:
            'Việc chưa từng thuyết trình kéo dài đến trước lúc cô ấy lo lắng (quá khứ), nên dùng had never given.',
        },
        {
          kind: 'explain',
          id: 'u12-l01-c07',
          title: 'Phủ định và câu hỏi',
          body: "Phủ định: had not (hadn't) + V3. Câu hỏi: đưa had lên đầu. Trong IELTS Speaking Part 2, thì này giúp bạn kể chuyện quá khứ rõ trước sau.",
          examples: [
            {
              en: "I hadn't seen snow until I went to Japan.",
              vi: 'Tôi chưa từng thấy tuyết cho đến khi sang Nhật.',
            },
            {
              en: 'Had you studied English before you started this course?',
              vi: 'Bạn đã học tiếng Anh trước khi vào khóa này chưa?',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u12-l01-c08',
          prompt: 'Chọn câu đúng',
          options: [
            "I didn't recognise her because we hadn't met before.",
            "I didn't recognise her because we didn't meet before.",
            "I didn't recognise her because we haven't met before.",
          ],
          answer: 0,
          explain:
            "Việc chưa gặp nhau xảy ra trước lúc không nhận ra cô ấy, nên dùng hadn't met.",
        },
        {
          kind: 'fill',
          id: 'u12-l01-c09',
          prompt: 'Gõ trợ động từ còn thiếu',
          sentence:
            'Lan felt confident in the exam because she ___ practised every day for months.',
          answers: ['had'],
          explain:
            'Việc luyện tập xảy ra trước lúc thi (felt), nên dùng had practised.',
        },
        {
          kind: 'order',
          id: 'u12-l01-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'They had finished the project by Friday.',
          alternatives: ['By Friday they had finished the project.'],
          explain:
            'By Friday là mốc quá khứ, việc hoàn thành xảy ra trước mốc đó nên dùng had finished.',
        },
        {
          kind: 'explain',
          id: 'u12-l01-c11',
          title: 'Dùng trong IELTS Writing Task 1',
          body: 'Khi mô tả biểu đồ quá khứ, by + mốc thời gian đi với quá khứ hoàn thành để nói số liệu đã đạt mức nào tại thời điểm đó.',
          formula: 'By + mốc quá khứ, S + had + V3',
          examples: [
            {
              en: 'By 2010, the number of internet users had doubled.',
              vi: 'Đến năm 2010, số người dùng internet đã tăng gấp đôi.',
            },
            {
              en: 'By the end of the period, car sales had fallen to 2 million.',
              vi: 'Đến cuối giai đoạn, doanh số ô tô đã giảm còn 2 triệu.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u12-l01-c12',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'By 2015, the city ___ (build) three new bridges.',
          answers: ['had built'],
          bank: ['built', 'had built', 'has built', 'was building'],
          explain:
            'By + mốc quá khứ (2015) đi với quá khứ hoàn thành had built.',
        },
        {
          kind: 'fix',
          id: 'u12-l01-c13',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'By',
            '2000,',
            'the',
            'population',
            'has',
            'reached',
            'ten',
            'million.',
          ],
          wrongIndex: 4,
          correction: 'had',
          explain:
            'By 2000 là mốc trong quá khứ, nên dùng had reached, không dùng has.',
        },
      ],
    },
    {
      id: 'u12-l02',
      title: 'Câu điều kiện hỗn hợp',
      titleEn: 'Mixed conditionals',
      summary: 'Ghép loại 2 và loại 3 khi quá khứ và hiện tại ảnh hưởng nhau.',
      cards: [
        {
          kind: 'explain',
          id: 'u12-l02-c01',
          title: 'Quá khứ khác đi, hiện tại khác đi',
          body: 'Khi một điều không có thật trong quá khứ dẫn đến kết quả ở hiện tại, ghép vế If của loại 3 với vế chính của loại 2.',
          formula: 'If + S + had + V3, S + would + V (bây giờ)',
          examples: [
            {
              en: 'If I had studied harder, I would have a better job now.',
              vi: 'Nếu hồi đó tôi học chăm hơn thì bây giờ tôi đã có việc tốt hơn.',
            },
            {
              en: 'If she had taken the medicine, she would feel better now.',
              vi: 'Nếu cô ấy đã uống thuốc thì giờ đã thấy khỏe hơn.',
            },
          ],
          pitfall: {
            wrong: 'If I had taken that job, I would have been rich now.',
            right: 'If I had taken that job, I would be rich now.',
            note: 'Có now thì vế sau nói về hiện tại: would + V, không dùng would have + V3.',
          },
        },
        {
          kind: 'choice',
          id: 'u12-l02-c02',
          prompt: 'Chọn dạng đúng',
          sentence:
            'If I had saved more money last year, I ___ able to travel now.',
          options: ['will be', 'would be', 'would have been'],
          answer: 1,
          explain:
            'Vế If nói về quá khứ (last year), vế sau nói về hiện tại (now), nên dùng would be.',
        },
        {
          kind: 'fill',
          id: 'u12-l02-c03',
          prompt: 'Chọn cụm từ điền vào chỗ trống',
          sentence: 'If she ___ the bus this morning, she would be here now.',
          answers: ["hadn't missed", 'had not missed'],
          bank: ["hadn't missed", "didn't miss", "wouldn't miss"],
          explain:
            "Việc lỡ xe buýt đã xảy ra sáng nay (quá khứ), nên vế If dùng had + V3: hadn't missed.",
        },
        {
          kind: 'explain',
          id: 'u12-l02-c04',
          title: 'Chiều ngược lại: hiện tại giải thích quá khứ',
          body: 'Một đặc điểm không đúng ở hiện tại (tính cách, khả năng) giải thích một việc đã không xảy ra. Khi đó vế If dùng loại 2, vế chính dùng loại 3.',
          formula: 'If + S + V2/were, S + would have + V3',
          examples: [
            {
              en: 'If I were more confident, I would have spoken at the meeting.',
              vi: 'Nếu tôi tự tin hơn thì tôi đã phát biểu trong buổi họp rồi.',
            },
            {
              en: 'If he spoke English, he would have got the job.',
              vi: 'Nếu anh ấy nói được tiếng Anh thì đã có được công việc đó.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u12-l02-c05',
          prompt: 'Chọn câu điều kiện đúng với tình huống',
          sentence:
            "He is afraid of flying, so he didn't go to the conference in Paris.",
          options: [
            "If he weren't afraid of flying, he would have gone to the conference.",
            "If he weren't afraid of flying, he would go to the conference.",
            "If he isn't afraid of flying, he will go to the conference.",
          ],
          answer: 0,
          explain:
            'Sợ máy bay là đặc điểm hiện tại (loại 2), còn hội nghị đã diễn ra (loại 3), nên dùng would have gone.',
        },
        {
          kind: 'fix',
          id: 'u12-l02-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'she',
            'accepted',
            'the',
            'offer',
            'last',
            'year,',
            'she',
            'would',
            'live',
            'in',
            'London',
            'now.',
          ],
          wrongIndex: 2,
          correction: 'had accepted',
          explain:
            'Lời mời làm việc là chuyện năm ngoái (quá khứ), nên vế If phải dùng had accepted.',
        },
        {
          kind: 'explain',
          id: 'u12-l02-c07',
          title: 'Dùng trong IELTS Speaking',
          body: 'Câu điều kiện hỗn hợp rất hợp khi nói về tiếc nuối hoặc lựa chọn trong đời. Để ý từ now, today hoặc tính cách lâu dài để biết vế nào nói về hiện tại.',
          examples: [
            {
              en: "If I hadn't moved to Hanoi, I wouldn't know so many people now.",
              vi: 'Nếu tôi không chuyển ra Hà Nội thì giờ tôi đã không quen nhiều người như vậy.',
            },
            {
              en: 'If I were better at maths, I would have chosen engineering.',
              vi: 'Nếu tôi giỏi toán hơn thì tôi đã chọn ngành kỹ thuật.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u12-l02-c08',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            'If the government had invested in public transport ten years ago, traffic ___ (be) much better today.',
          answers: ['would be', 'might be', 'could be'],
          explain:
            'Vế If nói về mười năm trước, vế sau nói về hôm nay (today), nên dùng would be.',
        },
        {
          kind: 'order',
          id: 'u12-l02-c09',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'She would be a doctor if she had passed the exam.',
          alternatives: ['If she had passed the exam she would be a doctor.'],
          explain:
            'Thi trượt là chuyện quá khứ (had passed), còn việc không phải bác sĩ là hiện tại (would be).',
        },
        {
          kind: 'fix',
          id: 'u12-l02-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'I',
            'were',
            'taller,',
            'I',
            'would',
            'join',
            'the',
            'basketball',
            'team',
            'last',
            'year.',
          ],
          wrongIndex: 6,
          correction: 'have joined',
          explain:
            'Last year là quá khứ, nên vế chính phải là would have joined.',
        },
        {
          kind: 'choice',
          id: 'u12-l02-c11',
          prompt: 'Chọn dạng đúng',
          sentence:
            'If we ___ climate warnings seriously decades ago, many coastal cities would not be at risk today.',
          options: ['took', 'had taken', 'would take', 'have taken'],
          answer: 1,
          explain:
            'Decades ago là quá khứ, nên vế If dùng had taken. Vế sau có today nên dùng would not be.',
        },
        {
          kind: 'fill',
          id: 'u12-l02-c12',
          prompt: 'Chọn cụm từ điền vào chỗ trống',
          sentence:
            "Minh is a very shy person. If he ___ so shy, he would have asked the speaker a question at yesterday's talk.",
          answers: ["weren't", 'were not', "wasn't", 'was not'],
          bank: ["weren't", "won't be", "wouldn't be"],
          explain:
            "Nhút nhát là tính cách hiện tại (loại 2), nên vế If dùng weren't. Vế sau nói về việc đã không xảy ra.",
        },
      ],
    },
    {
      id: 'u12-l03',
      title: 'Đảo ngữ nhấn mạnh',
      titleEn: 'Inversion for emphasis',
      summary: 'Never have I..., Not only..., Rarely, Seldom, Hardly... when.',
      cards: [
        {
          kind: 'explain',
          id: 'u12-l03-c01',
          title: 'Từ phủ định đứng đầu thì đảo ngữ',
          body: 'Khi đưa Never, Rarely, Seldom lên đầu câu, ta đảo trợ động từ lên trước chủ ngữ, giống câu hỏi. Cách này trang trọng, giúp bài IELTS Writing đa dạng cấu trúc.',
          formula: 'Never/Rarely/Seldom + trợ động từ + S + V',
          examples: [
            {
              en: 'Never have I seen such a beautiful beach.',
              vi: 'Chưa bao giờ tôi thấy bãi biển nào đẹp như vậy.',
            },
            {
              en: 'Rarely do students read the whole textbook.',
              vi: 'Hiếm khi sinh viên đọc hết cả cuốn giáo trình.',
            },
          ],
          pitfall: {
            wrong: 'Never I have seen such a beautiful beach.',
            right: 'Never have I seen such a beautiful beach.',
            note: 'Never đứng đầu thì phải đảo have lên trước I.',
          },
        },
        {
          kind: 'choice',
          id: 'u12-l03-c02',
          prompt: 'Chọn phần đúng',
          sentence: 'Never ___ such a difficult exam.',
          options: ['I have taken', 'have I taken', 'I taken have'],
          answer: 1,
          explain: 'Never đứng đầu câu nên đảo have lên trước chủ ngữ I.',
        },
        {
          kind: 'fix',
          id: 'u12-l03-c03',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Rarely',
            'did',
            'she',
            'misses',
            'a',
            'lecture',
            'last',
            'term.',
          ],
          wrongIndex: 3,
          correction: 'miss',
          explain:
            'Đã có trợ động từ did thì động từ chính trở về nguyên mẫu: did she miss.',
        },
        {
          kind: 'fill',
          id: 'u12-l03-c04',
          prompt: 'Chọn trợ động từ đúng',
          sentence: 'Seldom ___ young people write letters by hand these days.',
          answers: ['do'],
          bank: ['do', 'does', 'are', 'have'],
          explain:
            'Câu ở hiện tại đơn với chủ ngữ số nhiều young people, nên đảo do lên trước.',
        },
        {
          kind: 'explain',
          id: 'u12-l03-c05',
          title: 'Not only... but also',
          body: 'Khi Not only đứng đầu câu, vế đầu phải đảo ngữ. Vế sau giữ trật tự bình thường: but + S + also + V.',
          formula: 'Not only + trợ động từ + S + V, but + S + also + V',
          examples: [
            {
              en: 'Not only does pollution harm our health, but it also damages the economy.',
              vi: 'Ô nhiễm không chỉ hại sức khỏe mà còn gây thiệt hại cho kinh tế.',
            },
            {
              en: 'Not only did she pass, but she also got the highest score.',
              vi: 'Cô ấy không chỉ đậu mà còn đạt điểm cao nhất.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u12-l03-c06',
          prompt: 'Chọn câu đúng',
          options: [
            'Not only cycling is cheap, but it is also healthy.',
            'Not only is cycling cheap, but it is also healthy.',
            'Not only cycling cheap is, but it is also healthy.',
          ],
          answer: 1,
          explain: 'Not only đứng đầu nên đảo is lên trước chủ ngữ cycling.',
        },
        {
          kind: 'order',
          id: 'u12-l03-c07',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'Not only does the app save time, but it also saves money.',
          explain:
            'Vế đầu đảo does lên trước the app. Vế sau giữ trật tự thường: but it also saves.',
        },
        {
          kind: 'fill',
          id: 'u12-l03-c08',
          prompt: 'Gõ trợ động từ còn thiếu',
          sentence:
            'Not only ___ the factory pollute the river, but it also produced a lot of noise.',
          answers: ['did'],
          explain:
            'Vế sau dùng produced (quá khứ), và pollute ở dạng nguyên mẫu, nên trợ động từ là did.',
        },
        {
          kind: 'explain',
          id: 'u12-l03-c09',
          title: 'Hardly... when, No sooner... than',
          body: 'Hai cấu trúc này nghĩa là "vừa mới... thì đã...", cho hai việc nối tiếp rất nhanh trong quá khứ. Vế đầu đảo ngữ với had + V3. Nhớ cặp: Hardly đi với when, No sooner đi với than.',
          formula: 'Hardly had + S + V3 + when + S + V2',
          examples: [
            {
              en: 'Hardly had I sat down when the phone rang.',
              vi: 'Tôi vừa mới ngồi xuống thì điện thoại reo.',
            },
            {
              en: 'No sooner had we arrived than it started to rain.',
              vi: 'Chúng tôi vừa đến nơi thì trời đổ mưa.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u12-l03-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'No',
            'sooner',
            'had',
            'we',
            'left',
            'the',
            'house',
            'when',
            'it',
            'began',
            'to',
            'snow.',
          ],
          wrongIndex: 7,
          correction: 'than',
          explain:
            'No sooner luôn đi với than, không đi với when. (Hardly mới đi với when.)',
        },
        {
          kind: 'choice',
          id: 'u12-l03-c11',
          prompt: 'Chọn trợ động từ đúng',
          sentence: 'Hardly ___ the lecture begun when the lights went out.',
          options: ['had', 'has', 'did'],
          answer: 0,
          explain:
            'Begun là V3 và câu kể chuyện quá khứ, nên dùng had: Hardly had the lecture begun.',
        },
        {
          kind: 'fill',
          id: 'u12-l03-c12',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            'No sooner had the minister ___ (finish) his speech than the protesters started shouting.',
          answers: ['finished'],
          bank: ['finish', 'finished', 'finishing'],
          explain: 'Sau had cần V3: had the minister finished.',
        },
        {
          kind: 'order',
          id: 'u12-l03-c13',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'Seldom do governments invest enough in public health.',
          alternatives: [
            'Seldom do governments invest in public health enough.',
          ],
          explain:
            'Seldom đứng đầu nên đảo do lên trước chủ ngữ governments, động từ invest giữ nguyên mẫu.',
        },
      ],
    },
    {
      id: 'u12-l04',
      title: 'Mệnh đề phân từ',
      titleEn: 'Participle clauses',
      summary: 'Rút gọn mệnh đề bằng V-ing hoặc V3, và tránh lỗi chủ ngữ treo.',
      cards: [
        {
          kind: 'explain',
          id: 'u12-l04-c01',
          title: 'Rút gọn bằng V-ing',
          body: 'Khi hai vế có cùng chủ ngữ, có thể bỏ chủ ngữ ở một vế và đổi động từ thành V-ing (nghĩa chủ động). Câu gọn và học thuật hơn, rất hợp với IELTS Writing.',
          formula: 'V-ing + ..., S + V',
          examples: [
            {
              en: 'Feeling tired, she went to bed early.',
              vi: 'Thấy mệt nên cô ấy đi ngủ sớm.',
            },
            {
              en: 'Walking home, I saw an accident.',
              vi: 'Trên đường đi bộ về nhà, tôi thấy một vụ tai nạn.',
            },
          ],
          pitfall: {
            wrong: 'Walking along the street, my phone fell out of my pocket.',
            right: 'Walking along the street, I dropped my phone.',
            note: 'Chủ ngữ sau dấu phẩy phải là người làm hành động V-ing. Điện thoại không đi bộ được.',
          },
        },
        {
          kind: 'choice',
          id: 'u12-l04-c02',
          prompt: 'Chọn dạng đúng',
          sentence: '___ the bus, Lan realised she had forgotten her wallet.',
          options: ['Got on', 'Getting on', 'Get on'],
          answer: 1,
          explain:
            'Lan tự lên xe (chủ động) và có cùng chủ ngữ với vế sau, nên dùng V-ing: Getting on.',
        },
        {
          kind: 'fill',
          id: 'u12-l04-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            '___ (live) in a big city, I often feel stressed by the traffic.',
          answers: ['Living'],
          bank: ['Living', 'Lived', 'Live'],
          explain:
            'Chủ ngữ I tự sống ở thành phố (chủ động), nên dùng V-ing: Living.',
        },
        {
          kind: 'explain',
          id: 'u12-l04-c04',
          title: 'V3 mang nghĩa bị động',
          body: 'Nếu chủ ngữ chịu tác động (bị làm, được làm), dùng V3 thay cho V-ing.',
          formula: 'V3 + ..., S + V',
          examples: [
            {
              en: 'Built in 1902, Long Bien Bridge is a symbol of Hanoi.',
              vi: 'Được xây năm 1902, cầu Long Biên là biểu tượng của Hà Nội.',
            },
            {
              en: 'Written in simple English, the book is easy to read.',
              vi: 'Được viết bằng tiếng Anh đơn giản, cuốn sách rất dễ đọc.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u12-l04-c05',
          prompt: 'Chọn dạng đúng',
          sentence:
            '___ by millions of people every day, social media has changed how we communicate.',
          options: ['Using', 'Used', 'Uses'],
          answer: 1,
          explain:
            'Mạng xã hội được mọi người sử dụng (bị động, có by), nên dùng V3: Used.',
        },
        {
          kind: 'fill',
          id: 'u12-l04-c06',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            '___ (make) from recycled plastic, these bags are better for the environment.',
          answers: ['Made'],
          explain:
            'Những chiếc túi được làm từ nhựa tái chế (bị động), nên dùng V3: Made.',
        },
        {
          kind: 'fix',
          id: 'u12-l04-c07',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Comparing',
            'with',
            'last',
            'year,',
            'prices',
            'are',
            'much',
            'higher',
            'now.',
          ],
          wrongIndex: 0,
          correction: 'Compared',
          explain:
            'Giá cả được đem ra so sánh (bị động), nên dùng Compared with. Đây là cụm rất hay dùng trong IELTS Writing Task 1.',
        },
        {
          kind: 'explain',
          id: 'u12-l04-c08',
          title: 'Lỗi chủ ngữ treo (dangling participle)',
          body: 'Chủ ngữ ngay sau dấu phẩy phải là người/vật làm hành động V-ing (hoặc chịu hành động V3). Nếu không, câu sai nghĩa. Ví dụ "Arriving late, the teacher scolded me" nghe như cô giáo đến muộn.',
          examples: [
            {
              en: 'Arriving late, I was scolded by the teacher.',
              vi: 'Đến muộn nên tôi bị cô giáo mắng.',
            },
            {
              en: 'Looking out of the window, I saw the mountains.',
              vi: 'Nhìn ra cửa sổ, tôi thấy những ngọn núi.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u12-l04-c09',
          prompt: 'Chọn câu đúng',
          options: [
            'Reading the report, the mistakes were obvious.',
            'Reading the report, I noticed several mistakes.',
            'Reading the report, several mistakes appeared.',
          ],
          answer: 1,
          explain:
            'Chỉ có I mới đọc được báo cáo. Hai câu còn lại nghe như những lỗi sai đang đọc báo cáo.',
        },
        {
          kind: 'fix',
          id: 'u12-l04-c10',
          prompt: 'Chạm vào từ cần sửa',
          tokens: [
            'Driving',
            'to',
            'work,',
            'a',
            'dog',
            'ran',
            'in',
            'front',
            'of',
            'my',
            'car.',
          ],
          wrongIndex: 0,
          correction: 'As I was driving',
          explain:
            'Chủ ngữ chính là a dog, mà con chó không lái xe. Phải đổi vế đầu thành mệnh đề đầy đủ có chủ ngữ I.',
        },
        {
          kind: 'order',
          id: 'u12-l04-c11',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'Located in the mountains, Sapa attracts many tourists.',
          explain:
            'Sapa nằm ở vùng núi, located mang nghĩa bị động (được đặt ở) nên dùng V3, và Sapa là chủ ngữ ngay sau dấu phẩy.',
        },
        {
          kind: 'fill',
          id: 'u12-l04-c12',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: '___ (not know) what to say, she stayed silent.',
          answers: ['Not knowing'],
          bank: ['Not knowing', 'Knowing not', 'Not known'],
          explain: 'Phủ định của V-ing: đặt Not ngay trước, thành Not knowing.',
        },
      ],
    },
    {
      id: 'u12-l05',
      title: 'Câu chẻ',
      titleEn: 'Cleft sentences',
      summary: 'Nhấn mạnh bằng It is/was... that/who và What... is/was.',
      cards: [
        {
          kind: 'explain',
          id: 'u12-l05-c01',
          title: 'It is/was... that: "Chính... mà..."',
          body: 'Muốn nhấn mạnh một phần của câu, đặt phần đó giữa It is/was và that (hoặc who cho người). Phần còn lại giữ nguyên.',
          formula: 'It is/was + phần nhấn mạnh + that/who + phần còn lại',
          examples: [
            {
              en: 'It was my teacher who encouraged me to take IELTS.',
              vi: 'Chính cô giáo đã khuyến khích tôi thi IELTS.',
            },
            {
              en: 'It is technology that has changed education the most.',
              vi: 'Chính công nghệ đã thay đổi giáo dục nhiều nhất.',
            },
          ],
          pitfall: {
            wrong: 'Is the price that worries me.',
            right: 'It is the price that worries me.',
            note: 'Tiếng Việt nói "Chính giá cả...", nhưng tiếng Anh luôn cần chủ ngữ giả It.',
          },
        },
        {
          kind: 'choice',
          id: 'u12-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'It was in 2019 ___ I first took the IELTS test.',
          options: ['that', 'which', 'where'],
          answer: 0,
          explain:
            'Câu chẻ It was... dùng that để nối phần còn lại, kể cả khi phần nhấn mạnh là thời gian.',
        },
        {
          kind: 'fill',
          id: 'u12-l05-c03',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence: 'It is my parents ___ have supported me the most.',
          answers: ['who', 'that'],
          bank: ['who', 'which', 'where'],
          explain: 'Phần được nhấn mạnh là người (my parents), nên dùng who.',
        },
        {
          kind: 'fix',
          id: 'u12-l05-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'It',
            'is',
            'air',
            'pollution',
            'what',
            'worries',
            'city',
            'residents',
            'most.',
          ],
          wrongIndex: 4,
          correction: 'that',
          explain: 'Câu chẻ với It is nối bằng that, không dùng what.',
        },
        {
          kind: 'explain',
          id: 'u12-l05-c05',
          title: 'What... is/was',
          body: 'What + mệnh đề đứng đầu làm chủ ngữ, rồi đến is/was và phần muốn nhấn mạnh. Rất tự nhiên trong IELTS Speaking, ví dụ What I like most about my job is...',
          formula: 'What + S + V + is/was + phần nhấn mạnh',
          examples: [
            {
              en: 'What I need is more practice.',
              vi: 'Thứ tôi cần là luyện tập nhiều hơn.',
            },
            {
              en: 'What surprised me was the size of the city.',
              vi: 'Điều làm tôi bất ngờ là thành phố rộng đến vậy.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u12-l05-c06',
          prompt: 'Chọn câu đúng',
          options: [
            'What I enjoy most is meeting new people.',
            'That I enjoy most is meeting new people.',
            'The thing what I enjoy most is meeting new people.',
          ],
          answer: 0,
          explain:
            'Câu chẻ mở đầu bằng What (nghĩa là "điều mà"). That không mang nghĩa này, và the thing không đi kèm what.',
        },
        {
          kind: 'order',
          id: 'u12-l05-c07',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'What I want is a stable job.',
          alternatives: ['A stable job is what I want.'],
          explain:
            'What I want làm chủ ngữ, rồi đến is và phần được nhấn mạnh a stable job.',
        },
        {
          kind: 'fill',
          id: 'u12-l05-c08',
          prompt: 'Gõ từ còn thiếu',
          sentence: '___ students need most is more time to sleep.',
          answers: ['What'],
          explain:
            'Câu cần một chủ ngữ nghĩa là "điều mà học sinh cần nhất", nên dùng What.',
        },
        {
          kind: 'explain',
          id: 'u12-l05-c09',
          title: 'Chia động từ trong câu chẻ',
          body: 'It luôn đi với is/was, kể cả khi phần nhấn mạnh là số nhiều. Còn động từ sau who/that chia theo phần được nhấn mạnh.',
          examples: [
            {
              en: 'It is young people who use social media the most.',
              vi: 'Chính giới trẻ là những người dùng mạng xã hội nhiều nhất.',
            },
            {
              en: 'It was the teachers who were tired, not the students.',
              vi: 'Chính các thầy cô mới mệt, không phải học sinh.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u12-l05-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'It',
            'are',
            'the',
            'children',
            'who',
            'suffer',
            'most',
            'from',
            'pollution.',
          ],
          wrongIndex: 1,
          correction: 'is',
          explain:
            'Câu chẻ luôn bắt đầu bằng It is, kể cả khi the children là số nhiều.',
        },
        {
          kind: 'fill',
          id: 'u12-l05-c11',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            'It was the volunteers who ___ (clean) the beach last Sunday.',
          answers: ['cleaned'],
          bank: ['cleaned', 'cleans', 'was cleaning'],
          explain: 'Có last Sunday nên dùng quá khứ đơn cleaned.',
        },
        {
          kind: 'order',
          id: 'u12-l05-c12',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'It was the cost that made me change my mind.',
          explain:
            'It was + phần nhấn mạnh the cost + that + phần còn lại made me change my mind.',
        },
        {
          kind: 'choice',
          id: 'u12-l05-c13',
          prompt: 'Câu nào nhấn mạnh "ở Singapore"?',
          options: [
            'It was in Singapore that she learned to speak English.',
            'It was English that she learned to speak in Singapore.',
            'What she learned in Singapore was to speak English.',
          ],
          answer: 0,
          explain:
            'Phần nằm giữa It was và that là phần được nhấn mạnh: in Singapore.',
        },
      ],
    },
  ],
}
