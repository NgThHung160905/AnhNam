export interface NoteTemplate {
  code: string;
  shortCode: string;
  aliases: string[];
  label: string;
  description: string;
  content: string;
}

export const DEFAULT_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    code: "Dặn dò chung",
    shortCode: "ddc",
    aliases: ["ddc", "chung", "dan do chung", "dan do"],
    label: "Dặn dò chung",
    description: "Sốt cao khó hạ, tím tái, nôn ói, thở bất thường, tiêu máu...",
    content: `Uống nhiều nước, uống thuốc hạ sốt khi sốt ≥ 38.5 độ C
Tái khám ngay hoặc đến cơ sở khám chữa bệnh gần nhất khi có các dấu hiệu sau:
- Sốt cao liên tục khó hạ
- Tím tái
- Ói liên tục, ói tất cả mọi thứ, bỏ ăn uống
- Thở bất thường
- Tiêu máu
- Bệnh nặng hơn`
  },
  {
    code: "Sốt xuất huyết",
    shortCode: "sxh",
    aliases: ["sxh", "sot xuat huyet"],
    label: "Sốt xuất huyết",
    description: "Ói, tiêu chảy, đau bụng, tay chân lạnh, chảy máu...",
    content: `Uống nhiều nước, uống thuốc hạ sốt khi sốt ≥ 38.5 độ C
Tái khám ngay hoặc đến cơ sở khám chữa bệnh gần nhất khi có các dấu hiệu sau:
- Ói, tiêu chảy nhiều
- Đau bụng
- Ăn uống kém hơn
- Tay chân lạnh
- Tiêu máu, chảy máu mũi, răng, nướu,…`
  },
  {
    code: "Tay chân miệng",
    shortCode: "tcm",
    aliases: ["tcm", "tay chan mieng"],
    label: "Tay chân miệng",
    description: "Sốt cao, giật mình, run chi, đi đứng bất thường, quấy khóc...",
    content: `Uống nhiều nước, uống thuốc hạ sốt khi sốt ≥ 38.5 độ C
Tái khám ngay hoặc đến cơ sở khám chữa bệnh gần nhất khi có các dấu hiệu sau:
- Sốt cao liên tục khó hạ
- Giật mình, run chi
- Đi đứng bất thường
- Quấy khóc vô cớ`
  },
  {
    code: "Hô hấp",
    shortCode: "hh",
    aliases: ["hh", "ho hap"],
    label: "Hô hấp",
    description: "Thở nhanh, thở co lõm ngực, tím tái, nôn ói...",
    content: `Uống nhiều nước, uống thuốc hạ sốt khi sốt ≥ 38.5 độ C
Tái khám ngay hoặc đến cơ sở khám chữa bệnh gần nhất khi có các dấu hiệu sau:
- Thở nhanh, thở co lõm ngực
- Tím tái
- Ói tất cả mọi thứ`
  },
  {
    code: "Tiêu hóa",
    shortCode: "th",
    aliases: ["th", "tieu hoa"],
    label: "Tiêu hóa",
    description: "Ói liên tục, bỏ ăn uống, đau bụng nhiều, tiêu máu...",
    content: `Uống nhiều nước, uống thuốc hạ sốt khi sốt ≥ 38.5 độ C
Tái khám ngay hoặc đến cơ sở khám chữa bệnh gần nhất khi có các dấu hiệu sau:
- Ói liên tục, ói tất cả mọi thứ, bỏ ăn uống
- Đau bụng nhiều
- Tiêu máu
- Thở bất thường`
  },
  {
    code: "Dị ứng",
    shortCode: "du",
    aliases: ["du", "di ung"],
    label: "Dị ứng",
    description: "Sưng phù mặt, môi, chảy nước mắt/mũi, khó thở, thở rít...",
    content: `Uống nhiều nước, uống thuốc hạ sốt khi sốt ≥ 38.5 độ C
Tái khám ngay hoặc đến cơ sở khám chữa bệnh gần nhất khi có các dấu hiệu sau:
- Sưng phù mặt, mi mắt, môi, miệng
- Chảy nước mắt, mũi
- Khó thở, thở rít
- Đau bụng nhiều, ói
- Mệt, tay chân lạnh, tím tái`
  }
];

export function getNoteTemplates(): NoteTemplate[] {
  if (typeof window === "undefined") return DEFAULT_NOTE_TEMPLATES;
  try {
    const saved = localStorage.getItem("khambenh_note_templates");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_NOTE_TEMPLATES;
}

export function findNoteTemplateByCode(query: string, templates = DEFAULT_NOTE_TEMPLATES): NoteTemplate | null {
  if (!query) return null;
  const clean = query.trim().toLowerCase();
  return templates.find(t => 
    t.shortCode.toLowerCase() === clean ||
    t.code.toLowerCase() === clean ||
    t.aliases.some(a => a.toLowerCase() === clean)
  ) || null;
}
