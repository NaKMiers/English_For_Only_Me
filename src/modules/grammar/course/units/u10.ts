import type { GrammarUnit } from '../types'

export const UNIT_10: GrammarUnit = {
  id: 'u10',
  order: 10,
  level: 'B1',
  title: 'Bị động, V-ing và to V',
  summary:
    'Câu bị động ở các thì, động từ đi với V-ing, động từ đi với to V và những động từ đổi nghĩa.',
  lessons: [
    {
      id: 'u10-l01',
      title: 'Bị động hiện tại và quá khứ',
      titleEn: 'Present and past passive',
      summary: 'be + V3 khi việc được làm quan trọng hơn người làm.',
      cards: [
        {
          kind: 'explain',
          id: 'u10-l01-c01',
          title: 'Câu bị động: be + V3',
          body: 'Dùng bị động khi muốn nói về việc được làm, còn ai làm thì không quan trọng hoặc không biết. Hiện tại dùng am/is/are + V3, quá khứ dùng was/were + V3.',
          formula: 'Chủ ngữ + be + V3',
          examples: [
            {
              en: 'English is spoken in many countries.',
              vi: 'Tiếng Anh được nói ở nhiều nước.',
            },
            {
              en: 'This house was built in 1990.',
              vi: 'Ngôi nhà này được xây năm 1990.',
            },
          ],
          pitfall: {
            wrong: 'This house built in 1990.',
            right: 'This house was built in 1990.',
            note: 'Tiếng Việt nói "Nhà này xây năm 1990", nhưng tiếng Anh không được bỏ be.',
          },
        },
        {
          kind: 'choice',
          id: 'u10-l01-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'English ___ all over the world.',
          options: ['is spoken', 'speaks', 'is speak'],
          answer: 0,
          explain:
            'Tiếng Anh không tự nói, mà được người ta nói, nên dùng bị động is + V3: is spoken.',
        },
        {
          kind: 'fill',
          id: 'u10-l01-c03',
          prompt: 'Điền dạng bị động của động từ trong ngoặc',
          sentence: 'The bridge ___ (build) in 2005.',
          answers: ['was built'],
          explain:
            'In 2005 là quá khứ, cây cầu là số ít, nên dùng was + V3: was built.',
        },
        {
          kind: 'fix',
          id: 'u10-l01-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['These', 'cars', 'are', 'make', 'in', 'Japan.'],
          wrongIndex: 3,
          correction: 'made',
          explain: 'Bị động là be + V3. V3 của make là made.',
        },
        {
          kind: 'explain',
          id: 'u10-l01-c05',
          title: 'Chia be theo chủ ngữ',
          body: 'Be chia theo chủ ngữ của câu bị động: is/was cho số ít, are/were cho số nhiều. Nhớ V3 của động từ bất quy tắc: steal - stolen, write - written.',
          examples: [
            {
              en: 'My bike was stolen last night.',
              vi: 'Xe đạp của tôi bị lấy trộm tối qua.',
            },
            {
              en: 'The rooms are cleaned every day.',
              vi: 'Các phòng được dọn mỗi ngày.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u10-l01-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'The windows ___ cleaned every week.',
          answers: ['are', 'were'],
          bank: ['is', 'are', 'was'],
          explain:
            'The windows là số nhiều và every week là thói quen hiện tại, nên dùng are.',
        },
        {
          kind: 'choice',
          id: 'u10-l01-c07',
          prompt: 'Chọn từ đúng',
          sentence: 'My phone ___ on the bus yesterday.',
          options: ['was stolen', 'stole', 'is stolen'],
          answer: 0,
          explain:
            'Điện thoại bị lấy trộm (bị động) và yesterday là quá khứ, nên dùng was stolen.',
        },
        {
          kind: 'explain',
          id: 'u10-l01-c08',
          title: 'By: do ai làm',
          body: 'Muốn nói ai làm việc đó, thêm by + người làm. Chỉ thêm khi thông tin đó có ích, đừng viết by someone hay by people.',
          formula: 'be + V3 + by + người làm',
          examples: [
            {
              en: 'Romeo and Juliet was written by Shakespeare.',
              vi: 'Romeo và Juliet do Shakespeare viết.',
            },
            {
              en: 'The cake was made by my sister.',
              vi: 'Cái bánh do chị tôi làm.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u10-l01-c09',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'This song was written by my friend.',
          explain:
            'Chủ ngữ This song, rồi was written (bị động), rồi by + người làm.',
        },
        {
          kind: 'fix',
          id: 'u10-l01-c10',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'The',
            'Mona',
            'Lisa',
            'was',
            'painted',
            'from',
            'Leonardo',
            'da',
            'Vinci.',
          ],
          wrongIndex: 5,
          correction: 'by',
          explain: 'Người làm trong câu bị động đi sau by, không dùng from.',
        },
        {
          kind: 'fill',
          id: 'u10-l01-c11',
          prompt: 'Điền dạng bị động của động từ trong ngoặc',
          sentence: 'Rice ___ (grow) in many parts of Vietnam.',
          answers: ['is grown'],
          explain:
            'Lúa được trồng (sự thật hiện tại), rice không đếm được nên dùng is + V3: is grown.',
        },
        {
          kind: 'order',
          id: 'u10-l01-c12',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'The letters were sent yesterday.',
          alternatives: ['Yesterday the letters were sent.'],
          explain:
            'The letters số nhiều, quá khứ, nên dùng were + V3: were sent.',
        },
      ],
    },
    {
      id: 'u10-l02',
      title: 'Bị động với các thì khác và modal',
      titleEn: 'Passive with other tenses and modals',
      summary: 'has been done, will be done, can be done.',
      cards: [
        {
          kind: 'explain',
          id: 'u10-l02-c01',
          title: 'Giữ thì, thêm be + V3',
          body: 'Mọi thì đều có bị động: giữ nguyên thì đó cho động từ be, rồi thêm V3. Hiện tại hoàn thành là has/have been + V3, tương lai là will be + V3.',
          formula: 'has/have been + V3 | will be + V3',
          examples: [
            {
              en: 'My car has been repaired.',
              vi: 'Xe của tôi đã được sửa xong.',
            },
            {
              en: 'The results will be announced tomorrow.',
              vi: 'Kết quả sẽ được công bố vào ngày mai.',
            },
          ],
          pitfall: {
            wrong: 'My car has repaired.',
            right: 'My car has been repaired.',
            note: 'Thiếu been thì câu thành "xe tự sửa". Bị động hoàn thành luôn cần been.',
          },
        },
        {
          kind: 'choice',
          id: 'u10-l02-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'All the tickets have ___ sold.',
          options: ['been', 'be', 'being'],
          answer: 0,
          explain: 'Bị động hiện tại hoàn thành: have been + V3.',
        },
        {
          kind: 'fill',
          id: 'u10-l02-c03',
          prompt: 'Điền dạng bị động tương lai của động từ trong ngoặc',
          sentence: 'A new hospital ___ (build) here next year.',
          answers: ['will be built', 'is going to be built'],
          explain:
            'Next year là tương lai, bệnh viện được xây nên dùng will be + V3: will be built.',
        },
        {
          kind: 'fix',
          id: 'u10-l02-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['Our', 'flight', 'has', 'been', 'cancel.'],
          wrongIndex: 4,
          correction: 'cancelled',
          explain: 'Sau has been phải là V3: cancelled.',
        },
        {
          kind: 'explain',
          id: 'u10-l02-c05',
          title: 'Bị động tiếp diễn: being + V3',
          body: 'Khi việc đang được làm, dùng am/is/are being + V3 (hiện tại) hoặc was/were being + V3 (quá khứ).',
          formula: 'is/are being + V3',
          examples: [
            {
              en: 'My car is being repaired.',
              vi: 'Xe của tôi đang được sửa.',
            },
            {
              en: 'The road was being repaired when we arrived.',
              vi: 'Lúc chúng tôi đến, con đường đang được sửa.',
            },
          ],
        },
        {
          kind: 'fill',
          id: 'u10-l02-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'Sorry, the lift ___ repaired at the moment.',
          answers: ['is being'],
          bank: ['is being', 'has been', 'will be'],
          explain:
            'At the moment là đang diễn ra, nên dùng bị động tiếp diễn: is being repaired.',
        },
        {
          kind: 'explain',
          id: 'u10-l02-c07',
          title: 'Modal + be + V3',
          body: 'Sau can, must, should, may... thì be giữ nguyên mẫu, rồi thêm V3.',
          formula: 'can / must / should + be + V3',
          examples: [
            {
              en: 'This problem can be solved.',
              vi: 'Vấn đề này có thể giải quyết được.',
            },
            {
              en: 'Phones must be turned off.',
              vi: 'Điện thoại phải được tắt.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u10-l02-c08',
          prompt: 'Chọn từ đúng',
          sentence: 'This medicine should ___ after meals.',
          options: ['be taken', 'taken', 'be take'],
          answer: 0,
          explain:
            'Thuốc được uống (bị động), sau should dùng be + V3: be taken.',
        },
        {
          kind: 'fix',
          id: 'u10-l02-c09',
          prompt: 'Chạm vào từ sai',
          tokens: ['Mobile', 'phones', 'must', 'are', 'switched', 'off.'],
          wrongIndex: 3,
          correction: 'be',
          explain: 'Sau must, be giữ nguyên mẫu: must be switched off.',
        },
        {
          kind: 'order',
          id: 'u10-l02-c10',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'The results will be announced tomorrow.',
          alternatives: ['Tomorrow the results will be announced.'],
          explain:
            'Bị động tương lai: will be + V3 (announced) đứng sau chủ ngữ The results.',
        },
        {
          kind: 'fill',
          id: 'u10-l02-c11',
          prompt: 'Điền be + V3 của động từ trong ngoặc',
          sentence: 'Plastic bottles can ___ (recycle).',
          answers: ['be recycled'],
          explain:
            'Chai nhựa được tái chế (bị động), sau can dùng be + V3: be recycled.',
        },
        {
          kind: 'order',
          id: 'u10-l02-c12',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Has the package been delivered?',
          explain:
            'Câu hỏi hiện tại hoàn thành: Has đứng đầu, rồi chủ ngữ the package, rồi been delivered.',
        },
        {
          kind: 'choice',
          id: 'u10-l02-c13',
          prompt: 'Chọn câu đúng',
          options: [
            'The meeting has been cancelled.',
            'The meeting has cancelled.',
            'The meeting has be cancelled.',
          ],
          answer: 0,
          explain:
            'Cuộc họp bị hủy (bị động), thì hoàn thành nên dùng has been + V3.',
        },
      ],
    },
    {
      id: 'u10-l03',
      title: 'V-ing sau động từ',
      titleEn: 'Verbs followed by -ing',
      summary: 'enjoy, avoid, finish, mind, suggest... + V-ing.',
      cards: [
        {
          kind: 'explain',
          id: 'u10-l03-c01',
          title: 'Những động từ cần V-ing',
          body: 'Một số động từ luôn đi với V-ing ở phía sau, không đi với to V. Cần học thuộc nhóm này: enjoy, avoid, finish, mind, suggest, keep, practise.',
          formula: 'enjoy / avoid / finish / mind ... + V-ing',
          examples: [
            { en: 'I enjoy reading.', vi: 'Tôi thích đọc sách.' },
            { en: 'She avoids eating late.', vi: 'Cô ấy tránh ăn khuya.' },
          ],
          pitfall: {
            wrong: 'I enjoy to read books.',
            right: 'I enjoy reading books.',
            note: 'Enjoy luôn đi với V-ing, không dùng to V.',
          },
        },
        {
          kind: 'choice',
          id: 'u10-l03-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'I enjoy ___ in the rain.',
          options: ['walking', 'to walk', 'walk'],
          answer: 0,
          explain: 'Sau enjoy dùng V-ing: enjoy walking.',
        },
        {
          kind: 'fill',
          id: 'u10-l03-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'Have you finished ___ (write) your essay?',
          answers: ['writing'],
          explain: 'Sau finish dùng V-ing. Write bỏ e rồi thêm -ing: writing.',
        },
        {
          kind: 'fix',
          id: 'u10-l03-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'avoids', 'eat', 'fast', 'food.'],
          wrongIndex: 2,
          correction: 'eating',
          explain: 'Sau avoid dùng V-ing: avoids eating.',
        },
        {
          kind: 'explain',
          id: 'u10-l03-c05',
          title: 'Would you mind + V-ing?',
          body: 'Would you mind + V-ing? là cách nhờ vả rất lịch sự, nghĩa là "Bạn có phiền... không?". I don\'t mind + V-ing nghĩa là "tôi không ngại".',
          examples: [
            {
              en: 'Would you mind opening the window?',
              vi: 'Bạn mở giúp cửa sổ được không?',
            },
            { en: "I don't mind waiting.", vi: 'Tôi không ngại chờ.' },
          ],
        },
        {
          kind: 'fill',
          id: 'u10-l03-c06',
          prompt: 'Chọn từ đúng',
          sentence: 'Would you mind ___ the door?',
          answers: ['closing'],
          bank: ['close', 'to close', 'closing'],
          explain: 'Sau mind dùng V-ing: Would you mind closing...?',
        },
        {
          kind: 'order',
          id: 'u10-l03-c07',
          prompt: 'Sắp xếp thành câu hỏi',
          sentence: 'Do you mind waiting a few minutes?',
          explain: 'Do you mind + V-ing: waiting đứng ngay sau mind.',
        },
        {
          kind: 'explain',
          id: 'u10-l03-c08',
          title: 'Suggest và keep',
          body: 'Suggest (gợi ý) và keep (cứ tiếp tục) cũng đi với V-ing. Không nói suggest to go.',
          examples: [
            {
              en: 'He suggested going to the beach.',
              vi: 'Anh ấy gợi ý đi biển.',
            },
            { en: 'Keep trying!', vi: 'Cứ tiếp tục cố gắng nhé!' },
          ],
        },
        {
          kind: 'choice',
          id: 'u10-l03-c09',
          prompt: 'Chọn từ đúng',
          sentence: 'My friend suggested ___ a taxi.',
          options: ['taking', 'to take', 'take'],
          answer: 0,
          explain: 'Sau suggest dùng V-ing: suggested taking.',
        },
        {
          kind: 'fix',
          id: 'u10-l03-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['Lan', 'practises', 'speak', 'English', 'every', 'day.'],
          wrongIndex: 2,
          correction: 'speaking',
          explain: 'Sau practise dùng V-ing: practises speaking.',
        },
        {
          kind: 'fill',
          id: 'u10-l03-c11',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: "Don't give up. Keep ___ (try).",
          answers: ['trying'],
          explain: 'Sau keep dùng V-ing: keep trying.',
        },
        {
          kind: 'order',
          id: 'u10-l03-c12',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'He has finished cleaning the kitchen.',
          explain: 'Has finished + V-ing: cleaning đứng ngay sau finished.',
        },
      ],
    },
    {
      id: 'u10-l04',
      title: 'to V sau động từ',
      titleEn: 'Verbs followed by to-infinitive',
      summary: 'want, decide, hope, plan, agree... + to V.',
      cards: [
        {
          kind: 'explain',
          id: 'u10-l04-c01',
          title: 'Những động từ cần to V',
          body: 'Nhiều động từ nói về ý định, mong muốn, quyết định đi với to V: want, decide, hope, plan, agree, promise, refuse, need.',
          formula: 'want / decide / hope / plan ... + to + V nguyên mẫu',
          examples: [
            { en: 'I want to go home.', vi: 'Tôi muốn về nhà.' },
            {
              en: 'She decided to study abroad.',
              vi: 'Cô ấy quyết định đi du học.',
            },
          ],
          pitfall: {
            wrong: 'I want go home.',
            right: 'I want to go home.',
            note: 'Tiếng Việt nói "muốn đi" không có chữ nào ở giữa, nên hay quên to.',
          },
        },
        {
          kind: 'choice',
          id: 'u10-l04-c02',
          prompt: 'Chọn từ đúng',
          sentence: 'We decided ___ a new car.',
          options: ['to buy', 'buying', 'buy'],
          answer: 0,
          explain: 'Sau decide dùng to V: decided to buy.',
        },
        {
          kind: 'fill',
          id: 'u10-l04-c03',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'I hope ___ (see) you again soon.',
          answers: ['to see'],
          explain: 'Sau hope dùng to V: hope to see.',
        },
        {
          kind: 'fix',
          id: 'u10-l04-c04',
          prompt: 'Chạm vào từ sai',
          tokens: ['She', 'wants', 'become', 'a', 'doctor.'],
          wrongIndex: 2,
          correction: 'to become',
          explain: 'Sau want phải có to: wants to become.',
        },
        {
          kind: 'explain',
          id: 'u10-l04-c05',
          title: 'Phủ định: not đứng trước to',
          body: 'Muốn nói "quyết định không...", "hứa không...", đặt not ngay trước to.',
          formula: 'decide / promise / agree + not to + V',
          examples: [
            {
              en: 'I decided not to buy it.',
              vi: 'Tôi quyết định không mua nó.',
            },
            {
              en: 'He promised not to tell anyone.',
              vi: 'Anh ấy hứa không kể với ai.',
            },
          ],
        },
        {
          kind: 'order',
          id: 'u10-l04-c06',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'They agreed not to tell anyone.',
          alternatives: ['They agreed to not tell anyone.'],
          explain: 'Not đứng trước to: agreed not to tell.',
        },
        {
          kind: 'fill',
          id: 'u10-l04-c07',
          prompt: 'Chọn từ đúng',
          sentence: 'He promised ___ (not / be) late again.',
          answers: ['not to be'],
          bank: ['not to be', 'not be', 'to be not'],
          explain: 'Phủ định của to V: đặt not trước to, thành not to be.',
        },
        {
          kind: 'explain',
          id: 'u10-l04-c08',
          title: 'Would like + to V',
          body: 'Would like (\'d like) là cách nói "muốn" lịch sự, luôn đi với to V. Need, plan và refuse cũng vậy.',
          examples: [
            { en: "I'd like to book a table.", vi: 'Tôi muốn đặt một bàn.' },
            {
              en: 'We plan to travel next summer.',
              vi: 'Chúng tôi dự định đi du lịch vào hè tới.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u10-l04-c09',
          prompt: 'Chọn từ đúng',
          sentence: "I'd like ___ a table for two, please.",
          options: ['to book', 'booking', 'book'],
          answer: 0,
          explain: "Would like ('d like) luôn đi với to V: I'd like to book.",
        },
        {
          kind: 'fix',
          id: 'u10-l04-c10',
          prompt: 'Chạm vào từ sai',
          tokens: ['They', 'plan', 'moving', 'to', 'Hanoi.'],
          wrongIndex: 2,
          correction: 'to move',
          explain: 'Sau plan dùng to V: plan to move.',
        },
        {
          kind: 'fill',
          id: 'u10-l04-c11',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'The manager refused ___ (answer) my question.',
          answers: ['to answer'],
          explain: 'Sau refuse dùng to V: refused to answer.',
        },
        {
          kind: 'choice',
          id: 'u10-l04-c12',
          prompt: 'Chọn câu đúng',
          options: [
            'We agreed to meet at six.',
            'We agreed meeting at six.',
            'We agreed meet at six.',
          ],
          answer: 0,
          explain: 'Sau agree dùng to V: agreed to meet.',
        },
        {
          kind: 'order',
          id: 'u10-l04-c13',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: 'I need to finish this report today.',
          alternatives: ['Today I need to finish this report.'],
          explain: 'Sau need dùng to V: need to finish.',
        },
      ],
    },
    {
      id: 'u10-l05',
      title: 'remember, stop, try, forget',
      titleEn: 'Verbs that change meaning',
      summary: 'Cùng một động từ, đi với V-ing hay to V thì nghĩa khác hẳn.',
      cards: [
        {
          kind: 'explain',
          id: 'u10-l05-c01',
          title: 'Stop + V-ing hay stop + to V',
          body: 'Stop + V-ing là ngừng hẳn việc đang làm. Stop + to V là dừng lại (việc khác) để làm việc đó.',
          examples: [
            {
              en: 'I stopped smoking last year.',
              vi: 'Tôi bỏ thuốc lá từ năm ngoái.',
            },
            {
              en: 'We stopped to buy some water.',
              vi: 'Chúng tôi dừng lại để mua nước.',
            },
          ],
          pitfall: {
            wrong: 'I stopped to smoke last year.',
            right: 'I stopped smoking last year.',
            note: 'Bỏ thuốc là stop smoking. Stop to smoke là dừng lại để hút thuốc.',
          },
        },
        {
          kind: 'choice',
          id: 'u10-l05-c02',
          prompt: 'Chọn từ đúng',
          sentence:
            'I was tired after driving for hours, so I stopped ___ a break.',
          options: ['to take', 'taking', 'take'],
          answer: 0,
          explain:
            'Dừng lái xe để nghỉ, tức dừng lại để làm việc khác: stopped to take.',
        },
        {
          kind: 'fill',
          id: 'u10-l05-c03',
          prompt: 'Chọn dạng đúng',
          sentence:
            'My dad stopped ___ (smoke) ten years ago, and he feels much healthier now.',
          answers: ['smoking'],
          bank: ['smoking', 'to smoke'],
          explain:
            'Bố đã bỏ hẳn thuốc lá nên dùng stop + V-ing: stopped smoking.',
        },
        {
          kind: 'explain',
          id: 'u10-l05-c04',
          title: 'Remember và forget',
          body: 'Remember/forget + to V: nhớ/quên làm một việc cần làm. Remember/forget + V-ing: nhớ/quên một việc đã làm rồi.',
          examples: [
            { en: 'Remember to lock the door.', vi: 'Nhớ khóa cửa nhé.' },
            {
              en: 'I remember meeting her in 2019.',
              vi: 'Tôi nhớ là đã gặp cô ấy năm 2019.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u10-l05-c05',
          prompt: 'Chọn từ đúng',
          sentence: 'Please remember ___ the lights when you leave.',
          options: ['to turn off', 'turning off', 'turn off'],
          answer: 0,
          explain:
            'Tắt đèn là việc cần làm khi ra về (chưa làm), nên dùng remember + to V.',
        },
        {
          kind: 'fill',
          id: 'u10-l05-c06',
          prompt: 'Điền dạng đúng của động từ trong ngoặc',
          sentence: 'I remember ___ (visit) this temple when I was a child.',
          answers: ['visiting'],
          explain:
            'Đây là ký ức về việc đã làm hồi nhỏ, nên dùng remember + V-ing.',
        },
        {
          kind: 'fix',
          id: 'u10-l05-c07',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'I',
            'forgot',
            'buying',
            'milk,',
            'so',
            'we',
            'have',
            'none.',
          ],
          wrongIndex: 2,
          correction: 'to buy',
          explain:
            'Quên một việc cần làm (nên giờ hết sữa) thì dùng forget + to V: forgot to buy.',
        },
        {
          kind: 'explain',
          id: 'u10-l05-c08',
          title: 'Try + to V hay try + V-ing',
          body: 'Try + to V là cố gắng làm một việc khó. Try + V-ing là thử làm một cách để xem có hiệu quả không.',
          examples: [
            {
              en: "I tried to open the jar, but I couldn't.",
              vi: 'Tôi cố mở cái lọ nhưng không được.',
            },
            {
              en: "If you can't sleep, try drinking warm milk.",
              vi: 'Nếu không ngủ được, hãy thử uống sữa ấm.',
            },
          ],
        },
        {
          kind: 'choice',
          id: 'u10-l05-c09',
          prompt: 'Chọn từ đúng',
          sentence: "The box was very heavy. I tried ___ it, but I couldn't.",
          options: ['to lift', 'lifting', 'lift'],
          answer: 0,
          explain:
            'Cố hết sức mà vẫn không làm được, đó là try + to V: tried to lift.',
        },
        {
          kind: 'fill',
          id: 'u10-l05-c10',
          prompt: 'Chọn dạng đúng',
          sentence:
            'The soup was bland, so I tried ___ (add) some salt. It tasted much better!',
          answers: ['adding'],
          bank: ['adding', 'to add'],
          explain:
            'Thêm muối là thử một cách để xem có ngon hơn không, nên dùng try + V-ing.',
        },
        {
          kind: 'order',
          id: 'u10-l05-c11',
          prompt: 'Sắp xếp thành câu đúng',
          sentence: "Don't forget to call your mother.",
          explain:
            "Gọi điện là việc cần làm (chưa làm), nên dùng forget + to V: Don't forget to call.",
        },
        {
          kind: 'fix',
          id: 'u10-l05-c12',
          prompt: 'Chạm vào từ sai',
          tokens: [
            'We',
            'stopped',
            'talk',
            'when',
            'the',
            'teacher',
            'came',
            'in.',
          ],
          wrongIndex: 2,
          correction: 'talking',
          explain:
            'Cả lớp ngừng nói chuyện khi cô vào, tức ngừng hẳn việc đang làm: stopped talking.',
        },
        {
          kind: 'choice',
          id: 'u10-l05-c13',
          prompt: 'Chọn câu đúng',
          options: [
            'I will never forget seeing snow for the first time.',
            'I will never forget to see snow for the first time.',
            'I will never forget see snow for the first time.',
          ],
          answer: 0,
          explain:
            'Đây là kỷ niệm đã xảy ra, nên dùng forget + V-ing: forget seeing.',
        },
      ],
    },
  ],
}
