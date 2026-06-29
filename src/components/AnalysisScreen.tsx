import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { CheckCircle2, RefreshCcw, ArrowRight, Loader2, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalysisScreenProps {
  originalImage: string;
  analysis: AnalysisResult;
  onApprove: (feedback: string) => void;
  isLoading: boolean;
}

export function AnalysisScreen({ originalImage, analysis, onApprove, isLoading }: AnalysisScreenProps) {
  const [feedback, setFeedback] = useState('');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">kliamdev</h1>
            <p className="text-blue-600 font-medium">Instagram Analyzer</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Original Image */}
          <div className="lg:col-span-1 flex flex-col items-center">
             <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4">Print Antigo</h2>
             <div className="w-full max-w-xs aspect-[9/16] rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white">
                <img src={originalImage} alt="Original Profile" className="w-full h-full object-cover" />
             </div>
          </div>

          {/* Right Column: Analysis */}
          <div className="lg:col-span-2 space-y-6">
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
             >
                <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                  O QUE ESTÁ RUIM (Diagnóstico da IA)
                </h2>
                
                <div className="space-y-4">
                   <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                     <h3 className="font-semibold text-red-800 text-sm uppercase mb-1">Biografia</h3>
                     <p className="text-red-700 text-sm leading-relaxed">{analysis.diagnostico.biografia}</p>
                   </div>
                   <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                     <h3 className="font-semibold text-orange-800 text-sm uppercase mb-1">Identidade Visual</h3>
                     <p className="text-orange-700 text-sm leading-relaxed">{analysis.diagnostico.identidade_visual}</p>
                   </div>
                   <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                     <h3 className="font-semibold text-amber-800 text-sm uppercase mb-1">Grade de Posts</h3>
                     <p className="text-amber-700 text-sm leading-relaxed">{analysis.diagnostico.grade_posts}</p>
                   </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h3 className="font-semibold text-slate-800 text-sm uppercase mb-3">Plano de Ação</h3>
                  <ul className="space-y-2">
                    {analysis.plano_acao.map((acao, i) => (
                      <li key={i} className="flex items-start text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                        <span>{acao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
             </motion.div>

             {/* Actions */}
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="bg-slate-900 p-6 rounded-2xl shadow-md text-white"
             >
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-400" />
                  Chat de Ajustes
                </h3>
                
                <div className="mb-4">
                   <p className="text-slate-400 text-sm mb-2">Deseja alguma modificação específica antes de gerar o novo visual?</p>
                   <textarea 
                     value={feedback}
                     onChange={e => setFeedback(e.target.value)}
                     placeholder="Ex: Não mude a minha logo atual, foca apenas na bio..."
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                     rows={3}
                     disabled={isLoading}
                   />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => onApprove(feedback)}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando Novo Perfil...</>
                    ) : (
                      <><CheckCircle2 className="w-5 h-5 mr-2" /> Aceitar e Gerar Mockup</>
                    )}
                  </button>
                  <button 
                     disabled={isLoading}
                     className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                     <RefreshCcw className="w-5 h-5" />
                  </button>
                </div>
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
