export const fallbackCourses = [
  {
    id: "office-dasar",
    slug: "office-dasar",
    title: "Microsoft Office Dasar",
    short_description:
      "Fondasi Word, Excel, dan PowerPoint untuk belajar, bekerja, dan melamar pekerjaan.",
    description:
      "Kuasai keterampilan inti Microsoft Office melalui video terarah, latihan praktis, enam ujian, bimbingan remote, dan sertifikat resmi LPKP MENTARI.",
    price: 1_500_000,
    level: "Dasar",
    status: "active",
  },
  {
    id: "office-lanjutan",
    slug: "office-lanjutan",
    title: "Microsoft Office Lanjutan",
    short_description:
      "Naikkan kemampuan dokumen, pengolahan data, dan presentasi ke level profesional.",
    description:
      "Pelajari teknik lanjutan Word, Excel, dan PowerPoint dengan tugas berbasis kasus kerja, penilaian pengajar, bimbingan remote, dan sertifikat resmi.",
    price: 1_500_000,
    level: "Lanjutan",
    status: "active",
  },
] as const;

export const learningApps = [
  { name: "Word", mark: "W", color: "office-word" },
  { name: "Excel", mark: "X", color: "office-excel" },
  { name: "PowerPoint", mark: "P", color: "office-powerpoint" },
] as const;
