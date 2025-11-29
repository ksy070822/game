import React, { useState, useEffect, useRef } from "react";
import "./AnimatedUI.css";

/**
 * 애니메이션 래퍼 컴포넌트
 * - 페이지 전환, 요소 등장 애니메이션
 * - stagger 효과로 순차적 등장
 */
export function AnimatedContainer({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 0.5,
  stagger = 0,
  className = ""
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`animated-container ${animation} ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        '--animation-duration': `${duration}s`,
        '--animation-delay': `${delay}s`,
        '--stagger-delay': `${stagger}s`
      }}
    >
      {children}
    </div>
  );
}

/**
 * 스태거 리스트 - 자식 요소들이 순차적으로 등장
 */
export function StaggerList({ children, staggerDelay = 0.1, className = "" }) {
  return (
    <div className={`stagger-list ${className}`}>
      {React.Children.map(children, (child, index) => (
        <div
          className="stagger-item"
          style={{ '--stagger-index': index, '--stagger-delay': `${staggerDelay}s` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * 플로팅 배경 효과
 */
export function FloatingBackground({ variant = "default" }) {
  return (
    <div className={`floating-background ${variant}`}>
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>
      <div className="bg-shape shape-4"></div>
      <div className="bg-shape shape-5"></div>

      {/* 발자국 파티클 */}
      <div className="paw-particles">
        <span className="paw-particle">🐾</span>
        <span className="paw-particle">🐾</span>
        <span className="paw-particle">🐾</span>
        <span className="paw-particle">🐾</span>
        <span className="paw-particle">🐾</span>
      </div>
    </div>
  );
}

/**
 * 인터랙티브 버튼
 */
export function AnimatedButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  className = ""
}) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled || loading) return;

    // 리플 효과
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, ripple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 600);

    onClick && onClick(e);
  };

  return (
    <button
      className={`animated-button ${variant} size-${size} ${loading ? 'loading' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      <span className="button-content">
        {loading ? (
          <span className="button-spinner"></span>
        ) : (
          <>
            {icon && <span className="button-icon">{icon}</span>}
            <span className="button-text">{children}</span>
          </>
        )}
      </span>

      {/* 리플 효과 */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </button>
  );
}

/**
 * 인터랙티브 카드
 */
export function AnimatedCard({
  children,
  onClick,
  variant = "default",
  hoverable = true,
  className = ""
}) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div
      className={`animated-card ${variant} ${hoverable ? 'hoverable' : ''} ${isPressed ? 'pressed' : ''} ${className}`}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <div className="card-glow"></div>
      <div className="card-content">{children}</div>
    </div>
  );
}

/**
 * 로딩 스피너 (귀여운 버전)
 */
export function CuteLoader({ text = "로딩 중..." }) {
  return (
    <div className="cute-loader">
      <div className="loader-paws">
        <span className="loader-paw">🐾</span>
        <span className="loader-paw">🐾</span>
        <span className="loader-paw">🐾</span>
      </div>
      <p className="loader-text">{text}</p>
    </div>
  );
}

/**
 * 성공/에러 토스트
 */
export function AnimatedToast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "💡"
  };

  return (
    <div className={`animated-toast ${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}

/**
 * 모달 오버레이
 */
export function AnimatedModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="animated-modal-overlay" onClick={onClose}>
      <div className="animated-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

/**
 * 진행 바 (게이지)
 */
export function AnimatedProgress({ value = 0, max = 100, color, label, showValue = true }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const getDefaultColor = () => {
    if (percentage >= 70) return '#4ade80';
    if (percentage >= 40) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="animated-progress">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color || getDefaultColor()
          }}
        >
          <div className="progress-shine"></div>
        </div>
      </div>
      {showValue && <span className="progress-value">{Math.round(percentage)}%</span>}
    </div>
  );
}

/**
 * 카운터 애니메이션
 */
export function AnimatedCounter({ value, duration = 1000, prefix = "", suffix = "" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setDisplayValue(Math.round(startValue + (endValue - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className="animated-counter">
      {prefix}{displayValue}{suffix}
    </span>
  );
}

export default {
  AnimatedContainer,
  StaggerList,
  FloatingBackground,
  AnimatedButton,
  AnimatedCard,
  CuteLoader,
  AnimatedToast,
  AnimatedModal,
  AnimatedProgress,
  AnimatedCounter
};
