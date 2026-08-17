'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface BillUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
}

export default function BillUploader({ onFileSelect, selectedFile, onClearFile }: BillUploaderProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds 5MB limit. Please upload a smaller image or PDF.');
      return;
    }

    // Check format
    const validFormats = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validFormats.includes(file.type)) {
      setErrorMsg('Unsupported format. Please upload JPG, PNG, or PDF file.');
      return;
    }

    setErrorMsg(null);
    onFileSelect(file);
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
        Upload Fuel Receipt / Bill (Mandatory - Max 5MB)
      </label>

      {selectedFile ? (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-[300px]">
                {selectedFile.name}
              </div>
              <div className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload ({(selectedFile.size / 1024).toFixed(0)} KB)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearFile}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 hover:border-bpcl-blue bg-white rounded-xl cursor-pointer hover:bg-slate-50 transition-all group">
          <div className="flex flex-col items-center justify-center pt-3 pb-3">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-bpcl-blue transition-colors mb-2" />
            <p className="text-xs font-bold text-slate-700">Click to upload or drag & drop fuel receipt</p>
            <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, or PDF format (Maximum 5MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
          />
        </label>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
