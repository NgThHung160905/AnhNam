export interface PatientSummaryInfo {
  id: string;
  name: string;
  gender: string;
  dob: string;
  phone?: string;
  address?: string;
  weight?: string;
  height?: string;
  temperature?: string;
}

export interface MedicalVisit {
  id: string | number;
  patientId: string;
  examinationDate: string;
  diagnosis: string;
  medicalHistory: string;
  medications: string;
  note: string;
}

export interface PatientMedicalSummaryData {
  patient: PatientSummaryInfo | null;
  visits: MedicalVisit[];
}
