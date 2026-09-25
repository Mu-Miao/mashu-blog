// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './GooeyNav.css';

// 液态黏合导航：切换项时药丸形变 + 气泡爆开；active 跟随 react-router 当前路由
const GooeyNav = ({
  items,
  animationTime = 600,
  particleCount = 12,
  particleDistances = [40, 8],
  particleR = 60,
  timeVariance = 250,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  onNavigate = undefined
}) => {
  const containerRef = useRef(null);
  const navRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const indexForPath = useCallback(
    pathname => {
      for (let i = 0; i < items.length; i++) {
        const to = items[i].to;
        if (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/')) return i;
      }
      return -1;
    },
    [items]
  );

  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = indexForPath(location.pathname);
    return idx >= 0 ? idx : 0;
  });

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i, t, d, r) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = element => {
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('active');
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--gooey-color-${p.color}, var(--gooey-accent))`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => element.classList.add('active'));
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            /* ignore */
          }
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = element => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const triggerEffect = liEl => {
    if (filterRef.current) {
      filterRef.current.querySelectorAll('.particle').forEach(p => filterRef.current.removeChild(p));
    }
    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
    if (filterRef.current) makeParticles(filterRef.current);
  };

  const handleClick = (e, index) => {
    e.preventDefault();
    const liEl = e.currentTarget;
    const target = items[index];
    if (activeIndex === index) {
      navigate(target.to);
      return;
    }
    setActiveIndex(index);
    updateEffectPosition(liEl);
    triggerEffect(liEl);
    navigate(target.to);
    onNavigate?.(index);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const liEl = e.currentTarget.parentElement;
      if (liEl) handleClick({ currentTarget: liEl, preventDefault: () => {} }, index);
    }
  };

  // 路由变化（含前进/后退）时同步高亮与药丸位置
  useEffect(() => {
    const idx = indexForPath(location.pathname);
    if (idx < 0) return;
    setActiveIndex(prev => (prev === idx ? prev : idx));
    const activeLi = navRef.current?.querySelectorAll('li')[idx];
    if (activeLi) updateEffectPosition(activeLi);
  }, [location.pathname, indexForPath]);

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return undefined;
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('active');
    }
    const resizeObserver = new ResizeObserver(() => {
      const cur = navRef.current?.querySelectorAll('li')[activeIndex];
      if (cur) updateEffectPosition(cur);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav aria-label="主导航">
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={item.to} className={activeIndex === index ? 'active' : ''}>
              <a href={item.to} aria-current={activeIndex === index ? 'page' : undefined} onClick={e => handleClick(e, index)} onKeyDown={e => handleKeyDown(e, index)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text select-none" ref={textRef} />
    </div>
  );
};

export default GooeyNav;
