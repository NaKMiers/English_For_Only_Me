import type { GrammarUnit } from '../types'

export const UNIT_03: GrammarUnit = {
  id: 'u03',
  order: 3,
  level: 'A2',
  title: 'Danh từ và mạo từ',
  summary:
    'Đếm được hay không, a/an, the, some/any, much/many và a few/a little.',
  lessons: [
    {
      id: 'u03-l01',
      title: 'Danh từ đếm được và không đếm được',
      titleEn: 'Countable and uncountable nouns',
      summary: 'Biết danh từ nào có số nhiều, danh từ nào không.',
      cards: [
        {
          kind: 'explain',
          id: 'u03-l01-c01',
          title: 'Đếm được hay không đếm được',
          body: 'Danh từ đếm được có số ít và số nhiều: a book, two books. Danh từ không đếm được không có số nhiều và không đi với a/an: water, rice, money, information.',
          examples: [
            { en: 'I have two brothers.', vi: 'Tôi có hai anh trai.' },
            { en: 'We need some rice.', vi: 'Chúng ta cần một ít gạo.' },
          ],
          pitfall: {
            wrong: 'She gave me many informations.',
            right: 'She gave me a lot of information.',
            note: 'Information không đếm được trong tiếng Anh, dù tiếng Việt nói "nhiều thông tin" rất tự nhiên.',
          },
        },
        {
          kind: 'choice',
          id: 'u03-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'Can you give me some ___ about the course?',
          options: ['information', 'informations', 'an information'],
          answer: 0,
          explain:
            'Information không đếm được: không thêm -s và không đi với an.',
        },
        {
          kind: 'fill',
          id: 'u03-l01-c03',
          prompt: 'Điền dạng đúng của danh từ trong ngoặc',
          sentence: 'I bought three ___ (apple) at the market.',
          answers: ['apples'],
          bank: ['apple', 'apples'],
          explain: 'Apple đếm được, có three nên phải dùng số nhiều: apples.',
        },
        {
          kind: 'explain',
          id: 'u03-l01-c04',
          title: 'Những từ hay bị nhầm',
          body: 'Advice, homework, news, furniture, luggage, money, traffic đều không đếm được: không thêm -s và đi với động từ số ít. News tuy có s ở cuối nhưng vẫn là không đếm được.',
          examples: [
            { en: 'The news is surprising.', vi: 'Tin này thật bất ngờ.' },
            {
              en: 'My teacher gave me some advice.',
              vi: 'Cô giáo cho tôi vài lời khuyên.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u03-l01-c05',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'have', 'a', 'lot', 'of', 'homeworks', 'tonight.'],
          wrongIndex: 5,
          correction: 'homework',
          explain: 'Homework không đếm được nên không thêm -s.',
        },
        {
          kind: 'choice',
          id: 'u03-l01-c06',
          prompt: 'Chọn câu đúng',
          options: [
            'The traffic is terrible today.',
            'The traffics are terrible today.',
            'The traffic are terrible today.',
          ],
          answer: 0,
          explain:
            'Traffic không đếm được: không có -s và đi với động từ số ít is.',
        },
        {
          kind: 'explain',
          id: 'u03-l01-c07',
          title: 'Đếm cái không đếm được',
          body: 'Muốn đếm danh từ không đếm được, thêm một đơn vị đo phía trước: a piece of, a cup of, a glass of, a bottle of...',
          formula: 'a piece / cup / glass of + danh từ không đếm được',
          examples: [
            { en: 'a piece of advice', vi: 'một lời khuyên' },
            { en: 'two cups of coffee', vi: 'hai tách cà phê' },
          ],
        },
        {
          kind: 'fill',
          id: 'u03-l01-c08',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Let me give you a ___ of advice.',
          answers: ['piece'],
          bank: ['piece', 'cup', 'bottle'],
          explain: 'Lời khuyên được đếm bằng a piece of: a piece of advice.',
        },
        {
          kind: 'order',
          id: 'u03-l01-c09',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Could I have a glass of water?',
          distractors: ['waters'],
          explain:
            'Water không đếm được nên không có -s; muốn đếm thì dùng a glass of water.',
        },
        {
          kind: 'fill',
          id: 'u03-l01-c10',
          prompt: 'Gõ dạng đúng của danh từ trong ngoặc',
          sentence:
            'We need to buy some new ___ (furniture) for the living room.',
          answers: ['furniture'],
          explain:
            'Furniture (đồ nội thất) không đếm được nên giữ nguyên, không thêm -s.',
        },
        {
          kind: 'fix',
          id: 'u03-l01-c11',
          prompt: 'Chạm vào từ sai',
          tokens: ['This', 'advice', 'are', 'very', 'useful.'],
          wrongIndex: 2,
          correction: 'is',
          explain:
            'Advice không đếm được nên đi với động từ số ít: This advice is very useful.',
        },
        {
          kind: 'choice',
          id: 'u03-l01-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'I need a new chair.',
            'I need a new furniture.',
            'I need new furnitures.',
          ],
          answer: 0,
          explain:
            'Chair đếm được nên dùng a chair. Furniture không đếm được nên không đi với a và không có -s.',
        },
      ],
    },
    {
      id: 'u03-l02',
      title: 'a hay an',
      titleEn: 'A or an',
      summary: 'Chọn a hay an theo âm đọc, không theo chữ viết.',
      cards: [
        {
          kind: 'explain',
          id: 'u03-l02-c01',
          title: 'Nghe âm, đừng nhìn chữ',
          body: 'Dùng an trước từ bắt đầu bằng một NGUYÊN ÂM khi đọc. Dùng a trước từ bắt đầu bằng một phụ âm khi đọc. Quan trọng là âm đầu tiên, không phải chữ cái đầu tiên.',
          formula: 'a + âm phụ âm / an + âm nguyên âm',
          examples: [
            { en: 'a dog, a banana', vi: 'một con chó, một quả chuối' },
            { en: 'an apple, an egg', vi: 'một quả táo, một quả trứng' },
          ],
          pitfall: {
            wrong: 'She is a honest person.',
            right: 'She is an honest person.',
            note: 'Chữ h trong honest là h câm, từ này bắt đầu bằng âm nguyên âm nên dùng an.',
          },
        },
        {
          kind: 'choice',
          id: 'u03-l02-c02',
          prompt: 'Chọn a hoặc an',
          sentence: 'I ate ___ orange for breakfast.',
          options: ['a', 'an'],
          answer: 1,
          explain:
            'Orange bắt đầu bằng âm nguyên âm (chữ o đọc như "o") nên dùng an.',
        },
        {
          kind: 'fill',
          id: 'u03-l02-c03',
          prompt: 'Điền a hoặc an',
          sentence: 'My sister is ___ engineer.',
          answers: ['an'],
          bank: ['a', 'an'],
          explain: 'Engineer bắt đầu bằng âm nguyên âm /e/ nên dùng an.',
        },
        {
          kind: 'explain',
          id: 'u03-l02-c04',
          title: 'H câm và chữ u đọc là "iu"',
          body: 'Hour, honest, honour có h câm nên dùng an: an hour. Ngược lại, university, uniform, useful bắt đầu bằng âm /j/ (đọc như "iu"), là phụ âm, nên dùng a: a university.',
          examples: [
            { en: 'I waited for an hour.', vi: 'Tôi đã đợi một tiếng.' },
            {
              en: 'She studies at a university in Hanoi.',
              vi: 'Cô ấy học ở một trường đại học tại Hà Nội.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u03-l02-c05',
          prompt: 'Chọn a hoặc an',
          sentence: 'The meeting lasted ___ hour.',
          options: ['a', 'an'],
          answer: 1,
          explain:
            'Chữ h trong hour không đọc, từ bắt đầu bằng âm nguyên âm nên dùng an.',
        },
        {
          kind: 'fix',
          id: 'u03-l02-c06',
          prompt: 'Chạm vào từ sai',
          tokens: ['He', 'goes', 'to', 'an', 'university', 'in', 'Hue.'],
          wrongIndex: 3,
          correction: 'a',
          explain:
            'University đọc bắt đầu bằng âm "iu" (/j/), là phụ âm, nên dùng a.',
        },
        {
          kind: 'order',
          id: 'u03-l02-c07',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I need an umbrella today.',
          alternatives: ['Today I need an umbrella.'],
          distractors: ['a'],
          explain:
            'Umbrella bắt đầu bằng âm nguyên âm (chữ u đọc như "â") nên dùng an umbrella.',
        },
        {
          kind: 'explain',
          id: 'u03-l02-c08',
          title: 'Xét từ đứng ngay sau',
          body: 'A hay an phụ thuộc vào từ đứng ngay sau nó, kể cả khi đó là tính từ chứ không phải danh từ.',
          examples: [
            {
              en: 'an apple / a big apple',
              vi: 'một quả táo / một quả táo to',
            },
            { en: 'a car / an old car', vi: 'một chiếc xe / một chiếc xe cũ' },
          ],
        },
        {
          kind: 'fill',
          id: 'u03-l02-c09',
          prompt: 'Gõ a hoặc an',
          sentence: 'It was ___ easy question.',
          answers: ['an'],
          explain:
            'Từ ngay sau là easy, bắt đầu bằng âm nguyên âm /i:/, nên dùng an.',
        },
        {
          kind: 'fix',
          id: 'u03-l02-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['It', 'is', 'a', 'interesting', 'idea.'],
          wrongIndex: 2,
          correction: 'an',
          explain:
            'Từ ngay sau là interesting, bắt đầu bằng âm nguyên âm, nên phải là an.',
        },
        {
          kind: 'fill',
          id: 'u03-l02-c11',
          prompt: 'Điền a hoặc an',
          sentence: 'She wears ___ uniform to work.',
          answers: ['a'],
          bank: ['a', 'an'],
          explain:
            'Uniform đọc bắt đầu bằng âm "iu" (/j/), là phụ âm, nên dùng a.',
        },
        {
          kind: 'choice',
          id: 'u03-l02-c12',
          prompt: 'Chọn cụm đúng',
          options: ['an useful book', 'a hour ago', 'an honest answer'],
          answer: 2,
          explain:
            'Honest có h câm nên là an honest. Useful đọc như "iu" nên phải là a useful, còn hour có h câm nên phải là an hour.',
        },
      ],
    },
    {
      id: 'u03-l03',
      title: 'the hay không mạo từ',
      titleEn: 'The or no article',
      summary: 'Khi nào dùng the, khi nào bỏ mạo từ.',
      cards: [
        {
          kind: 'explain',
          id: 'u03-l03-c01',
          title: 'Lần đầu dùng a, lần sau dùng the',
          body: 'Khi nhắc đến một thứ lần đầu, người nghe chưa biết là cái nào, ta dùng a/an. Khi nhắc lại, cả hai đã biết là cái nào, ta dùng the.',
          examples: [
            {
              en: 'I saw a dog. The dog was very big.',
              vi: 'Tôi thấy một con chó. Con chó đó rất to.',
            },
            {
              en: 'She has a cat and a rabbit. The cat is black.',
              vi: 'Cô ấy có một con mèo và một con thỏ. Con mèo màu đen.',
            },
          ],
          pitfall: {
            wrong: 'I bought new phone yesterday.',
            right: 'I bought a new phone yesterday.',
            note: 'Tiếng Việt không bắt buộc chữ "một", nhưng danh từ đếm được số ít trong tiếng Anh luôn cần a/an, the hoặc my, this...',
          },
        },
        {
          kind: 'fill',
          id: 'u03-l03-c02',
          prompt: 'Điền a hoặc the',
          sentence: 'I bought a shirt and a jacket. ___ jacket was cheap.',
          answers: ['The'],
          bank: ['A', 'The'],
          explain:
            'Jacket đã được nhắc đến ở câu trước, người nghe biết là cái nào, nên dùng the.',
        },
        {
          kind: 'choice',
          id: 'u03-l03-c03',
          prompt: 'Chọn câu đúng',
          options: [
            'My father is doctor.',
            'My father is a doctor.',
            'My father is an doctor.',
          ],
          answer: 1,
          explain:
            'Nói về nghề nghiệp, danh từ đếm được số ít cần a/an. Doctor bắt đầu bằng phụ âm nên dùng a.',
        },
        {
          kind: 'explain',
          id: 'u03-l03-c04',
          title: 'Cái duy nhất dùng the',
          body: 'Dùng the cho thứ chỉ có một, ai cũng biết là cái nào: the sun, the moon, the internet, the capital of Vietnam.',
          examples: [
            {
              en: 'The sun is very hot today.',
              vi: 'Hôm nay mặt trời rất gắt.',
            },
            {
              en: 'Hanoi is the capital of Vietnam.',
              vi: 'Hà Nội là thủ đô của Việt Nam.',
            },
          ],
        },
        {
          kind: 'fix',
          id: 'u03-l03-c05',
          prompt: 'Chạm vào từ sai',
          tokens: ['The', 'Earth', 'moves', 'around', 'a', 'sun.'],
          wrongIndex: 4,
          correction: 'the',
          explain:
            'Chỉ có một mặt trời mà ai cũng biết, nên phải dùng the sun.',
        },
        {
          kind: 'fill',
          id: 'u03-l03-c06',
          prompt: 'Gõ mạo từ còn thiếu',
          sentence: 'Look at ___ moon tonight!',
          answers: ['the'],
          explain: 'Chỉ có một mặt trăng nên dùng the.',
        },
        {
          kind: 'explain',
          id: 'u03-l03-c07',
          title: 'Nói chung thì không dùng the',
          body: 'Khi nói chung về một loại, dùng danh từ số nhiều hoặc không đếm được và KHÔNG có the. Chỉ dùng the khi nói về những cái cụ thể.',
          examples: [
            { en: 'I love music.', vi: 'Tôi yêu âm nhạc (nói chung).' },
            {
              en: 'The music at the party was too loud.',
              vi: 'Nhạc ở bữa tiệc đó quá to (cụ thể).',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u03-l03-c08',
          prompt: 'Chọn câu đúng',
          options: [
            'The money is not everything.',
            'Money is not everything.',
            'A money is not everything.',
          ],
          answer: 1,
          explain:
            'Đây là nói chung về tiền bạc, và money không đếm được, nên không dùng the hay a.',
        },
        {
          kind: 'fix',
          id: 'u03-l03-c09',
          prompt: 'Chạm vào từ thừa',
          tokens: ['The', 'English', 'is', 'an', 'international', 'language.'],
          wrongIndex: 0,
          correction: '',
          explain:
            'Tên ngôn ngữ nói chung không dùng the: English is an international language.',
        },
        {
          kind: 'order',
          id: 'u03-l03-c10',
          prompt: 'Sắp xếp thành câu khẳng định (nói chung về rau củ)',
          sentence: 'Vegetables are good for your health.',
          distractors: ['the'],
          explain: 'Nói chung về rau củ thì dùng số nhiều, không có the.',
        },
        {
          kind: 'fill',
          id: 'u03-l03-c11',
          prompt: 'Điền a hoặc the',
          sentence: 'I had ___ sandwich for lunch. The sandwich was great.',
          answers: ['a'],
          bank: ['a', 'the'],
          explain:
            'Đây là lần đầu nhắc đến cái bánh, người nghe chưa biết là cái nào, nên dùng a.',
        },
        {
          kind: 'choice',
          id: 'u03-l03-c12',
          prompt: 'Chọn từ đúng',
          sentence: "Could you close ___ door, please? It's cold.",
          options: ['a', 'the', 'an'],
          answer: 1,
          explain:
            'Cả hai người đều biết là cánh cửa nào (cửa của căn phòng này), nên dùng the.',
        },
      ],
    },
    {
      id: 'u03-l04',
      title: 'some, any, much, many, a lot of',
      titleEn: 'Quantifiers',
      summary: 'Nói "một ít", "nhiều" với hai loại danh từ.',
      cards: [
        {
          kind: 'explain',
          id: 'u03-l04-c01',
          title: 'some và any',
          body: 'Some dùng trong câu khẳng định. Any dùng trong câu phủ định và câu hỏi. Cả hai đi được với danh từ số nhiều và danh từ không đếm được.',
          examples: [
            {
              en: 'I have some friends in Hue.',
              vi: 'Tôi có vài người bạn ở Huế.',
            },
            {
              en: "We don't have any milk.",
              vi: 'Chúng ta không còn chút sữa nào.',
            },
            {
              en: 'Do you have any questions?',
              vi: 'Bạn có câu hỏi nào không?',
            },
          ],
          pitfall: {
            wrong: "I don't have some money.",
            right: "I don't have any money.",
            note: 'Câu phủ định dùng any, không dùng some.',
          },
        },
        {
          kind: 'fill',
          id: 'u03-l04-c02',
          prompt: 'Điền some hoặc any',
          sentence: 'There are ___ eggs in the fridge.',
          answers: ['some'],
          bank: ['some', 'any'],
          explain: 'Câu khẳng định nên dùng some.',
        },
        {
          kind: 'choice',
          id: 'u03-l04-c03',
          prompt: 'Chọn từ đúng',
          sentence: "There isn't ___ sugar in my coffee.",
          options: ['some', 'any', 'many'],
          answer: 1,
          explain:
            'Câu phủ định dùng any. Many không đi với sugar vì sugar không đếm được.',
        },
        {
          kind: 'explain',
          id: 'u03-l04-c04',
          title: 'Ngoại lệ: some trong lời mời',
          body: 'Khi mời hoặc xin cái gì, ta dùng some trong câu hỏi, vì mong câu trả lời là "có".',
          examples: [
            { en: 'Would you like some tea?', vi: 'Bạn uống chút trà nhé?' },
            {
              en: 'Can I have some water, please?',
              vi: 'Cho tôi xin chút nước được không?',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u03-l04-c05',
          prompt: 'Chọn từ đúng (bạn đang mời khách)',
          sentence: 'Would you like ___ cake?',
          options: ['some', 'many', 'a few'],
          answer: 0,
          explain:
            'Đây là lời mời nên dùng some dù là câu hỏi. Cake ở đây không đếm được nên không dùng many hay a few.',
        },
        {
          kind: 'explain',
          id: 'u03-l04-c06',
          title: 'much, many, a lot of',
          body: 'Many đi với danh từ đếm được số nhiều, much đi với danh từ không đếm được. Much và many hay dùng trong câu hỏi và phủ định. Câu khẳng định thường dùng a lot of cho cả hai loại.',
          examples: [
            { en: 'How many people came?', vi: 'Có bao nhiêu người đến?' },
            {
              en: "I don't have much time.",
              vi: 'Tôi không có nhiều thời gian.',
            },
            {
              en: 'She drinks a lot of water.',
              vi: 'Cô ấy uống rất nhiều nước.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u03-l04-c07',
          prompt: 'Điền much hoặc many',
          sentence: 'How ___ brothers do you have?',
          answers: ['many'],
          bank: ['much', 'many'],
          explain: 'Brothers là danh từ đếm được số nhiều nên dùng many.',
        },
        {
          kind: 'fix',
          id: 'u03-l04-c08',
          prompt: 'Chạm vào từ sai',
          tokens: ['There', "isn't", 'many', 'traffic', 'today.'],
          wrongIndex: 2,
          correction: 'much',
          explain: 'Traffic không đếm được nên dùng much, không dùng many.',
        },
        {
          kind: 'fill',
          id: 'u03-l04-c09',
          prompt: 'Gõ much hoặc many',
          sentence: "We don't have ___ time before the train leaves.",
          answers: ['much'],
          explain: 'Time (thời gian) không đếm được nên dùng much.',
        },
        {
          kind: 'order',
          id: 'u03-l04-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'She has a lot of friends in Hanoi.',
          alternatives: ['In Hanoi she has a lot of friends.'],
          distractors: ['much'],
          explain:
            'Câu khẳng định dùng a lot of. Much không đi với friends vì friends đếm được.',
        },
        {
          kind: 'choice',
          id: 'u03-l04-c11',
          prompt: 'Chọn câu tự nhiên nhất',
          options: [
            'I drink much coffee.',
            'I drink a lot of coffee.',
            'I drink many coffee.',
          ],
          answer: 1,
          explain:
            'Câu khẳng định thường dùng a lot of; much trong câu khẳng định nghe rất cứng. Many không đi với coffee vì coffee không đếm được.',
        },
        {
          kind: 'fill',
          id: 'u03-l04-c12',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Do you have ___ plans for the weekend?',
          answers: ['any'],
          bank: ['any', 'much', 'a lot'],
          explain:
            'Câu hỏi thường dùng any. Plans đếm được nên không dùng much, còn a lot phải có of.',
        },
      ],
    },
    {
      id: 'u03-l05',
      title: 'a few, a little, few, little',
      titleEn: 'A few and a little',
      summary:
        '"Một vài" hay "rất ít", với danh từ đếm được và không đếm được.',
      cards: [
        {
          kind: 'explain',
          id: 'u03-l05-c01',
          title: 'a few và a little: một ít, đủ dùng',
          body: 'A few đi với danh từ đếm được số nhiều, a little đi với danh từ không đếm được. Cả hai nghĩa là "một vài, một chút" và mang ý tích cực: vẫn có, vẫn đủ.',
          examples: [
            {
              en: 'I have a few friends here.',
              vi: 'Tôi có vài người bạn ở đây.',
            },
            { en: 'Add a little salt.', vi: 'Thêm một chút muối.' },
          ],
          pitfall: {
            wrong: 'I need a few water.',
            right: 'I need a little water.',
            note: 'Tiếng Việt nói "một ít" cho mọi thứ, nhưng water không đếm được nên phải dùng a little.',
          },
        },
        {
          kind: 'choice',
          id: 'u03-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'Can I ask you ___ questions?',
          options: ['a few', 'a little'],
          answer: 0,
          explain: 'Questions là danh từ đếm được số nhiều nên dùng a few.',
        },
        {
          kind: 'fill',
          id: 'u03-l05-c03',
          prompt: 'Điền a few hoặc a little',
          sentence: 'I speak ___ Japanese.',
          answers: ['a little'],
          bank: ['a few', 'a little'],
          explain:
            'Japanese (tiếng Nhật) là ngôn ngữ, không đếm được, nên dùng a little.',
        },
        {
          kind: 'explain',
          id: 'u03-l05-c04',
          title: 'few và little: rất ít',
          body: 'Bỏ chữ a đi thì nghĩa đổi: few và little nghĩa là "rất ít, gần như không có", nhấn vào sự thiếu thốn.',
          examples: [
            {
              en: 'Few people came to the party.',
              vi: 'Rất ít người đến bữa tiệc (đáng buồn).',
            },
            { en: 'There is little hope.', vi: 'Gần như không còn hy vọng.' },
          ],
        },
        {
          kind: 'choice',
          id: 'u03-l05-c05',
          prompt: 'Chọn từ đúng',
          sentence: 'He is very lonely because he has ___ friends.',
          options: ['a few', 'few', 'a little'],
          answer: 1,
          explain:
            'Lonely (cô đơn) cho thấy ý tiêu cực: gần như không có bạn, nên dùng few. Friends đếm được nên không dùng a little.',
        },
        {
          kind: 'fill',
          id: 'u03-l05-c06',
          prompt: 'Gõ a few, a little, few hoặc little',
          sentence: 'There is ___ milk left, so we can still make coffee.',
          answers: ['a little'],
          explain:
            'Milk không đếm được, và vẫn đủ để pha cà phê (ý tích cực), nên dùng a little.',
        },
        {
          kind: 'fix',
          id: 'u03-l05-c07',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'There',
            'are',
            'a',
            'little',
            'chairs',
            'in',
            'the',
            'room.',
          ],
          wrongIndex: 3,
          correction: 'few',
          explain:
            'Chairs là danh từ đếm được số nhiều nên dùng a few, không dùng a little.',
        },
        {
          kind: 'explain',
          id: 'u03-l05-c08',
          title: 'Tóm lại',
          body: 'Đếm được: a few (vài, đủ) và few (rất ít). Không đếm được: a little (chút ít, đủ) và little (rất ít). Hay gặp cụm only a few và only a little, không nói only few.',
          examples: [
            { en: 'I have a few ideas.', vi: 'Tôi có vài ý tưởng.' },
            {
              en: 'We have very little time.',
              vi: 'Chúng ta còn rất ít thời gian.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u03-l05-c09',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I need a little help with my homework.',
          distractors: ['few'],
          explain:
            'Help (sự giúp đỡ) không đếm được nên dùng a little, không dùng a few.',
        },
        {
          kind: 'fill',
          id: 'u03-l05-c10',
          prompt: 'Chọn từ đúng để điền',
          sentence: 'Only ___ students passed the test.',
          answers: ['a few'],
          bank: ['a few', 'few', 'a little'],
          explain:
            'Students đếm được nên không dùng a little. Sau only ta nói only a few, không nói only few.',
        },
        {
          kind: 'choice',
          id: 'u03-l05-c11',
          prompt: 'Chọn từ đúng',
          sentence: 'Hurry up! We have very ___ time.',
          options: ['little', 'few', 'a little'],
          answer: 0,
          explain:
            'Time không đếm được nên không dùng few. Very little nghĩa là rất ít; không nói very a little.',
        },
        {
          kind: 'fix',
          id: 'u03-l05-c12',
          prompt: 'Chạm vào từ sai',
          tokens: ['There', 'is', 'a', 'few', 'water', 'in', 'the', 'bottle.'],
          wrongIndex: 3,
          correction: 'little',
          explain:
            'Water không đếm được nên dùng a little: There is a little water in the bottle.',
        },
      ],
    },
  ],
}
