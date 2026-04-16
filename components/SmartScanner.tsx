import React, { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertTriangle, ScanLine, Image as ImageIcon, Loader2, ArrowRight } from 'lucide-react';
import { askPoultryExpert, Attachment } from '../services/geminiService';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';

const SmartScanner: React.FC = () => {
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage({
        file,
        preview: URL.createObjectURL(file)
      });
      setResult(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1];
            resolve(base64Data);
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = error => reject(error);
        img.src = event.target?.result as string;
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleScan = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const base64 = await fileToBase64(image.file);
      const attachment: Attachment = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64
        }
      };

      // Specific prompt for the scanner to trigger the protocol defined in system instructions
      const prompt = "Analyze this bird image according to your protocol: 1. Identify Breed, 2. Grade Quality/Health, 3. Estimate Market Rate, 4. Health Observations. Be precise.";
      
      const response = await askPoultryExpert(prompt, [attachment], 'English');
      setResult(response.text);
    } catch (error) {
      console.error(error);
      setResult("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ScanLine className="text-blue-600" /> Smart Bird Scanner
        </h1>
        <p className="text-gray-500 text-sm">AI-powered analysis for Breed Identification & Quality Grading.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Input Area */}
        <div className="space-y-6">
          <div className={`
            border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all relative overflow-hidden bg-gray-50
            ${image ? 'border-blue-300 bg-blue-50/30 h-auto p-4' : 'border-gray-300 h-80 hover:border-blue-400 hover:bg-blue-50'}
          `}>
             
             {!image ? (
               <div className="text-center space-y-4 p-6">
                  <div className="bg-white p-4 rounded-full shadow-sm inline-block">
                    <Camera size={48} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-700">Capture or Upload</h3>
                    <p className="text-sm text-gray-500 mt-1">Take a clear photo of the bird (side view preferred)</p>
                  </div>
                  
                  <div className="flex gap-3 justify-center mt-4">
                     <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        ref={cameraInputRef} 
                        onChange={handleFileSelect}
                     />
                     <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
                     >
                       <Camera size={18}/> Take Photo
                     </button>
                     
                     <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect}
                     />
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
                     >
                       <Upload size={18}/> Upload
                     </button>
                  </div>
               </div>
             ) : (
               <div className="w-full relative">
                  <img src={image.preview} alt="Scan Preview" className="w-full h-64 object-contain rounded-lg shadow-sm bg-black/5" />
                  <button 
                    onClick={resetScanner}
                    className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-gray-600 hover:text-red-600 shadow-sm"
                    title="Remove Image"
                  >
                    <RefreshCw size={16} />
                  </button>
                  
                  <div className="mt-4 flex flex-col gap-2">
                     <button 
                        onClick={handleScan}
                        disabled={isAnalyzing}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-70 transition-all"
                     >
                        {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <ScanLine size={20} />}
                        {isAnalyzing ? 'Scanning Bird...' : 'Identify & Analyze'}
                     </button>
                     <button onClick={resetScanner} className="text-sm text-gray-500 hover:text-gray-700 py-2">
                        Retake Photo
                     </button>
                  </div>
               </div>
             )}
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm">
             <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><ImageIcon size={16}/> Best Practices</h4>
             <ul className="space-y-1 text-blue-700">
               <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5"/> Ensure good lighting.</li>
               <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5"/> Capture full body view (Comb to Legs).</li>
               <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5"/> Avoid blurry or dark images.</li>
             </ul>
          </div>
        </div>

        {/* Right: Results Area */}
        <div className="h-full">
            {result ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full overflow-hidden flex flex-col animate-in slide-in-from-right-4">
                  <div className="bg-green-50 border-b border-green-100 p-4 flex justify-between items-center">
                      <h3 className="font-bold text-green-900 flex items-center gap-2"><CheckCircle2 className="text-green-600"/> Analysis Complete</h3>
                      <span className="text-xs bg-white px-2 py-1 rounded border border-green-200 text-green-700">AI Confidence: High</span>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[500px] prose prose-sm prose-blue max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  </div>
                  <div className="p-4 bg-gray-50 border-t text-center">
                      <button onClick={resetScanner} className="text-blue-600 font-semibold text-sm hover:underline">Scan Another Bird</button>
                  </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  {isAnalyzing ? (
                     <div className="flex flex-col items-center">
                        <div className="relative">
                           <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                           <ScanLine size={64} className="text-blue-500 relative z-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-700 mt-6">Analyzing Image...</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs">Identifying breed characteristics, checking health signs, and estimating market value.</p>
                     </div>
                  ) : (
                     <>
                        <ScanLine size={64} className="opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">No Analysis Yet</h3>
                        <p className="max-w-xs mt-2 text-sm">Upload a photo to see Breed ID, Quality Grade, and Price Estimation here.</p>
                     </>
                  )}
              </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default SmartScanner;