import React from 'react';
import { RebrandResult } from '../types';
import { CheckCircle2, ChevronRight, Download, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface MockupScreenProps {
  originalImage: string;
  editedImage: string;
  imageError?: string;
  rebrand: RebrandResult;
  onFinish: () => void;
}

export function MockupScreen({ originalImage, editedImage, imageError, rebrand, onFinish }: MockupScreenProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">kliamdev</h1>
            <p className="text-green-600 font-medium">Instagram Analyzer</p>
          </div>
          
          <button 
             onClick={onFinish}
             disabled={!editedImage && !imageError}
             className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2 px-6 rounded-lg flex items-center transition-colors"
          >
             Aprovar e Salvar Diretrizes
             <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </header>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
           {/* Before */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="flex flex-col items-center"
           >
              <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6">Print Original</h2>
              <div className="w-full max-w-[320px] rounded-[2.5rem] overflow-hidden shadow-lg border border-slate-200 bg-white">
                 <img src={originalImage} alt="Original" className="w-full h-auto object-cover" />
              </div>
           </motion.div>

           {/* Arrow */}
           <div className="hidden lg:flex items-center text-slate-300">
              <ChevronRight className="w-12 h-12" />
           </div>

           {/* After */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.2 }}
             className="flex flex-col items-center relative"
           >
              <h2 className="text-sm font-bold tracking-widest text-blue-500 uppercase mb-6 flex items-center">
                 <CheckCircle2 className="w-4 h-4 mr-1" />
                 Novo Visual (Gerado por IA)
              </h2>
              <div className="relative">
                <div className="w-full max-w-[320px] rounded-[2.5rem] overflow-hidden shadow-lg border border-slate-200 bg-white min-h-[500px] flex items-center justify-center">
                   {editedImage ? (
                     <img src={editedImage} alt="Edited" className="w-full h-auto object-cover" />
                   ) : imageError ? (
                     <div className="flex flex-col items-center p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                           <span className="text-red-500 font-bold text-xl">!</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">Erro na geração da imagem</span>
                        <span className="text-xs text-slate-500 mt-2">{imageError}</span>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center p-6 text-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <span className="text-sm font-medium text-slate-600">Gerando edição visual com Gemini 2.5 Flash Image...</span>
                     </div>
                   )}
                </div>
                {editedImage && (
                  <button className="absolute -right-4 -bottom-4 bg-white p-3 rounded-full shadow-xl border border-slate-100 text-slate-700 hover:text-slate-900 hover:scale-105 transition-all">
                     <Download className="w-5 h-5" />
                  </button>
                )}
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
