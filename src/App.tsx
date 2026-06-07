/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Trophy, ArrowUp, ArrowDown, User, Volume2, Lock, Repeat, VolumeX, Users, Bot, Cpu, Gauge, Brain, Loader2, ArrowLeft, Star } from 'lucide-react';

const MODES = {
  PVP: 'PLAY_WITH_FRIENDS',
  PVE: 'PLAY_WITH_AI',
  EVE: 'AI_VS_AI'
} as const;

const DIFF = {
  EASY: 'EASY',     
  MEDIUM: 'MEDIUM', 
  HARD: 'HARD'      
} as const;

const SPEEDS = {
  SLOW: 2000,   
  NORMAL: 1000, 
  FAST: 500     
} as const;

type GameMode = typeof MODES[keyof typeof MODES];
type AiDifficulty = typeof DIFF[keyof typeof DIFF];
type AiSpeed = typeof SPEEDS[keyof typeof SPEEDS];

interface HistoryItem {
  guess: number;
  result: 'lower' | 'higher' | 'correct';
}

interface PlayerMemory {
  min: number;
  max: number;
}

interface Feedback {
  type: 'lower' | 'higher' | 'correct';
  text: string;
  guess: number;
}

export default function App() {
  const [appState, setAppState] = useState<string>('MENU'); // MENU, SETTINGS, SETUP, PLAYING, GAMEOVER
  
  const [gameMode, setGameMode] = useState<GameMode>(MODES.PVP);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>(DIFF.MEDIUM);
  const [aiSpeed, setAiSpeed] = useState<AiSpeed>(SPEEDS.NORMAL);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Gameplay Data
  const [p1Secret, setP1Secret] = useState<number | null>(null);
  const [p2Secret, setP2Secret] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [winner, setWinner] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  
  // Scoring System
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [round, setRound] = useState<number>(1);
  
  const [p1History, setP1History] = useState<HistoryItem[]>([]);
  const [p2History, setP2History] = useState<HistoryItem[]>([]);
  const [p1Memory, setP1Memory] = useState<PlayerMemory>({ min: 1, max: 100 }); 
  const [p2Memory, setP2Memory] = useState<PlayerMemory>({ min: 1, max: 100 }); 
  
  const [inputValue, setInputValue] = useState<string>('');
  const [setupStep, setSetupStep] = useState<number>(1);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isHumanTurn = (gameMode === MODES.PVP) || 
                        (gameMode === MODES.PVE && currentTurn === 1);
    if (appState === 'SETUP' || (appState === 'PLAYING' && isHumanTurn && !feedback && !isAiThinking)) {
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
    }
  }, [appState, setupStep, currentTurn, feedback, isAiThinking, gameMode]);

  useEffect(() => {
    if (appState === 'PLAYING' && !feedback && !winner) {
      const isAITurn = (gameMode === MODES.PVE && currentTurn === 2) || (gameMode === MODES.EVE);
      
      if (isAITurn) {
        setIsAiThinking(true);
        const timer = setTimeout(() => {
          makeAIGuess();
        }, aiSpeed);
        return () => clearTimeout(timer);
      }
    }
  }, [currentTurn, appState, feedback, winner]);

  const initAudio = () => {
    setSoundEnabled(true);
    if ('speechSynthesis' in window) {
      try {
        const msg = new SpeechSynthesisUtterance('ចាប់ផ្តើម');
        msg.lang = 'km-KH';
        msg.volume = 0;
        window.speechSynthesis.speak(msg);
      } catch (e) {
        console.error('SpeechSynthesis error:', e);
      }
    }
  };

  const playTone = (type: 'higher' | 'lower' | 'correct') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'higher') {
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      } else if (type === 'lower') {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(880, now + 0.2);
      }
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.error('Tone playback error:', e);
    }
  };

  const speakVoice = (text: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'km-KH';
        window.speechSynthesis.speak(utterance);
      }, 50); 
    } catch (e) {
      console.error('Speech synthesis speak error:', e);
    }
  };

  const handleSelectMode = (mode: GameMode) => {
    initAudio();
    setGameMode(mode);
    setP1Score(0);
    setP2Score(0);
    setRound(1);
    setErrorText(null);
    if (mode === MODES.PVP) {
      setAppState('SETUP');
      setSetupStep(1);
    } else {
      setAppState('SETTINGS'); 
    }
  };

  const startSetup = () => {
    setAppState('SETUP');
    setErrorText(null);
    if (gameMode === MODES.EVE) {
      setP1Secret(Math.floor(Math.random() * 100) + 1);
      setP2Secret(Math.floor(Math.random() * 100) + 1);
      setTimeout(() => setAppState('PLAYING'), 1000);
    } else if (gameMode === MODES.PVE) {
      setP2Secret(Math.floor(Math.random() * 100) + 1);
      setSetupStep(1);
    } else {
      setSetupStep(1);
    }
  };

  const handleSetSecret = () => {
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      setErrorText('សូមបញ្ចូលលេខចន្លោះ ១ ដល់ ១០០');
      return;
    }

    setErrorText(null);
    if (setupStep === 1) {
      setP1Secret(num);
      if (gameMode === MODES.PVE) {
        setInputValue('');
        setAppState('PLAYING'); 
      } else {
        setSetupStep(2);
        setInputValue('');
      }
    } else if (setupStep === 2) {
      setP2Secret(num);
      setInputValue('');
      setAppState('PLAYING');
    }
  };

  const makeAIGuess = () => {
    const memory = currentTurn === 1 ? p1Memory : p2Memory;
    let guess = 50;

    if (aiDifficulty === DIFF.EASY) {
      guess = Math.floor(Math.random() * 100) + 1;
    } else if (aiDifficulty === DIFF.MEDIUM) {
      const min = memory.min;
      const max = memory.max;
      if (min >= max) guess = min;
      else guess = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      guess = Math.floor((memory.min + memory.max) / 2);
    }

    handleGuessSubmit(guess);
  };

  const handleManualGuess = () => {
    const guess = parseInt(inputValue, 10);
    if (isNaN(guess) || guess < 1 || guess > 100) {
      setErrorText('សូមបញ្ចូលលេខចន្លោះ ១ ដល់ ១០០');
      return;
    }
    setErrorText(null);
    handleGuessSubmit(guess);
  };

  const handleGuessSubmit = (guess: number) => {
    setInputValue('');
    setIsAiThinking(false);
    setErrorText(null);
    
    const targetSecret = currentTurn === 1 ? p2Secret : p1Secret;
    const currentMemory = currentTurn === 1 ? p1Memory : p2Memory;
    
    if (targetSecret === null) return;

    let result: 'lower' | 'higher' | 'correct' = 'correct';
    let newMin = currentMemory.min;
    let newMax = currentMemory.max;

    if (guess > targetSecret) {
      result = 'lower';
      setFeedback({ type: 'lower', text: 'ត្រូវតូចជាងនេះ!', guess });
      playTone('lower');
      speakVoice('តូចជាងនេះ');
      newMax = Math.min(newMax, guess - 1);
    } else if (guess < targetSecret) {
      result = 'higher';
      setFeedback({ type: 'higher', text: 'ត្រូវធំជាងនេះ!', guess });
      playTone('higher');
      speakVoice('ធំជាងនេះ');
      newMin = Math.max(newMin, guess + 1);
    } else {
      result = 'correct';
      setFeedback({ type: 'correct', text: `ត្រឹមត្រូវ! ចម្លើយគឺ ${targetSecret}`, guess });
      playTone('correct');
      speakVoice(`ត្រឹមត្រូវ! អ្នកលេងទី ${currentTurn} ឈ្នះក្នុងជុំនេះ`);
      setWinner(currentTurn);
      
      // Update Score
      if (currentTurn === 1) setP1Score(prev => prev + 1);
      else setP2Score(prev => prev + 1);

      setTimeout(() => {
        setAppState('GAMEOVER');
        setFeedback(null);
      }, 3000);
      return;
    }

    const historyItem: HistoryItem = { guess, result };
    if (currentTurn === 1) {
      setP1History([historyItem, ...p1History]);
      setP1Memory({ min: newMin, max: newMax });
    } else {
      setP2History([historyItem, ...p2History]);
      setP2Memory({ min: newMin, max: newMax });
    }

    setTimeout(() => {
      setCurrentTurn(currentTurn === 1 ? 2 : 1);
      setFeedback(null);
    }, 2000);
  };

  const handleNextRound = () => {
    setRound(prev => prev + 1);
    setP1Secret(null);
    setP2Secret(null);
    setP1History([]);
    setP2History([]);
    setP1Memory({ min: 1, max: 100 });
    setP2Memory({ min: 1, max: 100 });
    setCurrentTurn(1);
    setWinner(null);
    setInputValue('');
    setFeedback(null);
    setErrorText(null);
    setIsAiThinking(false);
    startSetup();
  };

  const handleBackToMenu = () => {
    setAppState('MENU');
    setP1Secret(null);
    setP2Secret(null);
    setP1History([]);
    setP2History([]);
    setP1Memory({ min: 1, max: 100 });
    setP2Memory({ min: 1, max: 100 });
    setCurrentTurn(1);
    setWinner(null);
    setP1Score(0);
    setP2Score(0);
    setRound(1);
    setInputValue('');
    setFeedback(null);
    setErrorText(null);
    setIsAiThinking(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#0f172a] to-black flex flex-col items-center justify-center p-4 font-sans text-white overflow-hidden relative">
      
      {/* Background Glow Elements */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000 opacity-30 pointer-events-none ${currentTurn === 1 ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
      <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000 opacity-20 pointer-events-none ${currentTurn === 2 ? 'bg-rose-500' : 'bg-cyan-500'}`}></div>

      <div className="bg-white/10 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/10 max-w-md w-full relative z-10 animate-modal-pop flex flex-col min-h-[700px]">
        
        {/* === HEADER (For Setup & Playing) === */}
        {appState !== 'MENU' && appState !== 'GAMEOVER' && (
          <div className="flex flex-col items-center mb-6 relative">
            <button 
              onClick={handleBackToMenu}
              className="absolute left-0 top-0 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="ត្រឡប់ទៅដើម"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="absolute right-0 top-0 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title={soundEnabled ? "បិទសំឡេង" : "បើកសំឡេង"}
            >
              {soundEnabled ? <Volume2 className="w-6 h-6 text-cyan-400 animate-pulse" /> : <VolumeX className="w-6 h-6 text-slate-500" />}
            </button>
            <h1 className="text-xl font-bold flex items-center justify-center gap-2 mb-4 text-white">
              ហ្គេមទាយលេខ (Guess Number)
            </h1>

            {/* Score Board Layout */}
            {(appState === 'PLAYING' || appState === 'GAMEOVER') && (
              <div className="w-full flex bg-black/40 border border-white/10 p-2 rounded-2xl shadow-inner relative mt-2">
                
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 text-yellow-300 text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md z-10">
                  <Star className="w-3 h-3 fill-yellow-300" /> ជុំទី {round}
                </div>

                <div className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl transition-colors ${currentTurn === 1 ? 'bg-white/10 shadow-[inset_0_0_15px_rgba(34,211,238,0.2)]' : ''}`}>
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1 whitespace-nowrap">
                    អ្នកទី១
                  </span>
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-b from-cyan-300 to-cyan-600 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{p1Score}</span>
                </div>
                
                <div className="w-px bg-white/10 mx-2 self-stretch"></div>
                
                <div className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl transition-colors ${currentTurn === 2 ? 'bg-white/10 shadow-[inset_0_0_15px_rgba(251,113,133,0.2)]' : ''}`}>
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-1 whitespace-nowrap">
                    អ្នកទី២ {gameMode !== MODES.PVP ? '(AI)' : ''}
                  </span>
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-b from-rose-300 to-rose-600 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]">{p2Score}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Container */}
        <div className="flex-1 flex flex-col justify-center relative">
          
          {/* STEP 1: Main Menu */}
          {appState === 'MENU' && (
            <div className="space-y-4 animate-modal-pop text-center mt-4">
              <div className="mb-2 inline-block bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 font-bold tracking-widest text-sm uppercase">Number Guess</span>
              </div>
              <h1 className="text-4xl font-black mb-10 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-lg tracking-tight">
                ជ្រើសរើសទម្រង់លេង
              </h1>

              <div className="flex flex-col gap-4 mt-8">
                <button onClick={() => handleSelectMode(MODES.PVP)} className="group relative w-full p-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/40 to-blue-500/40 hover:from-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25">
                  <div className="bg-[#121b2f] group-hover:bg-[#1a2642] transition-colors rounded-[14px] py-4 px-6 flex items-center justify-start gap-4">
                    <Users className="w-8 h-8 text-cyan-400" />
                    <div className="text-left">
                      <h3 className="font-bold text-lg text-white">លេងជាមួយមិត្តភក្តិ</h3>
                      <p className="text-xs text-slate-400">មនុស្ស ២នាក់ ប្តូរវេនគ្នាទាយ</p>
                    </div>
                  </div>
                </button>

                <button onClick={() => handleSelectMode(MODES.PVE)} className="group relative w-full p-0.5 rounded-2xl bg-gradient-to-r from-rose-500/40 to-purple-500/40 hover:from-rose-400 hover:to-purple-400 transition-all duration-300 shadow-lg hover:shadow-rose-500/25">
                  <div className="bg-[#121b2f] group-hover:bg-[#1a2642] transition-colors rounded-[14px] py-4 px-6 flex items-center justify-start gap-4">
                    <div className="flex items-center text-rose-400"><User className="w-6 h-6" /><Bot className="w-6 h-6 -ml-2" /></div>
                    <div className="text-left">
                      <h3 className="font-bold text-lg text-white">លេងជាមួយ AI</h3>
                      <p className="text-xs text-slate-400">ប្រកួតប្រាជ្ញាជាមួយកុំព្យូទ័រ</p>
                    </div>
                  </div>
                </button>

                <button onClick={() => handleSelectMode(MODES.EVE)} className="group relative w-full p-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/40 to-teal-500/40 hover:from-emerald-400 hover:to-teal-400 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25">
                  <div className="bg-[#121b2f] group-hover:bg-[#1a2642] transition-colors rounded-[14px] py-4 px-6 flex items-center justify-start gap-4">
                    <Cpu className="w-8 h-8 text-emerald-400" />
                    <div className="text-left">
                      <h3 className="font-bold text-lg text-white">AI ប្រកួតជាមួយ AI</h3>
                      <p className="text-xs text-slate-400">អង្គុយមើលកុំព្យូទ័រប្រកួតគ្នា</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Sound activator note */}
              <div className="pt-6">
                <button
                  onClick={() => {
                    initAudio();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 mx-auto transition-all ${
                    soundEnabled 
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' 
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
                  {soundEnabled ? 'បើកសំឡេងរួចរាល់ (Voice Assistance On)' : 'ចុចបើកសំឡេងពិពណ៌នាជួយសម្រួល'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AI Settings */}
          {appState === 'SETTINGS' && (
            <div className="space-y-6 animate-modal-pop text-center pt-8">
              <div className="inline-block bg-white/5 p-4 rounded-full border border-white/10 mb-2">
                <Bot className="w-12 h-12 text-rose-400" />
              </div>
              <h2 className="text-3xl font-black mb-8 text-white">ការកំណត់ AI</h2>
              
              <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-left mb-4">
                <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Brain className="w-4 h-4 text-cyan-400"/> កម្រិតភាពឆ្លាត
                </h3>
                <div className="flex gap-2">
                  {(Object.entries({ [DIFF.EASY]: 'ខ្សោយ (Easy)', [DIFF.MEDIUM]: 'មធ្យម (Medium)', [DIFF.HARD]: 'ខ្លាំង (Hard)' }) as [AiDifficulty, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setAiDifficulty(val)}
                      className={`flex-1 py-3 text-xs rounded-xl font-bold transition-all border ${aiDifficulty === val ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-left mb-8">
                <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Gauge className="w-4 h-4 text-rose-400"/> ល្បឿនលេង
                </h3>
                <div className="flex gap-2">
                  {(Object.entries({ [SPEEDS.SLOW]: 'យឺត', [SPEEDS.NORMAL]: 'ធម្មតា', [SPEEDS.FAST]: 'លឿន' }) as unknown as [AiSpeed, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setAiSpeed(Number(val) as AiSpeed)}
                      className={`flex-1 py-3 text-sm rounded-xl font-bold transition-all border ${aiSpeed === Number(val) ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startSetup} className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transform transition-all active:scale-95 uppercase tracking-wide">
                ចាប់ផ្តើមលេង
              </button>
            </div>
          )}

          {/* STEP 3: Setup Secrets */}
          {appState === 'SETUP' && (
            <div className="text-center space-y-6 animate-modal-pop flex flex-col justify-center h-full pb-10">
              <div className="relative inline-block mb-4">
                 <div className={`absolute inset-0 blur-xl opacity-40 rounded-full ${setupStep === 1 ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
                 <div className={`relative inline-flex p-5 rounded-full bg-black/40 border border-white/10 ${setupStep === 1 ? 'text-cyan-400' : 'text-rose-400'}`}>
                   <Lock className="w-10 h-10" />
                 </div>
              </div>
              
              <div>
                <h2 className="text-3xl font-black text-white">
                  អ្នកលេងទី {setupStep} {(gameMode === MODES.PVE && setupStep === 1) ? '(អ្នក)' : ''}
                </h2>
                <p className="text-slate-400 text-sm mt-3">សូមលាក់លេខសម្ងាត់ចន្លោះ ១ ដល់ ១០០</p>
              </div>
              
              <div className="space-y-4 pt-4 w-full max-w-[280px] mx-auto">
                <input
                  ref={inputRef} type="password" pattern="[0-9]*" inputMode="numeric"
                  value={inputValue} 
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (errorText) setErrorText(null);
                  }} 
                  onKeyDown={(e) => handleKeyPress(e, handleSetSecret)}
                  placeholder="•••"
                  className={`w-full text-center text-5xl py-4 bg-black/30 border border-white/20 rounded-2xl focus:outline-none bg-black/50 text-white tracking-[0.2em] transition-all shadow-inner ${setupStep === 1 ? 'focus:border-cyan-400' : 'focus:border-rose-400'}`}
                />

                {errorText && (
                  <div className="text-red-400 text-sm font-semibold animate-pulse">
                    {errorText}
                  </div>
                )}

                <button onClick={handleSetSecret} className={`w-full text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-white/10 ${setupStep === 1 ? 'bg-cyan-600/80 hover:bg-cyan-500' : 'bg-rose-600/80 hover:bg-rose-500'}`}>
                  ចាក់សោរលេខសម្ងាត់
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Playing */}
          {appState === 'PLAYING' && (
            <div className="flex flex-col h-full w-full animate-modal-pop">
              
              {/* History Panels (P1 vs P2 side-by-side) */}
              <div className="flex justify-between mb-8 gap-3 mt-4">
                {([1, 2] as const).map((player) => {
                  const history = player === 1 ? p1History : p2History;
                  const lastGuess = history[0];
                  const isActive = currentTurn === player;
                  const isCyan = player === 1;
                  return (
                     <div key={player} className={`flex-1 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden bg-black/30 backdrop-blur-sm ${isActive ? (isCyan ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-rose-500/50 shadow-[0_0_15px_rgba(251,113,133,0.2)]') : 'border-white/5 opacity-60'}`}>
                        {isActive && <div className={`absolute top-0 left-0 w-full h-1 ${isCyan ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>}
                        <div className={`text-xs font-bold mb-2 uppercase tracking-wider ${isCyan ? 'text-cyan-400' : 'text-rose-400'}`}>ការទាយចុងក្រោយ</div>
                        
                        {lastGuess ? (
                          <div className="flex items-center justify-between">
                             <span className="text-2xl font-black text-white">{lastGuess.guess}</span>
                             <div className={`p-1.5 rounded-lg border ${lastGuess.result === 'higher' ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'bg-sky-500/20 border-sky-500/30 text-sky-400'}`}>
                                {lastGuess.result === 'higher' ? <ArrowUp className="w-5 h-5 stroke-[3]"/> : <ArrowDown className="w-5 h-5 stroke-[3]"/>}
                             </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 py-1">មិនទាន់ទាយ</div>
                        )}
                     </div>
                  );
                })}
              </div>

              {/* Main Interaction Area */}
              <div className="flex-1 flex flex-col justify-center items-center w-full min-h-[280px]">
                {feedback ? (
                  <div className="w-full relative animate-modal-pop">
                    <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full ${feedback.type === 'higher' ? 'bg-orange-500' : feedback.type === 'lower' ? 'bg-sky-500' : 'bg-emerald-500'}`}></div>
                    <div className={`w-full p-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-center border relative bg-black/40 backdrop-blur-md ${
                      feedback.type === 'higher' ? 'border-orange-500/50 text-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.3)]' :
                      feedback.type === 'lower' ? 'border-sky-500/50 text-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]' :
                      'border-emerald-500/50 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    }`}>
                      <div className="bg-white/5 border border-white/10 px-6 py-1.5 rounded-full text-xs font-bold text-slate-300 mb-2">
                        អ្នកទាយលេខ: {feedback.guess}
                      </div>
                      {feedback.type === 'higher' && <ArrowUp className="w-20 h-20 animate-bounce stroke-[3]" />}
                      {feedback.type === 'lower' && <ArrowDown className="w-20 h-20 animate-bounce stroke-[3]" />}
                      {feedback.type === 'correct' && <Trophy className="w-20 h-20 animate-bounce stroke-[2] text-yellow-400" />}
                      <span className="font-black text-3xl text-white drop-shadow-md">{feedback.text}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {isAiThinking ? (
                      <div className="flex flex-col items-center justify-center text-slate-300 space-y-6 animate-modal-pop bg-black/20 p-8 rounded-[2rem] border border-white/5 w-full">
                        <Loader2 className={`w-14 h-14 animate-spin ${currentTurn === 1 ? 'text-cyan-400' : 'text-rose-400'}`} />
                        <span className="font-bold text-lg tracking-wider">AI កំពុងគិត...</span>
                      </div>
                    ) : (
                      <div className="w-full max-w-[280px] space-y-4 animate-modal-pop relative">
                        <div className="text-center font-bold text-slate-400 mb-2 text-sm uppercase tracking-widest">
                           ទាយលេខសម្ងាត់របស់អ្នកទី {currentTurn === 1 ? '២' : '១'}
                        </div>
                        <input
                          ref={inputRef} type="number" pattern="[0-9]*" inputMode="numeric"
                          value={inputValue} 
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            if (errorText) setErrorText(null);
                          }} 
                          onKeyDown={(e) => handleKeyPress(e, handleManualGuess)}
                          placeholder="?"
                          className={`w-full text-center text-6xl py-5 border-2 rounded-3xl focus:outline-none bg-black/40 font-black shadow-inner transition-colors ${currentTurn === 1 ? 'border-white/10 focus:border-cyan-400 text-cyan-300 focus:bg-black/60' : 'border-white/10 focus:border-rose-400 text-rose-300 focus:bg-black/60'}`}
                        />

                        {errorText && (
                          <div className="text-red-400 text-sm font-semibold text-center animate-pulse">
                            {errorText}
                          </div>
                        )}

                        <button onClick={handleManualGuess} className={`w-full font-black py-4 rounded-xl transition-all shadow-lg transform hover:-translate-y-0.5 text-white text-lg border border-white/10 ${currentTurn === 1 ? 'bg-cyan-600/80 hover:bg-cyan-500 shadow-cyan-500/20' : 'bg-rose-600/80 hover:bg-rose-500 shadow-rose-500/20'}`}>
                          បញ្ជាក់ចម្លើយ
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Game Over Modal */}
          {appState === 'GAMEOVER' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900/90 border border-white/20 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 max-w-md w-full text-center transform animate-modal-pop relative overflow-hidden">
                
                {/* Glow Effects */}
                <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full blur-[60px] opacity-40 ${winner === 1 ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
                <div className={`absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-40 ${winner === 1 ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>

                <div className="relative z-10">
                  <div className="relative inline-block mb-6">
                    <Trophy className="w-24 h-24 mx-auto text-yellow-400 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                    <div className="absolute -bottom-2 -right-4 bg-slate-800 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full border border-yellow-400/30">
                      ជុំទី {round}
                    </div>
                  </div>
                  
                  <h2 className={`text-4xl font-black drop-shadow-sm mb-2 ${winner === 1 ? 'text-cyan-400' : 'text-rose-400'}`}>
                    អ្នកលេងទី {winner} ឈ្នះ!
                  </h2>
                  <p className="text-slate-300 font-medium mb-6 bg-white/5 inline-block px-4 py-1 rounded-full border border-white/10">ទទួលបាន ១ ពិន្ទុបន្ថែម 🎉</p>
                  
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/10 text-left space-y-3 mb-8">
                    <h3 className="font-bold text-slate-400 border-b border-white/10 pb-2 flex items-center gap-2 text-sm uppercase"><Lock className="w-4 h-4"/> លេខសម្ងាត់ចម្លើយ</h3>
                    <div className="flex justify-between items-center bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                      <span className="text-cyan-200 font-medium text-sm">អ្នកទី១ លាក់:</span>
                      <span className="text-2xl font-black text-cyan-400 drop-shadow-sm">{p1Secret}</span>
                    </div>
                    <div className="flex justify-between items-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                      <span className="text-rose-200 font-medium text-sm">អ្នកទី២ លាក់:</span>
                      <span className="text-2xl font-black text-rose-400 drop-shadow-sm">{p2Secret}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button onClick={handleNextRound} className="w-full bg-white text-slate-900 font-black py-4 rounded-xl transition-all flex justify-center items-center gap-2 text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transform hover:-translate-y-0.5">
                      <Repeat className="w-5 h-5" />
                      លេងបន្ត (រក្សាពិន្ទុ)
                    </button>
                    <button onClick={handleBackToMenu} className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" />
                      ត្រឡប់ទៅម៉ឺនុយដើម
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modal-pop {
          0% { transform: scale(0.85) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-pop {
          animation: modal-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
