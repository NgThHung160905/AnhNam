/**
 * Dịch vụ Quản lý & Bảo toàn Giá thuốc Lịch sử
 * Đảm bảo: Khi thuốc A được kê tại thời điểm A với giá cũ, nếu sau đó user sửa giá mới
 * tại thời điểm B thì các đơn thuốc tại thời điểm A vẫn giữ nguyên giá cũ trong Tổng kết.
 */

export interface MedicinePriceHistoryEntry {
  medicineId: string;
  medicineName: string;
  oldPrice: number;
  newPrice: number;
  updatedAt: string; // Chuỗi ISO e.g. "2026-09-17T13:30:00.000Z"
}

export const MEDICINE_PRICE_HISTORY_KEY = "khambenh_medicine_price_history";

/**
 * Ghi lại lịch sử thay đổi giá của một loại thuốc vào localStorage
 */
export function recordMedicinePriceChange(
  medicineId: string,
  medicineName: string,
  oldPrice: number,
  newPrice: number
): void {
  if (typeof window === "undefined") return;
  if (oldPrice === newPrice) return;

  try {
    const raw = localStorage.getItem(MEDICINE_PRICE_HISTORY_KEY);
    const history: MedicinePriceHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: MedicinePriceHistoryEntry = {
      medicineId: String(medicineId || "").trim(),
      medicineName: String(medicineName || "").trim(),
      oldPrice: Number(oldPrice) || 0,
      newPrice: Number(newPrice) || 0,
      updatedAt: new Date().toISOString(),
    };
    history.unshift(newEntry);
    // Lưu tối đa 500 lần thay đổi gần nhất
    localStorage.setItem(MEDICINE_PRICE_HISTORY_KEY, JSON.stringify(history.slice(0, 500)));
  } catch (err) {
    console.error("Lỗi khi lưu lịch sử giá thuốc:", err);
  }
}

/**
 * Lấy danh sách lịch sử thay đổi giá thuốc từ localStorage
 */
export function getMedicinePriceHistory(): MedicinePriceHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEDICINE_PRICE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Chuyển đổi chuỗi ngày khám (ví dụ "15/09/2026" hoặc "2026-09-15") thành Date object tại cuối ngày
 */
export function parseDateToEndOfDay(dateStr: string | undefined): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const clean = dateStr.trim().split(" ")[0];
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    let year = 0, month = 0, day = 0;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parts[2].length === 2 ? parseInt(`20${parts[2]}`, 10) : parseInt(parts[2], 10);
    }
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 23, 59, 59, 999);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Xác định đơn giá của thuốc tại thời điểm kê đơn:
 * 1. Ưu tiên số 1: Giá đã lưu trên dòng thuốc (medItem.price > 0) -> Đảm bảo bất biến.
 * 2. Ưu tiên số 2: Tra cứu lịch sử thay đổi giá thuốc (`khambenh_medicine_price_history`).
 *    Nếu có lần đổi giá diễn ra sau ngày khám, lấy `oldPrice` của lần thay đổi đó.
 * 3. Ưu tiên số 3: Lấy giá hiện tại từ danh mục thuốc `catalogMedicines`.
 */
export function getHistoricalMedicinePrice(
  medItem: any,
  diagDate: string | undefined,
  catalogMedicines: any[],
  priceHistory?: MedicinePriceHistoryEntry[]
): number {
  if (!medItem) return 0;

  // 1. Ưu tiên số 1: Giá đã được chốt trực tiếp trong phiếu khám
  const savedPrice = typeof medItem.price === "number"
    ? medItem.price
    : (parseInt(String(medItem.price || "").replace(/\D/g, ""), 10) || 0);

  if (savedPrice > 0) {
    return savedPrice;
  }

  const rawName = String(medItem.medicineName || medItem.name || "").trim().toLowerCase();
  const rawId = String(medItem.medicineId || medItem.id || "").trim().toLowerCase();

  // 2. Ưu tiên số 2: Tra cứu trong lịch sử giá thuốc theo ngày khám
  const history = priceHistory || getMedicinePriceHistory();
  if (history.length > 0 && diagDate) {
    const diagDateObj = parseDateToEndOfDay(diagDate);
    if (diagDateObj) {
      const medHistory = history.filter((h) => {
        const hName = (h.medicineName || "").trim().toLowerCase();
        const hId = (h.medicineId || "").trim().toLowerCase();
        return (rawName && hName === rawName) || (rawId && hId === rawId);
      });

      // Sắp xếp thời gian tăng dần
      medHistory.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

      // Lần đổi giá đầu tiên sau ngày khám => Giá tại ngày khám chính là oldPrice
      const changeAfterDiag = medHistory.find((h) => new Date(h.updatedAt).getTime() > diagDateObj.getTime());
      if (changeAfterDiag && changeAfterDiag.oldPrice > 0) {
        return changeAfterDiag.oldPrice;
      }
    }
  }

  // 3. Ưu tiên số 3: Lấy từ danh mục thuốc hiện tại
  if (Array.isArray(catalogMedicines) && catalogMedicines.length > 0) {
    const matched = catalogMedicines.find((cat: any) => {
      const catName = String(cat.name || "").trim().toLowerCase();
      const catId = String(cat.id || "").trim().toLowerCase();
      return (rawName && catName === rawName) || (rawId && (catId === rawName || catId === rawId));
    });

    if (matched) {
      const catPrice = typeof matched.price === "number"
        ? matched.price
        : (parseInt(String(matched.price || "").replace(/\D/g, ""), 10) || 0);
      if (catPrice > 0) return catPrice;
    }
  }

  return 0;
}

/**
 * Đóng băng (snapshot) và chuẩn hóa danh sách thuốc khi lưu một phiếu khám
 */
export function freezePrescriptionMedicines(
  medicines: any[],
  catalogMedicines: any[],
  diagDate?: string
): any[] {
  if (!Array.isArray(medicines)) return [];
  const history = getMedicinePriceHistory();

  return medicines.map((med: any) => {
    const existingPrice = typeof med.price === "number" && med.price > 0
      ? med.price
      : (parseInt(String(med.price || "").replace(/\D/g, ""), 10) || 0);

    const resolvedPrice = existingPrice > 0
      ? existingPrice
      : getHistoricalMedicinePrice(med, diagDate, catalogMedicines, history);

    return {
      ...med,
      price: resolvedPrice > 0 ? resolvedPrice : 0,
      medicineQuantity: Math.max(1, parseInt(String(med.medicineQuantity)) || 1),
    };
  });
}

/**
 * Tự động chốt giá lịch sử cho toàn bộ phiếu khám cũ nếu có thuốc chưa được lưu giá
 */
export function backfillDiagnosesMedicinePrices(
  diagnoses: any[],
  catalogMedicines: any[]
): { updatedDiagnoses: any[]; changed: boolean } {
  if (!Array.isArray(diagnoses) || diagnoses.length === 0) {
    return { updatedDiagnoses: diagnoses, changed: false };
  }

  const history = getMedicinePriceHistory();
  let changed = false;

  const updatedDiagnoses = diagnoses.map((diag: any) => {
    if (!Array.isArray(diag.medicines) || diag.medicines.length === 0) return diag;

    let diagMedsChanged = false;
    const updatedMeds = diag.medicines.map((med: any) => {
      const existingPrice = typeof med.price === "number" && med.price > 0
        ? med.price
        : (parseInt(String(med.price || "").replace(/\D/g, ""), 10) || 0);

      if (existingPrice > 0) {
        if (med.price !== existingPrice) {
          diagMedsChanged = true;
          return { ...med, price: existingPrice };
        }
        return med;
      }

      // Chưa có giá, tính toán giá lịch sử và chốt lại
      const resolvedPrice = getHistoricalMedicinePrice(med, diag.date, catalogMedicines, history);
      if (resolvedPrice > 0) {
        diagMedsChanged = true;
        return { ...med, price: resolvedPrice };
      }
      return med;
    });

    if (diagMedsChanged) {
      changed = true;
      return { ...diag, medicines: updatedMeds };
    }
    return diag;
  });

  return { updatedDiagnoses, changed };
}
