import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef([]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setVisible(true);
    setProgress(8);
    timers.current.push(setTimeout(() => setProgress(45), 60));
    timers.current.push(setTimeout(() => setProgress(72), 220));
    timers.current.push(setTimeout(() => setProgress(90), 480));
    timers.current.push(setTimeout(() => setProgress(100), 620));
    timers.current.push(setTimeout(() => setVisible(false), 820));
    timers.current.push(setTimeout(() => setProgress(0), 960));

    return () => timers.current.forEach(clearTimeout);
  }, [location.pathname, location.search]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
      <div
        className="h-full rounded-r-full transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          background: 'linear-gradient(90deg, var(--bb-accent), var(--bb-accent-hot))',
          boxShadow: '0 0 8px var(--bb-accent-ring), 0 0 4px var(--bb-accent-ring)',
        }}
      />
    </div>
  );
}
