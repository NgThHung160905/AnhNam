"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Printer,
  Edit2,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  Sprout,
  Leaf,
  Trees,
  Phone,
  MapPin,
  Calendar,
  User,
  Heart,
  Flower2,
  Scale,
} from "lucide-react";
import { PatientSummaryInfo, MedicalVisit } from "@/types/patient-summary";
import {
  getPatientMedicalSummary,
  savePatientMedicalVisits,
  formatExaminationDate,
  formatPatientCode,
} from "@/lib/medicalSummaryService";
import { formatDisplayDate, calculateAge, formatInputDate } from "@/components/DatePicker";

interface PatientMedicalSummaryModalProps {
  patientId: string;
  patientData?: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PatientMedicalSummaryModal({
  patientId,
  patientData,
  isOpen,
  onClose,
}: PatientMedicalSummaryModalProps) {
  const [patient, setPatient] = useState<PatientSummaryInfo | null>(null);
  const [visits, setVisits] = useState<MedicalVisit[]>([]);

  // State quản lý chỉnh sửa/thêm lần khám
  const [editingVisit, setEditingVisit] = useState<MedicalVisit | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<{
    examinationDate: string;
    diagnosis: string;
    medicalHistory: string;
    medications: string;
    note: string;
  }>({
    examinationDate: "",
    diagnosis: "",
    medicalHistory: "",
    medications: "",
    note: "",
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isOpen && patientId) {
      const loadSummary = () => {
        const summary = getPatientMedicalSummary(patientId, patientData);
        setPatient(summary.patient);
        setVisits(summary.visits);
      };

      loadSummary();
      setEditingVisit(null);
      setIsAddingNew(false);
      setSuccessMessage("");

      window.addEventListener("khambenh_summary_updated", loadSummary);
      window.addEventListener("khambenh_diagnosis_updated", loadSummary);
      return () => {
        window.removeEventListener("khambenh_summary_updated", loadSummary);
        window.removeEventListener("khambenh_diagnosis_updated", loadSummary);
      };
    }
  }, [isOpen, patientId, patientData]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingVisit || isAddingNew) {
          setEditingVisit(null);
          setIsAddingNew(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, editingVisit, isAddingNew]);

  if (!isOpen) return null;

  // Xác định giới tính để phân loại màu sắc: Nam -> Xanh lá cây, Nữ -> Màu hồng
  const isFemale =
    patient?.gender?.toLowerCase().trim() === "nữ" ||
    patient?.gender?.toLowerCase().trim() === "nu" ||
    patient?.gender?.toLowerCase().trim() === "female";

  // Cấu hình theme động theo giới tính
  const theme = isFemale
    ? {
        modalBorder: "border-pink-300",
        bgGradient: "from-pink-50/95 via-white to-rose-50/80",
        headerGradient: "from-pink-600 via-rose-500 to-pink-500",
        headerIconBg: "bg-white/20 border-white/30 text-pink-100",
        badgeBg: "bg-pink-800/60 text-pink-100 border-pink-300/40",
        infoCardBorder: "border-pink-200",
        infoCardIconBg: "bg-pink-100 text-pink-700",
        infoCardBadge: "bg-pink-100 text-pink-800 border-pink-200",
        primaryText: "text-pink-950",
        subHeaderText: "text-pink-900",
        secondaryText: "text-pink-700/80",
        phoneText: "text-pink-700",
        iconColor: "text-pink-600",
        ageBadge: "bg-pink-50 text-pink-700 border-pink-200",
        tableBorder: "border-pink-300",
        tableHeader: "bg-linear-to-r from-pink-100 via-rose-100 to-fuchsia-100 text-pink-950 border-pink-300",
        tableRowBorder: "border-pink-100",
        tableHover: "hover:bg-pink-50/70",
        dateBadge: "bg-pink-50 text-pink-900 border-pink-200",
        noteBadge: "bg-pink-100/90 text-pink-950 border-pink-200",
        btnPrimary: "bg-pink-600 hover:bg-pink-700 text-white shadow-pink-600/30",
        btnAction: "text-pink-700 hover:text-pink-900 hover:bg-pink-100",
        footerBg: "bg-pink-50/80 border-pink-200 text-pink-700",
        footerBtn: "bg-pink-600 hover:bg-pink-700",
        editModalBorder: "border-pink-300",
        editModalHeader: "from-pink-600 to-rose-600",
        inputFocus: "focus:ring-pink-500",
        toastBg: "bg-pink-100/90 text-pink-900 border-pink-300",
      }
    : {
        modalBorder: "border-emerald-300",
        bgGradient: "from-emerald-50/95 via-white to-green-50/80",
        headerGradient: "from-emerald-600 via-emerald-500 to-green-600",
        headerIconBg: "bg-white/20 border-white/30 text-emerald-100",
        badgeBg: "bg-emerald-800/60 text-emerald-100 border-emerald-300/40",
        infoCardBorder: "border-emerald-200",
        infoCardIconBg: "bg-emerald-100 text-emerald-700",
        infoCardBadge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        primaryText: "text-emerald-950",
        subHeaderText: "text-emerald-900",
        secondaryText: "text-emerald-700/80",
        phoneText: "text-emerald-800",
        iconColor: "text-emerald-600",
        ageBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        tableBorder: "border-emerald-300",
        tableHeader: "bg-linear-to-r from-emerald-100 via-green-100 to-teal-100 text-emerald-950 border-emerald-300",
        tableRowBorder: "border-emerald-100",
        tableHover: "hover:bg-emerald-50/70",
        dateBadge: "bg-emerald-50 text-emerald-900 border-emerald-200",
        noteBadge: "bg-emerald-100/80 text-emerald-900 border-emerald-200",
        btnPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30",
        btnAction: "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100",
        footerBg: "bg-emerald-50/80 border-emerald-200 text-emerald-700",
        footerBtn: "bg-emerald-600 hover:bg-emerald-700",
        editModalBorder: "border-emerald-300",
        editModalHeader: "from-emerald-600 to-green-600",
        inputFocus: "focus:ring-emerald-500",
        toastBg: "bg-emerald-100/90 text-emerald-800 border-emerald-300",
      };

  const formattedDob = (dobStr: string) => {
    if (!dobStr) return "—";
    const formatted = formatDisplayDate(dobStr);
    return formatted || dobStr;
  };

  const handlePrint = () => {
    window.print();
  };

  const displayPatientCode = formatPatientCode(patient?.id);
  const ageString = patient?.dob ? calculateAge(patient.dob) : "";

  // Mở popup sửa
  const handleOpenEdit = (visit: MedicalVisit) => {
    setEditingVisit(visit);
    setIsAddingNew(false);
    setEditForm({
      examinationDate: visit.examinationDate || "",
      diagnosis: visit.diagnosis || "",
      medicalHistory: visit.medicalHistory === "—" ? "" : visit.medicalHistory || "",
      medications: visit.medications === "—" ? "" : visit.medications || "",
      note: visit.note || "",
    });
    setFormError("");
  };

  // Mở popup thêm mới
  const handleOpenAdd = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const todayFormatted = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear().toString().slice(2)}`;

    setEditingVisit(null);
    setIsAddingNew(true);
    setEditForm({
      examinationDate: todayFormatted,
      diagnosis: "",
      medicalHistory: "",
      medications: "",
      note: "",
    });
    setFormError("");
  };

  // Lưu chỉnh sửa hoặc thêm mới
  const handleSaveVisit = () => {
    if (!editForm.examinationDate.trim()) {
      setFormError("Vui lòng nhập Ngày khám bệnh!");
      return;
    }
    if (!editForm.diagnosis.trim()) {
      setFormError("Vui lòng nhập Chẩn đoán!");
      return;
    }

    let updatedVisits: MedicalVisit[] = [];

    if (editingVisit) {
      updatedVisits = visits.map((v) =>
        v.id === editingVisit.id
          ? {
              ...v,
              examinationDate: formatExaminationDate(editForm.examinationDate),
              diagnosis: editForm.diagnosis.trim(),
              medicalHistory: editForm.medicalHistory.trim() || "—",
              medications: editForm.medications.trim() || "—",
              note: editForm.note.trim(),
            }
          : v
      );
    } else {
      const newVisit: MedicalVisit = {
        id: `custom-v-${Date.now()}`,
        patientId: patientId,
        examinationDate: formatExaminationDate(editForm.examinationDate),
        diagnosis: editForm.diagnosis.trim(),
        medicalHistory: editForm.medicalHistory.trim() || "—",
        medications: editForm.medications.trim() || "—",
        note: editForm.note.trim(),
      };
      updatedVisits = [newVisit, ...visits];
    }

    setVisits(updatedVisits);
    savePatientMedicalVisits(patientId, updatedVisits);

    setEditingVisit(null);
    setIsAddingNew(false);
    setFormError("");
    setSuccessMessage("Đã lưu lịch sử khám bệnh thành công!");
    setTimeout(() => setSuccessMessage(""), 2500);
  };

  // Xóa lần khám
  const handleDeleteVisit = (visitId: string | number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lần khám này khỏi tóm tắt?")) {
      const updatedVisits = visits.filter((v) => v.id !== visitId);
      setVisits(updatedVisits);
      savePatientMedicalVisits(patientId, updatedVisits);
      setSuccessMessage("Đã xóa lần khám!");
      setTimeout(() => setSuccessMessage(""), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container chính - Tone màu động theo giới tính (Nam: Xanh lá, Nữ: Hồng) */}
      <div
        className={`relative bg-linear-to-b ${theme.bgGradient} rounded-2xl shadow-2xl border-2 ${theme.modalBorder} w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* BACKGROUND CÂY HOẠT HÌNH (CARTOON TREES CHUYỂN MÀU THEO GIỚI TÍNH) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          {/* Cụm cây hoạt hình góc dưới bên phải */}
          <svg
            className="absolute bottom-0 right-0 w-80 sm:w-96 h-60 opacity-35"
            viewBox="0 0 320 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Đồi cỏ mềm mại */}
            <path
              d="M0 220 C80 180 180 200 320 170 L320 220 Z"
              fill={isFemale ? "#fbcfe8" : "#86efac"}
            />
            <path
              d="M60 220 C140 185 240 180 320 150 L320 220 Z"
              fill={isFemale ? "#f472b6" : "#4ade80"}
              opacity="0.6"
            />

            {/* Cây hoạt hình to tròn (Nữ: Cây anh đào sakura hồng, Nam: Cây táo xanh lá) */}
            <rect x="215" y="115" width="16" height="65" rx="5" fill="#854d0e" />
            <circle cx="223" cy="90" r="46" fill={isFemale ? "#db2777" : "#15803d"} />
            <circle cx="203" cy="85" r="36" fill={isFemale ? "#e11d48" : "#16a34a"} />
            <circle cx="240" cy="85" r="34" fill={isFemale ? "#f43f5e" : "#22c55e"} />
            <circle cx="223" cy="55" r="32" fill={isFemale ? "#fb7185" : "#4ade80"} />

            {/* Quả đỏ/hoa vàng trang trí trên cây */}
            <circle cx="205" cy="75" r="4.5" fill={isFemale ? "#ffffff" : "#ef4444"} />
            <circle cx="238" cy="70" r="4" fill={isFemale ? "#fde047" : "#facc15"} />
            <circle cx="223" cy="45" r="4" fill={isFemale ? "#ffffff" : "#ef4444"} />
            <circle cx="212" cy="100" r="3.5" fill={isFemale ? "#fda4af" : "#facc15"} />

            {/* Cây thông hoạt hình */}
            <rect x="155" y="130" width="14" height="55" rx="4" fill="#713f12" />
            <path d="M162 60 L130 105 L194 105 Z" fill={isFemale ? "#be185d" : "#166534"} />
            <path d="M162 85 L125 130 L199 130 Z" fill={isFemale ? "#e11d48" : "#15803d"} />
            <path d="M162 110 L118 155 L206 155 Z" fill={isFemale ? "#fb7185" : "#22c55e"} />

            {/* Bụi cây tròn có hoa nhỏ */}
            <ellipse cx="90" cy="185" rx="36" ry="22" fill={isFemale ? "#f472b6" : "#22c55e"} />
            <ellipse cx="65" cy="190" rx="26" ry="18" fill={isFemale ? "#fb7185" : "#16a34a"} />
            <circle cx="95" cy="178" r="3.5" fill={isFemale ? "#ffffff" : "#f43f5e"} />
            <circle cx="75" cy="182" r="3.5" fill="#fbbf24" />
            <circle cx="108" cy="186" r="3" fill={isFemale ? "#fde047" : "#ec4899"} />

            {/* Lá/cánh hoa hoạt hình bay lơ lửng */}
            <path
              d="M70 90 C85 80 90 95 70 100 C70 95 70 90 70 90 Z"
              fill={isFemale ? "#f43f5e" : "#22c55e"}
              opacity="0.8"
            />
            <path
              d="M125 45 C135 40 140 50 125 55 C125 50 125 45 125 45 Z"
              fill={isFemale ? "#fb7185" : "#4ade80"}
              opacity="0.8"
            />
            <path
              d="M280 65 C290 60 295 70 280 75 C280 70 280 65 280 65 Z"
              fill={isFemale ? "#fda4af" : "#15803d"}
              opacity="0.7"
            />
          </svg>

          {/* Cụm cây hoạt hình góc dưới bên trái */}
          <svg
            className="absolute bottom-0 left-0 w-64 h-48 opacity-25"
            viewBox="0 0 240 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 180 C80 140 160 170 240 145 L240 180 Z"
              fill={isFemale ? "#fce7f3" : "#bbf7d0"}
            />
            <rect x="55" y="95" width="12" height="50" rx="4" fill="#854d0e" />
            <circle cx="61" cy="75" r="38" fill={isFemale ? "#f43f5e" : "#16a34a"} />
            <circle cx="45" cy="70" r="30" fill={isFemale ? "#fb7185" : "#22c55e"} />
            <circle cx="75" cy="70" r="28" fill={isFemale ? "#fda4af" : "#4ade80"} />
            <circle cx="61" cy="48" r="26" fill={isFemale ? "#fbcfe8" : "#86efac"} />
            <ellipse cx="120" cy="155" rx="30" ry="18" fill={isFemale ? "#f472b6" : "#22c55e"} />
            <circle cx="125" cy="148" r="3" fill="#ffffff" />
          </svg>
        </div>

        {/* HEADER THEME THEO GIỚI TÍNH */}
        <div className={`relative z-10 bg-linear-to-r ${theme.headerGradient} px-6 py-4 text-white flex items-center justify-between shadow-md`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${theme.headerIconBg} flex items-center justify-center backdrop-blur-xs shadow-inner`}>
              {isFemale ? <Flower2 className="w-6 h-6" /> : <Trees className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-xs flex items-center gap-1.5">
                  Tóm Tắt Quá Trình Khám Bệnh
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${theme.badgeBg} text-xs font-semibold`}>
                  {isFemale ? <Heart className="w-3 h-3 text-pink-200 fill-pink-200" /> : <Leaf className="w-3 h-3 text-emerald-300" />}
                  Mã: {formatPatientCode(patient?.id || displayPatientCode)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 flex items-center gap-1 mt-0.5">
                <span>Hồ sơ diễn biến và lịch sử khám bệnh của bệnh nhân ({isFemale ? "Nữ" : "Nam"})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-colors border border-white/30 cursor-pointer shadow-xs"
              title="In tóm tắt bệnh án"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In hồ sơ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/25 rounded-lg transition-colors cursor-pointer"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH (TRONG SUỐT NHẸ ĐỂ LỘ HỌA TIẾT CÂY HOẠT HÌNH) */}
        <div className="relative z-10 p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Thông báo cập nhật */}
          {successMessage && (
            <div className={`flex items-center gap-2 p-3 ${theme.toastBg} rounded-xl text-xs font-semibold animate-in fade-in shadow-xs`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. THÔNG TIN BỆNH NHÂN */}
          <div className={`bg-white/90 backdrop-blur-xs border-2 ${theme.infoCardBorder} rounded-xl p-4 sm:p-5 shadow-xs`}>
            <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${theme.infoCardIconBg} flex items-center justify-center`}>
                  <User className="w-4 h-4" />
                </div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.subHeaderText}`}>
                  Thông Tin Hành Chính Bệnh Nhân
                </h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md ${theme.infoCardBadge} font-bold text-xs`}>
                Mã số BN: {formatPatientCode(patient?.id || displayPatientCode)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              <div className="space-y-0.5 col-span-2 sm:col-span-2 lg:col-span-2 min-w-0">
                <span className={`text-xs ${theme.secondaryText} font-medium block`}>Họ và tên:</span>
                <span className={`font-bold ${theme.primaryText} text-base block truncate`}>
                  {patient?.name || "—"}
                </span>
              </div>

              <div className="space-y-0.5 col-span-1 sm:col-span-1 lg:col-span-1 min-w-0">
                <span className={`text-xs ${theme.secondaryText} font-medium block`}>Giới tính:</span>
                <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isFemale ? "bg-pink-500" : "bg-emerald-500"
                    }`}
                  />
                  {patient?.gender || (isFemale ? "Nữ" : "Nam")}
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 sm:col-span-2 lg:col-span-2 min-w-0">
                <span className={`text-xs ${theme.secondaryText} font-medium block`}>Ngày sinh (tuổi):</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-slate-800 whitespace-nowrap">
                    {patient?.dob ? formattedDob(patient.dob) : "—"}
                  </span>
                  {ageString ? (
                    <span className={`font-bold text-xs px-1.5 py-0.5 rounded border ${theme.ageBadge} whitespace-nowrap`}>
                      ({ageString})
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-0.5 col-span-1 sm:col-span-1 lg:col-span-1 min-w-0">
                <span className={`text-xs ${theme.secondaryText} font-medium block flex items-center gap-1`}>
                  <Scale className={`w-3 h-3 ${theme.iconColor}`} /> Cân nặng:
                </span>
                <span className={`font-bold ${theme.primaryText} block`}>
                  {patient?.weight && String(patient.weight).trim() ? (
                    <span>
                      {String(patient.weight).toLowerCase().includes("kg")
                        ? patient.weight
                        : `${patient.weight} kg`}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-xs">Chưa cập nhật</span>
                  )}
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 sm:col-span-2 lg:col-span-2 min-w-0">
                <span className={`text-xs ${theme.secondaryText} font-medium block flex items-center gap-1`}>
                  <Phone className={`w-3 h-3 ${theme.iconColor}`} /> Số điện thoại:
                </span>
                <span className={`font-bold ${theme.phoneText} block`}>
                  {patient?.phone && patient.phone.trim() ? (
                    patient.phone
                  ) : (
                    <span className="text-slate-400 font-normal italic text-xs">Chưa cập nhật</span>
                  )}
                </span>
              </div>

              {/* Địa chỉ luôn hiển thị đầy đủ */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-4 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-start gap-1 min-w-0">
                <span className={`text-xs ${theme.secondaryText} sm:w-20 shrink-0 font-medium flex items-center gap-1`}>
                  <MapPin className={`w-3 h-3 ${theme.iconColor}`} /> Địa chỉ:
                </span>
                <span className="font-medium text-slate-800 break-words leading-relaxed flex-1">
                  {patient?.address && patient.address.trim() ? (
                    patient.address
                  ) : (
                    <span className="text-slate-400 font-normal italic text-xs">Chưa cập nhật</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 2. BẢNG TÓM TẮT QUÁ TRÌNH KHÁM BỆNH */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md ${theme.infoCardIconBg} flex items-center justify-center`}>
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.subHeaderText}`}>
                  Lịch Sử Quá Trình Khám Bệnh ({visits.length} lần khám)
                </h3>
              </div>
              <button
                onClick={handleOpenAdd}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${theme.btnPrimary} rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer print:hidden`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm lần khám</span>
              </button>
            </div>

            {/* Bảng hồ sơ khám nổi bật */}
            <div className={`rounded-xl border-2 ${theme.tableBorder} shadow-xs overflow-hidden bg-white/95 backdrop-blur-xs`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px] text-sm">
                  <thead>
                    <tr className={`${theme.tableHeader} border-b-2 text-xs uppercase tracking-wider font-bold`}>
                      <th className="px-3.5 py-3 border-r border-slate-200/80 w-[115px] text-center">
                        Ngày khám bệnh
                      </th>
                      <th className="px-3.5 py-3 border-r border-slate-200/80 w-[170px]">
                        Chẩn đoán
                      </th>
                      <th className="px-3.5 py-3 border-r border-slate-200/80 min-w-[190px]">
                        Bệnh sử – Khám
                      </th>
                      <th className="px-3.5 py-3 border-r border-slate-200/80 min-w-[210px]">
                        Thuốc đã dùng
                      </th>
                      <th className="px-3.5 py-3 border-r border-slate-200/80 min-w-[160px]">
                        Ghi chú
                      </th>
                      <th className="px-2 py-3 w-[70px] text-center print:hidden">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme.tableRowBorder}`}>
                    {visits.length > 0 ? (
                      visits.map((visit, index) => (
                        <tr
                          key={visit.id || index}
                          className={`${theme.tableHover} transition-colors group`}
                        >
                          {/* Cột 1: Ngày khám bệnh */}
                          <td className="px-3.5 py-3 border-r border-slate-200/60 text-center font-bold whitespace-nowrap align-top">
                            <span className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-semibold border ${theme.dateBadge}`}>
                              {visit.examinationDate}
                            </span>
                          </td>

                          {/* Cột 2: Chẩn đoán */}
                          <td className="px-3.5 py-3 border-r border-slate-200/60 font-semibold text-slate-900 align-top break-words">
                            {visit.diagnosis || "—"}
                          </td>

                          {/* Cột 3: Bệnh sử – Khám */}
                          <td className="px-3.5 py-3 border-r border-slate-200/60 text-slate-800 align-top break-words whitespace-pre-line leading-relaxed">
                            {visit.medicalHistory || "—"}
                          </td>

                          {/* Cột 4: Thuốc đã dùng */}
                          <td className="px-3.5 py-3 border-r border-slate-200/60 text-slate-800 align-top break-words leading-relaxed font-medium">
                            {visit.medications || "—"}
                          </td>

                          {/* Cột 5: Ghi chú */}
                          <td className="px-3.5 py-3 border-r border-slate-200/60 text-slate-700 align-top break-words leading-relaxed">
                            {visit.note ? (
                              <span className={`px-2 py-0.5 rounded text-xs border inline-block font-medium ${theme.noteBadge}`}>
                                {visit.note}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">—</span>
                            )}
                          </td>

                          {/* Cột 6: Thao tác */}
                          <td className="px-2 py-3 text-center align-top whitespace-nowrap print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(visit)}
                                className={`p-1 ${theme.btnAction} rounded transition-colors cursor-pointer`}
                                title="Chỉnh sửa lần khám"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteVisit(visit.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Xóa lần khám"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                          {isFemale ? <Flower2 className="w-6 h-6 mx-auto mb-1.5 text-pink-400" /> : <Sprout className="w-6 h-6 mx-auto mb-1.5 text-emerald-400" />}
                          Chưa có lịch sử khám bệnh cho bệnh nhân này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`relative z-10 ${theme.footerBg} px-6 py-3 flex items-center justify-between print:hidden`}>
          <span className="text-xs font-medium flex items-center gap-1">
            {isFemale ? <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" /> : <Leaf className="w-3.5 h-3.5 text-emerald-600" />}
            Hồ sơ tóm tắt được tự động lưu trữ và đồng bộ
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 ${theme.footerBtn} text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs`}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* MODAL POPUP CHỈNH SỬA / THÊM MỚI LẦN KHÁM (THEME THEO GIỚI TÍNH) */}
      {(editingVisit || isAddingNew) && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => {
            setEditingVisit(null);
            setIsAddingNew(false);
          }}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl border-2 ${theme.editModalBorder} w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`bg-linear-to-r ${theme.editModalHeader} text-white px-5 py-3.5 flex items-center justify-between`}>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                {isFemale ? <Flower2 className="w-4 h-4 text-pink-200" /> : <Sprout className="w-4 h-4 text-emerald-200" />}
                {editingVisit ? "Chỉnh Sửa Lần Khám" : "Thêm Lần Khám Mới"}
              </h3>
              <button
                onClick={() => {
                  setEditingVisit(null);
                  setIsAddingNew(false);
                }}
                className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className={`block font-semibold ${theme.subHeaderText} mb-1`}>
                  Ngày khám bệnh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.examinationDate}
                  onChange={(e) => {
                    const formatted = formatInputDate(e.target.value, editForm.examinationDate);
                    setEditForm({ ...editForm, examinationDate: formatted });
                  }}
                  maxLength={10}
                  className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} text-slate-900 bg-white`}
                  placeholder="DD-MM-YYYY (Ví dụ: 01-09-2026)"
                />
              </div>

              <div>
                <label className={`block font-semibold ${theme.subHeaderText} mb-1`}>
                  Chẩn đoán <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.diagnosis}
                  onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} text-slate-900 bg-white`}
                  placeholder="Ví dụ: Viêm họng"
                />
              </div>

              <div>
                <label className={`block font-semibold ${theme.subHeaderText} mb-1`}>Bệnh sử – Khám</label>
                <textarea
                  rows={2}
                  value={editForm.medicalHistory}
                  onChange={(e) => setEditForm({ ...editForm, medicalHistory: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} text-slate-900 bg-white resize-none`}
                  placeholder="Ví dụ: Sốt 3 ngày, ho"
                />
              </div>

              <div>
                <label className={`block font-semibold ${theme.subHeaderText} mb-1`}>Thuốc đã dùng</label>
                <textarea
                  rows={2}
                  value={editForm.medications}
                  onChange={(e) => setEditForm({ ...editForm, medications: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} text-slate-900 bg-white resize-none`}
                  placeholder="Ví dụ: Amoxicillin, paracetamol"
                />
              </div>

              <div>
                <label className={`block font-semibold ${theme.subHeaderText} mb-1`}>Ghi chú</label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 ${theme.inputFocus} text-slate-900 bg-white`}
                  placeholder="Ví dụ: Uống amox bị ội"
                />
              </div>

              {formError && (
                <div className="text-red-600 font-medium p-2 bg-red-50 border border-red-200 rounded-lg">
                  {formError}
                </div>
              )}
            </div>

            <div className={`px-4 py-3 ${theme.footerBg} border-t flex justify-end gap-2`}>
              <button
                onClick={() => {
                  setEditingVisit(null);
                  setIsAddingNew(false);
                }}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveVisit}
                className={`inline-flex items-center gap-1 px-3.5 py-1.5 text-xs ${theme.btnPrimary} font-semibold rounded-lg shadow-xs cursor-pointer`}
              >
                <Save className="w-3.5 h-3.5" />
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
