"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, FileText, Edit2, Trash2, X, ClipboardList, Stethoscope, Pill, Printer } from "lucide-react";
import { formatPatientCode, syncDiagnosisToMedicalSummary, removeDiagnosisFromMedicalSummary } from "@/lib/medicalSummaryService";
import { freezePrescriptionMedicines, getHistoricalMedicinePrice, backfillDiagnosesMedicinePrices } from "@/lib/medicinePriceService";
import DatePicker, { calculateAge, formatDisplayDate } from "@/components/DatePicker";

const EMPTY_MED_LINE = { medicineName: "", medicineQuantity: 1, price: 0, medDays: "", medTimes: "", medAmount: "", medicineNote: "", medCustomUnit: "viên" };

const Autocomplete = ({ id, value, onChange, onSelect, options, getOptionLabel, renderOption, filterOption, maxSuggestions = 5, placeholder, className, dropdownClassName = "w-full" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

  const matchSearch = (text: string, search: string) => {
    if (!search) return true;
    return removeAccents(text.toLowerCase()).includes(removeAccents(search.toLowerCase()));
  };

  const filteredOptions = options.filter((opt: any) => {
    if (filterOption) return filterOption(opt, value);
    return matchSearch(getOptionLabel(opt), value);
  }).slice(0, maxSuggestions);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
            setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            let targetOpt = highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
              ? filteredOptions[highlightedIndex]
              : (filteredOptions.length > 0 ? filteredOptions[0] : null);
            if (!targetOpt && value) {
              const cleanV = String(value).trim().toLowerCase();
              targetOpt = options.find((opt: any) => 
                (opt.id && String(opt.id).trim().toLowerCase() === cleanV) ||
                (opt.name && String(opt.name).trim().toLowerCase() === cleanV)
              );
            }
            if (targetOpt) {
              onChange(getOptionLabel(targetOpt));
              if (onSelect) onSelect(targetOpt);
            } else {
              if (onSelect) onSelect({ name: value });
            }
            setIsOpen(false);
          } else if (e.key === "Tab") {
            setIsOpen(false);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className={`absolute z-50 bg-white border border-slate-200 shadow-xl rounded-md mt-1 max-h-64 overflow-auto ${dropdownClassName}`}>
          {filteredOptions.map((opt: any, index: number) => (
            <li
              key={index}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${highlightedIndex === index ? "bg-purple-100 text-purple-900" : "hover:bg-slate-50 text-slate-700"}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(getOptionLabel(opt));
                if (onSelect) onSelect(opt);
                setIsOpen(false);
              }}
            >
              {renderOption ? renderOption(opt) : getOptionLabel(opt)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const DUMMY_DIAGNOSIS = [
  {
    id: 1, patientId: "0001", patientName: "Nguyen Van A", doctorName: "Le Van C",
    diagnosis: "Viem hong cap", date: "2026-08-07 08:30",
    serviceName: "Khám nội", serviceFee: 150000,
    medicines: [
      { medicineName: "Paracetamol 500mg", medicineQuantity: 10 },
      { medicineName: "Amoxicillin 500mg", medicineQuantity: 14 },
    ]
  },
  {
    id: 2, patientId: "0002", patientName: "Tran Thi B", doctorName: "Pham Thi D",
    diagnosis: "Dau da day", date: "2026-08-06 14:15",
    serviceName: "Nội soi", serviceFee: 500000,
    medicines: [{ medicineName: "Vitamin C 1000mg", medicineQuantity: 1 }]
  },
];

const DUMMY_DOCTORS = [
  { id: "BS001", name: "Lê Văn C", specialty: "Nội khoa", phone: "0912345678", email: "levanc@clinic.com" },
  { id: "BS002", name: "Phạm Thị D", specialty: "Ngoại khoa", phone: "0923456789", email: "phamthid@clinic.com" },
];

export default function DiagnosisPage() {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [highlightedDoctorIndex, setHighlightedDoctorIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const getCurrentFormattedDate = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const regex = /^(\d{4})-(\d{2})-(\d{2})( \d{2}:\d{2})?$/;
    const match = dateStr.match(regex);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}${match[4] || ""}`;
    }
    return dateStr;
  };

  const [newDiag, setNewDiag] = useState<any>({ patientName: "", patientId: "", weight: "", doctorName: "", diagnosis: "", medicalHistory: "", date: getCurrentFormattedDate(), followUpDate: "", serviceName: "", serviceFee: 50000, notes: "", medicines: [{ ...EMPTY_MED_LINE }] });
  const [editingDiagId, setEditingDiagId] = useState<number | null>(null);
  const [deletingDiag, setDeletingDiag] = useState<any | null>(null);
  const [error, setError] = useState("");
  // Tự động nạp chi tiết đơn thuốc ngay nếu có ca khám được chuyển từ trang Doanh Thu
  const [viewingPrescription, setViewingPrescription] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const direct = sessionStorage.getItem("khambenh_direct_view_prescription");
        if (direct) {
          const parsed = JSON.parse(direct);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [availableMedicines, setAvailableMedicines] = useState<any[]>([
    { id: "T001", name: "Paracetamol 500mg", type: "Giảm đau hạ sốt", company: "Dược Hậu Giang", price: "5,000", unit: "Viên", stock: 100 },
    { id: "T002", name: "Amoxicillin 500mg", type: "Kháng sinh", company: "Dược Hậu Giang", price: "10,000", unit: "Viên", stock: 200 },
    { id: "T003", name: "Vitamin C 1000mg", type: "Vitamin", company: "Traphaco", price: "20,000", unit: "Hộp", stock: 50 },
  ]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>(DUMMY_DOCTORS);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);

  const getPatientCode = (diag: any) => {
    if (!diag) return "-";
    if (diag.patientId) return formatPatientCode(diag.patientId);
    if (diag.patientName) {
      const found = savedPatients.find((p: any) => p.name?.trim().toLowerCase() === diag.patientName?.trim().toLowerCase());
      if (found?.id) return formatPatientCode(found.id);
    }
    return "-";
  };

  const calculateBMI = (weight: string, height: string) => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return "";
  };

  const getPrescriptionDetails = (diag: any) => {
    let medCatalog = availableMedicines;
    try {
      const saved = localStorage.getItem("khambenh_medicines");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) medCatalog = parsed;
      }
    } catch (e) {}

    const meds: any[] = diag?.medicines || [];
    if (meds.length > 0 && meds.some((m: any) => m.medicineName || m.name || m.medicineId)) {
      return meds.filter((m: any) => m.medicineName || m.name || m.medicineId).map((m: any, idx: number) => {
        const rawName = String(m.medicineName || m.name || "").trim();
        const rawId = String(m.medicineId || m.id || "").trim();

        // 1. Tìm theo ID/mã thuốc trước (kể cả khi người dùng lưu mã thuốc vào medicineName)
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
        const displayCode = medInfo?.id || rawId || rawName;
        const savedPrice = typeof m.price === "number" && m.price > 0
          ? m.price
          : (parseInt(String(m.price || "").replace(/\D/g, ""), 10) || 0);
        const priceNum = savedPrice > 0
          ? savedPrice
          : (getHistoricalMedicinePrice(m, diag?.date, medCatalog) || (typeof medInfo?.price === "number" ? medInfo.price : parseInt(String(medInfo?.price || "5000").replace(/\D/g, ""), 10) || 5000));

        return {
          id: idx + 1,
          name: displayCode,
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
    return [
      { id: 1, name: "T001", quantity: 10, unit: "Viên", price: 5000, notes: "Uống sau ăn" },
      { id: 2, name: "T002", quantity: 14, unit: "Viên", price: 10000, notes: "Sáng 1 viên tối 1 viên" },
      { id: 3, name: "T003", quantity: 1, unit: "Hộp", price: 20000, notes: "Mỗi ngày 1 viên" }
    ];
  };

  const getFollowUpStatusColor = (dateStr: string) => {
    if (!dateStr) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    let targetDate: Date | null = null;
    const partsDMY = dateStr.split(/[-/]/);
    if (partsDMY.length === 3 && partsDMY[0].length <= 2 && partsDMY[2].length === 4) {
      targetDate = new Date(parseInt(partsDMY[2]), parseInt(partsDMY[1]) - 1, parseInt(partsDMY[0]));
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) targetDate = parsed;
    }
    if (!targetDate || isNaN(targetDate.getTime())) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1 || diffDays === 0) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (diffDays < 0) return "bg-red-50 text-red-700 border-red-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };



  useEffect(() => {
    let currentMeds = availableMedicines;
    const savedMeds = localStorage.getItem("khambenh_medicines");
    if (savedMeds) {
      try {
        const parsedMeds = JSON.parse(savedMeds);
        if (Array.isArray(parsedMeds) && parsedMeds.length > 0) {
          currentMeds = parsedMeds;
          setAvailableMedicines(parsedMeds);
        }
      } catch (e) { }
    }

    const saved = localStorage.getItem("khambenh_diagnosis");
    const sampleNames = [
      "nguyen van a", "nguyễn văn a", "trần bảo ngọc", "tran thi b", "trần thị b",
      "lê minh khang", "phạm gia hưng", "hoàng yến vy", "đỗ quốc bảo", "vũ tuấn kiệt"
    ];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(d => !sampleNames.includes((d.patientName || "").trim().toLowerCase()));
          const { updatedDiagnoses, changed } = backfillDiagnosesMedicinePrices(cleaned, currentMeds);
          setDiagnoses(updatedDiagnoses);
          if (cleaned.length !== parsed.length || changed) {
            localStorage.setItem("khambenh_diagnosis", JSON.stringify(updatedDiagnoses));
          }
        }
      } catch (e) { setDiagnoses([]); }
    } else {
      setDiagnoses([]);
    }

    const savedDoctors = localStorage.getItem("khambenh_doctors");
    if (savedDoctors) { try { setAvailableDoctors(JSON.parse(savedDoctors)); } catch (e) { } }
    const savedPts = localStorage.getItem("khambenh_patients");
    if (savedPts) { try { setSavedPatients(JSON.parse(savedPts)); } catch (e) { } }
    setIsLoaded(true);
  }, []);

  // Tự động mở chi tiết đơn thuốc khi được điều hướng từ "Tổng kết Doanh Thu" hoặc qua link
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Ưu tiên đối tượng phiếu khám trực tiếp từ sessionStorage
    const direct = sessionStorage.getItem("khambenh_direct_view_prescription");
    if (direct) {
      try {
        const parsed = JSON.parse(direct);
        if (parsed && typeof parsed === "object") {
          setViewingPrescription(parsed);
          sessionStorage.removeItem("khambenh_direct_view_prescription");
          sessionStorage.removeItem("khambenh_view_diag_id");
          sessionStorage.removeItem("khambenh_view_patient_name");
          sessionStorage.removeItem("khambenh_view_patient_id");
          return;
        }
      } catch (e) {}
    }

    // 2. Tìm theo ID hoặc Tên bệnh nhân từ URL hoặc sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const targetDiagId = urlParams.get("diagId") || sessionStorage.getItem("khambenh_view_diag_id");
    const targetPatientName = urlParams.get("patientName") || sessionStorage.getItem("khambenh_view_patient_name");
    const targetPatientId = urlParams.get("patientId") || sessionStorage.getItem("khambenh_view_patient_id");

    if (targetDiagId || targetPatientName || targetPatientId) {
      let matched: any = null;
      if (diagnoses.length > 0) {
        if (targetDiagId) {
          matched = diagnoses.find(d => String(d.id) === String(targetDiagId));
        }
        if (!matched && targetPatientId) {
          matched = diagnoses.find(d => String(d.patientId) === String(targetPatientId));
        }
        if (!matched && targetPatientName) {
          matched = diagnoses.find(d => (d.patientName || "").trim().toLowerCase() === targetPatientName!.trim().toLowerCase());
        }
      }

      // Thử tìm trong localStorage nếu diagnoses state chưa kịp nạp
      if (!matched) {
        try {
          const localRaw = localStorage.getItem("khambenh_diagnosis");
          if (localRaw) {
            const localDiags = JSON.parse(localRaw);
            if (Array.isArray(localDiags)) {
              if (targetDiagId) {
                matched = localDiags.find(d => String(d.id) === String(targetDiagId));
              }
              if (!matched && targetPatientId) {
                matched = localDiags.find(d => String(d.patientId) === String(targetPatientId));
              }
              if (!matched && targetPatientName) {
                matched = localDiags.find(d => (d.patientName || "").trim().toLowerCase() === targetPatientName!.trim().toLowerCase());
              }
            }
          }
        } catch (e) {}
      }

      if (matched) {
        setViewingPrescription(matched);
        sessionStorage.removeItem("khambenh_view_diag_id");
        sessionStorage.removeItem("khambenh_view_patient_name");
        sessionStorage.removeItem("khambenh_view_patient_id");
        // Dọn dẹp query parameters trên thanh URL mà không reload trang
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }
    }
  }, [isLoaded, diagnoses]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem("khambenh_diagnosis", JSON.stringify(diagnoses));
  }, [diagnoses, isLoaded]);

  // Auto-save draft khi đang nhập phiếu mới
  useEffect(() => {
    if (showAddModal && !editingDiagId && isLoaded) {
      localStorage.setItem("khambenh_draft_diag", JSON.stringify(newDiag));
    }
  }, [newDiag, showAddModal, editingDiagId, isLoaded]);

  const resetNewDiag = () => ({ patientName: "", patientId: "", weight: "", doctorName: "", diagnosis: "", medicalHistory: "", date: getCurrentFormattedDate(), followUpDate: "", serviceName: "", serviceFee: 50000, notes: "", medicines: [{ ...EMPTY_MED_LINE }] });

  const handleSaveDiag = () => {
    if (!newDiag.patientName.trim() || !newDiag.diagnosis.trim()) {
      setError("Vui lòng chọn Bệnh nhân và nhập Chẩn đoán!");
      return;
    }
    setError("");

    // Chuẩn hóa số lượng thuốc (tối thiểu 1) và đóng băng (snapshot) giá thuốc tại thời điểm kê đơn
    const sanitizedMeds = freezePrescriptionMedicines(newDiag.medicines || [], availableMedicines, newDiag.date);
    newDiag.medicines = sanitizedMeds;

    // Validation for stock
    if (newDiag.medicines && newDiag.medicines.length > 0) {
      for (const med of newDiag.medicines) {
        if (med.medicineName && med.medicineQuantity > 0) {
          const medInfo = availableMedicines.find((m: any) => m.name === med.medicineName);
          const currentStock = medInfo?.stock ? medInfo.stock : 100;

          let oldQuantity = 0;
          if (editingDiagId !== null) {
            const oldDiag = diagnoses.find(d => d.id === editingDiagId);
            if (oldDiag) {
              const oldMed = oldDiag.medicines?.find((m: any) => m.medicineName === med.medicineName);
              if (oldMed) oldQuantity = oldMed.medicineQuantity;
            }
          }

          if (med.medicineQuantity > currentStock + oldQuantity) {
            setError(`Không đủ thuốc trong kho cho ${med.medicineName}. Tồn kho hiện tại: ${currentStock}`);
            return;
          }
        }
      }
    }

    let updatedMeds = [...availableMedicines];
    let medsChanged = false;

    if (editingDiagId !== null) {
      const oldDiag = diagnoses.find(d => d.id === editingDiagId);

      // Revert old stock (ch? hoàn lại nếu đơn vị khớp)
      if (oldDiag && oldDiag.medicines) {
        oldDiag.medicines.forEach((oldMed: any) => {
          if (oldMed.medicineName && oldMed.medicineQuantity > 0) {
            const medIndex = updatedMeds.findIndex((m: any) => m.name === oldMed.medicineName);
            if (medIndex !== -1) {
              const inventoryUnit = updatedMeds[medIndex].unit || "";
              const prescriptionUnit = oldMed.medicineUnit ?? inventoryUnit;
              // Ch? hoàn lại kho khi đơn vị khớp
              if (!prescriptionUnit || prescriptionUnit === inventoryUnit) {
                updatedMeds[medIndex] = {
                  ...updatedMeds[medIndex],
                  stock: (updatedMeds[medIndex].stock !== undefined ? updatedMeds[medIndex].stock : 100) + oldMed.medicineQuantity
                };
                medsChanged = true;
              }
            }
          }
        });
      }

      // Deduct new stock (ch? trừ khi đơn vị khớp)
      if (newDiag.medicines) {
        newDiag.medicines.forEach((med: any) => {
          if (med.medicineName && med.medicineQuantity > 0) {
            const medIndex = updatedMeds.findIndex((m: any) => m.name === med.medicineName);
            if (medIndex !== -1) {
              const inventoryUnit = updatedMeds[medIndex].unit || "";
              const prescriptionUnit = med.medicineUnit ?? inventoryUnit;
              if (!prescriptionUnit || prescriptionUnit === inventoryUnit) {
                updatedMeds[medIndex] = {
                  ...updatedMeds[medIndex],
                  stock: Math.max(0, (updatedMeds[medIndex].stock !== undefined ? updatedMeds[medIndex].stock : 100) - med.medicineQuantity)
                };
                medsChanged = true;
              }
            }
          }
        });
      }

      let finalPatientId = newDiag.patientId;
      if (!finalPatientId && newDiag.patientName) {
        const match = savedPatients.find(p => p.name?.trim().toLowerCase() === newDiag.patientName?.trim().toLowerCase());
        if (match?.id) finalPatientId = match.id;
      }

      const fee = Number(newDiag.serviceFee) || 0;
      const savedDiagRecord = { id: editingDiagId, ...newDiag, serviceFee: fee, patientId: finalPatientId };
      const updatedList = diagnoses.map(d => d.id === editingDiagId ? savedDiagRecord : d);
      setDiagnoses(updatedList);
      localStorage.setItem("khambenh_diagnosis", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("khambenh_diagnosis_updated"));
      syncDiagnosisToMedicalSummary(savedDiagRecord);
    } else {
      let finalPatientId = newDiag.patientId;
      if (!finalPatientId && newDiag.patientName) {
        const match = savedPatients.find(p => p.name?.trim().toLowerCase() === newDiag.patientName?.trim().toLowerCase());
        if (match?.id) finalPatientId = match.id;
      }

      const nums = diagnoses.map(d => typeof d.id === 'number' ? d.id : parseInt(String(d.id).replace(/\D/g, ''))).filter(n => !isNaN(n));
      const nextId = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const fee = Number(newDiag.serviceFee) || 0;
      const savedDiagRecord = { id: nextId, ...newDiag, serviceFee: fee, patientId: finalPatientId };
      const updatedList = [savedDiagRecord, ...diagnoses];
      setDiagnoses(updatedList);
      localStorage.setItem("khambenh_diagnosis", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("khambenh_diagnosis_updated"));
      syncDiagnosisToMedicalSummary(savedDiagRecord);

      // Deduct new stock (ch? trừ khi đơn vị khớp)
      if (newDiag.medicines) {
        newDiag.medicines.forEach((med: any) => {
          if (med.medicineName && med.medicineQuantity > 0) {
            const medIndex = updatedMeds.findIndex((m: any) => m.name === med.medicineName);
            if (medIndex !== -1) {
              const inventoryUnit = updatedMeds[medIndex].unit || "";
              const prescriptionUnit = med.medicineUnit ?? inventoryUnit;
              if (!prescriptionUnit || prescriptionUnit === inventoryUnit) {
                updatedMeds[medIndex] = {
                  ...updatedMeds[medIndex],
                  stock: Math.max(0, (updatedMeds[medIndex].stock !== undefined ? updatedMeds[medIndex].stock : 100) - med.medicineQuantity)
                };
                medsChanged = true;
              }
            }
          }
        });
      }
    }

    if (medsChanged) {
      setAvailableMedicines(updatedMeds);
      localStorage.setItem("khambenh_medicines", JSON.stringify(updatedMeds));
      window.dispatchEvent(new Event("khambenh_medicines_updated"));
    }

    if (newDiag.weight !== undefined && newDiag.weight !== "") {
      const pId = newDiag.patientId || (savedPatients.find(p => p.name?.trim().toLowerCase() === newDiag.patientName?.trim().toLowerCase())?.id);
      const ptIdx = savedPatients.findIndex(p => pId ? p.id === pId : p.name?.trim().toLowerCase() === newDiag.patientName?.trim().toLowerCase());
      if (ptIdx !== -1) {
        const updatedPts = [...savedPatients];
        updatedPts[ptIdx] = { ...updatedPts[ptIdx], weight: newDiag.weight };
        setSavedPatients(updatedPts);
        try {
          localStorage.setItem("khambenh_patients", JSON.stringify(updatedPts));
          window.dispatchEvent(new Event("khambenh_patients_updated"));
        } catch (e) {}
      }
    }

    setNewDiag(resetNewDiag());
    setShowAddModal(false);
    setEditingDiagId(null);
    setError("");
    localStorage.removeItem("khambenh_draft_diag");
  };

  const handleEditClick = (diag: any) => {
    setEditingDiagId(diag.id);
    const existingFollowUp = diag.followUpDate || "";
    const matchedPt = savedPatients.find((p: any) => diag.patientId ? p.id === diag.patientId : p.name?.trim().toLowerCase() === diag.patientName?.trim().toLowerCase());
    const existingWeight = diag.weight !== undefined && diag.weight !== null && diag.weight !== ""
      ? diag.weight
      : (matchedPt?.weight || "");
    setNewDiag({ 
      patientName: diag.patientName, 
      patientId: diag.patientId || (matchedPt ? matchedPt.id : ""),
      weight: existingWeight,
      doctorName: diag.doctorName, 
      diagnosis: diag.diagnosis, 
      medicalHistory: diag.medicalHistory || "",
      date: diag.date, 
      followUpDate: existingFollowUp, 
      serviceName: diag.serviceName, 
      serviceFee: diag.serviceFee, 
      notes: diag.notes || "", 
      medicines: (diag.medicines && diag.medicines.length > 0) ? diag.medicines : [{ ...EMPTY_MED_LINE }] 
    });
    setError("");
    setShowAddModal(true);
  };

  const handleDeleteDiag = (diag: any) => {
    setDeletingDiag(diag);
  };

  const confirmDeleteDiag = () => {
    if (!deletingDiag) return;
    const diagToDelete = deletingDiag;
    const id = diagToDelete.id;

    if (diagToDelete.medicines) {
      let updatedMeds = [...availableMedicines];
      let medsChanged = false;

      diagToDelete.medicines.forEach((med: any) => {
        if (med.medicineName && med.medicineQuantity > 0) {
          const medIndex = updatedMeds.findIndex((m: any) => m.name === med.medicineName);
          if (medIndex !== -1) {
            updatedMeds[medIndex] = {
              ...updatedMeds[medIndex],
              stock: (updatedMeds[medIndex].stock !== undefined ? updatedMeds[medIndex].stock : 100) + med.medicineQuantity
            };
            medsChanged = true;
          }
        }
      });

      if (medsChanged) {
        setAvailableMedicines(updatedMeds);
        localStorage.setItem("khambenh_medicines", JSON.stringify(updatedMeds));
        window.dispatchEvent(new Event("khambenh_medicines_updated"));
      }
    }

    setDiagnoses(prev => {
      const updated = prev.filter(d => d.id !== id);
      const newTotal = Math.ceil(updated.length / itemsPerPage);
      if (currentPage > newTotal && newTotal > 0) {
        setCurrentPage(newTotal);
      }
      localStorage.setItem("khambenh_diagnosis", JSON.stringify(updated));
      window.dispatchEvent(new Event("khambenh_diagnosis_updated"));
      return updated;
    });
    removeDiagnosisFromMedicalSummary(id, diagToDelete.patientId);
    setDeletingDiag(null);
  };

  const updateMedLine = (idx: number, field: string, value: any) => {
    setNewDiag((prev: any) => {
      const updatedMedicines = prev.medicines.map((m: any, i: number) => {
        if (i !== idx) return m;

        const updated = { ...m, [field]: value };

        // Tự động tính toán tổng số lượng thuốc = C (số viên/lần) * B (số lần/ngày) * A (số ngày)
        // Áp dụng khi người dùng nhập hoặc chỉnh sửa các thông số liều dùng
        if (field === "medAmount" || field === "medTimes" || field === "medDays") {
          const parseFactor = (v: any) => {
            if (v === null || v === undefined) return NaN;
            const s = String(v).trim().replace(",", ".");
            if (!s) return NaN;
            if (s.includes("/")) {
              const parts = s.split("/");
              if (parts.length === 2) {
                const num = parseFloat(parts[0]);
                const den = parseFloat(parts[1]);
                if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
              }
            }
            return parseFloat(s);
          };

          const c = parseFactor(field === "medAmount" ? value : updated.medAmount);
          const b = parseFactor(field === "medTimes" ? value : updated.medTimes);
          const a = parseFactor(field === "medDays" ? value : updated.medDays);

          if (!isNaN(c) && c > 0 && !isNaN(b) && b > 0 && !isNaN(a) && a > 0) {
            const total = c * b * a;
            updated.medicineQuantity = total % 1 === 0 ? Math.round(total) : Math.ceil(total);
          }
        }

        // Đồng bộ hoặc gợi ý đơn vị khi chọn thuốc (hỗ trợ tìm theo tên hoặc Mã Thuốc)
        if (field === "medicineName") {
          const cleanVal = String(value || "").trim().toLowerCase();
          const medInfo = availableMedicines.find((item: any) => 
            item.name?.trim().toLowerCase() === cleanVal ||
            (item.id && item.id.trim().toLowerCase() === cleanVal)
          );
          if (medInfo) {
            updated.medicineName = medInfo.name;
            if (medInfo.id) updated.medicineId = medInfo.id;
            const priceNum = typeof medInfo.price === "number"
              ? medInfo.price
              : (parseInt(String(medInfo.price || "0").replace(/\D/g, ""), 10) || 0);
            updated.price = priceNum;
            if (medInfo.unit) {
              if (!updated.medicineUnit) updated.medicineUnit = medInfo.unit;
              if (!updated.medCustomUnit || updated.medCustomUnit === "viên") {
                updated.medCustomUnit = medInfo.unit.toLowerCase();
              }
            }
          }
        }

        return updated;
      });

      return { ...prev, medicines: updatedMedicines };
    });
  };
  const addMedLine = () => {
    setNewDiag((prev: any) => {
      const nextIdx = prev.medicines.length;
      setTimeout(() => {
        const el = document.getElementById(`med-name-input-${nextIdx}`);
        if (el) {
          el.focus();
        } else {
          setTimeout(() => {
            const retryEl = document.getElementById(`med-name-input-${nextIdx}`);
            if (retryEl) retryEl.focus();
          }, 80);
        }
      }, 60);

      return {
        ...prev,
        medicines: [...prev.medicines, { ...EMPTY_MED_LINE }]
      };
    });
  };

  const handleQtyKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const timesInput = document.getElementById(`med-times-input-${idx}`) as HTMLInputElement;
      if (timesInput) {
        timesInput.focus();
        timesInput.select();
      }
    } else if (e.key === "ArrowRight") {
      const timesInput = document.getElementById(`med-times-input-${idx}`);
      if (timesInput) {
        e.preventDefault();
        timesInput.focus();
      }
    }
  };

  const handleEndRowKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === newDiag.medicines.length - 1) {
        addMedLine();
      } else {
        const nextInput = document.getElementById(`med-name-input-${idx + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleDaysKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === newDiag.medicines.length - 1) {
        addMedLine();
      } else {
        const nextInput = document.getElementById(`med-name-input-${idx + 1}`);
        if (nextInput) {
          nextInput.focus();
        } else {
          addMedLine();
        }
      }
    }
  };

  const removeMedLine = (idx: number) => { if (newDiag.medicines.length > 1) setNewDiag({ ...newDiag, medicines: newDiag.medicines.filter((_: any, i: number) => i !== idx) }); };

  // Remove Vietnamese accents for better searching
  const removeAccents = (str: string) => {
    return str.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const matchSearch = (text: string, search: string) => {
    if (!search) return true;
    const textStr = removeAccents(text.toLowerCase());
    const searchStr = removeAccents(search.toLowerCase());
    const searchWords = searchStr.split(' ').filter(w => w.length > 0);
    const textWords = textStr.split(' ');
    return searchWords.every(sw => textWords.some(tw => tw.startsWith(sw)));
  };

  const filteredDoctors = availableDoctors.filter(d => {
    if (!newDiag.doctorName) return false;
    return matchSearch(d.name, newDiag.doctorName) && d.name !== newDiag.doctorName;
  });

  const handleDoctorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredDoctors.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedDoctorIndex(prev => {
        const nextIndex = prev < filteredDoctors.length - 1 ? prev + 1 : prev;
        setTimeout(() => document.getElementById(`doctor-suggestion-${nextIndex}`)?.scrollIntoView({ block: "nearest" }), 0);
        return nextIndex;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedDoctorIndex(prev => {
        const nextIndex = prev > 0 ? prev - 1 : 0;
        setTimeout(() => document.getElementById(`doctor-suggestion-${nextIndex}`)?.scrollIntoView({ block: "nearest" }), 0);
        return nextIndex;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedDoctorIndex >= 0 && highlightedDoctorIndex < filteredDoctors.length) {
        setNewDiag((prev: any) => ({ ...prev, doctorName: filteredDoctors[highlightedDoctorIndex].name }));
        setHighlightedDoctorIndex(-1);
      }
    }
  };

  const filteredDiagnoses = diagnoses.filter(diag => {
    const ptCode = getPatientCode(diag);
    return matchSearch(diag.patientName, searchTerm) ||
      matchSearch(ptCode, searchTerm) ||
      matchSearch(diag.patientId || "", searchTerm);
  });

  const totalPages = Math.ceil(filteredDiagnoses.length / itemsPerPage);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedDiagnoses = filteredDiagnoses.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Khung nội dung giao diện chẩn đoán - Ẩn khi đang in Đơn Thuốc */}
      <div className={`space-y-6 ${viewingPrescription ? "print:hidden" : ""}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{"Khám Bệnh & Kê Toa"}</h1>
          <p className="text-slate-500 mt-1">Ghi nhận chuẩn đoán và xuất toa thuốc cho bệnh nhân</p>
        </div>
        <div>
          <button onClick={() => {
            setEditingDiagId(null);
            const savedMeds = localStorage.getItem("khambenh_medicines");
            if (savedMeds) { try { setAvailableMedicines(JSON.parse(savedMeds)); } catch (e) { } }
            const savedPts = localStorage.getItem("khambenh_patients");
            if (savedPts) { try { setSavedPatients(JSON.parse(savedPts)); } catch (e) { } }
            const draft = localStorage.getItem("khambenh_draft_diag");
            if (draft) {
              try {
                const parsed = JSON.parse(draft);
                if (parsed && (parsed.serviceFee === 80000 || !parsed.serviceFee)) {
                  parsed.serviceFee = 50000;
                }
                setNewDiag(parsed);
              } catch {
                setNewDiag(resetNewDiag());
              }
            } else {
              setNewDiag(resetNewDiag());
            }
            setError("");
            setShowAddModal(true);
          }} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm shadow-purple-500/20">
            <Plus className="w-4 h-4" /><span>Phiếu khám mới</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Tìm kiếm theo mã BN, tên bệnh nhân..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-slate-900 placeholder-slate-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Thời gian</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Mã BN</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Bệnh nhân</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Bác sĩ khám</th>
                <th className="px-6 py-3 font-medium">Chẩn đoán</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Lịch tái khám</th>
                <th className="px-6 py-3 font-medium">Lưu ý</th>
                <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedDiagnoses.map((diag) => (
                <tr key={diag.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDateDisplay(diag.date)}</td>
                  <td className="px-6 py-4 font-mono font-medium text-blue-600 whitespace-nowrap">{getPatientCode(diag)}</td>
                  <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{diag.patientName}</td>
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{diag.doctorName}</td>
                  <td className="px-6 py-4 text-slate-800 font-medium">
                    <div>{diag.diagnosis}</div>
                    {diag.medicalHistory && (
                      <div className="text-xs text-slate-500 font-normal mt-0.5">{diag.medicalHistory}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                    {diag.followUpDate ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getFollowUpStatusColor(diag.followUpDate)}`}>
                        {diag.followUpDate}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Không có</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={diag.notes}>
                    {diag.notes ? diag.notes : <span className="text-slate-400 italic text-xs">Không có</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewingPrescription(diag)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md font-medium text-xs transition-colors border border-purple-200">
                        <FileText className="w-3.5 h-3.5" />Xem chi tiết
                      </button>
                      <button onClick={() => handleEditClick(diag)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteDiag(diag)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa phiếu khám"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-center gap-4 bg-slate-50">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &larr;
            </button>
            <span className="text-sm text-slate-600 font-medium">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &rarr;
            </button>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setEditingDiagId(null); setError(""); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-200">{editingDiagId ? "Chỉnh Sửa Phiếu Khám" : "Phiếu Khám Mới"}</h3>
            <div className="space-y-6">

              {/* Thông tin khám */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" /> Thông Tin Khám
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between items-center">
                      <span>Tên Bệnh Nhân</span>
                      {newDiag.patientId && (
                        <span className="text-xs font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Mã: {formatPatientCode(newDiag.patientId)}
                        </span>
                      )}
                    </label>
                    <Autocomplete
                      value={newDiag.patientName || ""}
                      onChange={(val: string) => {
                        const pt = savedPatients.find((p: any) => {
                          const ptCode = formatPatientCode(p.id);
                          const rawId = p.id ? String(p.id).trim().toLowerCase() : "";
                          const cleanVal = val.trim().toLowerCase();
                          return p.name?.trim().toLowerCase() === cleanVal ||
                                 ptCode.toLowerCase() === cleanVal ||
                                 rawId === cleanVal ||
                                 `bn${ptCode.toLowerCase()}` === cleanVal;
                        });
                        setNewDiag((prev: any) => ({
                          ...prev,
                          patientName: val,
                          patientId: pt ? pt.id : (val === "" ? "" : prev.patientId),
                          weight: pt?.weight !== undefined && pt?.weight !== "" ? pt.weight : prev.weight
                        }));
                      }}
                      onSelect={(pt: any) => setNewDiag((prev: any) => ({
                        ...prev,
                        patientName: pt.name,
                        patientId: pt.id,
                        weight: pt.weight !== undefined && pt.weight !== "" ? pt.weight : prev.weight
                      }))}
                      options={savedPatients}
                      getOptionLabel={(p: any) => p.name}
                      filterOption={(p: any, query: string) => {
                        if (!query) return true;
                        const ptCode = formatPatientCode(p.id);
                        const rawId = p.id ? String(p.id) : "";
                        const name = p.name || "";
                        return matchSearch(name, query) ||
                               matchSearch(ptCode, query) ||
                               matchSearch(rawId, query) ||
                               matchSearch(`BN${ptCode}`, query) ||
                               matchSearch(`BN${rawId}`, query);
                      }}
                      renderOption={(p: any) => (
                        <div className="flex items-center justify-between py-0.5">
                          <span className="font-medium text-slate-800">{p.name}</span>
                          <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {formatPatientCode(p.id)}
                          </span>
                        </div>
                      )}
                      placeholder="-- Chọn theo tên hoặc mã BN --"
                      maxSuggestions={7}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cân nặng</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newDiag.weight ?? ""}
                        onChange={e => setNewDiag({ ...newDiag, weight: e.target.value })}
                        className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                        placeholder="VD: 15"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">kg</span>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bác sĩ khám</label>
                    <select
                      value={newDiag.doctorName || ""}
                      onChange={e => setNewDiag({ ...newDiag, doctorName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                    >
                      <option value="">-- Chọn bác sĩ --</option>
                      <option value="Võ Tấn Nam">Võ Tấn Nam</option>
                      <option value="Nguyễn Thị Mỹ Phụng">Nguyễn Thị Mỹ Phụng</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chẩn đoán</label>
                    <input type="text" value={newDiag.diagnosis} onChange={e => setNewDiag({ ...newDiag, diagnosis: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                      placeholder="Bệnh..." />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bệnh sử – Khám</label>
                    <textarea
                      rows={2}
                      value={newDiag.medicalHistory || ""}
                      onChange={e => setNewDiag({ ...newDiag, medicalHistory: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 resize-none"
                      placeholder="Nhập bệnh sử, triệu chứng và kết quả khám (ví dụ: Sốt 3 ngày, ho...)"
                    />
                  </div>
                  <div className="sm:col-span-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 whitespace-nowrap">Thời gian</label>
                      <DatePicker
                        value={newDiag.date}
                        onChange={(val) => setNewDiag({ ...newDiag, date: val })}
                        placeholder="DD-MM-YYYY"
                        align="left"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1 whitespace-nowrap">Lịch Tái Khám</label>
                      <DatePicker
                        value={newDiag.followUpDate}
                        onChange={(val) => setNewDiag({ ...newDiag, followUpDate: val })}
                        placeholder="DD-MM-YYYY"
                        align="right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dịch vụ */}
              <div className="space-y-6">
                {/* Cột Dịch vụ */}
                <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 h-fit">
                  <h4 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" /> Dịch Vụ Khám
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tiền Dịch Vụ</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newDiag.serviceFee ?? ""}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setNewDiag({ ...newDiag, serviceFee: raw === "" ? "" : Number(raw) });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                        placeholder="50000"
                      />
                    </div>
                  </div>
                </div>

                {/* Cột Thuốc */}
                <div className="bg-purple-50/30 p-4 rounded-xl border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-purple-600" /> Kê Thuốc
                    </h4>
                    <button onClick={addMedLine} className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-medium bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-md transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Thêm Thuốc
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50/80 px-3 py-1.5 rounded-lg border border-purple-200 mb-3 overflow-x-auto">
                    <span className="font-bold text-purple-900 shrink-0">💡 Phím Tắt:</span>
                    <span className="text-purple-800 shrink-0">Nhấn <strong>Enter</strong>: Tên thuốc ➔ Mỗi ngày ... lần ➔ Mỗi lần ... viên ➔ Trong ngày ➔ Tự thêm thuốc mới</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-medium text-left">Tên thuốc / Mã thuốc</th>
                          <th className="px-3 py-2 font-medium text-center w-14">SL</th>
                          <th className="px-3 py-2 font-medium text-center w-12">ĐV</th>
                          <th className="px-3 py-2 font-medium text-left min-w-[340px]">Cách dùng</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {newDiag.medicines.map((med: any, idx: number) => {
                          const medInfo = availableMedicines.find((m: any) => 
                            m.name === med.medicineName || (m.id && m.id === med.medicineName) || (m.id && m.id === med.medicineId)
                          );
                          return (
                            <tr key={idx}>
                              <td className="px-2 py-1.5 relative">
                                <div className="relative">
                                  <Autocomplete
                                    id={`med-name-input-${idx}`}
                                    value={med.medicineName}
                                    onChange={(val: string) => {
                                      const cleanVal = val.trim().toLowerCase();
                                      const matched = availableMedicines.find((m: any) =>
                                        m.id && m.id.trim().toLowerCase() === cleanVal
                                      );
                                      if (matched) {
                                        updateMedLine(idx, "medicineName", matched.name);
                                      } else {
                                        updateMedLine(idx, "medicineName", val);
                                      }
                                    }}
                                    onSelect={(selectedMed: any) => {
                                      if (selectedMed?.name) {
                                        updateMedLine(idx, "medicineName", selectedMed.name);
                                      }
                                      setTimeout(() => {
                                        const timesInput = document.getElementById(`med-times-input-${idx}`) as HTMLInputElement;
                                        if (timesInput) {
                                          timesInput.focus();
                                          timesInput.select();
                                        }
                                      }, 60);
                                    }}
                                    options={availableMedicines}
                                    getOptionLabel={(m: any) => m.name}
                                    filterOption={(m: any, query: string) => {
                                      if (!query) return true;
                                      const name = m.name || "";
                                      const code = m.id || "";
                                      const type = m.type || "";
                                      return matchSearch(name, query) ||
                                             matchSearch(code, query) ||
                                             matchSearch(type, query);
                                    }}
                                    renderOption={(m: any) => (
                                      <div className="flex items-center justify-between gap-2 py-0.5">
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-800 truncate">{m.name}</span>
                                            {m.id && (
                                              <span className="font-mono text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 shrink-0">
                                                {m.id}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[11px] text-slate-500 mt-0.5">
                                            {m.type} | {m.company || "Kho thuốc"} | Tồn: <strong className={m.stock > 0 ? "text-emerald-600" : "text-red-600"}>{m.stock ?? 100}</strong> {m.unit}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    placeholder="-- Chọn theo tên hoặc Mã Thuốc --"
                                    maxSuggestions={7}
                                    className={`w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 text-xs ${medInfo?.id ? "pr-14" : ""}`}
                                    dropdownClassName="w-[360px] sm:w-[460px]"
                                  />
                                  {medInfo?.id && (
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 pointer-events-none">
                                      {medInfo.id}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-1 py-1.5">
                                <input
                                  id={`med-qty-input-${idx}`}
                                  type="number"
                                  min="1"
                                  value={med.medicineQuantity ?? ""}
                                  onChange={e => updateMedLine(idx, "medicineQuantity", e.target.value === "" ? "" : (parseInt(e.target.value) || 0))}
                                  onKeyDown={e => handleQtyKeyDown(idx, e)}
                                  onFocus={e => e.target.select()}
                                  className="w-full px-1 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 text-xs text-center font-medium"
                                  placeholder="1"
                                  title="Số lượng thuốc (Tự động tính theo liều dùng, nhấn Enter để sang Cách dùng)"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" value={med.medicineUnit ?? medInfo?.unit ?? (med.medicineName ? "Viên" : "")} onChange={e => updateMedLine(idx, "medicineUnit", e.target.value)} className="w-full px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white text-[11px]" placeholder="ĐV" />
                              </td>
                              <td className="px-1 py-1.5">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1 text-[11px] text-slate-700 whitespace-nowrap">
                                    mỗi ngày <input
                                      id={`med-times-input-${idx}`}
                                      type="text"
                                      value={med.medTimes || ""}
                                      onChange={e => updateMedLine(idx, "medTimes", e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const amountInput = document.getElementById(`med-amount-input-${idx}`) as HTMLInputElement;
                                          if (amountInput) {
                                            amountInput.focus();
                                            amountInput.select();
                                          }
                                        }
                                      }}
                                      onFocus={e => e.target.select()}
                                      placeholder="1"
                                      className="w-9 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white"
                                      title="Số lần/ngày (B) - Nhấn Enter để sang Mỗi lần"
                                    /> lần –
                                    mỗi lần <input
                                      id={`med-amount-input-${idx}`}
                                      type="text"
                                      value={med.medAmount || ""}
                                      onChange={e => updateMedLine(idx, "medAmount", e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const daysInput = document.getElementById(`med-days-input-${idx}`) as HTMLInputElement;
                                          if (daysInput) {
                                            daysInput.focus();
                                            daysInput.select();
                                          }
                                        }
                                      }}
                                      onFocus={e => e.target.select()}
                                      placeholder="1"
                                      className="w-9 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white"
                                      title="Số viên/lần (C) - Nhấn Enter để sang Trong ngày"
                                    />
                                    <input
                                      id={`med-custom-unit-input-${idx}`}
                                      type="text"
                                      value={med.medCustomUnit ?? (med.medicineUnit || medInfo?.unit ? (med.medicineUnit || medInfo?.unit).toLowerCase() : "viên")}
                                      onChange={e => updateMedLine(idx, "medCustomUnit", e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const daysInput = document.getElementById(`med-days-input-${idx}`) as HTMLInputElement;
                                          if (daysInput) {
                                            daysInput.focus();
                                            daysInput.select();
                                          }
                                        }
                                      }}
                                      onFocus={e => e.target.select()}
                                      placeholder="viên"
                                      className="w-11 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white"
                                    /> –
                                    trong <input
                                      id={`med-days-input-${idx}`}
                                      type="text"
                                      value={med.medDays || ""}
                                      onChange={e => updateMedLine(idx, "medDays", e.target.value)}
                                      onKeyDown={e => handleDaysKeyDown(idx, e)}
                                      onFocus={e => e.target.select()}
                                      placeholder="3"
                                      className="w-9 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white"
                                      title="Số ngày uống (A) (Nhấn Enter để tự thêm thuốc mới)"
                                    /> ngày
                                  </div>
                                  <input
                                    id={`med-note-input-${idx}`}
                                    type="text"
                                    value={med.medicineNote || ""}
                                    onChange={e => updateMedLine(idx, "medicineNote", e.target.value)}
                                    onKeyDown={e => handleEndRowKeyDown(idx, e)}
                                    className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs text-slate-900 bg-white placeholder:text-slate-400"
                                    placeholder="Ghi chú thêm (Nhấn Enter để thêm thuốc tiếp theo)"
                                  />
                                </div>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <button onClick={() => removeMedLine(idx)} disabled={newDiag.medicines.length === 1} className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Lưu Ý */}
              <div className="bg-yellow-50/30 p-4 rounded-xl border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-600" /> Lưu Ý
                </h4>
                <textarea value={newDiag.notes} onChange={e => setNewDiag({ ...newDiag, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white text-slate-900 text-sm resize-none" placeholder="Ghi chú thêm cho bệnh nhân..."></textarea>
              </div>

              {error && <div className="text-red-500 text-sm font-medium mt-4">{error}</div>}
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowAddModal(false); setEditingDiagId(null); setError(""); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
                <button onClick={handleSaveDiag} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">Lưu Lại</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {viewingPrescription && (() => {
        const medList = getPrescriptionDetails(viewingPrescription);
        const medCount = medList.length;
        const denseClass = medCount >= 7 ? "dense-mode ultra-dense-mode" : medCount >= 5 ? "dense-mode" : "";

        return (
          <div className="prescription-modal-backdrop fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingPrescription(null)}>
            <div ref={prescriptionModalRef} className="prescription-modal-container bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className={`prescription-sheet p-6 sm:p-8 bg-white text-slate-800 relative rounded-xl ${denseClass}`}>
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
                <div className="prescription-header text-center mb-6 sm:mb-7 mt-1 px-4">
                  <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-800 mb-1.5">
                    PHÒNG KHÁM NHI BS NAM – BS PHỤNG
                  </h3>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-900">
                    ĐƠN THUỐC
                  </h2>
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
                          <div className="flex gap-2 items-end flex-1">
                            <span className="font-bold whitespace-nowrap text-slate-800">Họ tên:</span>
                            <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-medium">
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
                          <div className="flex gap-2 items-end flex-1 whitespace-nowrap">
                            <span className="font-bold whitespace-nowrap text-slate-800">Ngày sinh:</span>
                            <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 whitespace-nowrap">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(pt as any).dob ? `${formatDisplayDate((pt as any).dob)} (${calculateAge((pt as any).dob)})` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-2 items-end w-36 shrink-0">
                            <span className="font-bold whitespace-nowrap text-slate-800">Giới tính:</span>
                            <span className="flex-1 border-b-2 border-dotted border-slate-300 flex items-center justify-around pb-1 text-xs sm:text-sm whitespace-nowrap">
                              <label className="flex items-center gap-1"><input type="checkbox" className="w-3.5 h-3.5" readOnly checked={(pt as any).gender === "Nam"} /> Nam</label>
                              <label className="flex items-center gap-1"><input type="checkbox" className="w-3.5 h-3.5" readOnly checked={(pt as any).gender === "Nữ"} /> Nữ</label>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-3 items-end flex-wrap text-[13px] sm:text-[14px]">
                          <div className="flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">Cân nặng:</span>
                            <span className="border-b-2 border-dotted border-slate-300 px-1.5 min-w-[40px]">
                              <span style={{ position: "relative", top: "3px" }}>
                                {viewingPrescription.weight || (pt as any).weight ? `${viewingPrescription.weight || (pt as any).weight} kg` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">Chiều cao:</span>
                            <span className="border-b-2 border-dotted border-slate-300 px-1.5 min-w-[40px]">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(pt as any).height ? `${(pt as any).height} cm` : ""}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">BMI:</span>
                            <span className="border-b-2 border-dotted border-slate-300 px-1.5 min-w-[35px]">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(() => {
                                  const curW = viewingPrescription.weight || (pt as any).weight;
                                  const curH = (pt as any).height;
                                  return curW && curH ? calculateBMI(curW, curH) : "";
                                })()}
                              </span>
                            </span>
                          </div>
                          <div className="flex gap-1.5 items-end">
                            <span className="font-bold whitespace-nowrap text-slate-800">NĐ:</span>
                            <span className="border-b-2 border-dotted border-slate-300 px-1.5 min-w-[35px]">
                              <span style={{ position: "relative", top: "3px" }}>
                                {(pt as any).temperature ? `${(pt as any).temperature} °C` : ""}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-end">
                          <span className="font-bold whitespace-nowrap text-slate-800">Địa chỉ:</span>
                          <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">
                            <span style={{ position: "relative", top: "3px" }}>{(pt as any).address || ""}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="diagnosis-box flex gap-2 items-end mb-2.5 text-[14px] sm:text-[15px]">
                    <span className="font-bold whitespace-nowrap text-slate-800">Chẩn đoán:</span>
                    <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-medium">
                      <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.diagnosis}</span>
                    </span>
                  </div>

                  {viewingPrescription.medicalHistory && (
                    <div className="diagnosis-box flex gap-2 items-end text-[14px] sm:text-[15px]">
                      <span className="font-bold whitespace-nowrap text-slate-800">Bệnh sử – Khám:</span>
                      <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">
                        <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.medicalHistory}</span>
                      </span>
                    </div>
                  )}
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

                {/* Ghi chú & Tái khám */}
                <div className="notes-box space-y-2.5 mb-6 text-[14px] sm:text-[15px]">
                  <div className="flex gap-2 items-end">
                    <span className="font-bold whitespace-nowrap text-slate-800">Ghi chú:</span>
                    <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-medium">
                      <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.notes}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 items-end">
                    <span className="font-bold whitespace-nowrap text-red-600">Tái khám:</span>
                    <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 text-slate-900 font-bold">
                      <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.followUpDate}</span>
                    </span>
                  </div>
                </div>

                {/* Ngày khám & Bác sĩ ký tên ở góc phải dưới cùng */}
                <div className="prescription-footer flex justify-end mt-2 mb-3">
                  <div className="text-center min-w-[200px]">
                    <p className="text-xs italic text-slate-600 mb-0.5">
                      {(() => {
                        const formatted = formatDateDisplay(viewingPrescription.date);
                        const parts = formatted ? formatted.split(" ")[0].split("-") : null;
                        if (parts && parts.length === 3) {
                          return `Ngày ${parts[0]} tháng ${parts[1]} năm ${parts[2]}`;
                        }
                        return formatted ? `Ngày khám: ${formatted}` : "Ngày .... tháng .... năm 20...";
                      })()}
                    </p>
                    <p className="font-bold uppercase text-slate-800 text-xs tracking-wide">
                      Bác sĩ khám bệnh
                    </p>
                    <p className="text-[11px] italic text-slate-500">
                      (Ký, ghi rõ họ tên)
                    </p>
                    <div className="signature-gap h-14 flex items-end justify-center">
                      {/* Khoảng trống để ký tên */}
                    </div>
                    <p className="font-bold text-slate-900 text-sm">
                      {viewingPrescription.doctorName || ""}
                    </p>
                  </div>
                </div>

                {/* Các nút hành động phía dưới (ẩn khi in) */}
                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-200 print:hidden">
                  <button
                    type="button"
                    onClick={handlePrintPrescription}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Đơn Thuốc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingPrescription(null)}
                    className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors border border-slate-300 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Xác nhận Xóa */}
      {deletingDiag && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeletingDiag(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa phiếu khám</h3>
            <p className="text-slate-600 text-sm mb-6">
              Bạn có chắc chắn muốn xóa phiếu khám của <span className="font-semibold text-slate-800">{deletingDiag.patientName}</span> ({formatDateDisplay(deletingDiag.date)}) không? Thuốc đã kê sẽ được hoàn lại vào kho.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingDiag(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeleteDiag}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Xóa phiếu khám
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








