"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, orderBy } from "firebase/firestore"; // Will use firestore in real app
import { Plus, Search, UserPlus, Edit2, Trash2, Activity, UserMinus, UserCheck, AlertTriangle } from "lucide-react";

// Dummy data for preview
const DUMMY_PATIENTS = [
  { id: "BN001", name: "Nguyễn Văn A", gender: "Nam", phone: "0901234567", address: "Hà Nội", dob: "2020-01-01", weight: "15", height: "100", temperature: "37" },
  { id: "BN002", name: "Trần Thị B", gender: "Nữ", phone: "0987654321", address: "TP HCM", dob: "2019-05-15", weight: "20", height: "115", temperature: "37" },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState(DUMMY_PATIENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", phone: "", gender: "Nam", address: "", dob: "", weight: "", height: "", temperature: "37" });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const getBMIDescription = (bmiStr: string) => {
    const bmi = parseFloat(bmiStr);
    if (isNaN(bmi)) return null;
    if (bmi < 18.5) return { text: "Gầy (Thiếu cân)", color: "text-amber-700 bg-amber-50 border-amber-200", icon: UserMinus };
    if (bmi < 23) return { text: "Bình thường (Cân nặng lý tưởng)", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: UserCheck };
    if (bmi < 25) return { text: "Thừa cân", color: "text-orange-700 bg-orange-50 border-orange-200", icon: UserPlus };
    return { text: "Béo phì", color: "text-red-700 bg-red-50 border-red-200", icon: AlertTriangle };
  };

  const handleSavePatient = () => {
    if (!newPatient.name.trim() || !newPatient.phone.trim()) {
      alert("Vui lòng nhập đầy đủ Họ và tên và Số điện thoại!");
      return;
    }

    if (editingPatientId) {
      setPatients(patients.map(p => p.id === editingPatientId ? { id: editingPatientId, ...newPatient } : p));
    } else {
      // Generate new ID like BN003
      const nextIdNum = patients.length > 0
        ? Math.max(...patients.map(p => parseInt(p.id.replace('BN', '')))) + 1
        : 1;
      const newId = `BN${String(nextIdNum).padStart(3, '0')}`;

      setPatients([{ id: newId, ...newPatient }, ...patients]);
    }

    setNewPatient({ name: "", phone: "", gender: "Nam", address: "", dob: "", weight: "", height: "", temperature: "37" });
    setShowAddModal(false);
    setEditingPatientId(null);
    localStorage.removeItem("khambenh_draft_patient");
  };

  const handleEditClick = (patient: any) => {
    setEditingPatientId(patient.id);
    setNewPatient({ 
      name: patient.name || "", 
      phone: patient.phone || "", 
      gender: patient.gender || "Nam", 
      address: patient.address || "",
      dob: patient.dob || "",
      weight: patient.weight || "",
      height: patient.height || "",
      temperature: patient.temperature || "37"
    });
    setShowAddModal(true);
  };

  const handleDeletePatient = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bệnh nhân này không?")) {
      setPatients(patients.filter(p => p.id !== id));
    }
  };

  // Load and save data to localStorage to prevent data loss on refresh
  useEffect(() => {
    const saved = localStorage.getItem("khambenh_patients");
    if (saved) {
      try {
        setPatients(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load patients from local storage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("khambenh_patients", JSON.stringify(patients));
    }
  }, [patients, isLoaded]);

  // Auto-save draft khi đang nhập bệnh nhân mới
  useEffect(() => {
    if (showAddModal && !editingPatientId && isLoaded) {
      localStorage.setItem("khambenh_draft_patient", JSON.stringify(newPatient));
    }
  }, [newPatient, showAddModal, editingPatientId, isLoaded]);

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

  const filteredPatients = patients.filter(p => {
    return matchSearch(p.name, searchTerm) || matchSearch(p.id, searchTerm);
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh sách Bệnh nhân</h1>
          <p className="text-slate-500 mt-1">Quản lý thông tin hồ sơ bệnh nhân</p>
        </div>
        <button
          onClick={() => {
            setEditingPatientId(null);
            const draft = localStorage.getItem("khambenh_draft_patient");
            if (draft) {
              try { setNewPatient(JSON.parse(draft)); } catch { setNewPatient({ name: "", phone: "", gender: "Nam", address: "", dob: "", weight: "", height: "", temperature: "37" }); }
            } else {
              setNewPatient({ name: "", phone: "", gender: "Nam", address: "", dob: "", weight: "", height: "", temperature: "37" });
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm shadow-blue-500/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm bệnh nhân</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm theo tên hoặc mã bệnh nhân..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-900 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Mã BN</th>
                <th className="px-6 py-3 font-medium">Họ và tên</th>
                <th className="px-6 py-3 font-medium">Giới tính</th>
                <th className="px-6 py-3 font-medium">Số điện thoại</th>
                <th className="px-6 py-3 font-medium">Địa chỉ</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-blue-600">{patient.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{patient.name}</td>
                  <td className="px-6 py-4 text-slate-600">{patient.gender}</td>
                  <td className="px-6 py-4 text-slate-600">{patient.phone}</td>
                  <td className="px-6 py-4 text-slate-600">{patient.address}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(patient)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(patient.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      {/* Modal Thêm/Sửa */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setEditingPatientId(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {editingPatientId ? "Chỉnh Sửa Thông Tin" : "Thêm Bệnh Nhân Mới"}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Nhập họ và tên..."
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ngày tháng năm sinh</label>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                          type="date"
                          value={newPatient.dob}
                          onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                          className="w-full sm:w-auto flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                        />
                        {newPatient.dob && calculateAge(newPatient.dob) && (
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 whitespace-nowrap">
                            {calculateAge(newPatient.dob)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full sm:w-28 shrink-0">
                      <label className="block text-sm font-medium text-slate-700 mb-1">NĐ (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newPatient.temperature}
                        onChange={(e) => setNewPatient({ ...newPatient, temperature: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 text-center"
                        placeholder="37"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cân nặng (Kg)</label>
                  <input
                    type="number"
                    value={newPatient.weight}
                    onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Ví dụ: 15"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chiều cao (cm)</label>
                  <input
                    type="number"
                    value={newPatient.height}
                    onChange={(e) => setNewPatient({ ...newPatient, height: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Ví dụ: 100"
                  />
                </div>

                {(() => {
                  const bmiVal = calculateBMI(newPatient.weight, newPatient.height);
                  if (!bmiVal) return null;
                  const desc = getBMIDescription(bmiVal);
                  if (!desc) return null;
                  const Icon = desc.icon;
                  return (
                    <div className="col-span-2">
                      <div className={`text-sm font-medium px-3 py-2 rounded-lg border inline-flex items-center gap-2 self-start ${desc.color}`}>
                        <Icon className="w-5 h-5" />
                        <span><span className="font-bold">BMI:</span> {bmiVal} - {desc.text}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Nhập số điện thoại..."
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    placeholder="Nhập địa chỉ..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowAddModal(false); setEditingPatientId(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
                <button onClick={handleSavePatient} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Lưu lại</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
