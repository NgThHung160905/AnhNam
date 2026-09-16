import { MedicalVisit, PatientMedicalSummaryData, PatientSummaryInfo } from "@/types/patient-summary";

/**
 * Định dạng mã bệnh nhân chỉ chứa số với 4 chữ số (ví dụ: BN001 -> 0001, 1 -> 0001)
 */
export function formatPatientCode(idStr?: string): string {
  if (!idStr) return "0001";
  const num = parseInt(idStr.replace(/\D/g, ""), 10);
  return !isNaN(num) ? String(num).padStart(4, "0") : idStr;
}

/**
 * Chuẩn hóa ngày khám sang định dạng ngắn DD-MM-YY (hoặc DD-MM-YYYY)
 * Ví dụ: "2026-09-01" -> "01-09-26", "01-09-2026" -> "01-09-26"
 */
export function formatExaminationDate(dateStr: string): string {
  if (!dateStr) return "";
  const cleaned = dateStr.trim();

  // Khớp YYYY-MM-DD
  const matchYMD = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchYMD) {
    const [, y, m, d] = matchYMD;
    const shortYear = y.length === 4 ? y.slice(2) : y;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${shortYear}`;
  }

  // Khớp DD-MM-YYYY
  const matchDMY = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (matchDMY) {
    const [, d, m, y] = matchDMY;
    const shortYear = y.length === 4 ? y.slice(2) : y;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${shortYear}`;
  }

  return cleaned;
}

/**
 * Chuẩn hóa danh sách thuốc đã dùng thành dạng chuỗi tên thuốc (phẩy ngăn cách)
 * Không bao gồm số lượng thuốc theo đúng yêu cầu chức năng
 */
export function formatMedicationsList(medicines: any[]): string {
  if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return "—";
  }

  const names = medicines
    .map((m) => (typeof m === "string" ? m : m?.medicineName || m?.name || ""))
    .filter((n) => Boolean(n && n.trim()));

  return names.length > 0 ? names.join(", ") : "—";
}

/**
 * Lấy toàn bộ thông tin bệnh nhân và lịch sử khám bệnh (Tóm tắt bệnh án)
 * @param patientId Mã số bệnh nhân (ví dụ: 0001, BN001 hoặc 001)
 * @param fallbackPatient Thông tin bệnh nhân truyền vào trực tiếp nếu có
 */
export function getPatientMedicalSummary(
  patientId: string,
  fallbackPatient?: any
): PatientMedicalSummaryData {
  if (typeof window === "undefined") {
    return {
      patient: fallbackPatient || null,
      visits: [],
    };
  }

  let patientInfo: PatientSummaryInfo | null = null;
  const targetNum = parseInt(patientId.replace(/\D/g, ""), 10);

  // 1. Tìm thông tin bệnh nhân trong localStorage
  try {
    const patientsRaw = localStorage.getItem("khambenh_patients");
    if (patientsRaw) {
      const patientsList: any[] = JSON.parse(patientsRaw);
      const found = patientsList.find((p) => {
        if (p.id === patientId) return true;
        const pNum = parseInt(p.id?.replace(/\D/g, ""), 10);
        return !isNaN(targetNum) && !isNaN(pNum) && pNum === targetNum;
      });
      if (found) {
        patientInfo = {
          id: formatPatientCode(found.id),
          name: found.name,
          gender: found.gender || "Nam",
          dob: found.dob || "",
          phone: found.phone || "",
          address: found.address || "",
          weight: found.weight || "",
          height: found.height || "",
          temperature: found.temperature || "",
        };
      }
    }
  } catch (err) {
    console.error("Lỗi khi đọc danh sách bệnh nhân từ localStorage:", err);
  }

  // Nếu chưa tìm thấy thì dùng fallback từ giao diện
  if (!patientInfo && fallbackPatient) {
    patientInfo = {
      id: formatPatientCode(fallbackPatient.id || patientId),
      name: fallbackPatient.name || "Bệnh nhân",
      gender: fallbackPatient.gender || "Nam",
      dob: fallbackPatient.dob || "",
      phone: fallbackPatient.phone || "",
      address: fallbackPatient.address || "",
      weight: fallbackPatient.weight || "",
      height: fallbackPatient.height || "",
      temperature: fallbackPatient.temperature || "",
    };
  }

  let visits: MedicalVisit[] = [];

  // 1b. Kiểm tra xem người dùng đã từng chỉnh sửa / lưu danh sách lịch sử khám cho bệnh nhân này chưa
  try {
    const formattedId = formatPatientCode(patientId);
    const customVisitsRaw =
      localStorage.getItem(`khambenh_summary_visits_${patientId}`) ||
      localStorage.getItem(`khambenh_summary_visits_${formattedId}`);
    if (customVisitsRaw) {
      const customVisits: MedicalVisit[] = JSON.parse(customVisitsRaw);
      if (Array.isArray(customVisits)) {
        // Tự động loại bỏ bất kỳ dữ liệu mẫu cũ nào (sample-v1, sample-v2) đã từng lưu
        visits = customVisits.filter(
          (v) => !v.id?.toString().startsWith("sample-") && v.id !== "sample-v1" && v.id !== "sample-v2"
        );
        if (visits.length !== customVisits.length) {
          localStorage.setItem(`khambenh_summary_visits_${patientId}`, JSON.stringify(visits));
          localStorage.setItem(`khambenh_summary_visits_${formattedId}`, JSON.stringify(visits));
        }
      }
    }
  } catch (err) {
    console.error("Lỗi khi đọc lịch sử khám tùy chỉnh:", err);
  }

  // 2. Tự động kiểm tra và đồng bộ tất cả phiếu khám từ khambenh_diagnosis cho bệnh nhân này
  try {
    const diagRaw = localStorage.getItem("khambenh_diagnosis");
    if (diagRaw) {
      const diagnoses: any[] = JSON.parse(diagRaw);

      // Lọc các phiếu khám trùng khớp mã BN hoặc tên BN
      const matched = diagnoses.filter((d) => {
        if (d.patientId) {
          if (d.patientId === patientId || formatPatientCode(d.patientId) === formatPatientCode(patientId)) {
            return true;
          }
          const dNum = parseInt(String(d.patientId).replace(/\D/g, ""), 10);
          if (!isNaN(targetNum) && !isNaN(dNum) && dNum === targetNum) {
            return true;
          }
        }
        if (patientInfo?.name && d.patientName) {
          return d.patientName.trim().toLowerCase() === patientInfo.name.trim().toLowerCase();
        }
        return false;
      });

      let visitsChanged = false;
      matched.forEach((diag) => {
        const visitItem: MedicalVisit = {
          id: diag.id,
          patientId: formatPatientCode(diag.patientId || patientId),
          examinationDate: formatExaminationDate(diag.date || ""),
          diagnosis: diag.diagnosis || "Chưa xác định",
          medicalHistory: diag.medicalHistory || diag.symptoms || diag.serviceName || "—",
          medications: formatMedicationsList(diag.medicines),
          note: diag.notes || (diag.followUpDate ? `Tái khám: ${diag.followUpDate}` : ""),
        };

        const existingIdx = visits.findIndex((v) => String(v.id) === String(diag.id));
        if (existingIdx !== -1) {
          visits[existingIdx] = {
            ...visits[existingIdx],
            ...visitItem,
          };
        } else {
          visits.unshift(visitItem);
          visitsChanged = true;
        }
      });

      if (visitsChanged) {
        const formattedId = formatPatientCode(patientId);
        localStorage.setItem(`khambenh_summary_visits_${patientId}`, JSON.stringify(visits));
        localStorage.setItem(`khambenh_summary_visits_${formattedId}`, JSON.stringify(visits));
      }
    }
  } catch (err) {
    console.error("Lỗi khi đọc lịch sử khám từ localStorage:", err);
  }

  return {
    patient: patientInfo || null,
    visits,
  };
}

/**
 * Lưu/Cập nhật danh sách lịch sử quá trình khám bệnh của bệnh nhân
 */
export function savePatientMedicalVisits(patientId: string, visits: MedicalVisit[]): void {
  if (typeof window === "undefined") return;
  try {
    const formattedId = formatPatientCode(patientId);
    // Lưu với cả 2 key để tương thích tối đa
    localStorage.setItem(`khambenh_summary_visits_${patientId}`, JSON.stringify(visits));
    localStorage.setItem(`khambenh_summary_visits_${formattedId}`, JSON.stringify(visits));

    // Đồng bộ các thông tin chẩn đoán, bệnh sử, ghi chú sang khambenh_diagnosis nếu có ID trùng khớp
    const diagRaw = localStorage.getItem("khambenh_diagnosis");
    if (diagRaw) {
      const diagnoses: any[] = JSON.parse(diagRaw);
      let diagChanged = false;
      visits.forEach((v) => {
        const found = diagnoses.find((d) => String(d.id) === String(v.id));
        if (found) {
          found.diagnosis = v.diagnosis;
          found.medicalHistory = v.medicalHistory;
          found.notes = v.note;
          diagChanged = true;
        }
      });
      if (diagChanged) {
        localStorage.setItem("khambenh_diagnosis", JSON.stringify(diagnoses));
      }
    }

    window.dispatchEvent(new Event("khambenh_summary_updated"));
  } catch (err) {
    console.error("Lỗi khi lưu lịch sử khám bệnh:", err);
  }
}

/**
 * Tự động đồng bộ một phiếu khám (khi tạo mới hoặc chỉnh sửa) vào "Lịch Sử Quá Trình Khám Bệnh" của bệnh nhân
 */
export function syncDiagnosisToMedicalSummary(diag: any): void {
  if (typeof window === "undefined" || !diag) return;
  try {
    let patientId = diag.patientId || "";
    if (!patientId && diag.patientName) {
      const savedPtsRaw = localStorage.getItem("khambenh_patients");
      if (savedPtsRaw) {
        const pts: any[] = JSON.parse(savedPtsRaw);
        const match = pts.find(
          (p: any) => p.name?.trim().toLowerCase() === diag.patientName?.trim().toLowerCase()
        );
        if (match?.id) patientId = match.id;
      }
    }
    if (!patientId) return;

    const formattedId = formatPatientCode(patientId);

    const key1 = `khambenh_summary_visits_${patientId}`;
    const key2 = `khambenh_summary_visits_${formattedId}`;
    const existingRaw = localStorage.getItem(key1) || localStorage.getItem(key2);

    let visits: MedicalVisit[] = [];
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) {
          visits = parsed.filter(
            (v) => !v.id?.toString().startsWith("sample-") && v.id !== "sample-v1" && v.id !== "sample-v2"
          );
        }
      } catch (e) {}
    }

    const visitId = diag.id;
    const newVisit: MedicalVisit = {
      id: visitId,
      patientId: formattedId,
      examinationDate: formatExaminationDate(diag.date || ""),
      diagnosis: diag.diagnosis || "Chưa xác định",
      medicalHistory: diag.medicalHistory || diag.symptoms || diag.serviceName || "—",
      medications: formatMedicationsList(diag.medicines),
      note: diag.notes || (diag.followUpDate ? `Tái khám: ${diag.followUpDate}` : ""),
    };

    const existingIndex = visits.findIndex((v) => String(v.id) === String(visitId));
    if (existingIndex !== -1) {
      visits[existingIndex] = {
        ...visits[existingIndex],
        ...newVisit,
      };
    } else {
      visits = [newVisit, ...visits];
    }

    localStorage.setItem(key1, JSON.stringify(visits));
    localStorage.setItem(key2, JSON.stringify(visits));
    window.dispatchEvent(new Event("khambenh_summary_updated"));
  } catch (err) {
    console.error("Lỗi khi đồng bộ phiếu khám vào tóm tắt bệnh án:", err);
  }
}

/**
 * Xóa một phiếu khám khỏi "Lịch Sử Quá Trình Khám Bệnh" khi phiếu khám bị xóa
 */
export function removeDiagnosisFromMedicalSummary(diagId: string | number, patientId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const keysToCheck: string[] = [];
    if (patientId) {
      keysToCheck.push(`khambenh_summary_visits_${patientId}`);
      keysToCheck.push(`khambenh_summary_visits_${formatPatientCode(patientId)}`);
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("khambenh_summary_visits_")) {
          keysToCheck.push(k);
        }
      }
    }

    keysToCheck.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const visits: MedicalVisit[] = JSON.parse(raw);
          if (Array.isArray(visits)) {
            const filtered = visits.filter((v) => String(v.id) !== String(diagId));
            if (filtered.length !== visits.length) {
              localStorage.setItem(key, JSON.stringify(filtered));
            }
          }
        } catch (e) {}
      }
    });

    window.dispatchEvent(new Event("khambenh_summary_updated"));
  } catch (err) {
    console.error("Lỗi khi xóa phiếu khám khỏi tóm tắt bệnh án:", err);
  }
}
