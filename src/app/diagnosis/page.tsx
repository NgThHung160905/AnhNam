"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, FileText, Edit2, Trash2, X, ClipboardList, Stethoscope, Pill } from "lucide-react";

const EMPTY_MED_LINE = { medicineName: "", medicineQuantity: 1, medDays: "", medTimes: "", medAmount: "", medicineNote: "", medCustomUnit: "viên" };

const DUMMY_DIAGNOSIS = [
  {
    id: 1, patientName: "Nguyen Van A", doctorName: "Le Van C",
    diagnosis: "Viem hong cap", date: "2026-08-07 08:30",
    serviceName: "Khám nội", serviceFee: 150000,
    medicines: [
      { medicineName: "Paracetamol 500mg", medicineQuantity: 10 },
      { medicineName: "Amoxicillin 500mg", medicineQuantity: 14 },
    ]
  },
  {
    id: 2, patientName: "Tran Thi B", doctorName: "Pham Thi D",
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
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return dateStr;
  };

  const [newDiag, setNewDiag] = useState<any>({ patientName: "", doctorName: "", diagnosis: "", date: getCurrentFormattedDate(), followUpDate: "", serviceName: "", serviceFee: 80000, notes: "", medicines: [{ ...EMPTY_MED_LINE }] });
  const [editingDiagId, setEditingDiagId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewingPrescription, setViewingPrescription] = useState<any>(null);
  const [availableMedicines, setAvailableMedicines] = useState<any[]>([
    { id: "T001", name: "Paracetamol 500mg", type: "Giảm đau hạ sốt", company: "Dược Hậu Giang", price: "5,000", unit: "Viên", stock: 100 },
    { id: "T002", name: "Amoxicillin 500mg", type: "Kháng sinh", company: "Dược Hậu Giang", price: "10,000", unit: "Viên", stock: 200 },
    { id: "T003", name: "Vitamin C 1000mg", type: "Vitamin", company: "Traphaco", price: "20,000", unit: "Hộp", stock: 50 },
  ]);
  const [availableDoctors, setAvailableDoctors] = useState<any[]>(DUMMY_DOCTORS);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);

  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    if (isNaN(birthDate.getTime())) return "";

    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();

    if (today.getDate() < birthDate.getDate()) {
      months--;
    }

    if (months < 0) return "Chưa sinh";
    if (months === 0) return "Dưới 1 tháng tuổi";

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) return `${months} tháng tuổi`;
    if (remainingMonths === 0) return `${months} tháng (${years} tuổi)`;
    return `${months} tháng (${years} tuổi ${remainingMonths} tháng)`;
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

  // Masked input cho Lịch Tái Khám: cursor tự do, user click vào DD/MM/YYYY để chỉnh sửa tại chỗ
  const followUpRef = useRef<HTMLInputElement>(null);
  const FOLLOW_UP_CURRENT_YEAR = new Date().getFullYear().toString();
  const FOLLOW_UP_DASH_POS = new Set([2, 5]);

  // Vị trí chữ số liền kề về bên phải từ `from` (inclusive)
  const fuNextDigit = (from: number): number | null => {
    for (let i = from; i < 10; i++) if (!FOLLOW_UP_DASH_POS.has(i)) return i;
    return null;
  };
  // Vị trí chữ số liền kề về bên trái `before` (exclusive)
  const fuPrevDigit = (before: number): number | null => {
    for (let i = before - 1; i >= 0; i--) if (!FOLLOW_UP_DASH_POS.has(i)) return i;
    return null;
  };

  const fuInitMask = () => `__-__-${FOLLOW_UP_CURRENT_YEAR}`;
  const fuIsEmpty = (v: string) => !v || v.replace(/[-_]/g, "") === "";

  const handleFollowUpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;
    if (e.ctrlKey || e.metaKey || key === "Tab") return;
    e.preventDefault();

    const input = followUpRef.current;
    if (!input) return;
    const cur = input.selectionStart ?? 0;
    const val = (newDiag.followUpDate?.length === 10) ? newDiag.followUpDate : fuInitMask();

    if (/^[0-9]$/.test(key)) {
      const pos = fuNextDigit(cur);
      if (pos !== null) {
        const next = val.slice(0, pos) + key + val.slice(pos + 1);
        setNewDiag((p: any) => ({ ...p, followUpDate: next }));
        const afterPos = fuNextDigit(pos + 1) ?? 10;
        requestAnimationFrame(() => input.setSelectionRange(afterPos, afterPos));
      }
    } else if (key === "Backspace") {
      const pos = fuPrevDigit(cur);
      if (pos !== null) {
        const next = val.slice(0, pos) + "_" + val.slice(pos + 1);
        setNewDiag((p: any) => ({ ...p, followUpDate: fuIsEmpty(next) ? "" : next }));
        requestAnimationFrame(() => input.setSelectionRange(pos, pos));
      }
    } else if (key === "Delete") {
      const pos = fuNextDigit(cur);
      if (pos !== null) {
        const next = val.slice(0, pos) + "_" + val.slice(pos + 1);
        setNewDiag((p: any) => ({ ...p, followUpDate: fuIsEmpty(next) ? "" : next }));
        requestAnimationFrame(() => input.setSelectionRange(pos, pos));
      }
    } else if (key === "ArrowLeft") {
      const pos = fuPrevDigit(cur) ?? 0;
      requestAnimationFrame(() => input.setSelectionRange(pos, pos));
    } else if (key === "ArrowRight") {
      const pos = fuNextDigit(cur + 1) ?? cur;
      requestAnimationFrame(() => input.setSelectionRange(pos, pos));
    } else if (key === "Home") {
      requestAnimationFrame(() => input.setSelectionRange(0, 0));
    } else if (key === "End") {
      requestAnimationFrame(() => input.setSelectionRange(9, 9));
    }
  };

  const handleFollowUpFocus = () => {
    if (!newDiag.followUpDate) {
      const mask = fuInitMask();
      setNewDiag((p: any) => ({ ...p, followUpDate: mask }));
      requestAnimationFrame(() => followUpRef.current?.setSelectionRange(0, 0));
    }
  };

  const handleFollowUpClick = () => {
    requestAnimationFrame(() => {
      const input = followUpRef.current;
      if (!input) return;
      const pos = input.selectionStart ?? 0;
      // Nếu click đúng vào dấu `-`, nậy sang chữ số tiếp theo
      if (FOLLOW_UP_DASH_POS.has(pos)) {
        const next = fuNextDigit(pos) ?? pos;
        input.setSelectionRange(next, next);
      }
    });
  };

  const handleFollowUpBlur = () => {
    if (fuIsEmpty(newDiag.followUpDate || "")) {
      setNewDiag((p: any) => ({ ...p, followUpDate: "" }));
    }
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

  const resetNewDiag = () => ({ patientName: "", patientId: "", doctorName: "", diagnosis: "", date: getCurrentFormattedDate(), followUpDate: "", serviceName: "", serviceFee: 80000, notes: "", medicines: [{ ...EMPTY_MED_LINE }] });

  const handleSaveDiag = () => {
    if (!newDiag.patientName.trim() || !newDiag.diagnosis.trim()) {
      alert("Vui lòng chọn Bệnh nhân và nhập Chẩn đoán!");
      return;
    }

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
            alert(`Không đủ thuốc trong kho cho ${med.medicineName}. Tồn kho hiện tại: ${currentStock}`);
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

      setDiagnoses(diagnoses.map(d => d.id === editingDiagId ? { id: editingDiagId, ...newDiag } : d));
    } else {
      const nextId = diagnoses.length > 0 ? Math.max(...diagnoses.map(d => d.id)) + 1 : 1;
      setDiagnoses([{ id: nextId, ...newDiag }, ...diagnoses]);

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

    setNewDiag(resetNewDiag());
    setShowAddModal(false);
    setEditingDiagId(null);
    localStorage.removeItem("khambenh_draft_diag");
  };

  const handleEditClick = (diag: any) => {
    setEditingDiagId(diag.id);
    const existingFollowUp = diag.followUpDate || "";
    setNewDiag({ patientName: diag.patientName, doctorName: diag.doctorName, diagnosis: diag.diagnosis, date: diag.date, followUpDate: existingFollowUp, serviceName: diag.serviceName, serviceFee: diag.serviceFee, notes: diag.notes || "", medicines: (diag.medicines && diag.medicines.length > 0) ? diag.medicines : [{ ...EMPTY_MED_LINE }] });
    setShowAddModal(true);
  };

  const handleDeleteDiag = (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phiếu khám này không? Thuốc đã kê sẽ được hoàn lại vào kho.")) {
      const diagToDelete = diagnoses.find(d => d.id === id);

      if (diagToDelete && diagToDelete.medicines) {
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

      setDiagnoses(diagnoses.filter(d => d.id !== id));
    }
  };

  const updateMedLine = (idx: number, field: string, value: any) => setNewDiag({ ...newDiag, medicines: newDiag.medicines.map((m: any, i: number) => i === idx ? { ...m, [field]: value } : m) });
  const addMedLine = () => setNewDiag({ ...newDiag, medicines: [...newDiag.medicines, { ...EMPTY_MED_LINE }] });
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
    return matchSearch(diag.patientName, searchTerm) ||
      matchSearch(diag.doctorName, searchTerm) ||
      matchSearch(diag.serviceName, searchTerm);
  });

  const totalPages = Math.ceil(filteredDiagnoses.length / itemsPerPage);
  const paginatedDiagnoses = filteredDiagnoses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalRevenue = filteredDiagnoses.reduce((acc, diag) => {
    return acc + (Number(diag.serviceFee) || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{"Khám Bệnh & Kê Toa"}</h1>
          <p className="text-slate-500 mt-1">Ghi nhận chuẩn đoán và xuất toa thuốc cho bệnh nhân</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 shadow-sm flex items-center">
            <span className="text-sm font-medium mr-2">Tổng Doanh Thu:</span>
            <span className="text-lg font-bold">{totalRevenue.toLocaleString('vi-VN')} ₫</span>
          </div>
          <button onClick={() => {
            setEditingDiagId(null);
            const draft = localStorage.getItem("khambenh_draft_diag");
            if (draft) {
              try { setNewDiag(JSON.parse(draft)); } catch { setNewDiag(resetNewDiag()); }
            } else {
              setNewDiag(resetNewDiag());
            }
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
            <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Tìm kiếm theo tên bệnh nhân..." className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-slate-900 placeholder-slate-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Thời gian</th>
                <th className="px-6 py-3 font-medium">B&#7879;nh nh&#226;n</th>
                <th className="px-6 py-3 font-medium">Bác sĩ khám</th>
                <th className="px-6 py-3 font-medium">Ch&#7849;n &#273;o&#225;n</th>
                <th className="px-6 py-3 font-medium">Thuốc kê</th>
                <th className="px-6 py-3 font-medium">Lịch tái khám</th>
                <th className="px-6 py-3 font-medium">Lưu ý</th>
                <th className="px-6 py-3 font-medium text-right">Toa thuốc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedDiagnoses.map((diag) => (
                <tr key={diag.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500">{formatDateDisplay(diag.date)}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{diag.patientName}</td>
                  <td className="px-6 py-4 text-slate-600">{diag.doctorName}</td>
                  <td className="px-6 py-4 text-slate-800 font-medium">{diag.diagnosis}</td>
                  <td className="px-6 py-4">
                    {diag.medicines && diag.medicines.filter((m: any) => m.medicineName).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {diag.medicines.filter((m: any) => m.medicineName).map((m: any, i: number) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                            {m.medicineName} <span className="ml-1 text-emerald-500">x{m.medicineQuantity}</span>
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-slate-400 italic text-xs">Chua ke thuoc</span>}
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
                      <button onClick={() => handleDeleteDiag(diag.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setEditingDiagId(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-200">{editingDiagId ? "Chỉnh Sửa Phiếu Khám" : "Phiếu Khám Mới"}</h3>
            <div className="space-y-6">

              {/* Thông tin khám */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600" /> Thông Tin Khám
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên Bệnh Nhân</label>
                    <select
                      value={newDiag.patientId || ""}
                      onChange={e => {
                        const pt = savedPatients.find((p: any) => p.id === e.target.value);
                        setNewDiag({ ...newDiag, patientId: e.target.value, patientName: pt ? pt.name : "" });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                    >
                      <option value="">-- Chọn bệnh nhân --</option>
                      {savedPatients.map((pt: any) => (
                        <option key={pt.id} value={pt.id}>{pt.name} ({pt.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
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

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ch&#7849;n &#273;o&#225;n</label>
                    <input type="text" value={newDiag.diagnosis} onChange={e => setNewDiag({ ...newDiag, diagnosis: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900"
                      placeholder="Bệnh..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian</label>
                    <input type="text" value={newDiag.date} onChange={e => setNewDiag({ ...newDiag, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900" placeholder="DD-MM-YYYY" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lịch Tái Khám</label>
                    <input
                      ref={followUpRef}
                      type="text"
                      value={newDiag.followUpDate}
                      onChange={() => { }}
                      onKeyDown={handleFollowUpKeyDown}
                      onFocus={handleFollowUpFocus}
                      onClick={handleFollowUpClick}
                      onBlur={handleFollowUpBlur}
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 tracking-widest"
                      placeholder="DD-MM-YYYY"
                    />
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

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-medium text-left">T&#234;n thu&#7889;c</th>
                          <th className="px-3 py-2 font-medium text-center w-12">SL</th>
                          <th className="px-3 py-2 font-medium text-center w-10">&#272;V</th>
                          <th className="px-3 py-2 font-medium text-left min-w-[280px]">Cách dùng</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {newDiag.medicines.map((med: any, idx: number) => {
                          const medInfo = availableMedicines.find((m: any) => m.name === med.medicineName);
                          return (
                            <tr key={idx}>
                              <td className="px-2 py-1.5">
                                <select value={med.medicineName} onChange={e => updateMedLine(idx, "medicineName", e.target.value)} className="w-full px-1 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 text-xs">
                                  <option value="">-- Chọn thuốc --</option>
                                  {availableMedicines.map((m: any) => <option key={m.id} value={m.name}>{m.name}</option>)}
                                </select>
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="number" min="1" value={med.medicineQuantity} onChange={e => updateMedLine(idx, "medicineQuantity", parseInt(e.target.value) || 1)} className="w-full px-1 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-900 text-xs text-center" />
                              </td>
                              <td className="px-1 py-1.5">
                                <input type="text" value={med.medicineUnit ?? medInfo?.unit ?? (med.medicineName ? "Viên" : "")} onChange={e => updateMedLine(idx, "medicineUnit", e.target.value)} className="w-full px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white text-[11px]" placeholder="ĐV" />
                              </td>
                              <td className="px-1 py-1.5">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1 text-[11px] text-slate-700 whitespace-nowrap">
                                    Uống <input type="text" value={med.medDays || ""} onChange={e => updateMedLine(idx, "medDays", e.target.value)} className="w-8 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" /> ngày,
                                    mỗi ngày <input type="text" value={med.medTimes || ""} onChange={e => updateMedLine(idx, "medTimes", e.target.value)} className="w-8 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" /> lần,
                                    mỗi lần <input type="text" value={med.medAmount || ""} onChange={e => updateMedLine(idx, "medAmount", e.target.value)} className="w-8 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" />
                                    <input type="text" value={med.medCustomUnit ?? "viên"} onChange={e => updateMedLine(idx, "medCustomUnit", e.target.value)} className="w-10 px-1 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900 font-medium bg-white" />
                                  </div>
                                  <input type="text" value={med.medicineNote || ""} onChange={e => updateMedLine(idx, "medicineNote", e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs text-slate-900 bg-white placeholder:text-slate-400" placeholder="Ghi chú thêm (VD: Uống sau khi ăn...)" />
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

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowAddModal(false); setEditingDiagId(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
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
              <div className="text-center mb-8 mt-4">
                <h2 className="text-3xl font-bold uppercase tracking-wider mb-2">Đơn Thuốc</h2>
                <p className="text-sm text-slate-600">
                  Mã đơn: <span className="font-medium">{viewingPrescription.id}</span> -
                  Ngày khám: <span className="font-medium">{formatDateDisplay(viewingPrescription.date)}</span>
                </p>
                {viewingPrescription.doctorName && (
                  <p className="text-lg text-slate-800 mt-2 font-medium">
                    Bác sĩ: <span className="font-bold text-green-700 text-xl">{viewingPrescription.doctorName}</span>
                  </p>
                )}
              </div>

              {/* Thông tin bệnh nhân */}
              {(() => {
                const pt = savedPatients.find((p: any) => viewingPrescription.patientId ? p.id === viewingPrescription.patientId : p.name === viewingPrescription.patientName) || {};
                return (
                  <div className="space-y-4 mb-8 text-base">
                    <div className="flex gap-2 items-end">
                      <span className="font-semibold whitespace-nowrap">Họ tên:</span>
                      <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">{viewingPrescription.patientName}</span>
                    </div>
                    <div className="flex gap-6 items-end">
                      <div className="flex gap-2 items-end flex-1">
                        <span className="font-semibold whitespace-nowrap">Ngày sinh:</span>
                        <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">
                          {(pt as any).dob ? `${new Date((pt as any).dob).toLocaleDateString('vi-VN')} (${calculateAge((pt as any).dob)})` : ""}
                        </span>
                      </div>
                      <div className="flex gap-2 items-end w-48">
                        <span className="font-semibold whitespace-nowrap">Giới tính:</span>
                        <span className="flex-1 border-b-2 border-dotted border-slate-300 flex items-center justify-around pb-1 text-sm">
                          <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" readOnly checked={(pt as any).gender === "Nam"} /> Nam</label>
                          <label className="flex items-center gap-1"><input type="checkbox" className="w-3 h-3" readOnly checked={(pt as any).gender === "Nữ"} /> Nữ</label>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-end flex-wrap">
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">Cân nặng:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[50px]">{(pt as any).weight ? `${(pt as any).weight} kg` : ""}</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">Chiều cao:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[50px]">{(pt as any).height ? `${(pt as any).height} cm` : ""}</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">BMI:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[40px]">{(pt as any).weight && (pt as any).height ? calculateBMI((pt as any).weight, (pt as any).height) : ""}</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <span className="font-semibold whitespace-nowrap">NĐ:</span>
                        <span className="border-b-2 border-dotted border-slate-300 px-2 min-w-[40px]">{(pt as any).temperature ? `${(pt as any).temperature} °C` : ""}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-end">
                      <span className="font-semibold whitespace-nowrap">Địa chỉ:</span>
                      <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">{(pt as any).address || ""}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 items-end mb-6">
                <span className="font-semibold whitespace-nowrap">Chẩn đoán:</span>
                <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-medium">{viewingPrescription.diagnosis}</span>
              </div>

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
                        <span className="border-b-2 border-dotted border-slate-300 min-w-[60px] text-center inline-block font-medium px-2">{item.quantity}</span>
                        <span className="mr-6">{item.unit}</span>

                        <span className="whitespace-nowrap">Uống {item.medDays || "...."} ngày, mỗi ngày {item.medTimes || "...."} lần, mỗi lần {item.medAmount || "...."} {item.medCustomUnit}.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tiền dịch vụ & Ghi chú */}
              <div className="space-y-4 mb-10 text-base">
                <div className="flex gap-2 items-end">
                  <span className="font-bold whitespace-nowrap">Tiền dịch vụ:</span>
                  <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2 font-bold text-lg">
                    {(Number(viewingPrescription.serviceFee) || 80000).toLocaleString("vi-VN")} &#8363;
                  </span>
                </div>
                <div className="flex gap-2 items-end">
                  <span className="font-bold whitespace-nowrap">Ghi chú:</span>
                  <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">{viewingPrescription.notes}</span>
                </div>
                <div className="flex gap-2 items-end uppercase">
                  <span className="font-bold whitespace-nowrap">Tái khám:</span>
                  <span className="flex-1 border-b-2 border-dotted border-slate-300 px-2">{viewingPrescription.followUpDate}</span>
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
      )}</div>
  );
}








