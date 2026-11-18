// du lieu mau theo dung response POST /documents/analyze trong docs/API.md
export const sampleMindmap = {
  title: 'Chương 3 - Đạo hàm',
  summary: 'Tài liệu trình bày khái niệm đạo hàm, các quy tắc tính và ứng dụng.',
  mindmap: {
    label: 'Đạo hàm',
    children: [
      {
        label: 'Định nghĩa',
        note: 'Giới hạn của tỉ số gia số',
        children: [{ label: 'Ý nghĩa hình học' }, { label: 'Ý nghĩa vật lý' }],
      },
      {
        label: 'Quy tắc tính',
        children: [
          { label: 'Tổng, hiệu, tích, thương' },
          { label: 'Hàm hợp', note: "(f(g(x)))' = f'(g(x)) · g'(x)" },
          { label: 'Hàm ngược' },
        ],
      },
      {
        label: 'Đạo hàm cơ bản',
        children: [{ label: 'xⁿ' }, { label: 'sin x, cos x' }, { label: 'eˣ, ln x' }],
      },
      {
        label: 'Ứng dụng',
        children: [
          { label: 'Tiếp tuyến' },
          { label: 'Khảo sát hàm số', children: [{ label: 'Đơn điệu' }, { label: 'Cực trị' }] },
          { label: 'Bài toán tối ưu' },
        ],
      },
    ],
  },
}

export const sampleMindmapJson = JSON.stringify(sampleMindmap, null, 2)
