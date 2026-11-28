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
    accountMenu: 'Tài khoản',
    accountMenuDescription: 'Tài khoản của bạn và ngôn ngữ của ứng dụng.',
    primary: 'Điều hướng chính',
    home: 'Bàn học',
    menu: 'Menu',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
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
    loginMetaTitle: 'Đăng nhập',
    loginTitle: 'English For Only Me',
    loginHeading: 'Chào mừng bạn quay lại',
    loginTagline:
      'Mỗi ngày nghe, viết và nhớ thêm một chút. Đăng nhập để học tiếp đúng chỗ bạn đã dừng.',
    loginFootnote: 'Chỉ đăng nhập bằng Google, không cần nhớ mật khẩu.',
    loginHeroNowPlaying: 'Nghe chép',
    loginModuleHints: {
      dictation: 'Nghe rồi gõ lại',
      vocabulary: 'Từ vựng nhớ lâu',
      grammar: 'Lộ trình 12 bài',
      ielts: 'Đề thi thử band 7+',
    },
    continueWithGoogle: 'Tiếp tục với Google',
    openingGoogle: 'Đang mở Google...',
    notConfigured:
      'Trang này chưa được cấu hình đăng nhập, nên hiện chưa ai đăng nhập được.',
    errorAccessDenied:
      'Đăng nhập Google đã bị huỷ hoặc không được cho phép. Hãy thử lại.',
    errorGeneric: 'Đăng nhập chưa thành công. Vui lòng thử lại.',
    errorLocked: 'Tài khoản này đã bị khóa. Hãy liên hệ chủ trang.',
    signOut: 'Đăng xuất',
    signOutTitle: 'Đăng xuất?',
    signOutDescription: 'Bạn sẽ đăng xuất khỏi English For Only Me.',
    account: 'Tài khoản',
    admin: 'Quản trị',
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
  journey: {
    nextStop: 'Trạm tiếp theo',
    youAreHere: 'Bạn đang ở đây',
    continue: 'Học tiếp',
    showSide: 'Xem lịch sử và điểm yếu',
    hideSide: 'Ẩn lịch sử và điểm yếu',
    allClear: 'Đã xong hết',
    stepOf: '{done} / {total}',
    stepOfLabel: 'Bước {done} trên {total}',
    stepTaken: '+1 bước',
    details: 'Chi tiết',
    moreItems: {
      one: 'Thêm {count} mục',
      other: 'Thêm {count} mục',
    },
    retryPip: {
      one: '{count} câu làm lại',
      other: '{count} câu làm lại',
    },
    breadcrumb: 'Đường dẫn',
  },
  errors: {
    generic: 'Đã có lỗi xảy ra.',
    network: 'Lỗi mạng. Hãy kiểm tra kết nối rồi thử lại.',
    notFound: 'Không tìm thấy.',
    unauthorized: 'Vui lòng đăng nhập để tiếp tục.',
    forbidden: 'Bạn không có quyền truy cập mục này.',
    invalidRequest: 'Yêu cầu không hợp lệ.',
    requestFailed: 'Yêu cầu thất bại ({status}).',
    ownerMismatch:
      'Thay đổi này thuộc về một tài khoản khác. Hãy tải lại trang.',
    writeKept: 'Chưa gửi: người học đã đổi. Dữ liệu được giữ lại để gửi sau.',
  },
  errorBoundary: {
    eyebrow: 'Có lỗi xảy ra',
    title: 'Trang này cần tải lại',
    description: 'Trang chưa tải được. Hãy thử lại; dữ liệu đã lưu không mất.',
    retry: 'Thử lại',
    home: 'Về bàn học',
  },
}
