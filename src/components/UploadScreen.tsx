import React, { useCallback, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadScreenProps {
  onUpload: (base64: string) => void;
  isLoading: boolean;
}

export function UploadScreen({ onUpload, isLoading }: UploadScreenProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  const onDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
          REBRAND.AI
        </h1>
        <p className="text-slate-500 mb-8 font-medium">
          MODO: APRENDER (Inativo)
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">
              Arraste ou selecione o print do seu perfil do Instagram
            </h2>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
              disabled={isLoading}
            />
            
            {isLoading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Lendo perfil com Gemini 3.1 Flash Lite...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-slate-600 font-medium">
                  Clique ou arraste a imagem aqui
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  PNG, JPG ou WEBP
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
