"use client";

import { useState, useEffect } from "react";
import { Search, Pill, Edit2, Trash2 } from "lucide-react";
import { recordMedicinePriceChange } from "@/lib/medicinePriceService";

const formatVND = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

const DUMMY_MEDICINES = [
  { id: "T001", name: "Paracetamol 500mg", type: "Giảm đau hạ sốt", unit: "Viên", price: 2000, stock: 100 },
  { id: "T002", name: "Amoxicillin 500mg", type: "Kháng sinh", unit: "Viên", price: 5000, stock: 200 },
  { id: "T003", name: "Vitamin C 1000mg", type: "Vitamin", unit: "Hộp", price: 45000, stock: 50 },
];

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState(DUMMY_MEDICINES);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({ id: "", name: "", type: "", unit: "", price: "", stock: "" });
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [deletingMed, setDeletingMed] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
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
    const trimmedId = newMed.id.trim();
    if (!trimmedId) {
      setError("Vui lòng nhập Mã thuốc!");
      return;
    }

    if (!newMed.name.trim() || !newMed.type.trim()) {
      setError("Vui lòng nhập Tên Thuốc và Loại!");
      return;
    }

    // Kiểm tra trùng lặp mã thuốc
    const isDuplicate = medicines.some(
      (m) => m.id.toLowerCase() === trimmedId.toLowerCase() && m.id !== editingMedId
    );
    if (isDuplicate) {
      setError(`Mã thuốc "${trimmedId}" đã tồn tại! Vui lòng nhập mã thuốc khác.`);
      return;
    }

    setError("");

    const parsedPrice = newMed.price !== "" ? Number(newMed.price) : 0;
    const parsedStock = newMed.stock !== "" ? Number(newMed.stock) : 0;

    if (editingMedId) {
      const existing = medicines.find((m) => m.id === editingMedId);
      const oldPrice = existing ? (typeof existing.price === "number" ? existing.price : (parseInt(String(existing.price || "0").replace(/\D/g, ""), 10) || 0)) : 0;
      if (existing && oldPrice !== parsedPrice) {
        recordMedicinePriceChange(trimmedId, newMed.name, oldPrice, parsedPrice);
      }

      const updated = medicines.map((m) =>
        m.id === editingMedId
          ? { ...newMed, id: trimmedId, price: parsedPrice, stock: parsedStock }
          : m
      );
      setMedicines(updated);
      localStorage.setItem("khambenh_medicines", JSON.stringify(updated));
      window.dispatchEvent(new Event("khambenh_medicines_updated"));
    } else {
      const updated = [
        { ...newMed, id: trimmedId, price: parsedPrice, stock: parsedStock },
        ...medicines,
      ];
      setMedicines(updated);
      localStorage.setItem("khambenh_medicines", JSON.stringify(updated));
      window.dispatchEvent(new Event("khambenh_medicines_updated"));
    }

    setNewMed({ id: "", name: "", type: "", unit: "", price: "", stock: "" });
    setShowAddModal(false);
    setEditingMedId(null);
    setError("");
    localStorage.removeItem("khambenh_draft_med");
  };

  const handleEditClick = (med: any) => {
    setEditingMedId(med.id);
    setNewMed({
      id: med.id,
      name: med.name,
      type: med.type,
      unit: med.unit,
      price: med.price !== undefined && med.price !== null ? med.price.toString() : "",
      stock: med.stock !== undefined && med.stock !== null ? med.stock.toString() : "",
    });
    setError("");
    setShowAddModal(true);
  };

  const handleDeleteMed = (med: any) => {
    setDeletingMed(med);
  };

  const confirmDeleteMed = () => {
    if (deletingMed) {
      const updated = medicines.filter(m => m.id !== deletingMed.id);
      setMedicines(updated);
      const newTotal = Math.ceil(updated.length / itemsPerPage);
      if (currentPage > newTotal && newTotal > 0) {
        setCurrentPage(newTotal);
      }
      localStorage.setItem("khambenh_medicines", JSON.stringify(updated));
      window.dispatchEvent(new Event("khambenh_medicines_updated"));
      setDeletingMed(null);
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
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedMedicines = filteredMedicines.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);

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
              try {
                const parsed = JSON.parse(draft);
                setNewMed({
                  id: parsed.id || "",
                  name: parsed.name || "",
                  type: parsed.type || "",
                  unit: parsed.unit || "",
                  price: parsed.price !== undefined && parsed.price !== null ? String(parsed.price) : "",
                  stock: parsed.stock !== undefined && parsed.stock !== null ? String(parsed.stock) : "",
                });
              } catch {
                setNewMed({ id: "", name: "", type: "", unit: "", price: "", stock: "" });
              }
            } else {
              setNewMed({ id: "", name: "", type: "", unit: "", price: "", stock: "" });
            }
            setError("");
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
                <th className="px-6 py-3 font-medium">Đơn Giá</th>
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
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {med.price !== undefined && med.price !== null && (med.price as any) !== ""
                      ? formatVND(Number(med.price))
                      : "-"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">{med.stock !== undefined ? med.stock : "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEditClick(med)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteMed(med)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa thuốc">
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setEditingMedId(null); setError(""); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingMedId ? "Chỉnh Sửa Thuốc" : "Thêm Thuốc Mới"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mã Thuốc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMed.id}
                    onChange={(e) => setNewMed({ ...newMed, id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Nhập Mã Thuốc..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tên Thuốc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMed.name}
                    onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Nhập tên thuốc..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Loại <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={newMed.type} onChange={e => setNewMed({ ...newMed, type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Nhập loại..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị</label>
                  <input type="text" value={newMed.unit} onChange={e => setNewMed({ ...newMed, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Viên, Hộp, Vỉ..." />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Đơn Giá (VNĐ)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={newMed.price}
                      onChange={(e) => setNewMed({ ...newMed, price: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                      placeholder="Ví dụ: 5000..."
                    />
                    {newMed.price !== "" && !isNaN(Number(newMed.price)) && Number(newMed.price) > 0 && (
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                        Thành tiền: {formatVND(Number(newMed.price))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kho (Số lượng tồn)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMed.stock}
                    onChange={(e) => setNewMed({ ...newMed, stock: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                    placeholder="Tồn kho..."
                  />
                </div>
              </div>
            </div>
            {error && <div className="text-red-500 text-sm font-medium mt-4">{error}</div>}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setEditingMedId(null); setError(""); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
              <button onClick={handleSaveMed} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors">Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa */}
      {deletingMed && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => setDeletingMed(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Xác nhận xóa thuốc</h3>
            <p className="text-slate-600 text-sm mb-6">
              Bạn có chắc chắn muốn xóa thuốc <span className="font-semibold text-slate-800">{deletingMed.name}</span> ({deletingMed.id}) không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingMed(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeleteMed}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                Xóa thuốc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



