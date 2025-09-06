
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, ScanStatus, type ScanItem, type Feedback } from './types';

// Declare global variables from CDN scripts for TypeScript
declare const XLSX: any;
declare const Html5QrcodeScanner: any;

// --- UTILITY & SERVICE FUNCTIONS ---

const excelService = {
  readExcelFile: (file: File): Promise<ScanItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet);
          
          const scanItems: ScanItem[] = json.map((row, index) => {
            const orderId = String(row['Mã đơn hàng'] || `DH${index + 1}`);
            const productId = String(row['Mã sản phẩm'] || `SP${index + 1}`);
            return {
              id: `${orderId}-${productId}-${index}`,
              orderId,
              productId,
              productName: String(row['Tên sản phẩm'] || 'N/A'),
              quantity: Number(row['Số lượng'] || 1),
              status: ScanStatus.Pending,
            };
          });
          resolve(scanItems);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          reject(new Error("Định dạng file Excel không hợp lệ."));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  },

  exportToExcel: (items: ScanItem[]) => {
    const dataToExport = items.map(item => ({
      'Mã đơn hàng': item.orderId,
      'Mã sản phẩm': item.productId,
      'Tên sản phẩm': item.productName,
      'Số lượng': item.quantity,
      'Trạng thái': item.status,
      'Thời gian quét': item.scannedAt || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả quét');
    XLSX.writeFile(workbook, `ket-qua-quet-${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};

const useSpeech = () => {
  const synth = window.speechSynthesis;
  const speak = useCallback((text: string, lang: string = 'vi-VN') => {
    if (synth.speaking) {
      synth.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    synth.speak(utterance);
  }, [synth]);
  return speak;
};

// --- SVG ICONS ---

const IconUploadCloud: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>
  </svg>
);

const IconFileDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M12 18v-6" /><path d="m15 15-3 3-3-3" />
  </svg>
);

const IconRotateCcw: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
);

const IconCheckCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const IconAlertTriangle: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
    </svg>
);

const IconXCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);


// --- UI COMPONENTS ---

const Header: React.FC = () => (
  <header className="bg-white shadow-md">
    <div className="container mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold text-slate-800">Trình quét QR Code Kho hàng</h1>
    </div>
  </header>
);

interface FileUploadScreenProps {
  onFileUpload: (items: ScanItem[]) => void;
  setFeedback: (feedback: Feedback | null) => void;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUpload, setFeedback }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel')) {
      setIsLoading(true);
      setFeedback(null);
      try {
        const items = await excelService.readExcelFile(file);
        if (items.length === 0) {
          throw new Error("File không có dữ liệu hoặc sai định dạng cột.");
        }
        onFileUpload(items);
        setFeedback({ type: 'success', message: `Tải lên ${items.length} mục thành công!` });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định.";
        setFeedback({ type: 'error', message: `Lỗi khi đọc file: ${errorMessage}` });
      } finally {
        setIsLoading(false);
      }
    } else {
      setFeedback({ type: 'error', message: "Vui lòng chọn file Excel (.xlsx, .xls)." });
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div 
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative w-full max-w-lg p-10 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'}`}
      >
        <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={handleFileChange} disabled={isLoading} />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
          <IconUploadCloud className="w-16 h-16 text-slate-400" />
          <p className="text-slate-600">
            <span className="font-semibold text-indigo-600">Tải file lên</span> hoặc kéo và thả
          </p>
          <p className="text-xs text-slate-500">XLSX, XLS</p>
        </label>
      </div>
      {isLoading && <p className="mt-4 text-slate-600 animate-pulse">Đang xử lý file...</p>}
    </div>
  );
};


interface QrScannerComponentProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure: (error: string) => void;
}
  
const QrScannerComponent: React.FC<QrScannerComponentProps> = ({ onScanSuccess, onScanFailure }) => {
    useEffect(() => {
        const qrCodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        const successCallback = (decodedText: string, decodedResult: any) => {
            onScanSuccess(decodedText);
            qrCodeScanner.pause();
            setTimeout(() => {
              if (qrCodeScanner.getState() !== 2) return; // 2 is SCANNING state
              qrCodeScanner.resume();
            }, 1500);
        };

        const errorCallback = (errorMessage: string) => {
            // onScanFailure(errorMessage); // This can be noisy
        };
        
        qrCodeScanner.render(successCallback, errorCallback);

        return () => {
            qrCodeScanner.clear().catch(error => {
                console.error("Failed to clear html5-qrcode-scanner.", error);
            });
        };
    }, [onScanSuccess, onScanFailure]);

    return <div id="qr-reader" className="w-full max-w-md mx-auto"></div>;
};

interface StatisticsProps {
  items: ScanItem[];
}

const Statistics: React.FC<StatisticsProps> = ({ items }) => {
  const stats = useMemo(() => {
    const scannedCount = items.filter(item => item.status === ScanStatus.Scanned).length;
    const totalCount = items.length;
    return {
      total: totalCount,
      scanned: scannedCount,
      remaining: totalCount - scannedCount,
    };
  }, [items]);

  return (
    <div className="grid grid-cols-3 gap-4 text-center mb-4">
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-sm text-slate-500">Tổng cộng</p>
        <p className="text-2xl font-bold">{stats.total}</p>
      </div>
      <div className="p-4 bg-green-100 rounded-lg shadow">
        <p className="text-sm text-green-700">Đã quét</p>
        <p className="text-2xl font-bold text-green-800">{stats.scanned}</p>
      </div>
      <div className="p-4 bg-amber-100 rounded-lg shadow">
        <p className="text-sm text-amber-700">Còn lại</p>
        <p className="text-2xl font-bold text-amber-800">{stats.remaining}</p>
      </div>
    </div>
  );
};


interface ScanningScreenProps {
  items: ScanItem[];
  setItems: React.Dispatch<React.SetStateAction<ScanItem[]>>;
  setFeedback: (feedback: Feedback | null) => void;
  onReset: () => void;
}

const ScanningScreen: React.FC<ScanningScreenProps> = ({ items, setItems, setFeedback, onReset }) => {
  const [isScanning, setIsScanning] = useState(false);
  const speak = useSpeech();

  const handleScan = useCallback((decodedText: string) => {
    setItems(prevItems => {
      const itemIndex = prevItems.findIndex(item => item.productId === decodedText);
      
      // Check if already scanned
      if (itemIndex !== -1 && prevItems[itemIndex].status === ScanStatus.Scanned) {
        const alreadyScannedItem = prevItems[itemIndex];
        const isDuplicate = prevItems.some(item => item.productId === decodedText && item.status === ScanStatus.Scanned);
        if (isDuplicate) {
          setFeedback({ type: 'warning', message: `Sản phẩm ${decodedText} đã được quét rồi.` });
          speak("Đã quét rồi");
          return prevItems; // Return original items
        }
      }

      // Find first pending item
      const pendingItemIndex = prevItems.findIndex(item => item.productId === decodedText && item.status === ScanStatus.Pending);

      if (pendingItemIndex !== -1) {
        setFeedback({ type: 'success', message: `Quét thành công: ${decodedText}` });
        speak("Quét thành công");

        const newItems = [...prevItems];
        newItems[pendingItemIndex] = { 
          ...newItems[pendingItemIndex], 
          status: ScanStatus.Scanned,
          scannedAt: new Date().toLocaleString('vi-VN')
        };
        return newItems;
      } else {
        setFeedback({ type: 'error', message: `Sai! Không tìm thấy sản phẩm ${decodedText}.` });
        speak("Sai");
        if(window.navigator.vibrate) {
            window.navigator.vibrate(200); // Vibrate for 200ms
        }
        return prevItems;
      }
    });
  }, [setItems, setFeedback, speak]);


  return (
    <div className="p-4 md:p-6 space-y-4">
      <Statistics items={items} />
      
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setIsScanning(prev => !prev)}
          className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${isScanning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {isScanning ? 'Dừng quét' : 'Bắt đầu quét'}
        </button>
        <button
          onClick={() => excelService.exportToExcel(items)}
          className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          <IconFileDown className="w-5 h-5"/> Xuất Excel
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white bg-slate-600 hover:bg-slate-700 transition-colors"
        >
          <IconRotateCcw className="w-5 h-5"/> Tải file khác
        </button>
      </div>

      {isScanning && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-inner">
            <QrScannerComponent 
                onScanSuccess={handleScan}
                onScanFailure={(error) => console.log(error)}
            />
        </div>
      )}
      
      <div className="overflow-x-auto bg-white rounded-lg shadow mt-4">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-100">
            <tr>
              <th scope="col" className="px-4 py-3">Mã ĐH</th>
              <th scope="col" className="px-4 py-3">Mã SP</th>
              <th scope="col" className="px-4 py-3">Tên sản phẩm</th>
              <th scope="col" className="px-4 py-3">SL</th>
              <th scope="col" className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className={`border-b ${item.status === ScanStatus.Scanned ? 'bg-green-50' : 'bg-white'}`}>
                <td className="px-4 py-2 font-medium text-slate-900">{item.orderId}</td>
                <td className="px-4 py-2 font-mono text-slate-900">{item.productId}</td>
                <td className="px-4 py-2">{item.productName}</td>
                <td className="px-4 py-2 text-center">{item.quantity}</td>
                <td className={`px-4 py-2 font-semibold ${item.status === ScanStatus.Scanned ? 'text-green-600' : 'text-slate-500'}`}>
                  {item.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


interface ToastProps {
  feedback: Feedback | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ feedback, onClose }) => {
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback, onClose]);

  if (!feedback) return null;

  const baseClasses = "fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 rounded-lg shadow-xl text-white font-semibold z-50 animate-fade-in-up";
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500'
  };
  const Icon = {
    success: <IconCheckCircle className="w-6 h-6" />,
    error: <IconXCircle className="w-6 h-6" />,
    warning: <IconAlertTriangle className="w-6 h-6" />
  };

  return (
    <div className={`${baseClasses} ${colors[feedback.type]}`}>
      {Icon[feedback.type]}
      <span>{feedback.message}</span>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.FileUpload);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  
  const handleFileUpload = (items: ScanItem[]) => {
    setScanItems(items);
    setAppState(AppState.Scanning);
  };
  
  const handleReset = () => {
    setScanItems([]);
    setFeedback(null);
    setAppState(AppState.FileUpload);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Header />
      <main className="container mx-auto max-w-4xl py-6">
        <Toast feedback={feedback} onClose={() => setFeedback(null)} />
        {appState === AppState.FileUpload && (
          <FileUploadScreen onFileUpload={handleFileUpload} setFeedback={setFeedback} />
        )}
        {appState === AppState.Scanning && (
          <ScanningScreen items={scanItems} setItems={setScanItems} setFeedback={setFeedback} onReset={handleReset} />
        )}
      </main>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
