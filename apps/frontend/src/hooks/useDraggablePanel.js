import { useState, useCallback, useRef } from 'react';

export function useDraggablePanel(getInitial) {
  const [pos, setPos] = useState(() =>
    typeof getInitial === 'function' ? getInitial() : getInitial,
  );
  const posRef = useRef(pos);

  const startDrag = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = posRef.current.x;
    const startY = posRef.current.y;

    const onMove = (ev) => {
      const x = Math.max(0, Math.min(window.innerWidth - 200, startX + ev.clientX - startMouseX));
      const y = Math.max(0, Math.min(window.innerHeight - 48, startY + ev.clientY - startMouseY));
      posRef.current = { x, y };
      setPos({ x, y });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return [pos, startDrag];
}
