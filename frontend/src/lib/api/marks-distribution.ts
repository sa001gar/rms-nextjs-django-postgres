import api from './client';

export interface MarksDistributionEntry {
  id: string;
  class_id: string;
  class_name: string;
  assessment_type_id: string;
  assessment_type_name: string;
  full_marks: number;
}

export interface BulkSaveEntry {
  class_id: string;
  assessment_type_id: string;
  full_marks: number;
}

export const marksDistributionApi = {
  getAll: async (): Promise<MarksDistributionEntry[]> => {
    const response = await api.get<{ results?: MarksDistributionEntry[] } | MarksDistributionEntry[]>(
      '/academics/marks-distribution/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },
  bulkSave: async (entries: BulkSaveEntry[]): Promise<any[]> => {
    return api.post<any[]>('/academics/marks-distribution/bulk-save/', { entries });
  },
};
