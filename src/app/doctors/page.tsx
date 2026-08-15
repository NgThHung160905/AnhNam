"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Stethoscope, Edit2, Trash2 } from "lucide-react";

const DUMMY_DOCTORS = [
  { id: "BS001", name: "Lê Văn C", specialty: "Nội khoa", phone: "0912345678", email: "levanc@clinic.com" },
  { id: "BS002", name: "Phạm Thị D", specialty: "Ngoại khoa", phone: "0923456789", email: "phamthid@clinic.com" },
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState(DUMMY_DOCTORS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: "", specialty: "", phone: "", email: "" });
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const saved = localStorage.getItem("khambenh_doctors");
    if (saved) {
      try {
        setDoctors(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("khambenh_doctors", JSON.stringify(doctors));
    }
  }, [doctors, isLoaded]);

  const handleSaveDoctor = () => {
    if (!newDoctor.name.trim()) {
      alert("Vui lòng nhập Họ và tên!");
      return;
    }

    const processedDoctor = {
      name: newDoctor.name.trim(),
      specialty: newDoctor.specialty.trim() || "...",
      phone: newDoctor.phone.trim() || "...",
      email: newDoctor.email.trim() || "..."
    };

    if (editingDoctorId) {
      setDoctors(doctors.map(d => d.id === editingDoctorId ? { id: editingDoctorId, ...processedDoctor } : d));
    } else {
      const nextIdNum = doctors.length > 0
        ? Math.max(...doctors.map(d => parseInt(d.id.replace('BS', '')))) + 1
        : 1;
      const newId = `BS${String(nextIdNum).padStart(3, '0')}`;

      setDoctors([{ id: newId, ...processedDoctor }, ...doctors]);
    }

    setNewDoctor({ name: "", specialty: "", phone: "", email: "" });
    setShowAddModal(false);
    setEditingDoctorId(null);
  };

  const handleEditClick = (doctor: any) => {
    setEditingDoctorId(doctor.id);
    setNewDoctor({ name: doctor.name, specialty: doctor.specialty, phone: doctor.phone, email: doctor.email });
    setShowAddModal(true);
  };

  const handleDeleteDoctor = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bác sĩ này không?")) {
      setDoctors(doctors.filter(d => d.id !== id));
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

  const filteredDoctors = doctors.filter(d => {
    return matchSearch(d.name, searchTerm) || matchSearch(d.id, searchTerm);
  });

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh sách Bác sĩ</h1>
          <p className="text-slate-500 mt-1">Quản lý đội ngũ bác sĩ của phòng khám</p>
        </div>
        <button
          onClick={() => {
            setEditingDoctorId(null);
            setNewDoctor({ name: "", specialty: "", phone: "", email: "" });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm shadow-emerald-500/20"
        >
          <Stethoscope className="w-4 h-4" />
          <span>Thêm bác sĩ</span>
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
              placeholder="Tìm kiếm bác sĩ..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-900 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Mã BS</th>
                <th className="px-6 py-3 font-medium">Họ và tên</th>
                <th className="px-6 py-3 font-medium">Chuyên khoa</th>
                <th className="px-6 py-3 font-medium">Số điện thoại</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedDoctors.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-emerald-600">{doctor.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{doctor.name}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-medium">
                      {doctor.specialty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{doctor.phone}</td>
                  <td className="px-6 py-4 text-slate-600">{doctor.email}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEditClick(doctor)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteDoctor(doctor.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setEditingDoctorId(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingDoctorId ? "Chỉnh Sửa Thông Tin" : "Thêm Bác Sĩ Mới"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input type="text" value={newDoctor.name} onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                  placeholder="Nhập họ và tên..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chuyên khoa</label>
                <input type="text" value={newDoctor.specialty} onChange={e => setNewDoctor({ ...newDoctor, specialty: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                  placeholder="Nhập chuyên khoa..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                  <input type="text" value={newDoctor.phone} onChange={e => setNewDoctor({ ...newDoctor, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    placeholder="Nhập số điện thoại..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={newDoctor.email} onChange={e => setNewDoctor({ ...newDoctor, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    placeholder="Nhập email..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setShowAddModal(false); setEditingDoctorId(null); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
                <button onClick={handleSaveDoctor} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">Lưu lại</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
