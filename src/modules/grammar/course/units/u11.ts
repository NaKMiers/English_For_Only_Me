import type { GrammarUnit } from '../types'

export const UNIT_11: GrammarUnit = {
  id: 'u11',
  order: 11,
  level: 'B2',
  title: 'Mệnh đề quan hệ và câu tường thuật',
  summary:
    'who, which, that, whose, where, when, dấu phẩy trong mệnh đề quan hệ và cách tường thuật câu kể, câu hỏi.',
  lessons: [
    {
      id: 'u11-l01',
      title: 'who, which, that',
      titleEn: 'Relative pronouns: who, which, that',
      summary:
        'Nối hai câu bằng who cho người, which cho vật, that cho cả hai.',
      cards: [
        {
          kind: 'explain',
          id: 'u11-l01-c01',
          title: 'Gộp hai câu thành một',
          body: 'Mệnh đề quan hệ bổ nghĩa cho danh từ đứng ngay trước nó, giúp gộp hai câu ngắn thành một. Who dùng cho người, which dùng cho vật hoặc con vật.',
          formula: 'Danh từ + who/which + động từ...',
          examples: [
            {
              en: 'The teacher who taught me English lives in Hue.',
              vi: 'Người thầy dạy tôi tiếng Anh sống ở Huế.',
            },
            {
              en: 'The laptop which I bought last year is already slow.',
              vi: 'Cái laptop tôi mua năm ngoái đã chậm rồi.',
            },
          ],
          pitfall: {
            wrong: 'The man who he lives next door is a doctor.',
            right: 'The man who lives next door is a doctor.',
            note: 'Who đã thay cho chủ ngữ, không thêm he nữa.',
          },
        },
        {
          kind: 'choice',
          id: 'u11-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'Students ___ study abroad often become more independent.',
          options: ['who', 'which', 'whose'],
          answer: 0,
          explain:
            'Students là người và mệnh đề đang thiếu chủ ngữ cho study, nên dùng who.',
        },
        {
          kind: 'fill',
          id: 'u11-l01-c03',
          prompt: 'Điền who hoặc which',
          sentence:
            'This is a policy ___ could reduce air pollution in big cities.',
          answers: ['which', 'that'],
          bank: ['who', 'which'],
          explain:
            'Policy (chính sách) là vật, không phải người, nên dùng which.',
        },
        {
          kind: 'fix',
          id: 'u11-l01-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'engineer',
            'which',
            'designed',
            'this',
            'bridge',
            'is',
            'famous.',
          ],
          wrongIndex: 2,
          correction: 'who',
          explain: 'Engineer (kỹ sư) là người nên dùng who, không dùng which.',
        },
        {
          kind: 'explain',
          id: 'u11-l01-c05',
          title: 'That dùng được cho cả người lẫn vật',
          body: 'Khi mệnh đề không có dấu phẩy, that có thể thay cho cả who và which. Trong IELTS Writing, dùng who/which hay that đều được.',
          examples: [
            {
              en: 'The app that I use every day is free.',
              vi: 'Ứng dụng tôi dùng hằng ngày thì miễn phí.',
            },
            {
              en: 'The people that I met were friendly.',
              vi: 'Những người tôi gặp đều thân thiện.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u11-l01-c06',
          prompt: 'Gõ đại từ quan hệ còn thiếu',
          sentence:
            'Renewable energy is a topic ___ appears in many IELTS essays.',
          answers: ['which', 'that'],
          explain:
            'Topic là vật và mệnh đề thiếu chủ ngữ cho appears, nên dùng which hoặc that.',
        },
        {
          kind: 'order',
          id: 'u11-l01-c07',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I know a woman who speaks four languages.',
          explain: 'Who đứng ngay sau a woman và làm chủ ngữ cho speaks.',
        },
        {
          kind: 'explain',
          id: 'u11-l01-c08',
          title: 'Khi nào được bỏ who/which/that',
          body: 'Nếu ngay sau who/which/that là một chủ ngữ mới (I, you, people...), đại từ đó là tân ngữ và có thể bỏ. Nếu ngay sau là động từ thì không được bỏ.',
          examples: [
            {
              en: 'The book (that) you lent me was useful.',
              vi: 'Cuốn sách bạn cho tôi mượn rất có ích.',
            },
            {
              en: 'The man who called you is my boss.',
              vi: 'Người đàn ông gọi cho bạn là sếp tôi.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l01-c09',
          prompt: 'Chọn câu đúng',
          options: [
            'The woman lives next door is a nurse.',
            'The woman who lives next door is a nurse.',
            'The woman who she lives next door is a nurse.',
          ],
          answer: 1,
          explain:
            'Who là chủ ngữ của lives nên không được bỏ, và cũng không thêm she.',
        },
        {
          kind: 'fix',
          id: 'u11-l01-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'report',
            'that',
            'I',
            'wrote',
            'it',
            'was',
            'too',
            'long.',
          ],
          wrongIndex: 5,
          correction: '',
          explain:
            'That đã thay cho the report (tân ngữ của wrote), nên không thêm it nữa.',
        },
        {
          kind: 'fill',
          id: 'u11-l01-c11',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence: 'Doctors ___ work night shifts often feel exhausted.',
          answers: ['who', 'that'],
          bank: ['who', 'which', 'whose'],
          explain:
            'Doctors là người và mệnh đề cần chủ ngữ cho work, nên dùng who.',
        },
        {
          kind: 'order',
          id: 'u11-l01-c12',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'Smartphones are devices that have changed our lives.',
          explain:
            'That have changed our lives bổ nghĩa cho devices, nên đứng ngay sau devices.',
        },
        {
          kind: 'choice',
          id: 'u11-l01-c13',
          prompt: 'Chọn từ đúng',
          sentence: 'The city ___ I grew up in has changed a lot.',
          options: ['who', 'which', 'where'],
          answer: 1,
          explain:
            'Cuối mệnh đề có giới từ in, nên cần which làm tân ngữ cho in. Where đã mang nghĩa "ở đó", dùng where thì phải bỏ in.',
        },
      ],
    },
    {
      id: 'u11-l02',
      title: 'whose, where, when',
      titleEn: 'Relative words: whose, where, when',
      summary: 'Nói "của ai", "ở đâu", "khi nào" ngay trong một câu.',
      cards: [
        {
          kind: 'explain',
          id: 'u11-l02-c01',
          title: 'whose là "của người/vật đó"',
          body: 'Whose thay cho his, her, their, its... và luôn có một danh từ theo ngay sau. Whose dùng được cho cả người lẫn vật.',
          formula: 'Danh từ + whose + danh từ + động từ...',
          examples: [
            {
              en: 'I have a friend whose father is a pilot.',
              vi: 'Tôi có một người bạn có bố là phi công.',
            },
            {
              en: 'This is the company whose products are sold worldwide.',
              vi: 'Đây là công ty có sản phẩm được bán khắp thế giới.',
            },
          ],
          pitfall: {
            wrong: 'I met a student who his parents are teachers.',
            right: 'I met a student whose parents are teachers.',
            note: 'Không ghép who + his. Chỉ cần một chữ whose.',
          },
        },
        {
          kind: 'choice',
          id: 'u11-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence:
            'Students ___ families have low incomes can apply for this scholarship.',
          options: ['who', 'whose', 'which'],
          answer: 1,
          explain:
            'Ngay sau chỗ trống là danh từ families (gia đình của các sinh viên), nên dùng whose.',
        },
        {
          kind: 'fill',
          id: 'u11-l02-c03',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence: 'She is the author ___ book won the award last year.',
          answers: ['whose'],
          bank: ['who', 'whose', 'which'],
          explain:
            'Cuốn sách của tác giả, và có danh từ book đứng ngay sau, nên dùng whose.',
        },
        {
          kind: 'fix',
          id: 'u11-l02-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'country',
            'who',
            'economy',
            'grew',
            'fastest',
            'was',
            'China.',
          ],
          wrongIndex: 2,
          correction: 'whose',
          explain:
            'Nền kinh tế của quốc gia đó: dùng whose + economy. Whose dùng được cả cho vật như country.',
        },
        {
          kind: 'explain',
          id: 'u11-l02-c05',
          title: 'where cho nơi chốn',
          body: 'Where thay cho "ở đó" sau danh từ chỉ nơi chốn. Sau where là một câu đầy đủ, có chủ ngữ và động từ.',
          formula: 'Nơi chốn + where + S + V',
          examples: [
            {
              en: 'This is the village where my grandparents live.',
              vi: 'Đây là ngôi làng nơi ông bà tôi sống.',
            },
            {
              en: 'Hanoi is a city where traffic is a serious problem.',
              vi: 'Hà Nội là thành phố mà giao thông là một vấn đề nghiêm trọng.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l02-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'This is the library ___ I usually study at weekends.',
          options: ['which', 'where', 'when'],
          answer: 1,
          explain:
            'Library là nơi chốn và phía sau là câu đủ (I usually study), nên dùng where. Muốn dùng which thì phải có thêm in.',
        },
        {
          kind: 'fix',
          id: 'u11-l02-c07',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'factory',
            'when',
            'my',
            'father',
            'works',
            'is',
            'closing',
            'down.',
          ],
          wrongIndex: 2,
          correction: 'where',
          explain:
            'Factory là nơi chốn, không phải thời gian, và sau đó là câu đủ (my father works), nên dùng where.',
        },
        {
          kind: 'explain',
          id: 'u11-l02-c08',
          title: 'when cho thời gian',
          body: 'When đi sau danh từ chỉ thời gian như day, year, time, season. Rất hữu ích trong IELTS Speaking khi kể về một kỷ niệm.',
          examples: [
            {
              en: 'I remember the day when I first went to school.',
              vi: 'Tôi nhớ ngày đầu tiên tôi đi học.',
            },
            {
              en: '2020 was the year when many classes moved online.',
              vi: '2020 là năm nhiều lớp học chuyển sang học trực tuyến.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u11-l02-c09',
          prompt: 'Gõ từ nối còn thiếu',
          sentence: 'Summer is the season ___ many tourists visit Ha Long Bay.',
          answers: ['when', 'in which', 'during which', 'that'],
          explain:
            'Season là thời gian và phía sau là câu đủ (many tourists visit Ha Long Bay), nên dùng when (cũng có thể dùng in which hoặc that).',
        },
        {
          kind: 'order',
          id: 'u11-l02-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I will never forget the day when we met.',
          alternatives: ['I never will forget the day when we met.'],
          explain:
            'When we met bổ nghĩa cho the day, nên đứng ngay sau the day.',
        },
        {
          kind: 'explain',
          id: 'u11-l02-c11',
          title: 'Mẹo chọn which hay where',
          body: 'Nhìn phần phía sau chỗ trống. Nếu mệnh đề còn thiếu chủ ngữ hoặc tân ngữ, dùng which. Nếu mệnh đề đã đủ, dùng where (nơi chốn) hoặc when (thời gian).',
          examples: [
            {
              en: 'The museum which we visited was crowded.',
              vi: 'Bảo tàng chúng tôi tham quan rất đông. (visited thiếu tân ngữ)',
            },
            {
              en: 'The museum where we met was crowded.',
              vi: 'Bảo tàng nơi chúng tôi gặp nhau rất đông. (câu đã đủ)',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l02-c12',
          prompt: 'Chọn từ đúng',
          sentence: 'The museum ___ we visited last week was very crowded.',
          options: ['where', 'which', 'when'],
          answer: 1,
          explain:
            'Visited cần tân ngữ (thăm cái gì?), và the museum chính là tân ngữ đó, nên dùng which.',
        },
        {
          kind: 'fill',
          id: 'u11-l02-c13',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence: 'Online learning suits people ___ schedules are very busy.',
          answers: ['whose'],
          bank: ['who', 'whose', 'where'],
          explain:
            'Lịch làm việc của những người đó: danh từ schedules đứng ngay sau, nên dùng whose.',
        },
      ],
    },
    {
      id: 'u11-l03',
      title: 'Có dấu phẩy hay không',
      titleEn: 'Defining and non-defining clauses',
      summary: 'Khi nào cần dấu phẩy, và vì sao không dùng that sau dấu phẩy.',
      cards: [
        {
          kind: 'explain',
          id: 'u11-l03-c01',
          title: 'Hai loại mệnh đề quan hệ',
          body: 'Mệnh đề xác định cho biết đang nói về ai, cái nào, và không có dấu phẩy. Mệnh đề không xác định chỉ thêm thông tin phụ về một người/vật đã rõ, và đặt giữa hai dấu phẩy.',
          examples: [
            {
              en: 'The student who sits next to me is from Hue.',
              vi: 'Bạn sinh viên ngồi cạnh tôi là người Huế. (người nào? người ngồi cạnh tôi)',
            },
            {
              en: 'My father, who is 60, still goes to work every day.',
              vi: 'Bố tôi, năm nay 60 tuổi, vẫn đi làm mỗi ngày. (thông tin thêm)',
            },
          ],
          pitfall: {
            wrong:
              'Hanoi, that is the capital of Vietnam, has over eight million people.',
            right:
              'Hanoi, which is the capital of Vietnam, has over eight million people.',
            note: 'Sau dấu phẩy không bao giờ dùng that.',
          },
        },
        {
          kind: 'choice',
          id: 'u11-l03-c02',
          prompt: 'Chọn từ đúng',
          sentence:
            'Ho Chi Minh City, ___ is the largest city in Vietnam, has serious traffic problems.',
          options: ['that', 'which', 'who'],
          answer: 1,
          explain:
            'Sau dấu phẩy không dùng that, và thành phố là vật nên dùng which.',
        },
        {
          kind: 'fill',
          id: 'u11-l03-c03',
          prompt: 'Điền who hoặc that',
          sentence:
            'My mother, ___ has taught for thirty years, is retiring next month.',
          answers: ['who'],
          bank: ['who', 'that'],
          explain:
            'Có dấu phẩy nên đây là mệnh đề không xác định. Với người chỉ dùng who, không dùng that.',
        },
        {
          kind: 'explain',
          id: 'u11-l03-c04',
          title: 'Khi nào cần dấu phẩy',
          body: 'Nếu danh từ đã rõ ràng (tên riêng, my mother, the Earth...), mệnh đề chỉ là thông tin thêm nên cần dấu phẩy. Thử bỏ mệnh đề đi: nếu câu vẫn rõ là nói về ai, cái gì thì dùng dấu phẩy.',
          examples: [
            {
              en: 'Mr Nam, who teaches maths, is very strict.',
              vi: 'Thầy Nam, người dạy toán, rất nghiêm khắc.',
            },
            {
              en: 'The Mekong, which flows through six countries, is facing drought.',
              vi: 'Sông Mê Kông, chảy qua sáu quốc gia, đang gặp hạn hán.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l03-c05',
          prompt: 'Câu nào đang thiếu dấu phẩy?',
          options: [
            'People who exercise regularly live longer.',
            'Ms Hoa who is our new manager speaks three languages.',
            'The phone that I bought yesterday is broken.',
          ],
          answer: 1,
          explain:
            'Ms Hoa là một người cụ thể, đã rõ. Mệnh đề who is our new manager chỉ là thông tin thêm, nên phải đặt giữa hai dấu phẩy.',
        },
        {
          kind: 'fix',
          id: 'u11-l03-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'Amazon',
            'rainforest,',
            'that',
            'absorbs',
            'huge',
            'amounts',
            'of',
            'carbon,',
            'is',
            'shrinking.',
          ],
          wrongIndex: 3,
          correction: 'which',
          explain:
            'Mệnh đề nằm giữa hai dấu phẩy, nên phải dùng which, không dùng that.',
        },
        {
          kind: 'explain',
          id: 'u11-l03-c07',
          title: 'Dấu phẩy có thể đổi nghĩa',
          body: 'Không có dấu phẩy: chỉ nói về một phần trong nhóm. Có dấu phẩy: nói về tất cả.',
          examples: [
            {
              en: 'The students who passed the test got a certificate.',
              vi: 'Chỉ những sinh viên thi đậu mới được nhận chứng chỉ.',
            },
            {
              en: 'The students, who passed the test, got a certificate.',
              vi: 'Tất cả sinh viên đều thi đậu và đều được nhận chứng chỉ.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l03-c08',
          prompt: 'Tôi có hai chị gái. Câu nào đúng?',
          options: [
            'My sister who lives in Australia is a doctor.',
            'My sister, who lives in Australia, is a doctor.',
            'My sister, that lives in Australia, is a doctor.',
          ],
          answer: 0,
          explain:
            'Có hai chị gái nên cần mệnh đề xác định để biết là chị nào. Vì vậy không dùng dấu phẩy.',
        },
        {
          kind: 'fill',
          id: 'u11-l03-c09',
          prompt: 'Gõ đại từ quan hệ còn thiếu',
          sentence:
            'Mr Long, ___ car was stolen last night, called the police.',
          answers: ['whose'],
          explain:
            'Chiếc xe của ông Long, có danh từ car ngay sau, nên dùng whose. Whose vẫn dùng được sau dấu phẩy.',
        },
        {
          kind: 'explain',
          id: 'u11-l03-c10',
          title: 'which nói về cả ý phía trước',
          body: 'Which sau dấu phẩy có thể nói về cả ý phía trước, nghĩa là "điều này". Cấu trúc này rất hay trong IELTS Writing để thêm lời bình luận.',
          examples: [
            {
              en: 'Many young people move to cities, which puts pressure on housing.',
              vi: 'Nhiều người trẻ chuyển lên thành phố, điều này gây áp lực lên nhà ở.',
            },
            {
              en: 'He failed the test, which surprised everyone.',
              vi: 'Anh ấy thi trượt, điều đó làm mọi người bất ngờ.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u11-l03-c11',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'Prices keep rising, which worries many families.',
          explain:
            'Which đứng ngay sau dấu phẩy và nói về cả ý phía trước: giá cả cứ tăng.',
        },
        {
          kind: 'fix',
          id: 'u11-l03-c12',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Many',
            'people',
            'work',
            'from',
            'home,',
            'that',
            'reduces',
            'traffic.',
          ],
          wrongIndex: 5,
          correction: 'which',
          explain:
            'Muốn nói về cả ý phía trước sau dấu phẩy thì dùng which. That không bao giờ đứng sau dấu phẩy.',
        },
        {
          kind: 'fill',
          id: 'u11-l03-c13',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence:
            'Vietnam, ___ has a long coastline, attracts millions of tourists.',
          answers: ['which'],
          bank: ['which', 'that', 'who'],
          explain:
            'Vietnam là tên riêng, mệnh đề nằm giữa hai dấu phẩy và nói về vật, nên dùng which.',
        },
      ],
    },
    {
      id: 'u11-l04',
      title: 'Tường thuật câu kể',
      titleEn: 'Reported statements',
      summary:
        'Lùi thì, đổi đại từ và từ chỉ thời gian, phân biệt said và told.',
      cards: [
        {
          kind: 'explain',
          id: 'u11-l04-c01',
          title: 'Kể lại lời người khác: lùi một thì',
          body: 'Khi kể lại lời ai đó bằng said, động từ trong lời nói thường lùi về quá khứ một bậc. Tiếng Việt không đổi thì nên người Việt hay quên bước này.',
          formula: 'S + said (that) + S + V (lùi một thì)',
          examples: [
            {
              en: '"I am tired." -> She said (that) she was tired.',
              vi: 'Cô ấy nói rằng cô ấy mệt.',
            },
            {
              en: '"We live in Hue." -> They said they lived in Hue.',
              vi: 'Họ nói họ sống ở Huế.',
            },
          ],
          pitfall: {
            wrong: 'Lan said she is busy that day.',
            right: 'Lan said she was busy that day.',
            note: 'Sau said, is thường lùi thành was.',
          },
        },
        {
          kind: 'choice',
          id: 'u11-l04-c02',
          prompt: 'Chọn từ đúng',
          sentence: '"I work in a bank." -> Nam said he ___ in a bank.',
          options: ['work', 'worked', 'working'],
          answer: 1,
          explain:
            'Lời gốc dùng hiện tại đơn work. Tường thuật bằng said nên lùi thành quá khứ đơn worked.',
        },
        {
          kind: 'fill',
          id: 'u11-l04-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            'Lan said that she ___ (be) too busy to come to the party that night.',
          answers: ['was'],
          bank: ['is', 'was', 'were'],
          explain:
            'Lời gốc là "I am too busy". Tường thuật bằng said nên am lùi thành was.',
        },
        {
          kind: 'explain',
          id: 'u11-l04-c04',
          title: 'will, can và các thì hoàn thành',
          body: 'Will thành would, can thành could. Hiện tại hoàn thành và quá khứ đơn lùi thành quá khứ hoàn thành (had + V3).',
          formula: 'will -> would, can -> could, have/has done -> had done',
          examples: [
            {
              en: '"I will call you." -> He said he would call me.',
              vi: 'Anh ấy nói sẽ gọi cho tôi.',
            },
            {
              en: '"I have finished." -> She said she had finished.',
              vi: 'Cô ấy nói đã làm xong.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u11-l04-c05',
          prompt: 'Gõ từ còn thiếu',
          sentence:
            '"We will open a new metro line next year." -> The mayor said they ___ open a new metro line the following year.',
          answers: ['would'],
          explain: 'Will lùi thành would khi tường thuật bằng said.',
        },
        {
          kind: 'fix',
          id: 'u11-l04-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Last',
            'Monday,',
            'she',
            'said',
            'she',
            'has',
            'finished',
            'the',
            'essay',
            'the',
            'day',
            'before.',
          ],
          wrongIndex: 5,
          correction: 'had',
          explain:
            'Việc làm xong bài luận xảy ra trước lúc cô ấy nói, nên dùng quá khứ hoàn thành had finished.',
        },
        {
          kind: 'explain',
          id: 'u11-l04-c07',
          title: 'Đổi đại từ và từ chỉ thời gian',
          body: 'Đổi đại từ theo người nói: I thành he/she, my thành his/her. Từ chỉ thời gian cũng đổi: today thành that day, tomorrow thành the next day, yesterday thành the day before.',
          examples: [
            {
              en: '"I will see you tomorrow." -> He said he would see me the next day.',
              vi: 'Anh ấy nói sẽ gặp tôi vào hôm sau.',
            },
            {
              en: '"I met my teacher yesterday." -> She said she had met her teacher the day before.',
              vi: 'Cô ấy nói đã gặp cô giáo vào hôm trước.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l04-c08',
          prompt: 'Chọn câu tường thuật đúng',
          sentence: '"I am meeting my boss today," Hung said.',
          options: [
            'Hung said he was meeting his boss that day.',
            'Hung said I was meeting my boss that day.',
            'Hung said he were meeting his boss that day.',
          ],
          answer: 0,
          explain:
            'I đổi thành he, my đổi thành his, am meeting lùi thành was meeting, today thành that day.',
        },
        {
          kind: 'fill',
          id: 'u11-l04-c09',
          prompt: 'Gõ cụm từ chỉ thời gian còn thiếu',
          sentence:
            '"I visited the museum yesterday." -> He said he had visited the museum ___.',
          answers: ['the day before', 'the previous day'],
          explain:
            'Khi tường thuật, yesterday đổi thành the day before (hoặc the previous day).',
        },
        {
          kind: 'order',
          id: 'u11-l04-c10',
          prompt: 'Sắp xếp thành câu tường thuật',
          sentence: 'They said they had missed the bus.',
          explain:
            'Lời gốc "We missed the bus": we đổi thành they, quá khứ đơn missed lùi thành had missed.',
        },
        {
          kind: 'explain',
          id: 'u11-l04-c11',
          title: 'said hay told',
          body: 'Told luôn cần người nghe ngay sau: told me, told her. Said không có người nghe ngay sau. Nếu muốn nhắc người nghe thì dùng said to me.',
          formula: 'say (to sb) + that... / tell + sb + that...',
          examples: [
            {
              en: 'She told me that she was leaving.',
              vi: 'Cô ấy bảo tôi là cô ấy sắp đi.',
            },
            {
              en: 'She said that she was leaving.',
              vi: 'Cô ấy nói là cô ấy sắp đi.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u11-l04-c12',
          prompt: 'Chọn từ đúng',
          sentence: 'My manager ___ me that the meeting had been cancelled.',
          options: ['said', 'told', 'spoke'],
          answer: 1,
          explain: 'Ngay sau chỗ trống là người nghe me, nên dùng told.',
        },
        {
          kind: 'fix',
          id: 'u11-l04-c13',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'told', 'that', 'she', 'had', 'lost', 'her', 'keys.'],
          wrongIndex: 1,
          correction: 'said',
          explain:
            'Told phải có người nghe ngay sau (told me). Không có người nghe thì dùng said.',
        },
        {
          kind: 'fill',
          id: 'u11-l04-c14',
          prompt: 'Điền said hoặc told',
          sentence:
            'The teacher ___ the class that the exam would be difficult.',
          answers: ['told'],
          bank: ['said', 'told'],
          explain: 'The class là người nghe đứng ngay sau, nên dùng told.',
        },
      ],
    },
    {
      id: 'u11-l05',
      title: 'Tường thuật câu hỏi',
      titleEn: 'Reported questions',
      summary: 'asked if/whether, trật tự câu kể và không đảo ngữ.',
      cards: [
        {
          kind: 'explain',
          id: 'u11-l05-c01',
          title: 'Câu hỏi tường thuật không còn là câu hỏi',
          body: 'Khi tường thuật câu hỏi, câu trở về trật tự câu kể: chủ ngữ đứng trước động từ, bỏ do/does/did và không có dấu hỏi. Vẫn lùi thì như câu kể.',
          formula: 'S + asked (+ sb) + từ để hỏi + S + V',
          examples: [
            {
              en: '"Where do you live?" -> She asked me where I lived.',
              vi: 'Cô ấy hỏi tôi sống ở đâu.',
            },
            {
              en: '"What are you doing?" -> He asked what I was doing.',
              vi: 'Anh ấy hỏi tôi đang làm gì.',
            },
          ],
          pitfall: {
            wrong: 'She asked me where did I live.',
            right: 'She asked me where I lived.',
            note: 'Câu tường thuật không đảo trợ động từ và bỏ did.',
          },
        },
        {
          kind: 'choice',
          id: 'u11-l05-c02',
          prompt: 'Chọn câu tường thuật đúng',
          sentence: '"Where is the station?" the tourist asked.',
          options: [
            'The tourist asked where was the station.',
            'The tourist asked where the station was.',
            'The tourist asked where is the station.',
          ],
          answer: 1,
          explain:
            'Theo trật tự câu kể: chủ ngữ the station đứng trước was, và is lùi thành was.',
        },
        {
          kind: 'order',
          id: 'u11-l05-c03',
          prompt: 'Sắp xếp thành câu tường thuật',
          sentence: 'He asked me what I was studying.',
          explain:
            'Sau từ để hỏi what là trật tự câu kể: chủ ngữ I rồi mới đến was studying.',
        },
        {
          kind: 'fix',
          id: 'u11-l05-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'interviewer',
            'asked',
            'me',
            'why',
            'did',
            'I',
            'wanted',
            'this',
            'job.',
          ],
          wrongIndex: 5,
          correction: '',
          explain:
            'Câu tường thuật không dùng did để hỏi. Bỏ did đi: why I wanted this job.',
        },
        {
          kind: 'explain',
          id: 'u11-l05-c05',
          title: 'Câu hỏi Yes/No: thêm if hoặc whether',
          body: 'Câu hỏi không có từ để hỏi (trả lời Yes/No) thì thêm if hoặc whether. Whether trang trọng hơn, hợp với IELTS Writing.',
          formula: 'S + asked (+ sb) + if/whether + S + V',
          examples: [
            {
              en: '"Do you like your job?" -> She asked me if I liked my job.',
              vi: 'Cô ấy hỏi tôi có thích công việc không.',
            },
            {
              en: '"Is the test difficult?" -> He asked whether the test was difficult.',
              vi: 'Anh ấy hỏi bài thi có khó không.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u11-l05-c06',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence:
            '"Are you a student?" -> The officer asked me ___ I was a student.',
          answers: ['if', 'whether'],
          bank: ['if', 'that', 'what'],
          explain:
            'Câu hỏi gốc là Yes/No, không có từ để hỏi, nên dùng if (hoặc whether).',
        },
        {
          kind: 'choice',
          id: 'u11-l05-c07',
          prompt: 'Chọn phần đúng',
          sentence: '"Have you finished the report?" -> My boss asked ___.',
          options: [
            'if I had finished the report',
            'that I had finished the report',
            'had I finished the report',
          ],
          answer: 0,
          explain:
            'Câu hỏi Yes/No dùng if, theo trật tự câu kể, và have finished lùi thành had finished.',
        },
        {
          kind: 'fix',
          id: 'u11-l05-c08',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'She',
            'asked',
            'me',
            'that',
            'I',
            'could',
            'speak',
            'French.',
          ],
          wrongIndex: 3,
          correction: 'if',
          explain:
            'Tường thuật câu hỏi Yes/No ("Can you speak French?") phải dùng if hoặc whether, không dùng that.',
        },
        {
          kind: 'explain',
          id: 'u11-l05-c09',
          title: 'Vẫn lùi thì và đổi từ như câu kể',
          body: 'Câu hỏi tường thuật cũng lùi thì, đổi đại từ và từ chỉ thời gian giống câu kể. Lỗi hay gặp nhất là giữ dấu hỏi hoặc giữ do/did.',
          examples: [
            {
              en: '"Will you come tomorrow?" -> She asked if I would come the next day.',
              vi: 'Cô ấy hỏi hôm sau tôi có đến không.',
            },
            {
              en: '"Did you see the news?" -> He asked whether I had seen the news.',
              vi: 'Anh ấy hỏi tôi đã xem tin tức chưa.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u11-l05-c10',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence:
            '"Do you live near here?" -> The man asked if I ___ (live) near there.',
          answers: ['lived'],
          explain: 'Bỏ do, và hiện tại đơn live lùi thành quá khứ đơn lived.',
        },
        {
          kind: 'order',
          id: 'u11-l05-c11',
          prompt: 'Sắp xếp thành câu tường thuật',
          sentence: 'They asked whether the city had enough hospitals.',
          explain:
            'Câu hỏi Yes/No dùng whether, rồi đến trật tự câu kể: the city + had.',
        },
        {
          kind: 'choice',
          id: 'u11-l05-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'He asked me how old was I.',
            'He asked me how old I was.',
            'He asked me how old am I.',
          ],
          answer: 1,
          explain: 'Sau how old là trật tự câu kể: chủ ngữ I đứng trước was.',
        },
        {
          kind: 'fill',
          id: 'u11-l05-c13',
          prompt: 'Chọn từ điền vào chỗ trống',
          sentence:
            '"How long does the course take?" -> I asked how long the course ___.',
          answers: ['took'],
          bank: ['took', 'does take', 'did take'],
          explain: 'Bỏ does, và hiện tại đơn take lùi thành quá khứ đơn took.',
        },
      ],
    },
  ],
}
