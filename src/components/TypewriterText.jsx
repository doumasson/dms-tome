import { useState, useEffect, useRef } from 'react';

/**
 * TypewriterText — animates text character-by-character
 * Used for narrator messages to create a typewriter effect
 */
export default function TypewriterText({ text, speed = 30, onComplete }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(true);
      return;
    }

    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      indexRef.current += 1;
      const nextText = text.slice(0, indexRef.current);
      setDisplayedText(nextText);

      if (indexRef.current >= text.length) {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return <span>{displayedText}</span>;
}
