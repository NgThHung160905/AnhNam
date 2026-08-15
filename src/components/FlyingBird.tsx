"use client";

import { useEffect, useState } from "react";

export default function FlyingBird() {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    let x = 50;
    let y = 50;
    let dx = 0.12;
    let dy = 0.07;

    const interval = setInterval(() => {
      x += dx;
      y += dy;

      if (x >= 93 || x <= 7) {
        dx = -dx;
        setFlip(dx < 0);
      }
      if (y >= 88 || y <= 10) {
        dy = -dy;
      }

      setPos({ x, y });
    }, 16);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <div
        className="absolute"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: `translate(-50%, -50%) scaleX(${flip ? -1 : 1})`,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 160 130"
          width="130"
          height="110"
          style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))" }}
        >
          {/* === ĐUÔI CÔNG (Tail feathers) === */}
          {/* Lông đuôi dạng quạt */}
          {[
            { cx: 30, cy: 90, rx: 6, ry: 28, rotate: -50 },
            { cx: 30, cy: 90, rx: 6, ry: 30, rotate: -35 },
            { cx: 30, cy: 90, rx: 6, ry: 32, rotate: -20 },
            { cx: 30, cy: 90, rx: 6, ry: 33, rotate: -5  },
            { cx: 30, cy: 90, rx: 6, ry: 32, rotate: 10  },
            { cx: 30, cy: 90, rx: 6, ry: 30, rotate: 25  },
            { cx: 30, cy: 90, rx: 6, ry: 26, rotate: 38  },
          ].map((f, i) => (
            <ellipse
              key={i}
              cx={f.cx}
              cy={f.cy}
              rx={f.rx}
              ry={f.ry}
              fill={i % 2 === 0 ? "#1a8a5a" : "#1565a0"}
              opacity="0.85"
              transform={`rotate(${f.rotate} 30 90)`}
            />
          ))}

          {/* Mắt lông công (eyespots) */}
          {[
            { x: 10, y: 62, rot: -50 },
            { x: 14, y: 58, rot: -35 },
            { x: 18, y: 56, rot: -20 },
            { x: 22, y: 56, rot: -5  },
            { x: 26, y: 58, rot: 10  },
            { x: 28, y: 62, rot: 25  },
            { x: 28, y: 68, rot: 38  },
          ].map((e, i) => (
            <g key={i}>
              <circle cx={e.x} cy={e.y} r="5" fill="#0d47a1" opacity="0.9" />
              <circle cx={e.x} cy={e.y} r="3" fill="#00bcd4" opacity="0.95" />
              <circle cx={e.x} cy={e.y} r="1.5" fill="#1a237e" />
            </g>
          ))}

          {/* === THÂN CHIM CÔNG === */}
          <ellipse cx="85" cy="82" rx="28" ry="16" fill="#1565a0" />

          {/* Ngực */}
          <ellipse cx="95" cy="78" rx="16" ry="12" fill="#0288d1" />

          {/* Đầu */}
          <circle cx="118" cy="65" r="13" fill="#1565a0" />

          {/* Mào (crown feathers) */}
          {[-15, -5, 5, 15, 25].map((angle, i) => (
            <line
              key={i}
              x1="118" y1="53"
              x2={118 + Math.sin((angle * Math.PI) / 180) * 14}
              y2={53 - 14}
              stroke="#00bcd4"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          {[-15, -5, 5, 15, 25].map((angle, i) => (
            <circle
              key={i}
              cx={118 + Math.sin((angle * Math.PI) / 180) * 14}
              cy={53 - 14}
              r="2.5"
              fill="#00e5ff"
            />
          ))}

          {/* Mắt */}
          <circle cx="124" cy="62" r="3.5" fill="white" />
          <circle cx="125" cy="62" r="2" fill="#111" />
          <circle cx="125.5" cy="61.2" r="0.8" fill="white" />

          {/* Mỏ */}
          <polygon points="131,64 142,60 131,67" fill="#f5a623" />

          {/* === CÁNH === */}
          {/* Cánh trên - vỗ lên */}
          <ellipse cx="85" cy="65" rx="32" ry="11" fill="#1976d2">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 85 82;-22 85 82;0 85 82"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Cánh dưới - vỗ xuống */}
          <ellipse cx="85" cy="98" rx="30" ry="9" fill="#1565a0">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 85 82;22 85 82;0 85 82"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Chi tiết cánh */}
          <ellipse cx="85" cy="65" rx="28" ry="7" fill="#42a5f5" opacity="0.6">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 85 82;-22 85 82;0 85 82"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </ellipse>
        </svg>
      </div>
    </div>
  );
}
