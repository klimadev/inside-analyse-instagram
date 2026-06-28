import React, { useState, useRef, useEffect } from 'react';
import { RebrandResult, CopilotResponse, CopilotItem } from '../types';
import { Send, Image as ImageIcon, LayoutTemplate, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CopilotScreenProps {
  rebrand: RebrandResult;
}

export function CopilotScreen({ rebrand }: CopilotScreenProps) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, items?: CopilotItem[]}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          branding: rebrand.branding_md,
          design: rebrand.design_md
        })
      });

      if (!response.ok) throw new Error('Copilot API error');
      
      const data: CopilotResponse = await response.json();
      
      // Add assistant message immediately
      setMessages(prev => [...prev, { role: 'assistant', content: data.mensagem, items: data.itens_gerados }]);

      // Now generate images for the items in background
      if (data.itens_gerados && data.itens_gerados.length > 0) {
        generateImagesForItems(data.itens_gerados, messages.length + 1); // +1 because we just added 2 messages (user + assistant), so index of assistant is length (since it was length-1 before pushing) wait, length is current length. If old was 0, we added 2. index is 1. so messages.length + 1 is the new length. Actually, let's just update by looking at the last message.
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImagesForItems = async (items: CopilotItem[], messageIndex: number) => {
    const updatedItems = [...items];
    
    // We update the state message by message index, but since React state is tricky,
    // let's do it carefully.
    for (let i = 0; i < updatedItems.length; i++) {
       if (updatedItems[i].imagem_prompt) {
          try {
             const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: updatedItems[i].imagem_prompt, aspectRatio: '1:1' })
             });
             if (res.ok) {
                const imgData = await res.json();
                updatedItems[i].imagem_gerada = imgData.base64;
                
                // Update state
                setMessages(prev => {
                   const newMsgs = [...prev];
                   const msgToUpdate = newMsgs[newMsgs.length - 1]; // Assuming it's the last one
                   if (msgToUpdate.role === 'assistant' && msgToUpdate.items) {
                       msgToUpdate.items = [...updatedItems];
                   }
                   return newMsgs;
                });
             }
          } catch (e) {
             console.error("Image gen failed", e);
          }
       }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar with Guidelines */}
      <div className="w-80 bg-slate-900 text-white flex flex-col hidden md:flex border-r border-slate-800">
         <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold tracking-tight">REBRAND.AI</h1>
            <p className="text-blue-400 font-medium text-sm mt-1">MODO: COPILOT (Ativo)</p>
         </div>
         
         <div className="p-6 flex-1 overflow-y-auto">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Diretrizes Ativas</h3>
            
            <div className="space-y-6">
               <div>
                  <div className="flex items-center text-slate-300 mb-2">
                     <LayoutTemplate className="w-4 h-4 mr-2" />
                     <span className="font-semibold text-sm">DESIGN.md</span>
                  </div>
                  <div className="bg-slate-800 rounded p-3 text-xs text-slate-400 space-y-2">
                     <div className="flex gap-2">
                        {rebrand.novo_perfil.paleta_cores.map(c => (
                           <div key={c} className="w-6 h-6 rounded-full border border-slate-700" style={{backgroundColor: c}}></div>
                        ))}
                     </div>
                     <p className="line-clamp-4">{rebrand.design_md}</p>
                  </div>
               </div>

               <div>
                  <div className="flex items-center text-slate-300 mb-2">
                     <ImageIcon className="w-4 h-4 mr-2" />
                     <span className="font-semibold text-sm">BRANDING.md</span>
                  </div>
                  <div className="bg-slate-800 rounded p-3 text-xs text-slate-400">
                     <p className="line-clamp-6">{rebrand.branding_md}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
         <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center text-slate-500 text-sm mt-10">
               <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LayoutTemplate className="w-8 h-8 text-blue-600" />
               </div>
               <p>As diretrizes da marca estão carregadas.</p>
               <p>Peça um carrossel, um post único ou ideias para stories.</p>
            </div>

            {messages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl rounded-2xl p-4 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 shadow-sm text-slate-800'}`}>
                     <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                     
                     {/* Render Generated Items */}
                     {m.items && m.items.length > 0 && (
                        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
                           {m.items.map((item, idx) => (
                              <div key={idx} className="flex-shrink-0 w-64 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm relative group">
                                 <div className="aspect-square bg-slate-200 relative flex items-center justify-center">
                                    {item.imagem_gerada ? (
                                       <img src={item.imagem_gerada} alt="Generated" className="w-full h-full object-cover" />
                                    ) : (
                                       <div className="flex flex-col items-center">
                                          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                                          <span className="text-xs text-slate-500 font-medium">Gerando Imagem...</span>
                                       </div>
                                    )}
                                    {item.texto && (
                                       <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/30">
                                          <h3 className="text-white font-bold text-center text-xl drop-shadow-md">{item.texto}</h3>
                                       </div>
                                    )}
                                 </div>
                                 {item.legenda && (
                                    <div className="p-3 text-xs text-slate-600 bg-white border-t border-slate-100">
                                       <span className="font-bold text-slate-800 mr-1">{rebrand.novo_perfil.novo_user}</span>
                                       {item.legenda}
                                    </div>
                                 )}
                                 {item.imagem_gerada && (
                                    <button className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Download className="w-4 h-4 text-slate-700" />
                                    </button>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 shadow-sm text-slate-800 rounded-2xl p-4 flex items-center">
                     <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                     <span className="text-sm">Assistente pensando...</span>
                  </div>
               </div>
            )}
            <div ref={endRef} />
         </div>

         {/* Input Box */}
         <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
               <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ex: Preciso de um carrossel de 3 slides sobre o produto X..."
                  className="w-full bg-slate-100 border-none rounded-xl pl-4 pr-12 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
               />
               <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-colors"
               >
                  <Send className="w-4 h-4" />
               </button>
            </form>
         </div>
      </div>
    </div>
  );
}
