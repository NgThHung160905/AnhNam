"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, FileText, Edit2, Trash2, X, ClipboardList, Stethoscope, Pill } from "lucide-react";
import { formatPatientCode, syncDiagnosisToMedicalSummary, removeDiagnosisFromMedicalSummary } from "@/lib/medicalSummaryService";
import DatePicker, { calculateAge, formatDisplayDate } from "@/components/DatePicker";

const EMPTY_MED_LINE = { medicineName: "", medicineQuantity: 1, medDays: "", medTimes: "", medAmount: "", medicineNote: "", medCustomUnit: "viên" };

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
            const targetOpt = highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
              ? filteredOptions[highlightedIndex]
              : (filteredOptions.length > 0 ? filteredOptions[0] : null);
            if (targetOpt) {
              e.preventDefault();
              onChange(getOptionLabel(targetOpt));
              if (onSelect) onSelect(targetOpt);
              setIsOpen(false);
            }
          } else if (e.key === "Tab") {
            if (isOpen && filteredOptions.length > 0 && !e.shiftKey) {
              const targetOpt = highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
                ? filteredOptions[highlightedIndex]
                : filteredOptions[0];
              if (targetOpt) {
                onChange(getOptionLabel(targetOpt));
                if (onSelect) onSelect(targetOpt);
                setIsOpen(false);
              }
            }
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
  const [diagnoses, setDiagnoses] = useState<any[]>(DUMMY_DIAGNOSIS);
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

  const [newDiag, setNewDiag] = useState<any>({ patientName: "", patientId: "", weight: "", doctorName: "", diagnosis: "", medicalHistory: "", date: getCurrentFormattedDate(), followUpDate: "", serviceName: "", serviceFee: 80000, notes: "", medicines: [{ ...EMPTY_MED_LINE }] });
  const [editingDiagId, setEditingDiagId] = useState<number | null>(null);
  const [deletingDiag, setDeletingDiag] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewingPrescription, setViewingPrescription] = useState<any>(null);
  const [availableMedicines, setAvailableMedicines] = useState<any[]>([
    { id: "T001", name: "Paracetamol 500mg", type: "Giảm đau hạ sốt", company: "Dược Hậu Giang", price: "5,000", unit: "Viên", stock: 100 },
    { id: "T002", name: "Amoxicillin 500mg", type: "Kháng sinh", company: "Dược Hậu Giang", price: "10,000", unit: "Viên", stock: 200 },
    { id: "T003", name: "Vitamin C 1000mg", type: "Vitamin", company: "Traphaco", price: "20,000", unit: "Hộp", stock: 50 },
  ]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>(DUMMY_DOCTORS);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);

  const getPatientCode = (diag: any) => {
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
    const meds: any[] = diag.medicines || [];
    if (meds.length > 0 && meds.some((m: any) => m.medicineName)) {
      return meds.filter((m: any) => m.medicineName).map((m: any, idx: number) => {
        const medInfo = availableMedicines.find((med: any) => med.name === m.medicineName) || { unit: "Vien", price: "5000" };
        const priceNum = parseInt((medInfo.price || "5000").toString().replace(/[^0-9]/g, "")) || 5000;
        return { id: idx + 1, name: m.medicineName, quantity: m.medicineQuantity || 1, unit: m.medicineUnit ?? medInfo?.unit ?? (m.medicineName ? "Viên" : ""), price: priceNum, medDays: m.medDays || "", medTimes: m.medTimes || "", medAmount: m.medAmount || "", medCustomUnit: m.medCustomUnit ?? "viên", notes: m.medicineNote || "" };
      });
    }
    return [
      { id: 1, name: "Paracetamol 500mg", quantity: 10, unit: "Vien", price: 5000, notes: "Uong sau an" },
      { id: 2, name: "Amoxicillin 500mg", quantity: 14, unit: "Vien", price: 10000, notes: "Sang 1 vien toi 1 vien" },
      { id: 3, name: "Vitamin C 1000mg", quantity: 1, unit: "Hop", price: 20000, notes: "Moi ngay 1 vien" }
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
    const saved = localStorage.getItem("khambenh_diagnosis");
    if (saved) { try { setDiagnoses(JSON.parse(saved)); } catch (e) { } }
    const savedMeds = localStorage.getItem("khambenh_medicines");
    if (savedMeds) { try { setAvailableMedicines(JSON.parse(savedMeds)); } catch (e) { } }
    const savedDoctors = localStorage.getItem("khambenh_doctors");
    if (savedDoctors) { try { setAvailableDoctors(JSON.parse(savedDoctors)); } catch (e) { } }
    const savedPts = localStorage.getItem("khambenh_patients");
    if (savedPts) { try { setSavedPatients(JSON.parse(savedPts)); } catch (e) { } }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem("khambenh_diagnosis", JSON.stringify(diagnoses));
  }, [diagnoses, isLoaded]);

  // Auto-save draft khi đang nhập phiếu mới
  useEffect(() => {
    if (showAddModal && !editingDiagId && isLoaded) {
      localStorage.setItem("khambenh_draft_diag", JSON.stringify(newDiag));
    }
  }, [newDiag, showAddModal, editingDiagId, isLoaded]);

  const resetNewDiag = () => ({ patientName: "", patientId: "", weight: "", doctorName: "", diagnosis: "", medicalHistory: "", date: getCurrentFormattedDate(), followUpDate: "", serviceName: "", serviceFee: 80000, notes: "", medicines: [{ ...EMPTY_MED_LINE }] });

  const handleSaveDiag = () => {
    if (!newDiag.patientName.trim() || !newDiag.diagnosis.trim()) {
      setError("Vui lòng chọn Bệnh nhân và nhập Chẩn đoán!");
      return;
    }
    setError("");

    // Chuẩn hóa số lượng thuốc (tối thiểu 1)
    const sanitizedMeds = (newDiag.medicines || []).map((med: any) => ({
      ...med,
      medicineQuantity: Math.max(1, parseInt(String(med.medicineQuantity)) || 1)
    }));
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

      const savedDiagRecord = { id: editingDiagId, ...newDiag, patientId: finalPatientId };
      setDiagnoses(diagnoses.map(d => d.id === editingDiagId ? savedDiagRecord : d));
      syncDiagnosisToMedicalSummary(savedDiagRecord);
    } else {
      let finalPatientId = newDiag.patientId;
      if (!finalPatientId && newDiag.patientName) {
        const match = savedPatients.find(p => p.name?.trim().toLowerCase() === newDiag.patientName?.trim().toLowerCase());
        if (match?.id) finalPatientId = match.id;
      }

      const nums = diagnoses.map(d => typeof d.id === 'number' ? d.id : parseInt(String(d.id).replace(/\D/g, ''))).filter(n => !isNaN(n));
      const nextId = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const savedDiagRecord = { id: nextId, ...newDiag, patientId: finalPatientId };
      setDiagnoses([savedDiagRecord, ...diagnoses]);
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
    const nextIdx = newDiag.medicines.length;
    setNewDiag((prev: any) => ({
      ...prev,
      medicines: [...prev.medicines, { ...EMPTY_MED_LINE }]
    }));
    setTimeout(() => {
      const el = document.getElementById(`med-name-input-${nextIdx}`);
      if (el) el.focus();
    }, 60);
  };

  const handleQtyKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if ((e.key === "Tab" && !e.shiftKey) || e.key === "Enter") {
      e.preventDefault();
      if (idx === newDiag.medicines.length - 1) {
        addMedLine();
      } else {
        const nextInput = document.getElementById(`med-name-input-${idx + 1}`);
        if (nextInput) nextInput.focus();
      }
    } else if (e.key === "ArrowRight") {
      const amountInput = document.getElementById(`med-amount-input-${idx}`);
      if (amountInput) {
        e.preventDefault();
        amountInput.focus();
      }
    }
  };

  const handleEndRowKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if ((e.key === "Tab" && !e.shiftKey) || e.key === "Enter") {
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
        if (nextInput) nextInput.focus();
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
              try { setNewDiag(JSON.parse(draft)); } catch { setNewDiag(resetNewDiag()); }
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
                      <input type="number" value={newDiag.serviceFee} onChange={e => setNewDiag({ ...newDiag, serviceFee: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900" min="0"
                        placeholder="80000" />
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

                  <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50/80 px-3 py-1.5 rounded-lg border border-purple-200 mb-3 whitespace-nowrap">
                    <span className="font-bold text-purple-900 whitespace-nowrap">💡 Phím Tắt:</span>
                    <span className="whitespace-nowrap text-purple-800">Nhấn <strong>Tab</strong> hoặc <strong>Enter</strong> để thêm thuốc tiếp theo</span>
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
                                      updateMedLine(idx, "medicineName", selectedMed.name);
                                      setTimeout(() => {
                                        const qtyInput = document.getElementById(`med-qty-input-${idx}`) as HTMLInputElement;
                                        if (qtyInput) {
                                          qtyInput.focus();
                                          qtyInput.select();
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
                                  title="Số lượng thuốc (Nhấn Tab hoặc Enter để thêm thuốc tiếp theo, phím → để sang Cách dùng)"
                                />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" value={med.medicineUnit ?? medInfo?.unit ?? (med.medicineName ? "Viên" : "")} onChange={e => updateMedLine(idx, "medicineUnit", e.target.value)} className="w-full px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white text-[11px]" placeholder="ĐV" />
                              </td>
                              <td className="px-1 py-1.5">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1 text-[11px] text-slate-700 whitespace-nowrap">
                                    Uống mỗi lần <input id={`med-amount-input-${idx}`} type="text" value={med.medAmount || ""} onChange={e => updateMedLine(idx, "medAmount", e.target.value)} placeholder="1" className="w-9 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" title="Số viên/lần (C)" />
                                    <input id={`med-custom-unit-input-${idx}`} type="text" value={med.medCustomUnit ?? (med.medicineUnit || medInfo?.unit ? (med.medicineUnit || medInfo?.unit).toLowerCase() : "viên")} onChange={e => updateMedLine(idx, "medCustomUnit", e.target.value)} placeholder="viên" className="w-11 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" /> –
                                    mỗi ngày <input id={`med-times-input-${idx}`} type="text" value={med.medTimes || ""} onChange={e => updateMedLine(idx, "medTimes", e.target.value)} placeholder="1" className="w-9 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" title="Số lần/ngày (B)" /> lần –
                                    trong <input id={`med-days-input-${idx}`} type="text" value={med.medDays || ""} onChange={e => updateMedLine(idx, "medDays", e.target.value)} onKeyDown={e => handleDaysKeyDown(idx, e)} placeholder="3" className="w-9 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" title="Số ngày uống (A) (Nhấn Enter để thêm thuốc tiếp theo)" /> ngày
                                  </div>
                                  <input id={`med-note-input-${idx}`} type="text" value={med.medicineNote || ""} onChange={e => updateMedLine(idx, "medicineNote", e.target.value)} onKeyDown={e => handleEndRowKeyDown(idx, e)} className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs text-slate-900 bg-white placeholder:text-slate-400" placeholder="Ghi chú thêm (Nhấn Tab hoặc Enter để thêm thuốc tiếp theo)" />
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

      {viewingPrescription && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingPrescription(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8 bg-white text-slate-800 relative rounded-xl">
              {/* Nút đóng */}
              <button onClick={() => setViewingPrescription(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors print:hidden">
                <X className="w-5 h-5" />
              </button>

              {/* Header Đơn Thuốc */}
              <div className="text-center mb-8 mt-2 px-8">
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                  PHÒNG KHÁM NHI BS NAM – BS PHỤNG
                </h3>
                <h2 className="text-3xl font-bold uppercase tracking-wider text-slate-900">
                  ĐƠN THUỐC
                </h2>
              </div>

              {/* Thông tin bệnh nhân */}
              {(() => {
                const pt = savedPatients.find((p: any) => viewingPrescription.patientId ? p.id === viewingPrescription.patientId : p.name === viewingPrescription.patientName) || {};
                const ptCode = getPatientCode(viewingPrescription);
                const displayPtCode = ptCode !== "-" ? ptCode : (viewingPrescription.patientId || (pt as any).id || "");
                return (
                  <div className="space-y-4 mb-8 text-base">
                    <div className="flex gap-6 items-end">
                      <div className="flex gap-2 items-end flex-1">
                        <span className="font-semibold whitespace-nowrap">Họ tên:</span>
                        <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-medium">
                          <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.patientName}</span>
                        </span>
                      </div>
                      <div className="flex gap-2 items-end w-44 shrink-0">
                        <span className="font-semibold whitespace-nowrap">Mã BN:</span>
                        <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-mono font-bold text-blue-700">
                          <span style={{ position: "relative", top: "3px" }}>{displayPtCode}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-6 items-end">
                      <div className="flex gap-2 items-end flex-1 whitespace-nowrap">
                        <span className="font-semibold whitespace-nowrap">Ngày sinh:</span>
                        <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 whitespace-nowrap">
                          <span style={{ position: "relative", top: "3px" }}>
                            {(pt as any).dob ? `${formatDisplayDate((pt as any).dob)} (${calculateAge((pt as any).dob)})` : ""}
                          </span>
                        </span>
                      </div>
                      <div className="flex gap-2 items-end w-44 shrink-0">
                        <span className="font-semibold whitespace-nowrap">Giới tính:</span>
                        <span className="flex-1 border-b-2 border-dotted border-slate-300 flex items-center justify-around pb-1 text-sm whitespace-nowrap">
                          <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" readOnly checked={(pt as any).gender === "Nam"} /> Nam</label>
                          <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" readOnly checked={(pt as any).gender === "Nữ"} /> Nữ</label>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-end flex-wrap">
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">Cân nặng:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[50px]">
                          <span style={{ position: "relative", top: "3px" }}>
                            {viewingPrescription.weight || (pt as any).weight ? `${viewingPrescription.weight || (pt as any).weight} kg` : ""}
                          </span>
                        </span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">Chiều cao:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[50px]">
                          <span style={{ position: "relative", top: "3px" }}>
                            {(pt as any).height ? `${(pt as any).height} cm` : ""}
                          </span>
                        </span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">BMI:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[40px]">
                          <span style={{ position: "relative", top: "3px" }}>
                            {(() => {
                              const curW = viewingPrescription.weight || (pt as any).weight;
                              const curH = (pt as any).height;
                              return curW && curH ? calculateBMI(curW, curH) : "";
                            })()}
                          </span>
                        </span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">NĐ:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[40px]">
                          <span style={{ position: "relative", top: "3px" }}>
                            {(pt as any).temperature ? `${(pt as any).temperature} °C` : ""}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <span className="font-semibold whitespace-nowrap">Địa chỉ:</span>
                      <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">
                        <span style={{ position: "relative", top: "3px" }}>{(pt as any).address || ""}</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 items-end mb-3">
                <span className="font-semibold whitespace-nowrap">Chẩn đoán:</span>
                <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-medium">
                  <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.diagnosis}</span>
                </span>
              </div>

              {viewingPrescription.medicalHistory && (
                <div className="flex gap-2 items-end mb-6">
                  <span className="font-semibold whitespace-nowrap">Bệnh sử – Khám:</span>
                  <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">
                    <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.medicalHistory}</span>
                  </span>
                </div>
              )}

              {/* Danh sách thuốc */}
              <div className="mb-10 min-h-[200px]">
                <h3 className="font-bold text-lg mb-4">Thuốc điều trị:</h3>
                <div className="space-y-6">
                  {getPrescriptionDetails(viewingPrescription).map((item: any, idx: number) => (
                    <div key={idx} className="text-base">
                      <div className="font-bold mb-2">
                        {idx + 1}/ {item.name}
                      </div>
                      <div className="pl-6 text-slate-700 flex flex-wrap gap-y-2 items-end">
                        {item.notes && <span className="w-full text-slate-600 italic mb-1">- Ghi chú: {item.notes}</span>}
                        <span className="whitespace-nowrap">- Số lượng:</span>
                        <span className="border-b-2 border-dotted border-slate-300 min-w-[60px] text-center inline-block font-medium px-2">
                          <span style={{ position: "relative", top: "3px" }}>{item.quantity}</span>
                        </span>
                        <span className="mr-6">{item.unit}</span>

                        <span className="whitespace-nowrap">Uống mỗi lần {item.medAmount || "...."} {item.medCustomUnit || item.unit || "viên"}, mỗi ngày {item.medTimes || "...."} lần, trong {item.medDays || "...."} ngày.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ghi chú & Tái khám */}
              <div className="space-y-4 mb-6 text-base">
                <div className="flex gap-2 items-end">
                  <span className="font-bold whitespace-nowrap">Ghi chú:</span>
                  <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">
                    <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.notes}</span>
                  </span>
                </div>
                <div className="flex gap-2 items-end">
                  <span className="font-bold whitespace-nowrap text-red-600">Tái khám:</span>
                  <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 text-slate-800 font-medium">
                    <span style={{ position: "relative", top: "3px" }}>{viewingPrescription.followUpDate}</span>
                  </span>
                </div>
              </div>

              {/* Ngày khám & Bác sĩ ký tên ở góc phải dưới cùng */}
              <div className="flex justify-end mt-6 mb-8">
                <div className="text-center min-w-[240px]">
                  <p className="text-sm italic text-slate-600 mb-1">
                    {(() => {
                      const formatted = formatDateDisplay(viewingPrescription.date);
                      const parts = formatted ? formatted.split(" ")[0].split("-") : null;
                      if (parts && parts.length === 3) {
                        return `Ngày ${parts[0]} tháng ${parts[1]} năm ${parts[2]}`;
                      }
                      return formatted ? `Ngày khám: ${formatted}` : "Ngày .... tháng .... năm 20...";
                    })()}
                  </p>
                  <p className="font-bold uppercase text-slate-800 text-sm tracking-wide">
                    Bác sĩ khám bệnh
                  </p>
                  <p className="text-xs italic text-slate-500">
                    (Ký, ghi rõ họ tên)
                  </p>
                  <div className="h-20 flex items-end justify-center">
                    {/* Khoảng trống để ký tên */}
                  </div>
                  <p className="font-bold text-slate-900 text-base">
                    {viewingPrescription.doctorName || ""}
                  </p>
                </div>
              </div>
              {/* Các nút hành động (ẩn khi in) */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 print:hidden">
                <button onClick={() => window.print()} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  In Đơn Thuốc
                </button>
                <button onClick={() => setViewingPrescription(null)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors border border-slate-300">
                  &#272;&#243;ng
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

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








