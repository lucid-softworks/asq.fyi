const ITEMS = [
  "★ QUESTIONS ANSWERED BY HUMANS",
  "● OPEN BETA · ALL HANDLES WELCOME",
  "NEW · #PHILOSOPHY-AT-3AM",
  "● BUILT ON THE AT PROTOCOL",
  "★ NO ADS · NO ALGORITHM · NO LOCK-IN",
  "● SIGN IN WITH @YOURHANDLE.BSKY.SOCIAL",
  "? WHY IS THE SKY BLUE · 87 ANSWERS",
  "● YOUR DATA LIVES ON YOUR PDS",
];

export function Ticker() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker__track">
        {doubled.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}
