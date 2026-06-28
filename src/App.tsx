import React, { useState } from 'react';
import { UploadScreen } from './components/UploadScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { MockupScreen } from './components/MockupScreen';
import { CopilotScreen } from './components/CopilotScreen';
import { AnalysisResult, RebrandResult } from './types';

type AppState = 'upload' | 'analysis' | 'mockup' | 'copilot';

export default function App() {
  const [state, setState] = useState<AppState>('upload');
  const [originalImage, setOriginalImage] = useState('');
  const [editedImage, setEditedImage] = useState('');
  const [imageError, setImageError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [rebrand, setRebrand] = useState<RebrandResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async (base64: string) => {
    setOriginalImage(base64);
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();
      setAnalysis(data);
      setState('analysis');
    } catch (e) {
      console.error(e);
      alert('Falha ao analisar a imagem.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateEditedImage = async (rebrandData: RebrandResult) => {
    try {
       setImageError('');
       const prompt = `Redesign this instagram profile to match this new branding and style:
       Bio: ${rebrandData.novo_perfil.nova_bio}
       Followers: ${rebrandData.novo_perfil.seguidores}
       Username: ${rebrandData.novo_perfil.novo_user}
       Design Guidelines: ${rebrandData.design_md}
       Make the image a realistic instagram profile screenshot with the new design and colors. Keep the overall structure but apply the new brand identity.`;

       const res = await fetch('/api/edit-profile-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: originalImage, prompt })
       });
       if (res.ok) {
          const data = await res.json();
          setEditedImage(data.base64);
       } else {
          const errData = await res.json().catch(() => ({}));
          console.error("Failed to edit image", errData);
          setImageError(errData.error || 'Failed to edit image. Quota exceeded or API error.');
       }
    } catch (e) {
       console.error("Error generating edited image", e);
       setImageError('Network error while editing image.');
    }
  };

  const handleApproveAnalysis = async (feedback: string) => {
    if (!analysis) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/rebrand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, feedback })
      });
      const data: RebrandResult = await res.json();
      setRebrand(data);
      
      // Start generating edited image in background, but move to mockup screen immediately
      generateEditedImage(data);
      setState('mockup');
    } catch (e) {
      console.error(e);
      alert('Falha ao gerar o rebranding.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishMockup = () => {
    setState('copilot');
  };

  return (
    <>
      {state === 'upload' && <UploadScreen onUpload={handleUpload} isLoading={isLoading} />}
      {state === 'analysis' && analysis && (
        <AnalysisScreen 
          originalImage={originalImage} 
          analysis={analysis} 
          onApprove={handleApproveAnalysis} 
          isLoading={isLoading} 
        />
      )}
      {state === 'mockup' && rebrand && (
        <MockupScreen 
          originalImage={originalImage}
          editedImage={editedImage}
          imageError={imageError}
          rebrand={rebrand}
          onFinish={handleFinishMockup}
        />
      )}
      {state === 'copilot' && rebrand && (
        <CopilotScreen rebrand={rebrand} />
      )}
    </>
  );
}
