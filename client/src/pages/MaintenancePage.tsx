import { useState, useEffect, useCallback } from "react";

interface Props {
  endTime: string;
  message: string;
}

const EMOJIS = ["💰", "🏆", "💎", "🚀", "⭐", "🎯", "🎮", "🔥"];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildCards() {
  const pairs = [...EMOJIS, ...EMOJIS];
  return shuffle(pairs).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

function useCountdown(endTime: string) {
  const calc = useCallback(() => {
    if (!endTime) return null;
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, over: true };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, over: false };
  }, [endTime]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

function MemoryGame() {
  const [cards, setCards] = useState(buildCards);
  const [picked, setPicked] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const flip = (id: number) => {
    if (locked) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const next = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(next);
    const newPicked = [...picked, id];

    if (newPicked.length === 2) {
      setLocked(true);
      setMoves(m => m + 1);
      const [a, b] = newPicked.map(pid => next.find(c => c.id === pid)!);
      if (a.emoji === b.emoji) {
        const matched = next.map(c => newPicked.includes(c.id) ? { ...c, matched: true } : c);
        setCards(matched);
        setPicked([]);
        setLocked(false);
        if (matched.every(c => c.matched)) setWon(true);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => newPicked.includes(c.id) ? { ...c, flipped: false } : c));
          setPicked([]);
          setLocked(false);
        }, 900);
      }
    } else {
      setPicked(newPicked);
    }
  };

  const reset = () => {
    setCards(buildCards());
    setPicked([]);
    setLocked(false);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm text-white/70">
        <span>Coups : <strong className="text-white">{moves}</strong></span>
        {won && <span className="text-yellow-300 font-bold animate-bounce">🎉 Bravo !</span>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => flip(card.id)}
            data-testid={`card-memory-${card.id}`}
            className={`
              w-14 h-14 rounded-xl text-2xl font-bold transition-all duration-300 select-none
              ${card.flipped || card.matched
                ? "bg-white/20 border-2 border-white/40 scale-105"
                : "bg-white/10 border-2 border-white/20 hover:bg-white/15 active:scale-95"}
              ${card.matched ? "opacity-60" : ""}
            `}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>
      {won && (
        <button
          onClick={reset}
          data-testid="button-reset-game"
          className="mt-2 px-5 py-2 bg-yellow-400 text-yellow-900 font-bold rounded-xl hover:bg-yellow-300 transition-colors"
        >
          Rejouer 🔄
        </button>
      )}
    </div>
  );
}

export default function MaintenancePage({ endTime, message }: Props) {
  const time = useCountdown(endTime);
  const [showGame, setShowGame] = useState(false);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #1a1464 40%, #0d47a1 100%)" }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { w: 300, h: 300, x: -80, y: -80, delay: "0s", dur: "8s" },
          { w: 200, h: 200, x: "70%", y: "60%", delay: "2s", dur: "10s" },
          { w: 150, h: 150, x: "20%", y: "70%", delay: "4s", dur: "7s" },
          { w: 100, h: 100, x: "80%", y: "10%", delay: "1s", dur: "9s" },
        ].map((o, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: o.w,
              height: o.h,
              left: o.x,
              top: o.y,
              background: i % 2 === 0
                ? "radial-gradient(circle, #4fc3f7, transparent)"
                : "radial-gradient(circle, #ce93d8, transparent)",
              animation: `pulse ${o.dur} ease-in-out infinite alternate`,
              animationDelay: o.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6 pt-10 pb-8 gap-6">

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: "linear-gradient(135deg, #1565c0, #283593)" }}
            >
              <span className="text-4xl">🔧</span>
            </div>
            {/* Spinning ring */}
            <div
              className="absolute -inset-2 rounded-[28px] border-2 border-blue-400/40"
              style={{ animation: "spin 6s linear infinite" }}
            />
            <div
              className="absolute -inset-4 rounded-[36px] border border-purple-400/20"
              style={{ animation: "spin 10s linear infinite reverse" }}
            />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-wide">SIKA TEXTE</h1>
            <span className="text-xs font-semibold text-blue-300 bg-blue-300/10 border border-blue-300/30 px-3 py-0.5 rounded-full">
              BUSINESS
            </span>
          </div>
        </div>

        {/* Maintenance badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-orange-400/40 text-orange-300 text-sm font-semibold"
          style={{ background: "rgba(255,165,0,0.1)" }}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block" />
          Maintenance en cours
        </div>

        {/* Message */}
        <p className="text-center text-white/80 text-sm leading-relaxed px-2">
          {message || "Le site est en cours de maintenance. Nous revenons très bientôt !"}
        </p>

        {/* Countdown */}
        {endTime && time && !time.over && (
          <div className="w-full">
            <p className="text-center text-white/50 text-xs mb-3 uppercase tracking-widest">Retour dans</p>
            <div className="flex justify-center gap-3">
              {[{ label: "H", val: time.h }, { label: "MIN", val: time.m }, { label: "SEC", val: time.s }].map(({ label, val }) => (
                <div key={label} className="flex flex-col items-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-mono font-bold text-white shadow-lg"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    {pad(val)}
                  </div>
                  <span className="text-xs text-white/40 mt-1 tracking-widest">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {endTime && time?.over && (
          <div className="text-center">
            <p className="text-green-300 font-semibold">La maintenance est terminée.</p>
            <p className="text-white/60 text-sm mt-1">Rechargez la page pour continuer.</p>
            <button
              onClick={() => window.location.reload()}
              data-testid="button-reload"
              className="mt-3 px-6 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-colors"
            >
              Recharger
            </button>
          </div>
        )}

        {/* Animated progress bar */}
        <div className="w-full h-1 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
            style={{ animation: "progress-bar 3s ease-in-out infinite alternate", width: "60%" }}
          />
        </div>

        {/* Game section */}
        <div className="w-full">
          <button
            onClick={() => setShowGame(g => !g)}
            data-testid="button-toggle-game"
            className="w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-300 border border-white/20 text-white/80 hover:bg-white/10 active:scale-95"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {showGame ? "🙈 Masquer le jeu" : "🎮 Jouer en attendant"}
          </button>

          {showGame && (
            <div
              className="mt-4 p-4 rounded-2xl border border-white/15"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <p className="text-center text-white/60 text-xs mb-4 uppercase tracking-widest">Jeu de mémoire</p>
              <MemoryGame />
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs text-center">
          Merci pour votre patience. Notre équipe travaille activement.
        </p>
      </div>

      <style>{`
        @keyframes progress-bar {
          from { width: 20%; margin-left: 0; }
          to { width: 70%; margin-left: 30%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
