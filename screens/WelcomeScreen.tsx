import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const WALLET_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuDpyjDohqE781rx296GnCf4TLM7Fykc1sTuNqpFddrz-P8BjILQIgC0SYLvXElForX6ee4dTxq42mPKyIqBjWSkRPWlltc6Ub7wE0zLyxbd8IsMMYtAc9lTt8YbA-uFYSltoxRuGCU5-YVwUDhLxUC2-9_JMIV-Wlcytmj5jLu3kHNZ44WMHeR_58D55Klhyd9SpT5yuDhoSJDIqiQPbZ-ld6UnRz468f07K52MZRLTLfSMAGcW2Kr2puE-oRDL1nGxkYTz9BYPdW3K";

const SLIDES = [
  {
    id: 1,
    titlePrefix: "Seu dinheiro,",
    titleHighlight: "sob controle.",
    description: "Organize gastos, alcance metas e veja seu patrimônio crescer em um só lugar.",
    image: WALLET_IMAGE,
    filter: "none",
    overlayIcon: "check_circle",
    overlayColor: "text-blue-500"
  },
  {
    id: 2,
    titlePrefix: "Planejamento",
    titleHighlight: "inteligente.",
    description: "Defina orçamentos mensais, categorize despesas e nunca mais fique no vermelho.",
    image: WALLET_IMAGE,
    // Roxo
    filter: "hue-rotate(240deg) saturate(1.2)",
    overlayIcon: "calendar_month",
    overlayColor: "text-purple-400"
  },
  {
    id: 3,
    titlePrefix: "Análises e",
    titleHighlight: "relatórios.",
    description: "Gráficos detalhados para você entender exatamente para onde vai cada centavo.",
    image: WALLET_IMAGE,
    // Laranja/Dourado
    filter: "hue-rotate(160deg) brightness(1.1) saturate(1.2)",
    overlayIcon: "pie_chart",
    overlayColor: "text-orange-400"
  }
];

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleManualChange = (index: number) => {
    setCurrentSlide(index);
    startTimer(); // Reset timer on interaction
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    if (timerRef.current) clearInterval(timerRef.current); // Pause on touch
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe Left (Next)
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      } else {
        // Swipe Right (Prev)
        setCurrentSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
      }
    }
    touchStartX.current = null;
    startTimer(); // Resume
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#050505] text-white mx-auto font-display">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-center pt-8 pb-4 relative z-10">
        <div className="flex items-center gap-2.5">
           <span className="material-symbols-outlined text-blue-500 text-[28px]">account_balance_wallet</span>
           <span className="text-xl font-bold tracking-tight text-white">FinControl</span>
        </div>
      </div>

      {/* Carousel Container */}
      <div 
        className="flex-1 flex flex-col justify-center relative z-10 w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div 
            className="flex transition-transform duration-500 ease-out h-full items-center"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
            {SLIDES.map((slide) => (
                <div key={slide.id} className="w-full flex-shrink-0 flex flex-col items-center justify-center px-6">
                    {/* Image Composite Area */}
                    <div className="w-full relative mb-8 flex justify-center h-[320px] items-center">
                        <div className="relative w-full aspect-square max-w-[280px] flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
                            
                            {/* Main 3D Image */}
                            <img 
                                src={slide.image}
                                alt="3D Illustration" 
                                className="w-full h-full object-contain drop-shadow-2xl transition-all duration-500 scale-110"
                                style={{ filter: slide.filter }}
                                draggable={false}
                            />

                            {/* Floating Overlay Icon Card - Creates a composite "Scene" */}
                            <div className="absolute -bottom-4 -right-2 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl animate-[float_4s_ease-in-out_infinite_reverse]">
                                <span className={`material-symbols-outlined text-[42px] ${slide.overlayColor} drop-shadow-lg`}>
                                    {slide.overlayIcon}
                                </span>
                            </div>

                             {/* Decorative Background Circle */}
                             <div className={`absolute inset-0 m-auto w-40 h-40 rounded-full blur-[60px] opacity-40 -z-10 ${slide.id === 1 ? 'bg-blue-600' : slide.id === 2 ? 'bg-purple-600' : 'bg-orange-600'}`}></div>
                        </div>
                    </div>

                    {/* Text Area */}
                    <div className="text-center space-y-4 max-w-sm mx-auto">
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
                            {slide.titlePrefix}<br/>
                            <span className={slide.id === 1 ? 'text-blue-500' : slide.id === 2 ? 'text-purple-500' : 'text-orange-500'}>
                                {slide.titleHighlight}
                            </span>
                        </h1>
                        <p className="text-slate-400 font-medium leading-relaxed text-sm">
                            {slide.description}
                        </p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-8 relative z-10">
        {SLIDES.map((_, index) => (
           <button
             key={index}
             onClick={() => handleManualChange(index)}
             className={`h-1.5 rounded-full transition-all duration-300 ${
               index === currentSlide 
                 ? (index === 0 ? 'w-6 bg-blue-600' : index === 1 ? 'w-6 bg-purple-600' : 'w-6 bg-orange-600') 
                 : 'w-1.5 bg-slate-800'
             }`}
           />
        ))}
      </div>

      {/* Footer Buttons */}
      <div className="w-full px-6 pb-12 pt-2 relative z-10">
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate('/login', { state: { tab: 'register' } })}
            className={`w-full rounded-xl h-14 text-white font-bold shadow-lg active:scale-[0.98] transition-all
              ${currentSlide === 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 
                currentSlide === 1 ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' : 
                'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'}
            `}
          >
            Começar Agora
          </button>
          <button 
             onClick={() => navigate('/login', { state: { tab: 'login' } })}
             className="w-full rounded-xl h-14 bg-transparent border border-slate-800 hover:bg-slate-900 text-white font-bold active:scale-[0.98] transition-all"
          >
            Já tenho uma conta
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;