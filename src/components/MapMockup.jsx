import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function MapMockup({ from, to, height = "200px" }) {
    return (
        <div className="map-mockup" style={{ height }}>
            <div className="map-overlay">
                <div className="map-route">
                    <div className="map-point">
                        <MapPin size={18} color="var(--primary)" />
                        <span>{from || 'Точка А'}</span>
                    </div>
                    <div className="map-line"></div>
                    <div className="map-point">
                        <Navigation size={18} color="var(--secondary)" />
                        <span>{to || 'Точка Б'}</span>
                    </div>
                </div>
            </div>
            {/* Имитация карты (просто фон с паттерном или градиентом) */}
            <div className="map-background"></div>

            <style>{`
        .map-mockup {
          width: 100%;
          border-radius: var(--radius);
          overflow: hidden;
          position: relative;
          background: #e5e5f7;
          opacity: 0.9;
          background-image:  repeating-radial-gradient( circle at 0 0, transparent 0, #e5e5f7 10px ), repeating-linear-gradient( #4caf5022, #4caf5022 );
          border: 1px solid var(--glass-border);
        }
        .map-overlay {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          background: var(--glass-bg);
          backdrop-filter: blur(5px);
          padding: 10px;
          border-radius: 8px;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .map-point {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .map-line {
          height: 15px;
          width: 2px;
          background: #ccc;
          margin-left: 8px;
        }
      `}</style>
        </div>
    );
}
