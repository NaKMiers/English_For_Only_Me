import type { Messages } from '../en'

/** Vietnamese UI text shared by every module. Keys mirror en/common.ts. */
export const common: Messages['common'] = {
  app: {
    name: 'English For Only Me',
    description:
      'Bàn học IELTS riêng cho chép chính tả, từ vựng, ôn tập, ghi chú viết và các phần luyện tiếng Anh sắp tới.',
    logoAlt: 'Logo English For Only Me',
    tagline: 'Góc học tiếng Anh của riêng bạn',
  },
  nav: {
    primary: 'Điều hướng chính',
    home: 'Bàn học',
    menu: 'Menu',
    menuDescription: 'Chuyển nhanh tới một phần học.',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
    soon: 'Sắp có',
  },
  modules: {
    dictation: {
      title: 'Chép chính tả',
      shortTitle: 'Chính tả',
      skill: 'Nghe',
      description:
        'Luyện nghe chép từng câu từ YouTube, sửa lỗi, ôn tập và ghi nhớ cho phần Listening IELTS.',
    },
    vocabulary: {
      title: 'Từ vựng',
      shortTitle: 'Từ vựng',
      skill: 'Từ vựng',
      description:
        'Kho từ của riêng bạn, ôn lại cách quãng, cụm từ đi kèm và luyện các từ hay quên.',
    },
    grammar: {
      title: 'Ngữ pháp',
      shortTitle: 'Ngữ pháp',
      skill: 'Ngữ pháp',
      description:
        'Lộ trình bài ngữ pháp ngắn từ A1 đến C1, có sao, bài kiểm tra chặng và ôn tập cách quãng.',
    },
    ielts: {
      title: 'Đề IELTS',
      shortTitle: 'IELTS',
      skill: 'Thi thử',
      description:
        'Đề Listening, Reading và Writing đầy đủ, có chế độ luyện tập và thi thử bấm giờ, chấm band và xem bằng chứng đáp án.',
    },
    'writing-notes': {
      title: 'Ghi chú Writing',
      shortTitle: 'Writing',
      skill: 'Viết',
      description:
        'Mẫu Task 1 và Task 2, ý tưởng bài luận, cách nâng cấp câu và nhận xét.',
    },
    'ai-coach': {
      title: 'Trợ lý AI',
      shortTitle: 'Trợ lý',
      skill: 'Hướng dẫn',
      description: 'Tổng kết cá nhân, gợi ý cách học và lên lộ trình IELTS.',
    },
    reading: {
      title: 'Đọc hiểu',
      shortTitle: 'Đọc',
      skill: 'Đọc',
      description:
        'Luyện đọc bài, nhận diện bẫy câu hỏi, ghi chú thời gian và xem bằng chứng đáp án.',
    },
    speaking: {
      title: 'Nói',
      shortTitle: 'Nói',
      skill: 'Nói',
      description:
        'Ý tưởng cho cue card, luyện nói trôi chảy, ghi chú phát âm và cách sắp xếp câu trả lời.',
    },
  },
  moduleStatus: {
    active: 'Đang dùng',
    future: 'Sắp có',
    secondary: 'Phụ',
  },
  theme: {
    toDay: 'Chuyển sang giao diện ban ngày',
    toNight: 'Chuyển sang giao diện ban đêm',
  },
  language: {
    label: 'Ngôn ngữ',
    switchTo: 'Chuyển sang {language}',
    names: {
      en: 'tiếng Anh',
      vi: 'tiếng Việt',
    },
  },
  auth: {
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    signOutTitle: 'Đăng xuất?',
    signOutDescription: 'Bạn sẽ đăng xuất khỏi English For Only Me.',
    account: 'Tài khoản',
    admin: 'Quản trị',
    favorites: 'Yêu thích',
  },
  actions: {
    cancel: 'Hủy',
    close: 'Đóng',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Sửa',
    back: 'Quay lại',
    retry: 'Thử lại',
    next: 'Tiếp',
    previous: 'Trước',
    continue: 'Tiếp tục',
    done: 'Xong',
    loading: 'Đang tải…',
    saving: 'Đang lưu…',
  },
  audio: {
    play: 'Phát',
    pause: 'Tạm dừng',
    previousLine: 'Câu trước',
    nextLine: 'Câu tiếp',
    backSeconds: 'Lùi {seconds} giây',
    forwardSeconds: 'Tới {seconds} giây',
    backShort: 'Lùi {seconds} giây',
    forwardShort: 'Tới {seconds} giây',
    withShortcut: '{label} (Alt+{key})',
    speed: 'Tốc độ phát {rate}x',
    changeSpeed: 'Đổi tốc độ',
    seek: 'Tua',
    clockOf: '{time} / {total}',
  },
  footer: {
    rights: '© {year} English For Only Me. Bảo lưu mọi quyền.',
    developedBy: 'Phát triển bởi {author}',
  },
  errors: {
    generic: 'Đã có lỗi xảy ra.',
    network: 'Lỗi mạng. Hãy kiểm tra kết nối rồi thử lại.',
    notFound: 'Không tìm thấy.',
    unauthorized: 'Vui lòng đăng nhập để tiếp tục.',
    forbidden: 'Bạn không có quyền truy cập mục này.',
    invalidRequest: 'Yêu cầu không hợp lệ.',
    serverError: 'Lỗi máy chủ. Vui lòng thử lại.',
    requestFailed: 'Yêu cầu thất bại ({status}).',
    guestSession: 'Không tạo được phiên khách.',
    ownerMismatch:
      'Thay đổi này thuộc về một tài khoản khác. Hãy tải lại trang.',
    writeKept: 'Chưa gửi: người học đã đổi. Dữ liệu được giữ lại để gửi sau.',
  },
}
