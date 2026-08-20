"use client";

import { useState, useEffect } from "react";
import { Search, Pill, Edit2, Trash2 } from "lucide-react";

const DUMMY_MEDICINES = [
  { id: "T001", name: "Paracetamol 500mg", type: "Giảm đau hạ sốt", unit: "Viên", stock: 100 },
  { id: "T002", name: "Amoxicillin 500mg", type: "Kháng sinh", unit: "Viên", stock: 200 },
  { id: "T003", name: "Vitamin C 1000mg", type: "Vitamin", unit: "Hộp", stock: 50 },
];

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState(DUMMY_MEDICINES);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", type: "", unit: "", stock: "" });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadMeds = () => {
      const saved = localStorage.getItem("khambenh_medicines");
      if (saved) {
        try { setMedicines(JSON.parse(saved)); } catch (e) { }
      }
    };
    loadMeds();
    setIsLoaded(true);

    window.addEventListener("khambenh_medicines_updated", loadMeds);
    return () => window.removeEventListener("khambenh_medicines_updated", loadMeds);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("khambenh_medicines", JSON.stringify(medicines));
    }
  }, [medicines, isLoaded]);

  // Auto-save draft khi đang nhập thuốc mới
  useEffect(() => {
    if (showAddModal && !editingMedId && isLoaded) {
      localStorage.setItem("khambenh_draft_med", JSON.stringify(newMed));
    }
  }, [newMed, showAddModal, editingMedId, isLoaded]);

  const handleSaveMed = () => {
    if (!newMed.name.trim() || !newMed.type.trim()) {
      alert("Vui lòng nhập Tên thuốc và Loại!");
      return;
    }

    if (editingMedId) {
      setMedicines(medicines.map(m => m.id === editingMedId ? { id: editingMedId, ...newMed, stock: Number(newMed.stock) } : m));
    } else {
      const nextIdNum = medicines.length > 0 ? Math.max(...medicines.map(m => parseInt(m.id.replace('T', '')))) + 1 : 1;
      const newId = `T${String(nextIdNum).padStart(3, '0')}`;
      setMedicines([{ id: newId, ...newMed, stock: Number(newMed.stock) }, ...medicines]);
    }

    setNewMed({ name: "", type: "", unit: "", stock: "" });
    setShowAddModal(false);
    setEditingMedId(null);
    localStorage.removeItem("khambenh_draft_med");
  };

  const handleEditClick = (med: any) => {
    setEditingMedId(med.id);
    setNewMed({ name: med.name, type: med.type, unit: med.unit, stock: med.stock ? med.stock.toString() : "" });
    setShowAddModal(true);
  };

  const handleDeleteMed = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thuốc này không?")) {
      setMedicines(medicines.filter(m => m.id !== id));
    }
  };

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

  const filteredMedicines = medicines.filter(m => {
    return matchSearch(m.name, searchTerm) || matchSearch(m.id, searchTerm) || matchSearch(m.type || "", searchTerm);
  });

  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  const paginatedMedicines = filteredMedicines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Kho thuốc</h1>
          <p className="text-slate-500 mt-1">Quản lý danh mục thuốc và vật tư y tế</p>
        </div>
        <button
          onClick={() => {
            setEditingMedId(null);
            const draft = localStorage.getItem("khambenh_draft_med");
            if (draft) {
              try { setNewMed(JSON.parse(draft)); } catch { setNewMed({ name: "", type: "", unit: "", stock: "" }); }
            } else {
              setNewMed({ name: "", type: "", unit: "", stock: "" });
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm shadow-amber-500/20"
        >
          <Pill className="w-4 h-4" />
          <span>Thêm thuốc mới</span>
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
              placeholder="Tìm kiếm thuốc..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-slate-900 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Mã Thuốc</th>
                <th className="px-6 py-3 font-medium">Tên Thuốc</th>
                <th className="px-6 py-3 font-medium">Loại</th>
                <th className="px-6 py-3 font-medium">Đơn vị</th>
                <th className="px-6 py-3 font-medium">Kho</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedMedicines.map((med) => (
                <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-amber-600">{med.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{med.name}</td>
                  <td className="px-6 py-4 text-slate-600">{med.type}</td>
                  <td className="px-6 py-4 text-slate-600">{med.unit}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">{med.stock !== undefined ? med.stock : "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEditClick(med)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteMed(med.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setEditingMedId(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingMedId ? "Chỉnh Sửa Thuốc" : "Thêm Thuốc Mới"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên Thuốc</label>
                <input type="text" value={newMed.name} onChange={e => setNewMed({ ...newMed, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                  placeholder="Nhập tên thuốc..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                  <input type="text" value={newMed.type} onChange={e => setNewMed({ ...newMed, type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Nhập loại..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị</label>
                  <input type="text" value={newMed.unit} onChange={e => setNewMed({ ...newMed, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Viên, Hộp, Vỉ..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kho</label>
                <input type="number" min="0" value={newMed.stock} onChange={e => setNewMed({ ...newMed, stock: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                  placeholder="Tồn kho..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setEditingMedId(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
              <button onClick={handleSaveMed} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">Lưu lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
    ;
}



