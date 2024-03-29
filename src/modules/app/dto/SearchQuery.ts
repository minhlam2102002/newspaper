export type SearchParamsType = {
  category: string | undefined;
  label: string | undefined;
  time: 'day' | 'week' | 'month' | 'all' | undefined;
  field: 'title' | 'body' | 'abstract' | 'all' | undefined;
  query: string | undefined;
  page: number | undefined;
  pageSize: number | undefined;
  status: 'Draft' | 'Published' | 'Approved' | 'Pending' | 'Rejected' | 'all';
  isPremium: boolean;
  createdBy: number;
};

export class SearchParms {
  category: string;
  label: string;
  time: 'day' | 'week' | 'month' | 'all';
  field: 'title' | 'body' | 'abstract' | 'all';
  query: string;
  page: number;
  pageSize: number;
  isPremium: boolean;
  status: 'Draft' | 'Published' | 'Approved' | 'Pending' | 'Rejected' | 'all';
  createdBy: number | null;

  constructor(params: SearchParamsType, isPremium = false) {
    this.category = params.category || '';
    this.label = params.label || '';
    this.time = params.time || 'all';
    this.query = params.query || '';
    this.page = params.page || 1;
    this.pageSize = params.pageSize || 10;
    this.field = params.field || 'all';
    this.isPremium = isPremium;
    this.status = params.status || 'all';
    this.createdBy = params.createdBy;
  }
}
