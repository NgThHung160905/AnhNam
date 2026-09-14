"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Sun, Moon } from "lucide-react";

export interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  align?: "left" | "right";
  className?: string;
  minYear?: number;
  maxYear?: number;
}

// Parse date string DD-MM-YYYY or YYYY-MM-DD
export const parseDate = (str: string): Date | null => {
  if (!str) return null;
  const partsDMY = str.split(/[-/]/);
  if (partsDMY.length === 3) {
    if (partsDMY[0].length <= 2 && partsDMY[2].length === 4) {
      const d = parseInt(partsDMY[0], 10);
      const m = parseInt(partsDMY[1], 10) - 1;
      const y = parseInt(partsDMY[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    } else if (partsDMY[0].length === 4 && partsDMY[2].length <= 2) {
      const y = parseInt(partsDMY[0], 10);
      const m = parseInt(partsDMY[1], 10) - 1;
      const d = parseInt(partsDMY[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDisplayDate = (str: string): string => {
  const d = parseDate(str);
  if (!d) return str || "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const calculateAge = (dob: string): string => {
  if (!dob) return "";
  const birthDate = parseDate(dob);
  if (!birthDate) return "";
  const today = new Date();

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
  if (remainingMonths === 0) return `${years} tuổi`;
  return `${years} tuổi ${remainingMonths} tháng`;
};

export const DatePicker = ({
  value,
  onChange,
  placeholder = "DD-MM-YYYY",
  align = "left",
  className = "",
  minYear: minYearProp,
  maxYear: maxYearProp,
}: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"days" | "month-year">("days");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const today = new Date();

  useEffect(() => {
    const savedTheme = localStorage.getItem("khambenh_calendar_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  const parsedVal = parseDate(value);
  const currentYear = today.getFullYear();
  const maxYear = maxYearProp ?? (currentYear + 1);
  const defaultMinYear = minYearProp ?? 2000;
  const minYear = parsedVal && parsedVal.getFullYear() < defaultMinYear ? parsedVal.getFullYear() : defaultMinYear;

  const availableYears: number[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    availableYears.push(y);
  }

  const [viewYear, setViewYear] = useState(
    parsedVal ? Math.max(minYear, Math.min(parsedVal.getFullYear(), maxYear)) : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(parsedVal ? parsedVal.getMonth() : today.getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const p = parseDate(value);
      if (p) {
        setViewYear(Math.max(minYear, Math.min(p.getFullYear(), maxYear)));
        setViewMonth(p.getMonth());
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
      setViewMode("days");
    }
  }, [isOpen, value, maxYear, minYear]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPrevDisabled = viewMode === "days"
    ? viewYear <= minYear && viewMonth === 0
    : viewYear <= minYear;

  const isNextDisabled = viewMode === "days"
    ? viewYear >= maxYear && viewMonth === 11
    : viewYear >= maxYear;

  const prevPeriod = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMode === "days") {
      if (viewMonth === 0) {
        if (viewYear > minYear) {
          setViewMonth(11);
          setViewYear(viewYear - 1);
        }
      } else {
        setViewMonth(viewMonth - 1);
      }
    } else {
      if (viewYear > minYear) {
        setViewYear(viewYear - 1);
      }
    }
  };

  const nextPeriod = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewMode === "days") {
      if (viewMonth === 11) {
        if (viewYear < maxYear) {
          setViewMonth(0);
          setViewYear(viewYear + 1);
        }
      } else {
        setViewMonth(viewMonth + 1);
      }
    } else {
      if (viewYear < maxYear) {
        setViewYear(viewYear + 1);
      }
    }
  };

  const handleSelectDay = (day: number) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    onChange(`${pad(day)}-${pad(viewMonth + 1)}-${viewYear}`);
    setIsOpen(false);
  };

  // Days calculations
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const totalSlots = firstDayIndex + daysInCurrentMonth;
  const remainingSlots = (7 - (totalSlots % 7)) % 7;

  const MONTH_NAMES = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];
  const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (d: number) =>
    parsedVal && d === parsedVal.getDate() && viewMonth === parsedVal.getMonth() && viewYear === parsedVal.getFullYear();

  const isDark = theme === "dark";

  // If value is YYYY-MM-DD, show as DD-MM-YYYY for display
  const displayStr = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value.slice(8, 10)}-${value.slice(5, 7)}-${value.slice(0, 4)}`
    : value;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 bg-white cursor-pointer hover:border-emerald-400 transition-colors ${className}`}
      >
        <input
          type="text"
          value={displayStr || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent focus:outline-none text-slate-900 cursor-pointer text-sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        />
        <Calendar className="w-4 h-4 text-emerald-600 shrink-0 ml-2 pointer-events-none" />
      </div>

      {isOpen && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1 z-50 rounded-xl shadow-2xl p-3 w-72 transition-colors animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? "bg-slate-900 border border-slate-700 text-slate-100 shadow-emerald-950/40"
              : "bg-white border border-slate-200 text-slate-800 shadow-slate-300/50"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              disabled={isPrevDisabled}
              onClick={prevPeriod}
              className={`p-1.5 rounded-lg transition-colors ${
                isPrevDisabled
                  ? "opacity-30 cursor-not-allowed"
                  : isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
              }`}
              title={viewMode === "days" ? "Tháng trước" : "Năm trước"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode(viewMode === "days" ? "month-year" : "days");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold transition-all ${
                viewMode === "month-year"
                  ? isDark
                    ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isDark
                  ? "text-slate-100 hover:bg-slate-800"
                  : "text-slate-800 hover:bg-slate-100"
              }`}
              title="Nhấp để chọn Tháng / Năm"
            >
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${viewMode === "month-year" ? "rotate-180 text-emerald-500" : "text-slate-400"}`} />
            </button>
            <button
              type="button"
              disabled={isNextDisabled}
              onClick={nextPeriod}
              className={`p-1.5 rounded-lg transition-colors ${
                isNextDisabled
                  ? "opacity-30 cursor-not-allowed"
                  : isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600"
              }`}
              title={viewMode === "days" ? "Tháng sau" : "Năm sau"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Month-Year Selector Mode */}
          {viewMode === "month-year" ? (
            <div className="py-1 space-y-3">
              {/* Year selector row */}
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                isDark ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"
              }`}>
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Chọn năm:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={viewYear <= minYear}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewYear((y) => Math.max(minYear, y - 1));
                    }}
                    className={`p-1 rounded transition-colors ${
                      viewYear <= minYear
                        ? "opacity-30 cursor-not-allowed"
                        : isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <select
                    value={viewYear}
                    onChange={(e) => {
                      e.stopPropagation();
                      setViewYear(parseInt(e.target.value, 10));
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold focus:outline-none border cursor-pointer ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-emerald-400"
                        : "bg-white border-slate-300 text-emerald-700"
                    }`}
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={viewYear >= maxYear}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewYear((y) => Math.min(maxYear, y + 1));
                    }}
                    className={`p-1 rounded transition-colors ${
                      viewYear >= maxYear
                        ? "opacity-30 cursor-not-allowed"
                        : isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, mIdx) => (
                  <button
                    key={mIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMonth(mIdx);
                      setViewMode("days");
                    }}
                    className={`py-2 px-1 text-xs rounded-lg font-medium transition-all ${
                      viewMonth === mIdx
                        ? "bg-emerald-600 text-white font-bold shadow-sm"
                        : isDark
                        ? "text-slate-200 hover:bg-slate-800 hover:text-white"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Body: Days Grid Mode */
            <>
              {/* Weekday headers */}
              <div className={`grid grid-cols-7 gap-1 text-center text-xs font-semibold mb-1 ${
                isDark ? "text-slate-400" : "text-slate-400"
              }`}>
                {WEEK_DAYS.map((wd) => (
                  <div key={wd} className="py-1">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Prev month padding */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div
                    key={`prev-${i}`}
                    className={`py-1.5 select-none ${
                      isDark ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {daysInPrevMonth - firstDayIndex + 1 + i}
                  </div>
                ))}

                {/* Current month days */}
                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                  const day = i + 1;
                  const selected = isSelected(day);
                  const todayDay = isToday(day);
                  return (
                    <button
                      type="button"
                      key={`cur-${day}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectDay(day);
                      }}
                      className={`py-1.5 rounded-lg font-medium transition-colors ${
                        selected
                          ? "bg-emerald-600 text-white shadow-sm font-bold"
                          : todayDay
                          ? isDark
                            ? "bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-700 hover:bg-emerald-900"
                            : "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100"
                          : isDark
                          ? "text-slate-200 hover:bg-slate-800"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}

                {/* Next month padding */}
                {Array.from({ length: remainingSlots }).map((_, i) => (
                  <div
                    key={`next-${i}`}
                    className={`py-1.5 select-none ${
                      isDark ? "text-slate-600" : "text-slate-300"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Bottom Bar: Dark / Light Mode Switch ONLY */}
          <div className={`mt-3 pt-2.5 border-t flex items-center justify-between ${
            isDark ? "border-slate-800" : "border-slate-100"
          }`}>
            <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Chế độ:
            </span>
            <div className={`inline-flex rounded-lg p-0.5 border ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme("light");
                  try { localStorage.setItem("khambenh_calendar_theme", "light"); } catch (e) {}
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  !isDark
                    ? "bg-white text-slate-800 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Light
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTheme("dark");
                  try { localStorage.setItem("khambenh_calendar_theme", "dark"); } catch (e) {}
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isDark
                    ? "bg-slate-900 text-emerald-300 shadow-sm font-semibold border border-slate-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-emerald-400" /> Dark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
