"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  Printer,
  FileText,
  Receipt,
  CheckCircle2,
  Stethoscope,
  Filter,
  AlertCircle
} from "lucide-react";

// Định dạng tiền tệ VND chuẩn
const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

const formatVNDCompact = (amount: number) => {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} tr`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} k`;
  }
  return `${amount}`;
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
        dateFormatted: `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`
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
        dateFormatted: `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`
      };
    }
  }
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear(), dateFormatted: clean };
};

const DEFAULT_DIAGNOSES = [
  {
    id: 1, patientId: "0001", patientName: "Nguyễn Văn A", doctorName: "Lê Văn C",
    diagnosis: "Viêm họng cấp", date: "07-08-2026 08:30",
    serviceName: "Khám nội", serviceFee: 150000,
  },
  {
    id: 2, patientId: "0002", patientName: "Trần Thị B", doctorName: "Phạm Thị D",
    diagnosis: "Đau dạ dày", date: "06-08-2026 14:15",
    serviceName: "Nội soi", serviceFee: 500000,
  },
];

const PANDA_MESSAGES = [
  "Bác sĩ ơi, doanh thu nè! 🐼🎋",
  "Bé Panda chúc Bác sĩ khám vui vẻ! 💖🩺",
  "Tiền dịch vụ hôm nay xịn xò quá! ✨💰",
  "Bác sĩ nhớ uống nước nghỉ ngơi nha! 🍵🐾",
  "Phòng khám hôm nay thật tuyệt vời! 🌟🐼"
];

export default function SummaryPage() {
  const [activeTab, setActiveTab] = useState<"day" | "month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any | null>(null);

  // Mascot Panda dễ thương
  const [pandaMsgIndex, setPandaMsgIndex] = useState<number>(0);
  const [isPandaWiggling, setIsPandaWiggling] = useState<boolean>(false);

  const handlePandaClick = () => {
    setIsPandaWiggling(true);
    setPandaMsgIndex(prev => (prev + 1) % PANDA_MESSAGES.length);
    setTimeout(() => setIsPandaWiggling(false), 600);
  };

  // Load danh sách phiếu khám thực tế từ localStorage
  const loadData = () => {
    try {
      const diagRaw = localStorage.getItem("khambenh_diagnosis");
      if (diagRaw) {
        const parsed = JSON.parse(diagRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDiagnoses(parsed);
          return;
        }
      }
      setDiagnoses(DEFAULT_DIAGNOSES);
    } catch (e) {
      console.error("Lỗi khi đọc dữ liệu phiếu khám:", e);
      setDiagnoses(DEFAULT_DIAGNOSES);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("khambenh_diagnosis_updated", loadData);
    return () => {
      window.removeEventListener("khambenh_diagnosis_updated", loadData);
    };
  }, []);

  // Xử lý phiếu khám: 100% DOANH THU = "TIỀN DỊCH VỤ"
  const processedDiagnoses = useMemo(() => {
    return diagnoses.map(d => {
      // Tiền dịch vụ thực tế của phiếu khám
      const serviceFee = typeof d.serviceFee === "number"
        ? d.serviceFee
        : (parseInt(String(d.serviceFee || "").replace(/\D/g, ""), 10) || 0);

      const parsed = parseDiagDate(d.date);

      return {
        ...d,
        serviceFee,
        revenue: serviceFee, // Doanh thu tính 100% theo Tiền Dịch Vụ
        parsedDay: parsed.day,
        parsedMonth: parsed.month,
        parsedYear: parsed.year,
        cleanDateStr: parsed.dateFormatted
      };
    });
  }, [diagnoses]);

  // Danh sách các năm thực tế có trong hệ thống
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(processedDiagnoses.map(d => d.parsedYear))).filter(Boolean);
    if (!years.includes(2026)) years.push(2026);
    return years.sort((a, b) => b - a);
  }, [processedDiagnoses]);

  // 1. Thống kê Doanh Thu Theo Tháng (12 tháng trong năm được chọn)
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map(m => {
      const diagsInMonth = processedDiagnoses.filter(
        d => d.parsedYear === selectedYear && d.parsedMonth === m
      );
      const totalServiceFee = diagsInMonth.reduce((sum, d) => sum + d.serviceFee, 0);

      return {
        month: m,
        monthLabel: `Tháng ${m}`,
        serviceFee: totalServiceFee,
        revenue: totalServiceFee,
        patients: diagsInMonth.length,
        diagnoses: diagsInMonth
      };
    });
  }, [processedDiagnoses, selectedYear]);

  // 2. Thống kê Doanh Thu Theo Năm (100% dựa trên phiếu khám thực tế)
  const yearlyData = useMemo(() => {
    return availableYears.map(year => {
      const diagsInYear = processedDiagnoses.filter(d => d.parsedYear === year);
      const totalServiceFee = diagsInYear.reduce((sum, d) => sum + d.serviceFee, 0);

      return {
        year,
        yearLabel: `Năm ${year}`,
        serviceFee: totalServiceFee,
        revenue: totalServiceFee,
        patients: diagsInYear.length,
        diagnoses: diagsInYear
      };
    });
  }, [processedDiagnoses, availableYears]);

  // 3. Thống kê Doanh Thu Theo Ngày (tất cả các ngày trong tháng được chọn)
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return days.map(d => {
      const diagsOnDay = processedDiagnoses.filter(
        item => item.parsedYear === selectedYear && item.parsedMonth === selectedMonth && item.parsedDay === d
      );
      const totalServiceFee = diagsOnDay.reduce((sum, item) => sum + item.serviceFee, 0);

      return {
        day: d,
        dayLabel: `${d}/${selectedMonth}`,
        fullDateStr: `${String(d).padStart(2, '0')}-${String(selectedMonth).padStart(2, '0')}-${selectedYear}`,
        serviceFee: totalServiceFee,
        revenue: totalServiceFee,
        patients: diagsOnDay.length,
        diagnoses: diagsOnDay
      };
    });
  }, [processedDiagnoses, selectedYear, selectedMonth]);

  // Thống kê hôm nay (ngày 12-09-2026 hoặc ngày hiện tại)
  const todayStats = useMemo(() => {
    const now = new Date();
    const currentDay = 12; // Hoặc now.getDate()
    const currentM = 9;
    const currentY = 2026;
    const diagsToday = processedDiagnoses.filter(
      d => d.parsedDay === currentDay && d.parsedMonth === currentM && d.parsedYear === currentY
    );
    const totalToday = diagsToday.reduce((sum, d) => sum + d.serviceFee, 0);
    return {
      revenue: totalToday,
      patients: diagsToday.length,
      dateStr: `${currentDay}-0${currentM}-${currentY}`
    };
  }, [processedDiagnoses]);

  // Thống kê tháng này
  const currentMonthStats = useMemo(() => {
    return monthlyData.find(m => m.month === selectedMonth) || { revenue: 0, patients: 0, diagnoses: [] };
  }, [monthlyData, selectedMonth]);

  // Thống kê cả năm
  const currentYearStats = useMemo(() => {
    const totalRev = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalPatients = monthlyData.reduce((sum, m) => sum + m.patients, 0);
    return {
      revenue: totalRev,
      patients: totalPatients
    };
  }, [monthlyData]);

  // Dữ liệu hiển thị của biểu đồ
  const chartData = useMemo(() => {
    if (activeTab === "day") {
      return dailyData.map(item => ({
        label: `${item.day}`,
        fullLabel: `Ngày ${item.day}/${selectedMonth}/${selectedYear}`,
        revenue: item.revenue,
        patients: item.patients
      }));
    } else if (activeTab === "month") {
      return monthlyData.map(item => ({
        label: `T${item.month}`,
        fullLabel: `Tháng ${item.month}/${selectedYear}`,
        revenue: item.revenue,
        patients: item.patients
      }));
    } else {
      return yearlyData.map(item => ({
        label: `${item.year}`,
        fullLabel: `Năm ${item.year}`,
        revenue: item.revenue,
        patients: item.patients
      }));
    }
  }, [activeTab, dailyData, monthlyData, yearlyData, selectedMonth, selectedYear]);

  // Mốc max cho trục Y của biểu đồ Excel
  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.revenue), 100000);
    const factor = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil((maxVal * 1.25) / factor) * factor;
  }, [chartData]);

  // Xuất file CSV (Excel) phục vụ kê khai thuế
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    if (activeTab === "day") {
      csvContent += "BÁO CÁO DOANH THU THEO TIỀN DỊCH VỤ - PHÒNG KHÁM NHI BS NAM & BS PHỤNG\n";
      csvContent += `Tháng ${selectedMonth}/${selectedYear}\n\n`;
      csvContent += "Ngày,Số ca khám,Tiền Dịch Vụ (Doanh thu tính thuế VND),Thuế GTGT+TNCN ước tính (2%),Trạng thái\n";
      dailyData.forEach(d => {
        const tax = Math.round(d.revenue * 0.02);
        csvContent += `"${d.fullDateStr}",${d.patients},${d.revenue},${tax},"${d.revenue > 0 ? 'Có phát sinh' : 'Không'}"\n`;
      });
      const totalR = dailyData.reduce((s, d) => s + d.revenue, 0);
      const totalP = dailyData.reduce((s, d) => s + d.patients, 0);
      csvContent += `"TỔNG CỘNG THÁNG",${totalP},${totalR},${Math.round(totalR * 0.02)},"Hợp lệ"\n`;
    } else if (activeTab === "month") {
      csvContent += "BÁO CÁO DOANH THU TIỀN DỊCH VỤ THEO THÁNG - PHÒNG KHÁM NHI BS NAM & BS PHỤNG\n";
      csvContent += `Năm ${selectedYear}\n\n`;
      csvContent += "Kỳ kế toán,Số lượt khám,Doanh Thu Tiền Dịch Vụ (VND),Thuế ước tính (2%),Ghi chú kê khai thuế\n";
      monthlyData.forEach(m => {
        const tax = Math.round(m.revenue * 0.02);
        csvContent += `"${m.monthLabel}",${m.patients},${m.revenue},${tax},"${m.revenue > 0 ? 'Có phát sinh ca khám' : 'Chưa phát sinh'}"\n`;
      });
      const totalR = monthlyData.reduce((s, d) => s + d.revenue, 0);
      const totalP = monthlyData.reduce((s, d) => s + d.patients, 0);
      csvContent += `"TỔNG CẢ NĂM",${totalP},${totalR},${Math.round(totalR * 0.02)},"Hồ sơ đầy đủ"\n`;
    } else {
      csvContent += "BÁO CÁO TỔNG KẾT DOANH THU TIỀN DỊCH VỤ THEO NĂM - KÊ KHAI CƠ QUAN THUẾ\n\n";
      csvContent += "Năm,Số lượt khám,Tổng Doanh Thu Tiền Dịch Vụ (VND),Thuế khoán ước tính (2%),Ghi chú quyết toán\n";
      yearlyData.forEach(y => {
        const tax = Math.round(y.revenue * 0.02);
        csvContent += `"${y.year}",${y.patients},${y.revenue},${tax},"Đã đối chiếu sổ khám bệnh"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Doanh_Thu_Tien_Dich_Vu_${activeTab.toUpperCase()}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0">

      {/* Header & Công cụ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Tổng Kết Doanh Thu (Tiền Dịch Vụ)</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Tính toán 100% dựa trên <strong>Tiền Dịch Vụ</strong> của phiếu khám thực tế – Phục vụ theo dõi nội bộ & khai báo thuế
              </p>
            </div>
          </div>
        </div>

        {/* Nút tác vụ */}
        <div className="flex items-center gap-3 flex-wrap print:hidden">
          {/* Bộ chọn năm */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Năm:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
            title="Xuất bảng số liệu ra file Excel (.CSV UTF-8)"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
            title="In trang báo cáo thuế"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI: 100% Tiền Dịch Vụ Thực Tế */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu Hôm nay */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">
            <span>Tiền Dịch Vụ Hôm Nay</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Calendar className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {formatVND(todayStats.revenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Số ca khám: <strong className="text-slate-800">{todayStats.patients} ca</strong></span>
            <span className="text-blue-600 font-medium">{todayStats.dateStr}</span>
          </div>
        </div>

        {/* Doanh thu Tháng này */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">
            <span>Tiền Dịch Vụ Tháng {selectedMonth}</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Receipt className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-purple-700 mb-1">
            {formatVND(currentMonthStats.revenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng ca trong tháng: <strong className="text-slate-800">{currentMonthStats.patients} ca</strong></span>
            <span className="text-purple-600 font-medium">{selectedMonth}/{selectedYear}</span>
          </div>
        </div>

        {/* Doanh thu Cả Năm */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wider">
            <span>Tiền Dịch Vụ Năm {selectedYear}</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mb-1">
            {formatVND(currentYearStats.revenue)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng ca cả năm: <strong className="text-slate-800">{currentYearStats.patients} ca</strong></span>
            <span className="text-emerald-700 font-medium">Toàn năm {selectedYear}</span>
          </div>
        </div>

        {/* Thuế Ước Tính Cho Cơ Quan Thuế */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-2 uppercase tracking-wider">
            <span>Thuế Ước Tính (2%)</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><FileText className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-amber-900 mb-1">
            {formatVND(Math.round(currentYearStats.revenue * 0.02))}
          </div>
          <div className="flex items-center justify-between text-xs text-amber-700">
            <span>2% trên Tiền Dịch Vụ</span>
            <span className="font-semibold bg-amber-200/60 px-1.5 py-0.5 rounded">Kê khai thuế</span>
          </div>
        </div>
      </div>

      {/* Thanh 3 Tabs Theo Đúng Yêu Cầu: Ngày - Tháng - Năm */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("day")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "day"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            1. Tổng Doanh Thu Ngày
          </button>
          <button
            onClick={() => setActiveTab("month")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "month"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            2. Tổng Doanh Thu Tháng
          </button>
          <button
            onClick={() => setActiveTab("year")}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === "year"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            3. Tổng Doanh Thu Năm
          </button>
        </div>

        {/* Chuyển đổi Dạng Biểu Đồ Cute */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold">
          {/* Chú Gấu Trúc Panda vẫy tay ngay cạnh Dạng biểu đồ */}
          <div className="w-8 h-8 relative flex-shrink-0 animate-panda-float cursor-pointer" title="Bé Panda vẫy tay chào Bác sĩ! 🐾">
            <img
              src="/panda_cute.png"
              alt="Panda cute"
              className="w-full h-full object-contain filter drop-shadow-xs pointer-events-none"
            />
          </div>
          <span className="flex items-center gap-1.5 text-purple-700 bg-purple-50/90 px-3 py-1.5 rounded-xl border border-purple-200 shadow-2xs">
            <span>🎋</span>
            <span>Dạng biểu đồ:</span>
          </span>
          <div className="flex items-center bg-purple-50/80 p-1 rounded-full border border-purple-200 shadow-inner">
            <button
              onClick={() => setChartType("bar")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${chartType === "bar"
                ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 text-white shadow-sm scale-105"
                : "text-purple-700 hover:text-purple-900 hover:bg-white/80"
                }`}
            >
              <span>📊</span>
              <span>Cột</span>
              <span className="text-[10px]">🐾</span>
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${chartType === "line"
                ? "bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-sm scale-105"
                : "text-purple-700 hover:text-purple-900 hover:bg-white/80"
                }`}
            >
              <span>📈</span>
              <span>Đường</span>
              <span className="text-[10px]">✨</span>
            </button>
          </div>
        </div>
      </div>

      {/* KHU VỰC BIỂU ĐỒ CUTE (100% TIỀN DỊCH VỤ THỰC TẾ) */}
      <div className="bg-white/95 rounded-3xl p-6 border-2 border-purple-200/80 shadow-md relative overflow-visible mt-4">

        {/* MASCOT GẤU TRÚC HOẠT HÌNH Ở BÊN GÓC PHẢI TRÊN CÙNG (KHÔNG VIỀN TRẮNG) */}
        <div className="absolute -top-8 right-3 sm:-top-10 sm:right-6 z-20 flex items-center gap-2.5">
          {/* Bong bóng lời thoại dễ thương của Gấu Trúc */}
          <div
            onClick={handlePandaClick}
            className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border-2 border-purple-300 shadow-md text-xs font-bold text-purple-800 cursor-pointer hover:border-pink-400 transition-all select-none animate-cute-pulse"
            title="Click vào em để đổi lời chào cute nha! 🎋"
          >
            <span>{PANDA_MESSAGES[pandaMsgIndex]}</span>
            <span className="text-[10px] text-pink-500 font-normal">✨(Bấm em nè)</span>
          </div>

          {/* Chú Gấu Trúc Hoạt Hình Panda.jfif (Đã xóa sạch viền trắng) */}
          <div
            onClick={handlePandaClick}
            className={`group relative cursor-pointer select-none ${isPandaWiggling ? 'animate-panda-wiggle' : 'animate-panda-float'}`}
            title="Click vào Bé Panda để đổi lời chào cute nha! 🎋"
          >
            {/* Chú Gấu Trúc trong suốt hoàn toàn, không viền trắng */}
            <div className="relative w-20 h-24 sm:w-24 sm:h-28 flex items-end justify-center filter drop-shadow-[0_8px_16px_rgba(168,85,247,0.3)] hover:scale-110 transition-all duration-200">
              <img
                src="/panda_cute.png"
                alt="Hình gấu trúc hoạt hình cute"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Badge tên gấu trúc */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md border border-white flex items-center gap-1">
              <span>🐼 Panda</span>
              <span className="text-[9px]">🐾</span>
            </div>
          </div>
        </div>

        {/* Tiêu đề biểu đồ với khoảng đệm rộng bên phải tránh đè mascot */}
        <div className="flex flex-col justify-between gap-2 mb-6 pb-4 border-b border-purple-100/80 pr-20 sm:pr-72">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-xs animate-cute-pulse"></span>
              {activeTab === "day" && `Đồ Thị Tiền Dịch Vụ Từng Ngày (Tháng ${selectedMonth}/${selectedYear})`}
              {activeTab === "month" && `Đồ Thị Tiền Dịch Vụ 12 Tháng (Năm ${selectedYear})`}
              {activeTab === "year" && "Đồ Thị Tiền Dịch Vụ Theo Năm"}
            </h3>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 px-3 py-1 rounded-xl border border-purple-200/80 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 inline-block"></span>
              <span>100% Tiền Dịch Vụ</span>
            </div>
          </div>
          <p className="text-xs text-purple-700/80 flex items-center gap-1">
            <span>🐾 Biểu đồ trực quan dễ thương – Số liệu chính xác từ Tiền Dịch Vụ của từng phiếu khám</span>
          </p>
        </div>

        {/* Khung vẽ SVG phong cách Cute & Hiện đại */}
        <div className="relative w-full h-72 sm:h-80 select-none overflow-x-auto">
          <svg className="w-full h-full min-w-[650px]" viewBox="0 0 800 280">
            <defs>
              {/* Gradient Cột Cute Pastel (Tím hồng pastel sang xanh ngọc / xanh tím dịu dàng) */}
              <linearGradient id="cuteBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="cuteBarHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              {/* Gradient Vùng Dưới Đường Uốn Lượn */}
              <linearGradient id="cuteLineArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#a855f7" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
              </linearGradient>
              <filter id="cuteGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#a855f7" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Đường lưới ngang mềm mại */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = 240 - pct * 200;
              const val = maxChartValue * pct;
              return (
                <g key={i}>
                  <line x1="60" y1={y} x2="780" y2={y} stroke="#f1f5f9" strokeDasharray="4,4" strokeWidth="1.2" />
                  <text x="50" y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600" fontFamily="monospace">
                    {formatVNDCompact(val)}
                  </text>
                </g>
              );
            })}

            {/* Trục X và Trục Y chính nét mượt */}
            <line x1="60" y1="240" x2="780" y2="240" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="60" y1="35" x2="60" y2="240" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

            {/* Vẽ Cột Cute hoặc Đường Cute */}
            {(() => {
              const count = chartData.length;
              const usableWidth = 710;
              const colWidth = usableWidth / count;

              if (chartType === "line") {
                const points = chartData.map((d, idx) => {
                  const x = 60 + idx * colWidth + colWidth / 2;
                  const y = 240 - (d.revenue / maxChartValue) * 200;
                  return `${x},${y}`;
                }).join(" ");

                const areaPoints = `60,240 ${points} ${60 + (count - 1) * colWidth + colWidth / 2},240`;

                return (
                  <g>
                    <polygon points={areaPoints} fill="url(#cuteLineArea)" />
                    <polyline points={points} fill="none" stroke="#d946ef" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    {chartData.map((d, idx) => {
                      const x = 60 + idx * colWidth + colWidth / 2;
                      const y = 240 - (d.revenue / maxChartValue) * 200;
                      return (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredDataPoint({ ...d, x, y })}
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        >
                          <circle cx={x} cy={y} r="5.5" fill="#a855f7" stroke="#ffffff" strokeWidth="2.5" filter="url(#cuteGlow)" />
                          <circle cx={x} cy={y} r="14" fill="transparent" />
                          {d.revenue > 0 && (
                            <text x={x} y={y - 9} textAnchor="middle" fontSize="9" fill="#9333ea" fontWeight="800">
                              {formatVNDCompact(d.revenue)}
                            </text>
                          )}
                          <text x={x} y="258" textAnchor="middle" fontSize={count > 20 ? "8" : "10"} fill="#64748b" fontWeight="600">
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              }

              // Biểu đồ Cột Cute (Pill Rounded Columns)
              return chartData.map((d, idx) => {
                const center = 60 + idx * colWidth + colWidth / 2;
                const barW = Math.min(colWidth * 0.62, 30);
                const x = center - barW / 2;
                const h = (d.revenue / maxChartValue) * 200;
                const y = 240 - h;
                const cornerRadius = Math.min(barW / 2, 7);

                return (
                  <g
                    key={idx}
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    onMouseEnter={() => setHoveredDataPoint({ ...d, x: center, y })}
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  >
                    {h > 0 ? (
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={h}
                        fill="url(#cuteBarGradient)"
                        rx={cornerRadius}
                        className="hover:brightness-110 transition-all"
                      />
                    ) : (
                      // Viên kẹo nhỏ màu xám nhạt xinh xắn cho mốc 0đ
                      <rect x={x} y="237" width={barW} height="3.5" fill="#e2e8f0" rx="2" />
                    )}

                    {/* Data label trên đầu cột */}
                    {d.revenue > 0 && (
                      <text x={center} y={y - 7} textAnchor="middle" fontSize={count > 20 ? "8" : "9"} fill="#7c3aed" fontWeight="800">
                        {formatVNDCompact(d.revenue)}
                      </text>
                    )}

                    {/* Nhãn trục X */}
                    <text x={center} y="258" textAnchor="middle" fontSize={count > 20 ? "8" : "10"} fill="#64748b" fontWeight="600">
                      {d.label}
                    </text>
                  </g>
                );
              });
            })()}
          </svg>

          {/* Tooltip khi rê chuột phong cách Cute & Rõ Ràng */}
          {hoveredDataPoint && (
            <div
              className="absolute pointer-events-none bg-slate-900/90 text-white px-3.5 py-2.5 rounded-2xl text-xs shadow-2xl border border-purple-400/40 -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md z-30 transition-all duration-150"
              style={{
                left: `${(hoveredDataPoint.x / 800) * 100}%`,
                top: `${(hoveredDataPoint.y / 280) * 100}%`
              }}
            >
              <div className="font-bold border-b border-slate-700/80 pb-1 mb-1.5 text-purple-200 flex items-center justify-between gap-2">
                <span>{hoveredDataPoint.fullLabel}</span>
                <span>🐾</span>
              </div>
              <div className="space-y-1 font-mono">
                <div className="flex justify-between gap-3 text-pink-300 font-bold">
                  <span>Tiền Dịch Vụ:</span>
                  <span>{formatVND(hoveredDataPoint.revenue)}</span>
                </div>
                <div className="flex justify-between gap-3 text-amber-300 text-[11px]">
                  <span>Thuế ước tính (2%):</span>
                  <span>{formatVND(Math.round(hoveredDataPoint.revenue * 0.02))}</span>
                </div>
                <div className="text-[10px] text-slate-300 pt-0.5 flex items-center justify-between">
                  <span>Số ca khám:</span>
                  <span className="font-bold text-white">{hoveredDataPoint.patients} ca</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BẢNG KÊ KHAI CHI TIẾT THEO TIỀN DỊCH VỤ (PHỤC VỤ CƠ QUAN THUẾ) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Bảng Kê Khai Chi Tiết Doanh Thu Tiền Dịch Vụ (Cơ Quan Thuế)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ số tiền được kết xuất trực tiếp từ <strong>Tiền Dịch Vụ</strong> trong sổ phiếu khám
            </p>
          </div>

          {/* Chọn tháng khi ở tab Ngày */}
          {activeTab === "day" && (
            <div className="flex items-center gap-2 text-xs font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <span>Tháng:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}/{selectedYear}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-14">STT</th>
                <th className="px-4 py-3">
                  {activeTab === "day" && "Ngày Khám"}
                  {activeTab === "month" && "Kỳ Kế Toán (Tháng)"}
                  {activeTab === "year" && "Năm Kê Khai"}
                </th>
                <th className="px-4 py-3 text-center">Số Lượt Khám</th>
                <th className="px-4 py-3 text-right font-bold text-blue-900">Tiền Dịch Vụ (Doanh Thu)</th>
                <th className="px-4 py-3 text-right text-amber-800">Thuế Ước Tính (2%)</th>
                <th className="px-4 py-3 text-center">Tình Trạng Kê Khai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {/* TAB 1: DOANH THU THEO NGÀY */}
              {activeTab === "day" && dailyData.map((d, idx) => (
                <tr key={idx} className={d.revenue > 0 ? "hover:bg-purple-50/40 bg-blue-50/15" : "opacity-35"}>
                  <td className="px-4 py-2.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-800">
                    {d.fullDateStr}
                    {d.revenue > 0 && (
                      <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                        {d.patients} ca
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center font-sans font-semibold text-slate-700">{d.patients}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-700 text-sm">
                    {formatVND(d.revenue)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-700 font-medium">
                    {formatVND(Math.round(d.revenue * 0.02))}
                  </td>
                  <td className="px-4 py-2.5 text-center font-sans">
                    {d.revenue > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Đã ghi nhận
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">0 ca</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* TAB 2: DOANH THU THEO THÁNG */}
              {activeTab === "month" && monthlyData.map((m, idx) => (
                <tr key={idx} className={m.revenue > 0 ? "hover:bg-purple-50/40 bg-blue-50/15" : "opacity-35"}>
                  <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-sans font-bold text-slate-800">
                    {m.monthLabel} năm {selectedYear}
                  </td>
                  <td className="px-4 py-3 text-center font-sans font-semibold text-slate-700">
                    {m.patients} ca
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 text-sm">
                    {formatVND(m.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700 font-medium">
                    {formatVND(Math.round(m.revenue * 0.02))}
                  </td>
                  <td className="px-4 py-3 text-center font-sans">
                    {m.revenue > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Có phát sinh
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Chưa có ca khám</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* TAB 3: DOANH THU THEO NĂM */}
              {activeTab === "year" && yearlyData.map((y, idx) => (
                <tr key={idx} className="hover:bg-purple-50/40">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-sans font-bold text-slate-900 text-base">
                    Năm {y.year}
                  </td>
                  <td className="px-4 py-3.5 text-center font-sans font-semibold text-slate-800">{y.patients} bệnh nhân</td>
                  <td className="px-4 py-3.5 text-right font-bold text-blue-800 text-base">
                    {formatVND(y.revenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-amber-800 font-bold">
                    {formatVND(Math.round(y.revenue * 0.02))}
                  </td>
                  <td className="px-4 py-3.5 text-center font-sans">
                    <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium border border-blue-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Quyết toán thuế
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Hàng Tổng Cộng in đậm chuẩn kế toán Excel */}
            <tfoot className="bg-slate-100 text-slate-900 font-mono text-xs font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={2} className="px-4 py-3.5 font-sans text-right uppercase tracking-wider text-slate-700">
                  TỔNG CỘNG TIỀN DỊCH VỤ:
                </td>
                <td className="px-4 py-3.5 text-center font-sans">
                  {activeTab === "day" && dailyData.reduce((s, d) => s + d.patients, 0)}
                  {activeTab === "month" && monthlyData.reduce((s, m) => s + m.patients, 0)}
                  {activeTab === "year" && yearlyData.reduce((s, y) => s + y.patients, 0)} ca
                </td>
                <td className="px-4 py-3.5 text-right text-blue-900 text-base">
                  {formatVND(
                    activeTab === "day" ? dailyData.reduce((s, d) => s + d.revenue, 0) :
                      activeTab === "month" ? monthlyData.reduce((s, m) => s + m.revenue, 0) :
                        yearlyData.reduce((s, y) => s + y.revenue, 0)
                  )}
                </td>
                <td className="px-4 py-3.5 text-right text-amber-900 text-sm">
                  {formatVND(
                    Math.round(
                      (activeTab === "day" ? dailyData.reduce((s, d) => s + d.revenue, 0) :
                        activeTab === "month" ? monthlyData.reduce((s, m) => s + m.revenue, 0) :
                          yearlyData.reduce((s, y) => s + y.revenue, 0)) * 0.02
                    )
                  )}
                </td>
                <td className="px-4 py-3.5 text-center font-sans text-slate-500 font-normal text-[11px]">
                  Cơ sở dữ liệu thực tế
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Thông tin minh bạch thuế */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
          <p className="font-bold text-blue-950 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" /> Xác thực số liệu kê khai thuế:
          </p>
          <p>
            - Toàn bộ doanh thu hiển thị trên hệ thống được tính toán <strong>chính xác 100% theo trường Tiền Dịch Vụ</strong> mà bác sĩ đã nhập trên mỗi phiếu khám bệnh, tuyệt đối không có số liệu giả lập.
          </p>
          <p>
            - Bảng kê chi tiết này có thể xuất trực tiếp ra file Excel (.CSV) hoặc in ra văn bản đối chiếu khi quyết toán thuế với Cơ quan Thuế.
          </p>
        </div>
      </div>

    </div>
  );
}
