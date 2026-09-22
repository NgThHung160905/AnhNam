"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Printer,
  FileText,
  Receipt,
  CheckCircle2,
  Users,
  Eye,
  X,
  ChevronRight,
  Info,
  ArrowUpRight,
  Pill
} from "lucide-react";
import { formatPatientCode } from "@/lib/medicalSummaryService";
import { getHistoricalMedicinePrice, backfillDiagnosesMedicinePrices } from "@/lib/medicinePriceService";
import { calculateAge, formatDisplayDate } from "@/components/DatePicker";

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const regex = /^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2})?$/;
  const match = dateStr.match(regex);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}${match[4] || ""}`;
  }
  return dateStr;
};

const calculateBMI = (weight: string, height: string) => {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (w > 0 && h > 0) {
    return (w / (h * h)).toFixed(1);
  }
  return "";
};

// Định dạng tiền tệ VND chuẩn
const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
};

const formatVNDCompact = (amount: number) => {
  if (!amount || amount === 0) return "0 đ";
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} tr`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} k`;
  }
  return `${amount} đ`;
};

// Hàm chuẩn hóa bóc tách ngày từ chuỗi ngày của phiếu khám (YYYY-MM-DD hoặc DD-MM-YYYY)
const parseDiagDate = (dateStr: string) => {
  if (!dateStr) {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear(), dateFormatted: "" };
  }
  const clean = dateStr.trim().split(" ")[0]; // Bỏ phần giờ nếu có
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // Dạng YYYY-MM-DD
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return {
        year: y,
        month: m,
        day: d,
        dateFormatted: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      };
    } else {
      // Dạng DD-MM-YYYY
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parts[2].length === 2 ? parseInt(`20${parts[2]}`, 10) : parseInt(parts[2], 10);
      return {
        day: d,
        month: m,
        year: y,
        dateFormatted: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
      };
    }
  }
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear(), dateFormatted: clean };
};

// 12 Bảng màu Gradient theo 4 Mùa: XUÂN - HẠ - THU - ĐÔNG
const MONTH_PALETTES = [
  // === MÙA XUÂN (Tháng 1 - 3): Sắc Xanh Lộc Non, Đâm Chồi Nảy Lộc ===
  { month: 1, name: "Tháng 1", season: "Mùa Xuân", seasonIcon: "🌸", gradId: "mGrad1", from: "#059669", to: "#34d399", bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-200" },
  { month: 2, name: "Tháng 2", season: "Mùa Xuân", seasonIcon: "🌸", gradId: "mGrad2", from: "#16a34a", to: "#4ade80", bg: "bg-green-500", text: "text-green-600", light: "bg-green-50", border: "border-green-200" },
  { month: 3, name: "Tháng 3", season: "Mùa Xuân", seasonIcon: "🌸", gradId: "mGrad3", from: "#0d9488", to: "#2dd4bf", bg: "bg-teal-500", text: "text-teal-600", light: "bg-teal-50", border: "border-teal-200" },

  // === MÙA HẠ (Tháng 4 - 6): Sắc Đỏ Phượng & Nắng Hạ Rực Rỡ ===
  { month: 4, name: "Tháng 4", season: "Mùa Hạ", seasonIcon: "☀️", gradId: "mGrad4", from: "#ea580c", to: "#fb923c", bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50", border: "border-orange-200" },
  { month: 5, name: "Tháng 5", season: "Mùa Hạ", seasonIcon: "☀️", gradId: "mGrad5", from: "#dc2626", to: "#f87171", bg: "bg-red-500", text: "text-red-600", light: "bg-red-50", border: "border-red-200" },
  { month: 6, name: "Tháng 6", season: "Mùa Hạ", seasonIcon: "☀️", gradId: "mGrad6", from: "#e11d48", to: "#fb7185", bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50", border: "border-rose-200" },

  // === MÙA THU (Tháng 7 - 9): Sắc Vàng Nắng Thu & Lá Vàng Hổ Phách ===
  { month: 7, name: "Tháng 7", season: "Mùa Thu", seasonIcon: "🍂", gradId: "mGrad7", from: "#d97706", to: "#fbbf24", bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50", border: "border-amber-200" },
  { month: 8, name: "Tháng 8", season: "Mùa Thu", seasonIcon: "🍂", gradId: "mGrad8", from: "#ca8a04", to: "#facc15", bg: "bg-yellow-500", text: "text-yellow-600", light: "bg-yellow-50", border: "border-yellow-200" },
  { month: 9, name: "Tháng 9", season: "Mùa Thu", seasonIcon: "🍂", gradId: "mGrad9", from: "#b45309", to: "#f59e0b", bg: "bg-amber-600", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200" },

  // === MÙA ĐÔNG (Tháng 10 - 12): Sắc Xanh Biển Băng Lạnh & Bầu Trời Đông ===
  { month: 10, name: "Tháng 10", season: "Mùa Đông", seasonIcon: "❄️", gradId: "mGrad10", from: "#0891b2", to: "#38bdf8", bg: "bg-cyan-500", text: "text-cyan-600", light: "bg-cyan-50", border: "border-cyan-200" },
  { month: 11, name: "Tháng 11", season: "Mùa Đông", seasonIcon: "❄️", gradId: "mGrad11", from: "#2563eb", to: "#60a5fa", bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50", border: "border-blue-200" },
  { month: 12, name: "Tháng 12", season: "Mùa Đông", seasonIcon: "❄️", gradId: "mGrad12", from: "#1e40af", to: "#3b82f6", bg: "bg-indigo-600", text: "text-indigo-600", light: "bg-indigo-50", border: "border-indigo-200" },
];

const PANDA_MESSAGES = [
  "Bác sĩ ơi, doanh thu nè! 🐼🎋",
  "Bé Panda chúc Bác sĩ khám vui vẻ! 💖🩺",
  "Tiền khám & thuốc hôm nay rất đều đặn! ✨💰",
  "Bác sĩ nhớ uống nước nghỉ ngơi nha! 🍵🐾",
  "Phòng khám hôm nay thật tuyệt vời! 🌟🐼"
];

// Danh sách các tên bệnh nhân mẫu cần dọn sạch khỏi máy người dùng
const SAMPLE_PATIENT_NAMES = [
  "nguyễn văn a", "nguyen van a", "trần bảo ngọc", "tran thi b", "trần thị b",
  "lê minh khang", "phạm gia hưng", "hoàng yến vy", "đỗ quốc bảo", "vũ tuấn kiệt"
];

export default function SummaryPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);

  // State dữ liệu thực tế từ máy người dùng
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);
  const [hoveredMonth, setHoveredMonth] = useState<any | null>(null);

  // Modal xem chi tiết ca khám ngày
  const [viewingDayModal, setViewingDayModal] = useState<{ day: number; month: number; year: number; diags: any[] } | null>(null);

  // Modal xem chi tiết ĐƠN THUỐC / KHÁM & KÊ TOA của bệnh nhân (ngay tại trang Tổng kết, không chuyển trang)
  const [viewingPrescription, setViewingPrescription] = useState<any>(null);

  const prescriptionModalRef = useRef<HTMLDivElement>(null);

  // Đảm bảo đơn thuốc luôn cuộn lên trên cùng ngay khi mở
  useEffect(() => {
    if (viewingPrescription && prescriptionModalRef.current) {
      prescriptionModalRef.current.scrollTop = 0;
    }
  }, [viewingPrescription]);

  // Xử lý in đơn thuốc: Cuộn về đỉnh tuyệt đối và thiết lập tên file xuất PDF theo "Mã BN_Họ Tên"
  const handlePrintPrescription = () => {
    if (prescriptionModalRef.current) {
      prescriptionModalRef.current.scrollTop = 0;
    }
    const originalTitle = document.title;
    if (viewingPrescription) {
      const pt = savedPatients.find((p: any) => viewingPrescription.patientId ? p.id === viewingPrescription.patientId : p.name === viewingPrescription.patientName) || {};
      const ptCode = getPatientCode(viewingPrescription);
      const displayPtCode = ptCode !== "-" ? ptCode : (viewingPrescription.patientId || (pt as any).id || "");
      const patientName = (viewingPrescription.patientName || "").trim();
      const safeCode = (displayPtCode || "").replace(/[\\/:*?"<>|]/g, "_").trim();
      const safeName = (patientName || "").replace(/[\\/:*?"<>|]/g, "_").trim();
      if (safeCode && safeName) {
        document.title = `${safeCode}_${safeName}`;
      } else if (safeName) {
        document.title = safeName;
      } else if (safeCode) {
        document.title = safeCode;
      } else {
        document.title = "DonThuoc";
      }
    }
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 50);
  };

  // Xem chi tiết Khám & Kê toa của bệnh nhân trực tiếp tại trang Tổng kết
  const handleOpenPatientDiagnosis = (item: any) => {
    if (!item) return;
    setViewingPrescription(item);
  };

  // Helper lấy mã bệnh nhân
  const getPatientCode = (diag: any) => {
    if (!diag) return "-";
    if (diag.patientId) return formatPatientCode(diag.patientId);
    if (diag.patientName) {
      const found = savedPatients.find((p: any) => p.name?.trim().toLowerCase() === diag.patientName?.trim().toLowerCase());
      if (found?.id) return formatPatientCode(found.id);
    }
    return "-";
  };

  // Helper lấy danh sách thuốc kê trong phiếu khám
  const getPrescriptionDetails = (diag: any) => {
    if (!diag) return [];
    let medCatalog = medicines;
    try {
      const saved = localStorage.getItem("khambenh_medicines");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) medCatalog = parsed;
      }
    } catch (e) { }

    const meds: any[] = diag.medicines || [];
    if (meds.length > 0 && meds.some((m: any) => m.medicineName || m.name || m.medicineId)) {
      return meds.filter((m: any) => m.medicineName || m.name || m.medicineId).map((m: any, idx: number) => {
        const rawName = String(m.medicineName || m.name || "").trim();
        const rawId = String(m.medicineId || m.id || "").trim();

        // 1. Tìm theo ID/mã thuốc trước (kể cả khi m.medicineName là mã thuốc như T001)
        let medInfo = medCatalog.find((med: any) =>
          (med.id && (String(med.id).trim().toLowerCase() === rawName.toLowerCase() || (rawId && String(med.id).trim().toLowerCase() === rawId.toLowerCase())))
        );

        // 2. Tìm theo tên thuốc nếu chưa thấy
        if (!medInfo) {
          medInfo = medCatalog.find((med: any) =>
            med.name && med.name.trim().toLowerCase() === rawName.toLowerCase()
          );
        }

        // Hiển thị MÃ THUỐC thay vì tên thuốc theo đúng yêu cầu
        const displayMedCode = medInfo?.id || rawId || rawName;
        const savedPrice = typeof m.price === "number" && m.price > 0
          ? m.price
          : (parseInt(String(m.price || "").replace(/\D/g, ""), 10) || 0);
        const priceNum = savedPrice > 0
          ? savedPrice
          : (getHistoricalMedicinePrice(m, diag?.date, medCatalog) || (typeof medInfo?.price === "number" ? medInfo.price : (parseInt(String(medInfo?.price || "5000").replace(/[^0-9]/g, "")) || 5000)));

        return {
          id: idx + 1,
          name: displayMedCode,
          quantity: m.medicineQuantity || 1,
          unit: m.medicineUnit ?? medInfo?.unit ?? "Viên",
          price: priceNum,
          medDays: m.medDays || "",
          medTimes: m.medTimes || "",
          medAmount: m.medAmount || "",
          medCustomUnit: m.medCustomUnit ?? medInfo?.unit?.toLowerCase() ?? "viên",
          notes: m.medicineNote || ""
        };
      });
    }
    return [];
  };

  // Mascot Panda
  const [pandaMsgIndex, setPandaMsgIndex] = useState<number>(0);
  const [isPandaWiggling, setIsPandaWiggling] = useState<boolean>(false);

  const detailSectionRef = useRef<HTMLDivElement>(null);

  const handlePandaClick = () => {
    setIsPandaWiggling(true);
    setPandaMsgIndex(prev => (prev + 1) % PANDA_MESSAGES.length);
    setTimeout(() => setIsPandaWiggling(false), 600);
  };

  // Nạp và dọn dẹp dữ liệu từ localStorage
  const loadData = () => {
    try {
      // 1. Nạp danh mục thuốc
      let loadedMeds = medicines;
      const medRaw = localStorage.getItem("khambenh_medicines");
      if (medRaw) {
        try {
          const parsedMeds = JSON.parse(medRaw);
          if (Array.isArray(parsedMeds)) {
            loadedMeds = parsedMeds;
            setMedicines(parsedMeds);
          }
        } catch (e) { }
      }

      // Nạp danh sách hồ sơ bệnh nhân để tra cứu tuổi, mã, giới tính, địa chỉ
      const ptsRaw = localStorage.getItem("khambenh_patients");
      if (ptsRaw) {
        try {
          const parsedPts = JSON.parse(ptsRaw);
          if (Array.isArray(parsedPts)) setSavedPatients(parsedPts);
        } catch (e) { }
      }

      // Xóa cấu hình đơn giá chuẩn cũ nếu có
      localStorage.removeItem("khambenh_revenue_pricing");

      // 2. Nạp danh sách phiếu khám và TỰ ĐỘNG XÓA DATA MẪU + CHỐT GIÁ LỊCH SỬ
      const diagRaw = localStorage.getItem("khambenh_diagnosis");
      let realDiagnoses: any[] = [];
      if (diagRaw) {
        try {
          const parsedDiag = JSON.parse(diagRaw);
          if (Array.isArray(parsedDiag)) {
            // Lọc bỏ tất cả ca khám thuộc dữ liệu mẫu
            realDiagnoses = parsedDiag.filter(d => {
              const name = (d.patientName || "").trim().toLowerCase();
              return !SAMPLE_PATIENT_NAMES.includes(name);
            });

            // Tự động chốt giá lịch sử cho các phiếu khám cũ nếu có thuốc chưa lưu giá
            const { updatedDiagnoses, changed } = backfillDiagnosesMedicinePrices(realDiagnoses, loadedMeds);
            realDiagnoses = updatedDiagnoses;

            // Nếu phát hiện có dữ liệu mẫu hoặc cần chốt giá thì cập nhật lại localStorage ngay lập tức
            if (realDiagnoses.length !== parsedDiag.length || changed) {
              localStorage.setItem("khambenh_diagnosis", JSON.stringify(realDiagnoses));
            }
          }
        } catch (e) { }
      }

      setDiagnoses(realDiagnoses);
    } catch (e) {
      console.error("Lỗi nạp dữ liệu thống kê:", e);
      setDiagnoses([]);
    }
  };


  useEffect(() => {
    loadData();
    window.addEventListener("khambenh_diagnosis_updated", loadData);
    window.addEventListener("khambenh_medicines_updated", loadData);
    window.addEventListener("khambenh_patients_updated", loadData);
    return () => {
      window.removeEventListener("khambenh_diagnosis_updated", loadData);
      window.removeEventListener("khambenh_medicines_updated", loadData);
      window.removeEventListener("khambenh_patients_updated", loadData);
    };
  }, []);

  // Xử lý và tính toán từng phiếu khám theo đúng công thức:
  // Doanh thu ca khám = Tiền dịch vụ + Đơn giá thuốc (từ phần thuốc)
  const processedDiagnoses = useMemo(() => {
    return diagnoses.map(d => {
      // 1. Tiền dịch vụ của ca khám
      const serviceFee = typeof d.serviceFee === "number"
        ? d.serviceFee
        : (parseInt(String(d.serviceFee || "").replace(/\D/g, ""), 10) || 0);

      // 2. Đơn giá thuốc (tính từ các loại thuốc đã kê trong phiếu khám)
      // BẢO TOÀN GIÁ LỊCH SỬ: Ưu tiên tuyệt đối med.price đã chốt tại thời điểm kê đơn!
      let medicineFee = 0;
      if (Array.isArray(d.medicines) && d.medicines.length > 0) {
        d.medicines.forEach((med: any) => {
          if (!med.medicineName && !med.name && !med.medicineId && !med.id) return;
          // getHistoricalMedicinePrice: Ưu tiên med.price đã chốt -> Lịch sử đổi giá theo ngày -> Danh mục
          const priceNum = getHistoricalMedicinePrice(med, d.date, medicines);
          const quantity = parseInt(String(med.medicineQuantity || 1), 10) || 1;
          medicineFee += (priceNum > 0 ? priceNum * quantity : 0);
        });
      }

      // Doanh thu 1 ca khám = Tiền dịch vụ + Đơn giá thuốc
      const revenue = serviceFee + medicineFee;
      const parsed = parseDiagDate(d.date);

      return {
        ...d,
        serviceFee,
        medicineFee,
        revenue,
        parsedDay: parsed.day,
        parsedMonth: parsed.month,
        parsedYear: parsed.year,
        cleanDateStr: parsed.dateFormatted
      };
    });
  }, [diagnoses, medicines]);

  // Danh sách các năm thực tế có trong hệ thống
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(processedDiagnoses.map(d => d.parsedYear))).filter(Boolean);
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.push(currentYear);
    if (!years.includes(2026)) years.push(2026);
    return years.sort((a, b) => b - a);
  }, [processedDiagnoses]);

  // 1. Thống kê theo Tháng (12 tháng trong năm được chọn)
  // Doanh thu tháng = Tổng doanh thu các ngày trong tháng
  const monthlyData = useMemo(() => {
    return MONTH_PALETTES.map(p => {
      const m = p.month;
      const diagsInMonth = processedDiagnoses.filter(
        d => d.parsedYear === selectedYear && d.parsedMonth === m
      );

      const patientCount = diagsInMonth.length;
      const totalRevenue = diagsInMonth.reduce((sum, d) => sum + d.revenue, 0);
      const totalService = diagsInMonth.reduce((sum, d) => sum + d.serviceFee, 0);
      const totalMedicine = diagsInMonth.reduce((sum, d) => sum + d.medicineFee, 0);

      const avgServiceFee = patientCount > 0 ? Math.round(totalService / patientCount) : 0;
      const avgMedicinePrice = patientCount > 0 ? Math.round(totalMedicine / patientCount) : 0;

      return {
        month: m,
        monthLabel: `T${m}`,
        fullName: `Tháng ${m}`,
        patients: patientCount,
        serviceFee: totalService,
        medicineFee: totalMedicine,
        avgServiceFee,
        avgMedicinePrice,
        revenue: totalRevenue,
        palette: p,
        diagnoses: diagsInMonth
      };
    });
  }, [processedDiagnoses, selectedYear]);

  // 2. Thống kê theo Ngày (các ngày trong tháng được chọn)
  // Doanh thu ngày = Số bệnh nhân trong ngày × (Tiền dịch vụ + Đơn giá thuốc)
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return days.map(d => {
      const diagsOnDay = processedDiagnoses.filter(
        item => item.parsedYear === selectedYear && item.parsedMonth === selectedMonth && item.parsedDay === d
      );

      const patientCount = diagsOnDay.length;
      const totalRevenue = diagsOnDay.reduce((sum, item) => sum + item.revenue, 0);
      const totalService = diagsOnDay.reduce((sum, item) => sum + item.serviceFee, 0);
      const totalMedicine = diagsOnDay.reduce((sum, item) => sum + item.medicineFee, 0);

      // "Đơn giá thuốc" là tổng tiền thuốc của bệnh nhân trong ngày
      const medicinePrice = totalMedicine;

      // Thứ trong tuần
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      const dayOfWeekNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayOfWeek = dayOfWeekNames[dateObj.getDay()];

      return {
        day: d,
        dayLabel: `${String(d).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}`,
        fullDateStr: `${String(d).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`,
        dayOfWeek,
        patients: patientCount,
        serviceFee: totalService,
        medicinePrice,
        revenue: totalRevenue,
        diagnoses: diagsOnDay
      };
    });
  }, [processedDiagnoses, selectedYear, selectedMonth]);

  // 3. Thống kê theo Năm
  // Doanh thu năm = Tổng doanh thu các tháng trong năm
  const yearlyData = useMemo(() => {
    return availableYears.map(year => {
      const diagsInYear = processedDiagnoses.filter(d => d.parsedYear === year);
      const totalRevenue = diagsInYear.reduce((sum, d) => sum + d.revenue, 0);
      const totalPatients = diagsInYear.length;

      return {
        year,
        yearLabel: `Năm ${year}`,
        patients: totalPatients,
        revenue: totalRevenue,
        diagnoses: diagsInYear
      };
    });
  }, [processedDiagnoses, availableYears]);

  // Thống kê nhanh: Hôm nay
  const todayStats = useMemo(() => {
    const now = new Date();
    const curDay = now.getDate();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const diagsToday = processedDiagnoses.filter(
      d => d.parsedDay === curDay && d.parsedMonth === curMonth && d.parsedYear === curYear
    );
    const count = diagsToday.length;
    const rev = diagsToday.reduce((sum, d) => sum + d.revenue, 0);

    return {
      count,
      revenue: rev,
      dateFormatted: `${String(curDay).padStart(2, '0')}/${String(curMonth).padStart(2, '0')}/${curYear}`
    };
  }, [processedDiagnoses]);

  // Thống kê tháng đang chọn
  const currentMonthStats = useMemo(() => {
    return monthlyData.find(m => m.month === selectedMonth) || {
      month: selectedMonth,
      fullName: `Tháng ${selectedMonth}`,
      patients: 0,
      revenue: 0,
      diagnoses: []
    };
  }, [monthlyData, selectedMonth]);

  // Bảng màu của tháng đang chọn (đồng bộ chính xác với màu cột trong biểu đồ)
  const selectedMonthPalette = useMemo(() => {
    return MONTH_PALETTES.find(p => p.month === selectedMonth) || MONTH_PALETTES[0];
  }, [selectedMonth]);

  // Thống kê cả năm đang chọn
  const currentYearStats = useMemo(() => {
    const totalRev = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalPatients = monthlyData.reduce((sum, m) => sum + m.patients, 0);
    return {
      year: selectedYear,
      patients: totalPatients,
      revenue: totalRev
    };
  }, [monthlyData, selectedYear]);

  // Mốc tối đa trục Y của biểu đồ cột
  const maxMonthlyRevenue = useMemo(() => {
    const maxVal = Math.max(...monthlyData.map(d => d.revenue), 100000);
    const factor = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil((maxVal * 1.25) / factor) * factor;
  }, [monthlyData]);

  // Khi click vào một cột tháng trên biểu đồ
  const handleBarClick = (monthNumber: number) => {
    setSelectedMonth(monthNumber);
    if (detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Xuất file Excel (.XLSX) chuẩn định dạng và độ rộng cột, tránh lỗi hiển thị ######### trên Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: CHI TIẾT THÁNG ---
      const monthRows: any[][] = [
        [`BÁO CÁO CHI TIẾT DOANH THU THÁNG ${selectedMonth}/${selectedYear}`],
        [`Phòng Khám Nhi BS Nam – BS Phụng`],
        [`Công thức: Doanh thu ngày = Số BN × (Tiền dịch vụ + Đơn giá thuốc)`],
        [],
        ["Ngày Khám", "Thứ", "Số Ca Khám", "Đơn Giá Thuốc (Tổng tiền thuốc VND)", "Doanh Thu Ngày (VND)"]
      ];

      dailyData.forEach(d => {
        monthRows.push([
          d.fullDateStr,
          d.dayOfWeek,
          d.patients,
          d.medicinePrice,
          d.revenue
        ]);
      });

      const totalP = dailyData.reduce((s, d) => s + d.patients, 0);
      const totalM = dailyData.reduce((s, d) => s + d.medicinePrice, 0);
      const totalR = dailyData.reduce((s, d) => s + d.revenue, 0);

      monthRows.push([
        `TỔNG CỘNG THÁNG ${selectedMonth}/${selectedYear}`,
        "--",
        totalP,
        totalM,
        totalR
      ]);

      const wsMonth = XLSX.utils.aoa_to_sheet(monthRows);

      // Cài đặt độ rộng cột chuẩn để Excel hiển thị rõ chữ, không bị #########
      wsMonth["!cols"] = [
        { wch: 18 }, // Ngày Khám (18 ký tự: không bao giờ bị lỗi #########)
        { wch: 14 }, // Thứ
        { wch: 16 }, // Số Ca Khám
        { wch: 36 }, // Đơn Giá Thuốc (tổng tiền thuốc)
        { wch: 28 }, // Doanh Thu Ngày
      ];

      XLSX.utils.book_append_sheet(wb, wsMonth, `Tháng ${selectedMonth}-${selectedYear}`);

      // --- SHEET 2: TỔNG KẾT CẢ NĂM ---
      const yearRows: any[][] = [
        [`TỔNG KẾT DOANH THU CẢ NĂM ${selectedYear}`],
        [`Phòng Khám Nhi BS Nam – BS Phụng`],
        [],
        ["Tháng", "Số Ca Khám", "Doanh Thu Tháng (VND)"]
      ];

      monthlyData.forEach(m => {
        yearRows.push([
          m.fullName,
          m.patients,
          m.revenue
        ]);
      });

      const yrTotalP = monthlyData.reduce((s, m) => s + m.patients, 0);
      const yrTotalR = monthlyData.reduce((s, m) => s + m.revenue, 0);

      yearRows.push([
        "TỔNG CẢ NĂM",
        yrTotalP,
        yrTotalR
      ]);

      const wsYear = XLSX.utils.aoa_to_sheet(yearRows);
      wsYear["!cols"] = [
        { wch: 18 }, // Tháng
        { wch: 16 }, // Số Ca Khám
        { wch: 28 }, // Doanh Thu Tháng (VND)
      ];

      XLSX.utils.book_append_sheet(wb, wsYear, `Cả Năm ${selectedYear}`);

      // Tải trực tiếp file .xlsx về máy người dùng
      XLSX.writeFile(wb, `Doanh_Thu_Phong_Kham_Thang_${selectedMonth}_Nam_${selectedYear}.xlsx`);
    } catch (err) {
      console.error("Lỗi xuất file Excel:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 print:p-0 print:space-y-4">
      {/* Khung nội dung trang Tổng Kết - Ẩn khi đang in Đơn Thuốc */}
      <div className={`space-y-6 ${viewingPrescription ? "print:hidden" : ""}`}>

        {/* ======================= HEADER & CÔNG CỤ ======================= */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          {/* Background gradient nhẹ với tone #33CC99 */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#33CC99]/15 via-emerald-50/20 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#33CC99] to-[#249970] flex items-center justify-center text-white shadow-md shadow-[#33CC99]/25">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng Kết Doanh Thu</h2>
                <span className="bg-[#33CC99]/15 text-[#1a7053] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#33CC99]/30">
                  Phòng Khám
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-700">Công thức:</span>
                <code className="bg-slate-100 px-2 py-0.5 rounded text-[#1a7053] font-mono text-[11px] font-bold border border-slate-200">
                  Doanh thu ngày = Số BN × (Tiền dịch vụ + Đơn giá thuốc)
                </code>
              </p>
            </div>
          </div>

          {/* Nút tác vụ */}
          <div className="relative z-10 flex items-center gap-2.5 flex-wrap w-full md:w-auto print:hidden">

            {/* Nút Xuất Excel (.xlsx) */}
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#33CC99] hover:bg-[#28b082] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
              title="Tải bảng số liệu về máy (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>

            {/* Nút In báo cáo */}
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
              title="In trang báo cáo tổng kết"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* ======================= 3 THẺ KPI TỔNG QUAN ======================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Doanh thu hôm nay (Tông Xanh Dương) */}
          <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
            {/* Dải màu gradient trang trí trên đỉnh thẻ */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(to right, #2563eb, #38bdf8)" }}
            />

            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">
              <span>Doanh Thu Hôm Nay</span>
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100/80"><Calendar className="w-4 h-4" /></span>
            </div>
            <div className="text-2xl font-black text-slate-900 mb-1">
              {formatVND(todayStats.revenue)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Số bệnh nhân: <strong className="text-blue-900">{todayStats.count} ca</strong></span>
              <span className="text-blue-600 font-bold">{todayStats.dateFormatted}</span>
            </div>
          </div>

          {/* 2. Doanh thu tháng đang chọn (Đồng bộ màu chính xác theo cột trong Biểu đồ) */}
          <div
            className="bg-white p-5 rounded-2xl border shadow-xs hover:shadow-md transition-all relative overflow-hidden"
            style={{ borderColor: `${selectedMonthPalette.from}40` }}
          >
            {/* Dải màu gradient trang trí theo đúng màu cột tháng trong biểu đồ */}
            <div
              className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
              style={{ background: `linear-gradient(to right, ${selectedMonthPalette.from}, ${selectedMonthPalette.to})` }}
            />

            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">
              <span>Doanh Thu Tháng {selectedMonth}</span>
              <span
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: `${selectedMonthPalette.from}18`,
                  color: selectedMonthPalette.from
                }}
              >
                <Receipt className="w-4 h-4" />
              </span>
            </div>

            <div
              className="text-2xl font-black mb-1 transition-colors"
              style={{ color: selectedMonthPalette.from }}
            >
              {formatVND(currentMonthStats.revenue)}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Số bệnh nhân: <strong style={{ color: selectedMonthPalette.from }}>{currentMonthStats.patients} ca</strong>
              </span>
              <span
                className="font-bold transition-colors"
                style={{ color: selectedMonthPalette.from }}
              >
                Tháng {selectedMonth}/{selectedYear}
              </span>
            </div>
          </div>

          {/* 3. Doanh thu cả năm (Tông Xanh Lá Emerald) */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
            {/* Dải màu gradient trang trí trên đỉnh thẻ */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(to right, #059669, #34d399)" }}
            />

            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">
              <span>Doanh Thu Năm {selectedYear}</span>
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/80"><TrendingUp className="w-4 h-4" /></span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mb-1">
              {formatVND(currentYearStats.revenue)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Tổng cả năm: <strong className="text-emerald-900">{currentYearStats.patients} ca</strong></span>
              <span className="text-emerald-700 font-bold">12 Tháng</span>
            </div>
          </div>
        </div>

        {/* ======================= BỘ LỌC THỜI GIAN & KHU VỰC BIỂU ĐỒ ======================= */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-visible">

          {/* Mascot Gấu Trúc Hoạt Hình (Góc trên phải) */}
          <div className="absolute -top-7 right-4 sm:-top-9 sm:right-6 z-20 flex items-center gap-2 print:hidden">
            <div
              onClick={handlePandaClick}
              className="hidden sm:flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-2xl border-2 border-[#33CC99]/40 shadow-sm text-xs font-bold text-[#1a7053] cursor-pointer hover:border-[#33CC99] transition-all select-none"
              title="Click vào em để đổi lời chào cute nha! 🎋"
            >
              <span>{PANDA_MESSAGES[pandaMsgIndex]}</span>
            </div>

            <div
              onClick={handlePandaClick}
              className={`cursor-pointer select-none ${isPandaWiggling ? 'animate-bounce' : ''}`}
              title="Bé Panda chúc Bác sĩ khám vui vẻ!"
            >
              <div className="w-16 h-18 sm:w-20 sm:h-22 flex items-end justify-center filter drop-shadow-md hover:scale-105 transition-all">
                <img
                  src="/panda_cute.png"
                  alt="Panda"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* HEADER CỦA BIỂU ĐỒ */}
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-5 mb-5 border-b border-slate-100 pr-16 sm:pr-48">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#33CC99] inline-block"></span>
                  <span>Biểu Đồ Doanh Thu 12 Tháng Năm</span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="bg-[#33CC99]/10 text-[#1a7053] border border-[#33CC99]/30 rounded-lg px-2.5 py-0.5 font-bold text-base cursor-pointer focus:outline-none"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
                  (Click vào cột để xem chi tiết)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mỗi cột thể hiện tổng doanh thu của từng tháng trong năm {selectedYear}.
              </p>
            </div>
          </div>

          {/* KHUNG VẼ BIỂU ĐỒ SVG 12 THÁNG 12 MÀU THEO 4 MÙA */}
          <div className="relative w-full h-80 sm:h-92 select-none overflow-x-auto pb-4">
            <svg className="w-full h-full min-w-[700px]" viewBox="0 0 840 300">
              <defs>
                {/* Định nghĩa Gradients riêng cho từng tháng theo 4 mùa */}
                {MONTH_PALETTES.map(p => (
                  <linearGradient key={p.gradId} id={p.gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={p.to} />
                    <stop offset="100%" stopColor={p.from} />
                  </linearGradient>
                ))}
              </defs>

              {/* Đường lưới ngang */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = 250 - pct * 210;
                const val = maxMonthlyRevenue * pct;
                return (
                  <g key={i}>
                    <line x1="70" y1={y} x2="820" y2={y} stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1.2" />
                    <text x="60" y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600" fontFamily="monospace">
                      {formatVNDCompact(val)}
                    </text>
                  </g>
                );
              })}

              {/* Trục X và Trục Y chính */}
              <line x1="70" y1="250" x2="820" y2="250" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="70" y1="35" x2="70" y2="250" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

              {/* VẼ 12 CỘT CHO 12 THÁNG */}
              {(() => {
                const count = monthlyData.length;
                const usableWidth = 730;
                const colSlot = usableWidth / count;
                const barWidth = 38;

                return monthlyData.map((d, idx) => {
                  const center = 70 + idx * colSlot + colSlot / 2;
                  const x = center - barWidth / 2;
                  const h = maxMonthlyRevenue > 0 ? (d.revenue / maxMonthlyRevenue) * 210 : 0;
                  const y = 250 - h;
                  const isSelected = d.month === selectedMonth;

                  return (
                    <g
                      key={d.month}
                      className="cursor-pointer group transition-all"
                      onClick={() => handleBarClick(d.month)}
                      onMouseEnter={() => setHoveredMonth({ ...d, x: center, y: y > 0 ? y : 240 })}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Vùng cảm ứng click rộng quanh cột */}
                      <rect
                        x={center - colSlot / 2}
                        y="35"
                        width={colSlot}
                        height="215"
                        fill="transparent"
                        className="cursor-pointer"
                      />

                      {/* Hào quang nền khi cột được chọn mang sắc thái của mùa đó */}
                      {isSelected && (
                        <rect
                          x={center - colSlot / 2 + 3}
                          y="35"
                          width={colSlot - 6}
                          height="215"
                          fill={d.palette.from}
                          fillOpacity="0.14"
                          rx="10"
                        />
                      )}

                      {/* Thân Cột Biểu Đồ - Giữ nguyên màu mùa Xuân Hạ Thu Đông */}
                      {h > 0 ? (
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={h}
                          fill={`url(#${d.palette.gradId})`}
                          rx={barWidth / 5}
                          className={`transition-all duration-300 ${isSelected
                            ? "stroke-3 stroke-slate-900 brightness-110 shadow-lg"
                            : "group-hover:brightness-110"
                            }`}
                        />
                      ) : (
                        // Mốc xám thanh mảnh khi tháng chưa có doanh thu
                        <rect
                          x={x}
                          y="246"
                          width={barWidth}
                          height="4"
                          fill="#e2e8f0"
                          rx="2"
                          className={isSelected ? "stroke-2 stroke-slate-700" : ""}
                        />
                      )}

                      {/* Nhãn doanh thu trên đầu cột */}
                      {d.revenue > 0 && (
                        <text
                          x={center}
                          y={y - 8}
                          textAnchor="middle"
                          fontSize="10"
                          fill={isSelected ? d.palette.from : "#475569"}
                          fontWeight="800"
                        >
                          {formatVNDCompact(d.revenue)}
                        </text>
                      )}

                      {/* Chỉ báo tháng được chọn */}
                      {isSelected && (
                        <circle
                          cx={center}
                          cy="262"
                          r="3.5"
                          fill={d.palette.from}
                        />
                      )}

                      {/* Nhãn Tháng ở trục X */}
                      <text
                        x={center}
                        y="278"
                        textAnchor="middle"
                        fontSize="11"
                        fill={isSelected ? d.palette.from : "#64748b"}
                        fontWeight={isSelected ? "900" : "600"}
                        className="select-none"
                      >
                        {d.monthLabel}
                      </text>
                    </g>
                  );
                });
              })()}
            </svg>

            {/* Tooltip khi Hover trên Cột Tháng (Đảm bảo form đồng đều, không bị co dúm hay cắt chữ) */}
            {hoveredMonth && (
              <div
                className={`absolute pointer-events-none bg-slate-900 text-white px-4 py-3 rounded-2xl text-xs shadow-2xl border border-slate-700 -translate-y-full mb-3 z-30 transition-all duration-150 min-w-[290px] select-none ${hoveredMonth.month >= 10
                  ? "-translate-x-[85%]"
                  : hoveredMonth.month <= 2
                    ? "-translate-x-[15%]"
                    : "-translate-x-1/2"
                  }`}
                style={{
                  left: `${(hoveredMonth.x / 840) * 100}%`,
                  top: `${(hoveredMonth.y / 300) * 100}%`
                }}
              >
                <div className="font-bold border-b border-slate-700 pb-1.5 mb-2 flex items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${hoveredMonth.palette.bg}`}></span>
                    <span className="font-black text-white">{hoveredMonth.fullName} - Năm {selectedYear}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 shrink-0 whitespace-nowrap">
                    Click xem ngày
                  </span>
                </div>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between items-center gap-2 text-emerald-400 font-bold text-sm whitespace-nowrap">
                    <span className="text-xs text-slate-400 font-sans font-medium">Tổng Doanh Thu:</span>
                    <span className="font-mono">{formatVND(hoveredMonth.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2 text-slate-300 text-xs whitespace-nowrap">
                    <span className="text-slate-400 font-sans font-medium">Số ca khám:</span>
                    <span className="font-bold text-white font-mono">{hoveredMonth.patients} ca</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chú thích hướng dẫn */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#33CC99] flex-shrink-0" />
              <span>Click vào bất kỳ cột tháng nào trên biểu đồ để mở bảng chi tiết từng ngày của tháng đó.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Đang chọn:</span>
              <span
                className="font-bold px-2.5 py-0.5 rounded-md border text-xs transition-colors"
                style={{
                  backgroundColor: `${selectedMonthPalette.from}15`,
                  color: selectedMonthPalette.from,
                  borderColor: `${selectedMonthPalette.from}35`
                }}
              >
                Tháng {selectedMonth}/{selectedYear}
              </span>
            </div>
          </div>
        </div>

        {/* ======================= BẢNG CHI TIẾT THEO TỪNG NGÀY ======================= */}
        <div ref={detailSectionRef} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText
                  className="w-5 h-5 transition-colors"
                  style={{ color: selectedMonthPalette.from }}
                />
                <h3 className="text-lg font-bold text-slate-900">
                  Bảng Chi Tiết Doanh Thu Tháng {selectedMonth}/{selectedYear}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cột <strong>Đơn Giá Thuốc</strong> là tổng tiền thuốc của các bệnh nhân trong ngày.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <span className="text-slate-600">Tháng hiển thị:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold cursor-pointer focus:outline-none transition-colors"
                style={{ color: selectedMonthPalette.from }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}/{selectedYear}</option>
                ))}
              </select>
            </div>
          </div>

          {/* BẢNG DỮ LIỆU */}
          {/* BẢNG DỮ LIỆU */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-sm text-left border-collapse">
              {/* THEAD: TÁCH MÀU RIÊNG BIỆT CHO TỪNG CỘT & ĐỒNG BỘ CĂN GIỮA TẤT CẢ */}
              <thead className="text-xs font-black select-none font-sans">
                <tr>
                  {/* 1. Cột Ngày Khám: Tông VÀNG - Căn giữa */}
                  <th className="px-4 py-3.5 text-center bg-yellow-100 text-amber-950 border-b-2 border-yellow-400 font-black">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-800" />
                      <span>Ngày Khám</span>
                    </div>
                  </th>

                  {/* 2. Cột Số Bệnh Nhân: Tông XANH DƯƠNG - Căn giữa */}
                  <th className="px-4 py-3.5 text-center bg-blue-100 text-blue-950 border-b-2 border-blue-400 font-black">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-700" />
                      <span>Số Bệnh Nhân</span>
                    </div>
                  </th>

                  {/* 3. Cột Đơn Giá Thuốc: Tông màu #DE4D86 - Căn giữa */}
                  <th className="px-4 py-3.5 text-center bg-[#DE4D86]/20 text-[#831843] border-b-2 border-[#DE4D86] font-black">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <Pill className="w-4 h-4 text-[#DE4D86]" />
                      <span>Đơn Giá Thuốc</span>
                    </div>
                  </th>

                  {/* 4. Cột Doanh Thu Ngày: Tông XANH LÁ EMERALD - Căn giữa */}
                  <th className="px-4 py-3.5 text-center font-black bg-emerald-100 text-emerald-950 border-b-2 border-emerald-500">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                      <span>Doanh Thu Ngày</span>
                    </div>
                  </th>

                  {/* 5. Cột Thao Tác: Tông màu #6C7EE1 - Căn giữa */}
                  <th className="px-4 py-3.5 text-center w-36 print:hidden bg-[#6C7EE1]/20 text-[#1e2963] border-b-2 border-[#6C7EE1] font-black">
                    <div className="inline-flex items-center justify-center">
                      <span>Thao Tác</span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs font-sans">
                {dailyData.map((d) => {
                  const hasPatients = d.patients > 0;
                  return (
                    <tr
                      key={d.day}
                      className={`transition-colors ${hasPatients
                        ? "hover:bg-[#6C7EE1]/5 bg-white"
                        : "hover:bg-slate-50 bg-slate-50/30"
                        }`}
                    >
                      {/* 1. Ngày Khám (Màu Vàng - in đậm font-black - căn giữa) */}
                      <td className="px-4 py-3 font-sans text-center">
                        <div className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-black border shadow-xs transition-all ${hasPatients
                          ? "bg-yellow-300 text-amber-950 border-yellow-400 ring-2 ring-yellow-400/50 shadow-sm"
                          : "bg-yellow-100 text-amber-900 border-yellow-300"
                          }`}>
                          <Calendar className="w-4 h-4 text-amber-800 shrink-0" />
                          <span className="tracking-tight text-xs sm:text-sm font-black">{d.fullDateStr}</span>
                          <span className="text-xs text-amber-800 font-black">({d.dayOfWeek})</span>
                        </div>
                      </td>

                      {/* 2. Số Bệnh Nhân (Màu Xanh Dương - in đậm font-black - căn giữa) */}
                      <td className="px-4 py-3 text-center font-sans">
                        {hasPatients ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs">
                            {d.patients} ca
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black text-blue-900/80 bg-blue-50 border border-blue-200">
                            0 ca
                          </span>
                        )}
                      </td>

                      {/* 3. Đơn Giá Thuốc (Màu #DE4D86 - in đậm font-black - căn giữa) */}
                      <td className="px-4 py-3 text-center font-sans">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black border ${d.medicinePrice > 0
                          ? "text-[#831843] bg-[#DE4D86]/15 border-[#DE4D86]/40 shadow-2xs"
                          : "text-[#831843]/70 bg-[#DE4D86]/10 border-[#DE4D86]/25"
                          }`}>
                          {formatVND(d.medicinePrice)}
                        </span>
                      </td>

                      {/* 4. Doanh Thu Ngày (Màu Xanh Lá Emerald - in đậm font-black - căn giữa) */}
                      <td className="px-4 py-3 text-center font-sans">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black border ${d.revenue > 0
                          ? "text-emerald-950 bg-emerald-100 border-emerald-400 shadow-2xs"
                          : "text-emerald-900/80 bg-emerald-50 border-emerald-200 font-black"
                          }`}>
                          {formatVND(d.revenue)}
                        </span>
                      </td>

                      {/* 5. Thao Tác: Màu #6C7EE1 - Căn giữa */}
                      <td className="px-4 py-3 text-center font-sans print:hidden">
                        {hasPatients ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {d.diagnoses.length === 1 ? (
                              <button
                                onClick={() => handleOpenPatientDiagnosis(d.diagnoses[0])}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6C7EE1] hover:bg-[#5869CD] text-white rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer hover:scale-105"
                                title="Hiện thẳng vào Xem Chi Tiết ca khám của bệnh nhân này"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem chi tiết</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setViewingDayModal({ day: d.day, month: selectedMonth, year: selectedYear, diags: d.diagnoses })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#6C7EE1]/15 hover:bg-[#6C7EE1]/25 text-[#1e2963] rounded-lg text-xs font-black border border-[#6C7EE1]/40 transition-all cursor-pointer"
                                title={`Xem danh sách ${d.diagnoses.length} bệnh nhân trong ngày`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem chi tiết ({d.diagnoses.length})</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold text-[#6C7EE1]/70 bg-[#6C7EE1]/10 border border-[#6C7EE1]/25">
                            Không phát sinh
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* DÒNG TỔNG CỘNG FOOTER: ĐỒNG BỘ MÀU TƯƠNG ỨNG TỪNG CỘT & CĂN GIỮA */}
              <tfoot className="text-xs font-black border-t-2 border-slate-300 select-none font-sans">
                <tr>
                  <td className="px-4 py-3.5 font-sans text-center uppercase tracking-wider text-slate-900 bg-slate-100 font-black">
                    TỔNG CỘNG THÁNG {selectedMonth}/{selectedYear}:
                  </td>
                  <td className="px-4 py-3.5 text-center font-sans text-blue-950 font-black text-sm bg-blue-100/70 border-t border-blue-300">
                    {dailyData.reduce((s, d) => s + d.patients, 0)} ca
                  </td>
                  <td className="px-4 py-3.5 text-center font-black text-[#831843] bg-[#DE4D86]/20 border-t border-[#DE4D86]/40">
                    {formatVND(dailyData.reduce((s, d) => s + d.medicinePrice, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-center text-emerald-950 text-base font-black bg-emerald-100 border-t-2 border-emerald-500">
                    {formatVND(dailyData.reduce((s, d) => s + d.revenue, 0))}
                  </td>
                  <td className="px-4 py-3.5 print:hidden bg-[#6C7EE1]/15 border-t border-[#6C7EE1]/30"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ======================= MODAL XEM CHI TIẾT CA KHÁM NGÀY ======================= */}
        {viewingDayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <Eye className="w-5 h-5 text-[#33CC99]" />
                    <span>Chi Tiết Ca Khám:</span>
                    <span className="bg-yellow-300 text-amber-950 px-3 py-0.5 rounded-lg font-black border border-yellow-400 shadow-xs text-base">
                      Ngày {String(viewingDayModal.day).padStart(2, '0')}/{String(viewingDayModal.month).padStart(2, '0')}/{viewingDayModal.year}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Tổng cộng <strong>{viewingDayModal.diags.length} bệnh nhân</strong> đã khám trong ngày •
                  </p>
                </div>
                <button
                  onClick={() => setViewingDayModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {viewingDayModal.diags.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    Không có ca khám nào trong ngày này.
                  </div>
                ) : (
                  viewingDayModal.diags.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => handleOpenPatientDiagnosis(item)}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#33CC99] hover:shadow-md hover:bg-[#33CC99]/5 transition-all shadow-2xs space-y-3 cursor-pointer group"
                      title="Bấm vào để xem chi tiết Khám & Kê Toa của bệnh nhân này"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#33CC99]/15 text-[#1a7053] text-xs font-bold flex items-center justify-center group-hover:bg-[#33CC99] group-hover:text-white transition-colors">
                            {idx + 1}
                          </span>
                          <h5 className="font-bold text-slate-900 text-base group-hover:text-[#1a7053] transition-colors flex items-center gap-1.5">
                            <span>{item.patientName}</span>
                            <ArrowUpRight className="w-4 h-4 text-[#33CC99] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h5>
                          {item.patientId && (
                            <span className="text-[11px] bg-slate-100 text-slate-600 font-mono font-semibold px-2 py-0.5 rounded">
                              Mã: {item.patientId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">Doanh thu ca này</span>
                            <span className="text-base font-black text-emerald-600 font-mono">
                              {formatVND(item.revenue)}
                            </span>
                          </div>

                        </div>
                      </div>

                      <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                        <div>
                          <span className="text-slate-500">Bác sĩ khám:</span>{" "}
                          <strong className="text-slate-800">{item.doctorName || "BS. Võ Tấn Nam"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Chẩn đoán:</span>{" "}
                          <strong className="text-[#1a7053]">{item.diagnosis || "Chưa có chẩn đoán"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Tiền dịch vụ:</span>{" "}
                          <strong className="text-slate-800">{formatVND(item.serviceFee)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Tiền thuốc:</span>{" "}
                          <strong className="text-slate-800">{formatVND(item.medicineFee)}</strong>
                        </div>
                      </div>

                      {/* Danh sách thuốc đã kê */}
                      {Array.isArray(item.medicines) && item.medicines.length > 0 && item.medicines.some((m: any) => m.medicineName) && (
                        <div className="text-xs border-t border-slate-100 pt-2">
                          <span className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5 text-[#33CC99]" />
                            Toa thuốc đã kê:
                          </span>
                          <div className="space-y-1 pl-4">
                            {item.medicines.filter((m: any) => m.medicineName).map((med: any, mIdx: number) => {
                              const medPrice = getHistoricalMedicinePrice(med, item.date, medicines);
                              const qty = med.medicineQuantity || 1;
                              return (
                                <div key={mIdx} className="text-slate-600 flex justify-between items-center py-0.5">
                                  <span>• {med.medicineName}</span>
                                  <span className="font-mono text-slate-500 text-[11px]">
                                    {medPrice > 0 && <span className="text-slate-400 mr-1.5 font-normal">({formatVND(medPrice)}/đv)</span>}
                                    Số lượng: {qty} {med.medicineUnit || "viên"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <Link
                  href="/diagnosis"
                  className="text-xs font-semibold text-[#1a7053] hover:text-[#13533e] flex items-center gap-1"
                >
                  <span>Đến phần Khám & Kê toa</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setViewingDayModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================= MODAL XEM CHI TIẾT KHÁM & KÊ TOA (ĐƠN THUỐC) TRỰC TIẾP TRÊN TRANG TỔNG KẾT ======================= */}
      {viewingPrescription && (() => {
        const medList = getPrescriptionDetails(viewingPrescription);
        const medCount = medList.length;
        const denseClass = medCount >= 7 
          ? "dense-mode ultra-dense-mode" 
          : medCount >= 5 
            ? "dense-mode" 
            : medCount === 4 
              ? "standard-mode" 
              : "spacious-mode";

        return (
          <div className="prescription-modal-backdrop fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4" onClick={() => setViewingPrescription(null)}>
            <div ref={prescriptionModalRef} className="prescription-modal-container bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className={`prescription-sheet p-6 sm:p-8 bg-white text-slate-800 relative rounded-xl flex flex-col justify-between min-h-[640px] ${denseClass}`}>
                {/* Nút đóng */}
                <button
                  type="button"
                  onClick={() => setViewingPrescription(null)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors print:hidden cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header Đơn Thuốc */}
                <div className="prescription-header mb-5 sm:mb-6 mt-1 px-1">
                  <div className="text-left">
                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-800 mb-0.5">
                      PHÒNG KHÁM NHI BS NAM – BS PHỤNG
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-700">
                      SĐT: 0977.503.604
                    </p>
                  </div>
                  <div className="text-center mt-3 sm:mt-4">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-900">
                      ĐƠN THUỐC
                    </h2>
                  </div>
                </div>

                {/* Thông tin bệnh nhân & Chẩn đoán */}
                <div className="patient-section mb-6 sm:mb-7">
                  {(() => {
                    const pt = savedPatients.find((p: any) => viewingPrescription.patientId ? p.id === viewingPrescription.patientId : p.name === viewingPrescription.patientName) || {};
                    const ptCode = getPatientCode(viewingPrescription);
                    const displayPtCode = ptCode !== "-" ? ptCode : (viewingPrescription.patientId || (pt as any).id || "");
                    return (
                      <div className="patient-info-box space-y-3 mb-3 text-[14px] sm:text-[15px]">
                        <div className="flex gap-4 items-end">
                          <div className="flex gap-2 items-end flex-1 min-w-0">
                            <span className="font-bold whitespace-nowrap text-slate-800">Họ và tên:</span>
                            <span className="flex-1 min-w-0 border-b-2 border-dotted border-slate-300 px-2 font-bold uppercase text-slate-900">
                              <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.patientName}</span>
                            </span>
                          </div>
                          <div className="flex gap-2 items-end w-36 shrink-0">
                            <span className="font-bold whitespace-nowrap text-slate-800">Mã BN:</span>
                            <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-mono font-bold text-blue-700">
                              <span style={{ position: "relative", top: "3px" }}>{displayPtCode}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-4 items-end">
                          <div className="flex gap-2 items-end flex-1 min-w-0 whitespace-nowrap">
                            <span className="font-bold whitespace-nowrap text-slate-800">Ngày sinh:</span>
                            <span className="flex-1 min-w-0 border-b-2 border-dotted border-slate-300 px-2 whitespace-nowrap font-medium">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(pt as any).dob ? `${formatDisplayDate((pt as any).dob)} (${calculateAge((pt as any).dob)})` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-2 items-end w-36 shrink-0">
                            <span className="font-bold whitespace-nowrap text-slate-800">Giới tính:</span>
                            <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 text-center font-medium">
                              <span style={{ position: "relative", top: "3px" }}>{(pt as any).gender || ""}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-end gap-3 w-full">
                          <div className="flex-1 min-w-0 flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">Cân nặng:</span>
                            <span className="flex-1 min-w-[28px] border-b-2 border-dotted border-slate-300 px-1 text-center font-medium">
                              <span style={{ position: "relative", top: "3px" }}>
                                {viewingPrescription.weight || (pt as any).weight ? `${viewingPrescription.weight || (pt as any).weight} kg` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">Chiều cao:</span>
                            <span className="flex-1 min-w-[28px] border-b-2 border-dotted border-slate-300 px-1 text-center font-medium">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(pt as any).height ? `${(pt as any).height} cm` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">BMI:</span>
                            <span className="flex-1 min-w-[24px] border-b-2 border-dotted border-slate-300 px-1 text-center font-medium">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(() => {
                                  const curW = viewingPrescription.weight || (pt as any).weight;
                                  const curH = (pt as any).height;
                                  return curW && curH ? calculateBMI(curW, curH) : "";
                                })()}
                              </span>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">NĐ:</span>
                            <span className="flex-1 min-w-[24px] border-b-2 border-dotted border-slate-300 px-1 text-center font-medium">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(pt as any).temperature ? `${(pt as any).temperature} °C` : ""}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-baseline w-full min-w-0">
                          <span className="font-bold whitespace-nowrap text-slate-800 shrink-0">Địa chỉ:</span>
                          <span className="flex-1 min-w-0 border-b-2 border-dotted border-slate-300 px-2 break-all font-medium">
                            <span style={{ position: "relative", top: "3px", wordBreak: "break-word", overflowWrap: "anywhere" }}>{(pt as any).address || ""}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="diagnosis-box flex gap-2 items-baseline w-full min-w-0 mb-2.5 text-[14px] sm:text-[15px]">
                    <span className="font-bold whitespace-nowrap text-slate-800 shrink-0">Bệnh sử – Khám:</span>
                    <span className="flex-1 min-w-0 border-b-2 border-dotted border-slate-300 px-2 break-all font-medium">
                      <span style={{ position: "relative", top: "3px", wordBreak: "break-word", overflowWrap: "anywhere" }}>{viewingPrescription.medicalHistory || ""}</span>
                    </span>
                  </div>

                  <div className="diagnosis-box flex gap-2 items-baseline w-full min-w-0 text-[14px] sm:text-[15px]">
                    <span className="font-bold whitespace-nowrap text-slate-800 shrink-0">Chẩn đoán:</span>
                    <span className="flex-1 min-w-0 border-b-2 border-dotted border-slate-300 px-2 font-medium break-all">
                      <span style={{ position: "relative", top: "3px", wordBreak: "break-word", overflowWrap: "anywhere" }}>{viewingPrescription.diagnosis || ""}</span>
                    </span>
                  </div>
                </div>

                {/* Danh sách thuốc */}
                <div className="medicines-box mb-6 sm:mb-7">
                  <h3 className="font-black text-sm sm:text-base mb-3 uppercase tracking-wide text-slate-900">THUỐC ĐIỀU TRỊ:</h3>
                  <div className="medicines-list space-y-3 sm:space-y-3.5">
                    {medList.map((item: any, idx: number) => (
                      <div key={idx} className="prescription-item text-[14px] sm:text-[15px]">
                        <div className="med-title font-bold mb-1 text-slate-900">
                          {idx + 1}/ {item.name}
                        </div>
                        <div className="med-body pl-4 text-slate-800 space-y-1">
                          {item.notes && <div className="text-slate-600 italic text-xs mb-0.5">- Ghi chú: {item.notes}</div>}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                            <div className="flex items-baseline gap-1 shrink-0">
                              <span className="font-medium">- Số lượng:</span>
                              <span className="border-b-2 border-dotted border-slate-300 min-w-[44px] text-center font-bold px-1.5 text-slate-900">
                                <span style={{ position: "relative", top: "2px" }}>{item.quantity}</span>
                              </span>
                              <span className="font-medium">{item.unit}</span>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <span>Uống mỗi ngày {item.medTimes || "...."} lần, mỗi lần {item.medAmount || "...."} {item.medCustomUnit || item.unit || "viên"}, trong {item.medDays || "...."} ngày.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer đơn thuốc: Cột trái (Tái khám + Ghi chú) và Cột phải (Bác sĩ ký tên) */}
                <div className="prescription-footer flex justify-between items-start gap-4 mt-3 mb-1">
                  {/* Cột trái: Tái khám & Ghi chú */}
                  <div className="prescription-notes-col flex-1 min-w-0 text-left space-y-2">
                    {/* Dòng Tái khám */}
                    <div className="followup-box text-[13px] sm:text-[14px]">
                      <div className="flex gap-2 items-baseline w-full min-w-0">
                        <span className="font-bold whitespace-nowrap text-slate-800 shrink-0">Tái khám:</span>
                        <span className="flex-1 min-w-0 border-b border-dotted border-slate-300 px-2 text-slate-900 font-semibold break-all">
                          <span style={{ position: "relative", top: "1px", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                            {viewingPrescription.followUpDate || ""}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Ô Ghi chú riêng bên trái - không viền */}
                    <div className="notes-box">
                      <div className="font-bold text-slate-900 mb-1 text-xs sm:text-[13px]">Ghi chú:</div>
                      {(() => {
                        const rawNotes = viewingPrescription.notes ? viewingPrescription.notes.trim() : "";
                        const noteLines = rawNotes
                          ? rawNotes.split("\n").map((l: string) => l.trim()).filter(Boolean)
                          : [];

                        if (noteLines.length > 0) {
                          const hasExplicitBullets = noteLines.some((l: string) => /^[-•*]/.test(l));
                          return (
                            <div className="space-y-0.5 text-slate-800 font-medium">
                              {noteLines.map((line: string, idx: number) => {
                                const isBullet = /^[-•*]\s*/.test(line);
                                if (hasExplicitBullets) {
                                  if (isBullet) {
                                    return (
                                      <div key={idx} className="flex items-baseline gap-1.5 pl-1 leading-snug">
                                        <span className="font-bold text-slate-700 shrink-0">-</span>
                                        <span className="break-all" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                          {line.replace(/^[-•*]\s*/, "")}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} className="leading-snug break-all text-slate-800" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                      {line}
                                    </div>
                                  );
                                }

                                return (
                                  <div key={idx} className="flex items-baseline gap-1.5 leading-snug">
                                    <span className="font-bold text-slate-700 shrink-0">-</span>
                                    <span className="break-all" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>
                                      {line}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div className="min-h-[30px]">
                            {/* Để trống nếu không có ghi chú */}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Bác sĩ khám bệnh & Ký tên bên phải */}
                  <div className="text-center min-w-[200px] shrink-0">
                    <p className="text-xs italic text-slate-600 mb-1">
                      {(() => {
                        const formatted = formatDateDisplay(viewingPrescription.date);
                        const parts = formatted ? formatted.split(" ")[0].split("-") : null;
                        if (parts && parts.length === 3) {
                          return `Ngày ${parts[0]} Tháng ${parts[1]} năm ${parts[2]}`;
                        }
                        return formatted ? `Ngày khám: ${formatted}` : "Ngày .... Tháng .... năm 20...";
                      })()}
                    </p>
                    <p className="font-bold uppercase text-slate-800 text-xs sm:text-[13px] tracking-wide mb-0.5">
                      BÁC SĨ KHÁM BỆNH
                    </p>
                    <p className="text-[11px] italic text-slate-500">
                      (Ký, ghi rõ họ tên)
                    </p>
                    <div className="signature-gap h-12 min-h-[40px] flex items-end justify-center">
                      {/* Khoảng trống để ký tên */}
                    </div>
                    <p className="font-bold text-slate-900 text-sm">
                      {viewingPrescription.doctorName || "BS. Võ Tấn Nam"}
                    </p>
                  </div>
                </div>

                {/* Các nút hành động */}
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200 print:hidden">
                  <button
                    type="button"
                    onClick={() => setViewingPrescription(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors border border-slate-300 text-sm cursor-pointer"
                  >
                    {viewingDayModal ? "← Quay lại danh sách ngày" : "Đóng"}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrintPrescription}
                      className="px-6 py-2 bg-[#33CC99] text-white rounded-lg font-medium hover:bg-[#28b082] transition-colors shadow-sm flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>In Đơn Thuốc</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
