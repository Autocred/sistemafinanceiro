'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function FloatingScroller() {
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  useEffect(() => {
    const scroller = document.querySelector('.main-content') || window;
    
    const handleScroll = (e: Event) => {
      const target = e.target as any;
      
      let currentScrollY = 0;
      let currentMaxScroll = 0;
      
      if (target === document || target === window) {
        currentScrollY = window.scrollY;
        currentMaxScroll = document.documentElement.scrollHeight - window.innerHeight;
      } else {
        const el = target as HTMLElement;
        currentScrollY = el.scrollTop;
        currentMaxScroll = el.scrollHeight - el.clientHeight;
      }
      
      setScrollY(currentScrollY);
      setMaxScroll(currentMaxScroll);
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      // Trigger a fake scroll event to recalculate heights
      if (scroller === window) {
        handleScroll({ target: document } as any);
      } else {
        handleScroll({ target: scroller } as any);
      }
    }, { passive: true });
    
    // Initial calculation
    if (scroller === window) {
      handleScroll({ target: document } as any);
    } else {
      handleScroll({ target: scroller } as any);
    }

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll as any);
    };
  }, []);

  const scrollToTop = () => {
    const scroller = document.querySelector('.main-content') || window;
    scroller.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const scroller = document.querySelector('.main-content') || window;
    const scrollHeight = scroller === window 
      ? document.documentElement.scrollHeight 
      : (scroller as HTMLElement).scrollHeight;
      
    scroller.scrollTo({ top: scrollHeight, behavior: 'smooth' });
  };

  // If page is not scrollable enãough, don't show
  if (maxScroll <= 100) return null;

  // Show UP button if scrolled down a bit
  const showUp = scrollY > 200;
  // Show DOWN button if not at the bottom
  const showDown = scrollY < maxScroll - 200;

  return (
    <div style={{
      position: 'fixed',
      right: '20px',
      bottom: '180px', // Bem acima do botão '+' e do menu inferior não celular
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      opacity: (showUp || showDown) ? 1 : 0,
      pointerEvents: (showUp || showDown) ? 'auto' : 'none',
      transition: 'opacity 0.3s ease-in-out'
    }}>
      {showUp && (
        <button
          onClick={scrollToTop}
          title="Ir para o topo"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'var(--bg-glass)';
          }}
        >
          <ChevronUp size={20} />
        </button>
      )}

      {showDown && (
        <button
          onClick={scrollToBottom}
          title="Ir para o final"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(3px)';
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'var(--bg-glass)';
          }}
        >
          <ChevronDown size={20} />
        </button>
      )}
    </div>
  );
}
