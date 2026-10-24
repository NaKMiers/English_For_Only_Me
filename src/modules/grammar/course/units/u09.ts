import type { GrammarUnit } from '../types'

export const UNIT_09: GrammarUnit = {
  id: 'u09',
  order: 9,
  level: 'B1',
  title: 'Câu điều kiện',
  summary:
    'Câu điều kiện loại 0, 1, 2, 3, unless, in case, as long as và câu ước với wish.',
  lessons: [
    {
      id: 'u09-l01',
      title: 'Loại 0 và loại 1',
      titleEn: 'Zero and first conditionals',
      summary: 'Sự thật luôn đúng và điều có thể xảy ra trong tương lai.',
      cards: [
        {
          kind: 'explain',
          id: 'u09-l01-c01',
          title: 'Loại 1: điều có thể xảy ra',
          body: 'Dùng loại 1 cho một việc có thể xảy ra trong tương lai và kết quả của nó. Vế if dùng hiện tại đơn dù nghĩa là tương lai, vế còn lại dùng will.',
          formula: 'If + hiện tại đơn, will + V nguyên mẫu',
          examples: [
            {
              en: 'If it rains, we will stay at home.',
              vi: 'Nếu trời mưa, chúng tôi sẽ ở nhà.',
            },
            {
              en: "If you hurry, you'll catch the bus.",
              vi: 'Nếu bạn nhanh lên, bạn sẽ kịp xe buýt.',
            },
          ],
          pitfall: {
            wrong: 'If it will rain, we will stay at home.',
            right: 'If it rains, we will stay at home.',
            note: 'Sau if không dùng will, dù việc đó xảy ra trong tương lai.',
          },
        },
        {
          kind: 'choice',
          id: 'u09-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'If it ___ tomorrow, we will cancel the picnic.',
          options: ['rains', 'will rain', 'rained'],
          answer: 0,
          explain:
            'Vế if của loại 1 dùng hiện tại đơn: If it rains. Không dùng will sau if.',
        },
        {
          kind: 'fill',
          id: 'u09-l01-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'If you ___ (study) hard, you will pass the exam.',
          answers: ['study'],
          explain: 'Vế if dùng hiện tại đơn. Chủ ngữ you nên giữ nguyên study.',
        },
        {
          kind: 'fix',
          id: 'u09-l01-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'I',
            'will',
            'see',
            'Nam,',
            'I',
            'will',
            'tell',
            'him.',
          ],
          wrongIndex: 2,
          correction: '',
          explain:
            'Will chỉ đứng ở vế kết quả. Vế if dùng hiện tại đơn: If I see Nam.',
        },
        {
          kind: 'explain',
          id: 'u09-l01-c05',
          title: 'Loại 0: sự thật, quy luật',
          body: 'Khi kết quả luôn luôn xảy ra (sự thật, thói quen, quy luật), cả hai vế đều dùng hiện tại đơn. If ở đây gần nghĩa với when.',
          formula: 'If + hiện tại đơn, hiện tại đơn',
          examples: [
            {
              en: 'If you heat ice, it melts.',
              vi: 'Nếu đun nóng đá, nó sẽ tan.',
            },
            {
              en: "If I drink coffee at night, I can't sleep.",
              vi: 'Hễ uống cà phê buổi tối là tôi không ngủ được.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u09-l01-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'If you mix red and white, you ___ (get) pink.',
          answers: ['get', 'will get'],
          bank: ['get', 'got', 'gets'],
          explain:
            'Đây là quy luật luôn đúng (loại 0), nên dùng hiện tại đơn. Chủ ngữ you đi với get.',
        },
        {
          kind: 'fix',
          id: 'u09-l01-c07',
          prompt: 'Chạm vào từ sai',
          tokens: ['If', 'water', 'reach', '100', 'degrees,', 'it', 'boils.'],
          wrongIndex: 2,
          correction: 'reaches',
          explain:
            'Water là danh từ không đếm được, động từ chia như ngôi thứ ba số ít: reaches.',
        },
        {
          kind: 'explain',
          id: 'u09-l01-c08',
          title: 'Đảo vế và câu mệnh lệnh',
          body: 'Vế if có thể đứng sau, khi đó không cần dấu phẩy. Vế kết quả cũng có thể là câu mệnh lệnh hoặc dùng can.',
          examples: [
            {
              en: 'I will call you if I have time.',
              vi: 'Tôi sẽ gọi cho bạn nếu có thời gian.',
            },
            {
              en: 'If you see Lan, tell her to call me.',
              vi: 'Nếu gặp Lan, bảo cô ấy gọi cho tôi nhé.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u09-l01-c09',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I will call you if I finish early.',
          alternatives: [
            'If I finish early I will call you.',
            'I will call you early if I finish.',
            'If I finish I will call you early.',
          ],
          explain:
            'Vế if (hiện tại đơn) có thể đứng sau vế will. Khi đứng sau thì không cần dấu phẩy.',
        },
        {
          kind: 'choice',
          id: 'u09-l01-c10',
          prompt: 'Chọn từ đúng',
          sentence: "If you're cold, ___ the window.",
          options: ['close', 'will close', 'closed'],
          answer: 0,
          explain:
            'Vế sau là lời đề nghị, dùng câu mệnh lệnh với động từ nguyên mẫu: close.',
        },
        {
          kind: 'fill',
          id: 'u09-l01-c11',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'If you ___ (not / hurry), you will miss the bus.',
          answers: ["don't hurry", 'do not hurry'],
          explain: "Vế if dùng hiện tại đơn. Phủ định với you là don't hurry.",
        },
        {
          kind: 'order',
          id: 'u09-l01-c12',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'What will you do if you fail?',
          alternatives: ['If you fail what will you do?'],
          explain:
            'Câu hỏi nằm ở vế kết quả: What will you do. Vế if dùng hiện tại đơn: if you fail.',
        },
      ],
    },
    {
      id: 'u09-l02',
      title: 'Loại 2',
      titleEn: 'Second conditional',
      summary: 'Tưởng tượng điều không có thật ở hiện tại.',
      cards: [
        {
          kind: 'explain',
          id: 'u09-l02-c01',
          title: 'Loại 2: điều không có thật',
          body: 'Dùng loại 2 để tưởng tượng điều trái với hiện tại hoặc khó xảy ra. Vế if dùng quá khứ đơn, nhưng nghĩa vẫn là bây giờ. Vế còn lại dùng would.',
          formula: 'If + quá khứ đơn, would + V nguyên mẫu',
          examples: [
            {
              en: 'If I had more money, I would buy a car.',
              vi: 'Nếu tôi có nhiều tiền hơn, tôi sẽ mua ô tô.',
            },
            {
              en: 'If she lived here, we would see her more.',
              vi: 'Nếu cô ấy sống ở đây, chúng tôi sẽ gặp cô ấy nhiều hơn.',
            },
          ],
          pitfall: {
            wrong: 'If I have more money, I would buy a car.',
            right: 'If I had more money, I would buy a car.',
            note: 'Đã dùng would thì vế if phải lùi về quá khứ đơn.',
          },
        },
        {
          kind: 'choice',
          id: 'u09-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'If I ___ a car, I would drive to work.',
          options: ['had', 'have', 'would have'],
          answer: 0,
          explain:
            'Vế kia dùng would nên đây là loại 2: vế if dùng quá khứ đơn had.',
        },
        {
          kind: 'fill',
          id: 'u09-l02-c03',
          prompt: 'Điền would + động từ trong ngoặc',
          sentence: 'If she lived closer, we ___ (see) each other more often.',
          answers: ['would see'],
          explain:
            'Vế if dùng quá khứ đơn (lived) nên vế kết quả dùng would + V nguyên mẫu.',
        },
        {
          kind: 'explain',
          id: 'u09-l02-c04',
          title: 'Were cho mọi ngôi',
          body: 'Trong loại 2, động từ be dùng were cho mọi chủ ngữ, kể cả I, he, she, it. Khi nói, người ta cũng dùng was, nhưng câu khuyên If I were you thì luôn dùng were.',
          examples: [
            {
              en: 'If I were you, I would take the job.',
              vi: 'Nếu tôi là bạn, tôi sẽ nhận việc đó.',
            },
            {
              en: 'If it were cheaper, I would buy it.',
              vi: 'Nếu nó rẻ hơn, tôi sẽ mua.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u09-l02-c05',
          prompt: 'Chọn từ đúng',
          sentence: 'If I ___ you, I would talk to her.',
          answers: ['were'],
          bank: ['am', 'were', 'be'],
          explain: 'Câu khuyên If I were you luôn dùng were, kể cả với I.',
        },
        {
          kind: 'fix',
          id: 'u09-l02-c06',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'he',
            'were',
            'rich,',
            'he',
            'will',
            'travel',
            'the',
            'world.',
          ],
          wrongIndex: 5,
          correction: 'would',
          explain:
            'Vế if dùng were (loại 2) nên vế kết quả phải là would, không phải will.',
        },
        {
          kind: 'fill',
          id: 'u09-l02-c07',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'If it ___ (be) warmer today, we could go swimming.',
          answers: ['were', 'was'],
          explain:
            'Hôm nay không ấm, đây là điều không có thật (loại 2), nên dùng were (khi nói có thể dùng was).',
        },
        {
          kind: 'explain',
          id: 'u09-l02-c08',
          title: 'Could, might và câu phủ định',
          body: "Vế kết quả có thể dùng could (có thể) hoặc might (có lẽ) thay cho would. Phủ định dùng didn't ở vế if và wouldn't ở vế kết quả.",
          examples: [
            {
              en: "If I didn't have to work, I could come.",
              vi: 'Nếu không phải đi làm thì tôi đến được.',
            },
            {
              en: "I wouldn't do that if I were you.",
              vi: 'Nếu là bạn, tôi sẽ không làm vậy.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u09-l02-c09',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "I wouldn't do that if I were you.",
          alternatives: ["If I were you I wouldn't do that."],
          explain: "Vế kết quả dùng wouldn't + V, vế if dùng If I were you.",
        },
        {
          kind: 'choice',
          id: 'u09-l02-c10',
          prompt: 'Chọn từ đúng',
          sentence: 'What ___ you do if you won the lottery?',
          options: ['would', 'will', 'did'],
          answer: 0,
          explain:
            'Vế if dùng quá khứ won (trúng số là điều khó xảy ra), nên câu hỏi dùng would.',
        },
        {
          kind: 'fix',
          id: 'u09-l02-c11',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'I',
            'knew',
            'his',
            'number,',
            'I',
            'would',
            'called',
            'him.',
          ],
          wrongIndex: 7,
          correction: 'call',
          explain: 'Sau would luôn là động từ nguyên mẫu: would call.',
        },
        {
          kind: 'fill',
          id: 'u09-l02-c12',
          prompt: 'Chọn dạng đúng',
          sentence: 'If we ___ (not / live) in the city, we would need a car.',
          answers: ["didn't live", 'did not live'],
          bank: ["don't live", "didn't live", "wouldn't live"],
          explain: "Vế kia dùng would nên vế if dùng quá khứ đơn: didn't live.",
        },
        {
          kind: 'choice',
          id: 'u09-l02-c13',
          prompt: 'Chọn câu đúng',
          options: [
            'If I were taller, I would play basketball.',
            'If I am taller, I would play basketball.',
            'If I were taller, I will play basketball.',
          ],
          answer: 0,
          explain: 'Loại 2 cần đủ hai vế: were ở vế if và would ở vế kết quả.',
        },
      ],
    },
    {
      id: 'u09-l03',
      title: 'Loại 3',
      titleEn: 'Third conditional',
      summary: 'Tưởng tượng lại một việc đã không xảy ra trong quá khứ.',
      cards: [
        {
          kind: 'explain',
          id: 'u09-l03-c01',
          title: 'Loại 3: chuyện đã qua',
          body: 'Dùng loại 3 để nói về một việc trong quá khứ đã không xảy ra, thường để tiếc nuối. Vế if dùng had + V3, vế còn lại dùng would have + V3.',
          formula: 'If + had + V3, would have + V3',
          examples: [
            {
              en: 'If I had known, I would have helped you.',
              vi: 'Nếu tôi biết thì tôi đã giúp bạn rồi.',
            },
            {
              en: 'If we had left earlier, we would have caught the train.',
              vi: 'Nếu đi sớm hơn thì chúng tôi đã kịp tàu.',
            },
          ],
          pitfall: {
            wrong: 'If I would have known, I would have helped you.',
            right: 'If I had known, I would have helped you.',
            note: 'Would have chỉ ở vế kết quả. Vế if dùng had + V3.',
          },
        },
        {
          kind: 'choice',
          id: 'u09-l03-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'If you ___ earlier, you would have caught the train.',
          options: ['had left', 'left', 'would leave'],
          answer: 0,
          explain:
            'Vế kia là would have caught (loại 3), nên vế if dùng had + V3: had left.',
        },
        {
          kind: 'fill',
          id: 'u09-l03-c03',
          prompt: 'Điền would have + V3 của động từ trong ngoặc',
          sentence: 'If I had known about the party, I ___ (go).',
          answers: ['would have gone', "would've gone"],
          explain:
            'Vế if là had known (loại 3), nên vế kết quả là would have + V3 của go: gone.',
        },
        {
          kind: 'fix',
          id: 'u09-l03-c04',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'she',
            'had',
            'studied,',
            'she',
            'would',
            'have',
            'pass',
            'the',
            'exam.',
          ],
          wrongIndex: 7,
          correction: 'passed',
          explain: 'Sau would have phải là V3: would have passed.',
        },
        {
          kind: 'explain',
          id: 'u09-l03-c05',
          title: 'Phủ định và dạng rút gọn',
          body: "Phủ định dùng hadn't + V3 và wouldn't have + V3. Khi nói, had thường rút thành 'd, would have thành would've.",
          examples: [
            {
              en: "If it hadn't rained, we would have gone out.",
              vi: 'Nếu trời không mưa thì chúng tôi đã đi chơi rồi.',
            },
            {
              en: "We wouldn't have got lost if we'd had a map.",
              vi: 'Nếu có bản đồ thì chúng tôi đã không bị lạc.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u09-l03-c06',
          prompt: 'Chọn dạng đúng',
          sentence:
            "If he ___ (not / drive) so fast, he wouldn't have had the accident.",
          answers: ["hadn't driven", 'had not driven'],
          bank: ["didn't drive", "hadn't driven", "wouldn't drive"],
          explain:
            "Vế kia là wouldn't have had (loại 3), nên vế if dùng hadn't + V3: hadn't driven.",
        },
        {
          kind: 'order',
          id: 'u09-l03-c07',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'We would have won if Nam had played.',
          alternatives: ['If Nam had played we would have won.'],
          explain:
            'Vế kết quả would have won, vế if had played. Vế if có thể đứng trước hoặc sau.',
        },
        {
          kind: 'explain',
          id: 'u09-l03-c08',
          title: 'Phân biệt loại 2 và loại 3',
          body: 'Loại 2 tưởng tượng về hiện tại (If I had...). Loại 3 tưởng tượng về quá khứ (If I had had...). Nhìn mốc thời gian để chọn.',
          examples: [
            {
              en: 'If I had money now, I would buy it.',
              vi: 'Nếu bây giờ có tiền, tôi sẽ mua nó.',
            },
            {
              en: 'If I had had money last year, I would have bought it.',
              vi: 'Nếu năm ngoái có tiền, tôi đã mua nó rồi.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u09-l03-c09',
          prompt: 'Chọn từ đúng',
          sentence:
            "I didn't see you yesterday. If I ___ you, I would have said hello.",
          options: ['had seen', 'saw', 'would see'],
          answer: 0,
          explain:
            'Chuyện hôm qua đã không xảy ra (loại 3), nên vế if dùng had + V3: had seen.',
        },
        {
          kind: 'fix',
          id: 'u09-l03-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'If',
            'we',
            'had',
            'booked',
            'earlier,',
            'we',
            'will',
            'have',
            'got',
            'better',
            'seats.',
          ],
          wrongIndex: 6,
          correction: 'would',
          explain:
            'Loại 3 dùng would have + V3 ở vế kết quả, không dùng will have.',
        },
        {
          kind: 'fill',
          id: 'u09-l03-c11',
          prompt: 'Điền dạng phủ định của động từ trong ngoặc (dùng would)',
          sentence: 'She ___ (not / be) late if she had set an alarm.',
          answers: ["wouldn't have been", 'would not have been'],
          explain:
            "Vế if là had set (loại 3), nên vế kết quả là wouldn't have + V3 của be: been.",
        },
        {
          kind: 'choice',
          id: 'u09-l03-c12',
          prompt: 'Chọn câu nói về một việc đã không xảy ra trong quá khứ',
          options: [
            'If I had known, I would have called you.',
            'If I knew, I would call you.',
            'If I know, I will call you.',
          ],
          answer: 0,
          explain:
            'Chỉ loại 3 (had known, would have called) nói về quá khứ. Hai câu kia nói về hiện tại và tương lai.',
        },
        {
          kind: 'order',
          id: 'u09-l03-c13',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "It wouldn't have happened if you had listened.",
          alternatives: ["If you had listened it wouldn't have happened."],
          explain:
            "Vế kết quả wouldn't have happened, vế if had listened (had + V3).",
        },
      ],
    },
    {
      id: 'u09-l04',
      title: 'unless, in case, as long as',
      titleEn: 'unless, in case, as long as',
      summary: 'Ba cách khác để nói điều kiện.',
      cards: [
        {
          kind: 'explain',
          id: 'u09-l04-c01',
          title: 'Unless là "trừ khi"',
          body: 'Unless có nghĩa như if... not. Bản thân unless đã mang nghĩa phủ định, nên động từ sau nó để ở thể khẳng định.',
          formula: 'unless + hiện tại đơn = if + ... not',
          examples: [
            {
              en: 'You will be late unless you hurry.',
              vi: 'Bạn sẽ trễ trừ khi bạn nhanh lên.',
            },
            {
              en: "I won't go unless you come with me.",
              vi: 'Tôi sẽ không đi trừ khi bạn đi cùng.',
            },
          ],
          pitfall: {
            wrong: "Unless you don't hurry, you will be late.",
            right: 'Unless you hurry, you will be late.',
            note: 'Không thêm not sau unless, vì unless đã là phủ định.',
          },
        },
        {
          kind: 'choice',
          id: 'u09-l04-c02',
          prompt: 'Chọn từ đúng',
          sentence:
            'The bus leaves in five minutes. ___ you leave now, you will miss it.',
          options: ['Unless', 'If', 'In case'],
          answer: 0,
          explain:
            'Ý câu là nếu không đi ngay thì sẽ lỡ xe, tức if... not, nên dùng Unless.',
        },
        {
          kind: 'fix',
          id: 'u09-l04-c03',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'You',
            "can't",
            'enter',
            'unless',
            'you',
            'has',
            'a',
            'ticket.',
          ],
          wrongIndex: 5,
          correction: 'have',
          explain:
            'Sau unless vẫn chia động từ bình thường. Chủ ngữ you đi với have.',
        },
        {
          kind: 'fill',
          id: 'u09-l04-c04',
          prompt: 'Gõ một từ có nghĩa "trừ khi"',
          sentence: "I won't call you ___ there is a problem.",
          answers: ['unless'],
          explain:
            'Tôi chỉ gọi khi có vấn đề, tức là "trừ khi có vấn đề": unless.',
        },
        {
          kind: 'explain',
          id: 'u09-l04-c05',
          title: 'In case là "phòng khi"',
          body: 'In case nói về việc làm trước để đề phòng điều có thể xảy ra. Khác với if, hành động vẫn được làm dù chuyện kia có xảy ra hay không.',
          formula: 'in case + hiện tại đơn',
          examples: [
            {
              en: 'Take an umbrella in case it rains.',
              vi: 'Mang ô theo phòng khi trời mưa.',
            },
            {
              en: "I'll write it down in case I forget.",
              vi: 'Tôi sẽ ghi lại phòng khi quên.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u09-l04-c06',
          prompt: 'Chọn từ đúng',
          sentence: "Bring some cash ___ the shop doesn't accept cards.",
          options: ['in case', 'unless', 'as long as'],
          answer: 0,
          explain:
            'Mang tiền mặt để đề phòng cửa hàng không nhận thẻ, nên dùng in case.',
        },
        {
          kind: 'fix',
          id: 'u09-l04-c07',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'Take',
            'a',
            'jacket',
            'unless',
            'it',
            'gets',
            'cold',
            'tonight.',
          ],
          wrongIndex: 3,
          correction: 'in case',
          explain:
            'Mang áo khoác để đề phòng trời lạnh, nên phải là in case. Unless (trừ khi) làm câu mất nghĩa.',
        },
        {
          kind: 'explain',
          id: 'u09-l04-c08',
          title: 'As long as là "miễn là"',
          body: 'As long as đặt ra điều kiện bắt buộc: chỉ cần điều đó đúng thì việc kia được chấp nhận. Sau nó cũng dùng hiện tại đơn.',
          formula: 'as long as + hiện tại đơn',
          examples: [
            {
              en: 'You can borrow my bike as long as you bring it back.',
              vi: 'Bạn mượn xe được, miễn là trả lại.',
            },
            {
              en: "I don't mind as long as you're happy.",
              vi: 'Tôi không phiền, miễn là bạn vui.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u09-l04-c09',
          prompt: 'Chọn từ đúng',
          sentence: 'You can stay here ___ you keep the room clean.',
          answers: ['as long as'],
          bank: ['as long as', 'unless', 'in case'],
          explain:
            'Được ở lại với điều kiện giữ phòng sạch, tức "miễn là": as long as.',
        },
        {
          kind: 'order',
          id: 'u09-l04-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I will help you as long as you try.',
          alternatives: ['As long as you try I will help you.'],
          explain:
            'Vế chính I will help you, vế điều kiện as long as + hiện tại đơn.',
        },
        {
          kind: 'choice',
          id: 'u09-l04-c11',
          prompt: 'Chọn câu đúng',
          options: [
            'I will go unless it rains.',
            "I will go unless it doesn't rain.",
            'I will go unless it will rain.',
          ],
          answer: 0,
          explain:
            'Sau unless dùng hiện tại đơn khẳng định: unless it rains. Không thêm not, không dùng will.',
        },
        {
          kind: 'fill',
          id: 'u09-l04-c12',
          prompt: 'Gõ từ còn thiếu',
          sentence: 'Write down my number in ___ you lose your phone.',
          answers: ['case'],
          explain: 'Ghi lại số để đề phòng mất điện thoại: in case.',
        },
      ],
    },
    {
      id: 'u09-l05',
      title: 'Câu ước với wish',
      titleEn: 'Wishes',
      summary: 'Ước điều khác với hiện tại và tiếc nuối chuyện đã qua.',
      cards: [
        {
          kind: 'explain',
          id: 'u09-l05-c01',
          title: 'Ước cho hiện tại: wish + quá khứ đơn',
          body: 'Để ước một điều khác với hiện tại, dùng wish + quá khứ đơn. Động từ lùi một thì, giống vế if của loại 2.',
          formula: 'S + wish + S + quá khứ đơn',
          examples: [
            {
              en: 'I wish I had a car.',
              vi: 'Ước gì tôi có ô tô (nhưng tôi không có).',
            },
            { en: 'I wish I knew her name.', vi: 'Ước gì tôi biết tên cô ấy.' },
          ],
          pitfall: {
            wrong: 'I wish I have a car.',
            right: 'I wish I had a car.',
            note: 'Sau wish phải lùi thì: have thành had.',
          },
        },
        {
          kind: 'choice',
          id: 'u09-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'I wish I ___ taller.',
          options: ['were', 'am', 'will be'],
          answer: 0,
          explain: 'Ước cho hiện tại thì lùi thì. Với be, dùng were.',
        },
        {
          kind: 'fill',
          id: 'u09-l05-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'I wish I ___ (know) the answer.',
          answers: ['knew'],
          explain:
            'Ước điều không có thật ở hiện tại: wish + quá khứ đơn, know thành knew.',
        },
        {
          kind: 'fix',
          id: 'u09-l05-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['I', 'wish', 'I', 'can', 'speak', 'French.'],
          wrongIndex: 3,
          correction: 'could',
          explain: 'Sau wish phải lùi thì: can thành could.',
        },
        {
          kind: 'explain',
          id: 'u09-l05-c05',
          title: 'Were và could sau wish',
          body: 'Với be, dùng were cho mọi ngôi (khi nói có thể dùng was). Muốn ước có khả năng làm gì, dùng wish + could.',
          examples: [
            { en: 'I wish it were Friday.', vi: 'Ước gì hôm nay là thứ Sáu.' },
            {
              en: 'She wishes she could sing.',
              vi: 'Cô ấy ước mình biết hát.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u09-l05-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'My flat is tiny. I wish it ___ (be) bigger.',
          answers: ['were', 'was'],
          bank: ['is', 'were', 'will be'],
          explain: 'Căn hộ hiện tại nhỏ, ước điều ngược lại nên lùi thì: were.',
        },
        {
          kind: 'explain',
          id: 'u09-l05-c07',
          title: 'Tiếc chuyện đã qua: wish + had V3',
          body: 'Để tiếc nuối một việc trong quá khứ, dùng wish + quá khứ hoàn thành (had + V3), giống vế if của loại 3.',
          formula: 'S + wish + S + had + V3',
          examples: [
            {
              en: 'I wish I had studied harder.',
              vi: 'Giá mà tôi đã học chăm hơn.',
            },
            {
              en: "He wishes he hadn't said that.",
              vi: 'Anh ấy ước mình đã không nói câu đó.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u09-l05-c08',
          prompt: 'Chọn từ đúng',
          sentence: 'I failed the test last week. I wish I ___ more.',
          options: ['had studied', 'studied', 'study'],
          answer: 0,
          explain:
            'Bài thi đã qua, đây là tiếc nuối quá khứ nên dùng had + V3: had studied.',
        },
        {
          kind: 'fill',
          id: 'u09-l05-c09',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'I wish I ___ (not / eat) so much last night.',
          answers: ["hadn't eaten", 'had not eaten'],
          explain:
            "Last night là quá khứ, tiếc nuối nên dùng hadn't + V3: hadn't eaten.",
        },
        {
          kind: 'fix',
          id: 'u09-l05-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'She',
            'wishes',
            'she',
            'has',
            'gone',
            'to',
            'the',
            'party',
            'yesterday.',
          ],
          wrongIndex: 3,
          correction: 'had',
          explain: 'Tiếc chuyện hôm qua thì dùng had + V3: had gone.',
        },
        {
          kind: 'order',
          id: 'u09-l05-c11',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I wish I had more free time.',
          explain: 'Wish + quá khứ đơn (had) để ước điều khác với hiện tại.',
        },
        {
          kind: 'choice',
          id: 'u09-l05-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'I wish I had told her the truth.',
            'I wish I told her the truth yesterday.',
            'I wish I have told her the truth.',
          ],
          answer: 0,
          explain: 'Tiếc một việc đã qua dùng wish + had + V3: had told.',
        },
      ],
    },
  ],
}
