import React, { useState, useRef } from "react";
import { Upload, ChefHat, Info, Utensils, Zap, Camera, X, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ClassificationResult {
  plato: string;
  descripcion: string;
  ingredientes: string[];
  alertas: string[];
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen es demasiado grande. Por favor, sube una menor a 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // Redimensionamiento a 180x180 para el modelo de Keras
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = 180;
          canvas.height = 180;
          if (ctx) {
            ctx.drawImage(img, 0, 0, 180, 180);
            const resizedBase64 = canvas.toDataURL("image/jpeg");
            setImage(resizedBase64);
            setResult(null);
            setError(null);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const classifyImage = async () => {
    if (!image) return;
    setIsClassifying(true);
    setError(null);

    try {
      // Apuntamos al nuevo endpoint de nuestro futuro servidor Python
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) throw new Error("Error al clasificar la imagen");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("No pudimos analizar la imagen. Inténtalo de nuevo.");
    } finally {
      setIsClassifying(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="px-6 pt-12 pb-8 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-brand-olive rounded-full flex items-center justify-center text-brand-cream">
              <ChefHat size={28} />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-stone-900">
            Gastro<span className="italic text-brand-terracotta">AI</span>
          </h1>
          <p className="text-lg text-stone-600 max-w-xl mx-auto leading-relaxed">
            Sube una foto de tu plato y deja que nuestra inteligencia artificial identifique sus ingredientes y aporte nutricional.
          </p>
        </motion.div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          {/* Upload Area */}
          <section>
            <AnimatePresence mode="wait">
              {!image ? (
                <motion.div
                  key="uploader"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-white border-2 border-dashed border-stone-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-brand-terracotta hover:bg-stone-50 transition-all group"
                >
                  <div className="w-16 h-16 bg-brand-terracotta/10 rounded-full flex items-center justify-center text-brand-terracotta mb-4 group-hover:scale-110 transition-transform">
                    <Camera size={32} />
                  </div>
                  <p className="font-semibold text-stone-800">Haz una foto o sube una imagen</p>
                  <p className="text-sm text-stone-400 mt-1">PNG, JPG hasta 5MB</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative group"
                >
                  <img
                    src={image}
                    alt="Preview"
                    className="w-full aspect-square object-cover rounded-[2rem] shadow-xl border-8 border-white"
                  />
                  <button
                    onClick={reset}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg text-stone-800 hover:bg-white transition-colors"
                  >
                    <X size={20} />
                  </button>

                  {!result && !isClassifying && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={classifyImage}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-brand-olive text-white px-8 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 hover:bg-stone-700 transition-colors"
                    >
                      <Zap size={18} fill="currentColor" />
                      Analizar Plato
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="mt-4 text-sm text-red-500 text-center bg-red-50 py-2 rounded-lg px-4 border border-red-100 italic">
                {error}
              </p>
            )}
          </section>

          {/* Results Area */}
          <section className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {isClassifying && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full pt-12"
                >
                  <Loader2 className="animate-spin text-brand-terracotta mb-4" size={48} />
                  <p className="text-brand-olive font-serif italic text-xl">Consultando a nuestro chef digital...</p>
                </motion.div>
              )}

              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-8 rounded-[2rem] shadow-sm border border-stone-100"
                >
                  <div className="mb-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-terracotta mb-2 block">Plato Identificado</span>
                    <h2 className="text-3xl font-bold text-stone-900 leading-tight">{result.plato}</h2>
                  </div>

                  <p className="text-stone-600 mb-8 leading-relaxed italic">"{result.descripcion}"</p>

                  <div className="space-y-6">
                    <div>
                      <h3 className="flex items-center gap-2 text-stone-800 font-bold mb-3">
                        <Utensils size={18} className="text-brand-olive" />
                        Ingredientes Clave
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.ingredientes.map((ing, i) => (
                          <span key={i} className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-sm">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6">
                      {result.alertas && result.alertas.length > 0 ? (
                        <div className="p-5 bg-red-50 rounded-2xl border border-red-200">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} /> ¡Peligro de Alérgenos!
                          </h3>
                          <ul className="space-y-2">
                            {result.alertas.map((alerta, idx) => (
                              <li key={idx} className="text-red-700 font-medium text-sm flex items-start gap-2">
                                <span>{alerta}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="p-5 bg-green-50 rounded-2xl border border-green-200 flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full text-green-600">
                            <ShieldCheck size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-green-800">Libre de Alérgenos Principales</h3>
                            <p className="text-green-700 text-xs mt-1">Este plato no parece contener los ingredientes desencadenantes registrados en nuestra base de datos.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {!isClassifying && !result && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full pt-12 text-center"
                >
                  <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-6">
                    <Utensils size={32} />
                  </div>
                  <h3 className="text-xl font-serif text-stone-400 italic">Esperando tu próximo festín...</h3>
                  <p className="text-sm text-stone-400 mt-2 max-w-xs">Sube una imagen para obtener información gastronómica detallada.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-stone-200 text-center">
        <p className="text-xs text-stone-400 font-mono tracking-tighter uppercase">
          Aitor González Barrera y Víctor Sánchez Melero • 2026
        </p>
      </footer>
    </div>
  );
}

