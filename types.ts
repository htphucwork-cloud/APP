
export enum ScanStatus {
  Pending = 'Chưa quét',
  Scanned = 'Đã quét',
}

export interface ScanItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: ScanStatus;
  scannedAt?: string;
}

export enum AppState {
  FileUpload,
  Scanning,
}

export type Feedback = {
  type: 'success' | 'error' | 'warning';
  message: string;
};
