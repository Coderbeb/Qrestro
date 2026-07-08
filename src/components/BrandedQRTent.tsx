import React from 'react';
import { ChefHat, Utensils, Star, Smartphone, BookOpen, Percent, Zap } from 'lucide-react';

interface BrandedQRTentProps {
  restaurantName: string;
  tableNumber: number;
  qrCodeUrl: string;
}

export const BrandedQRTent: React.FC<BrandedQRTentProps> = ({ restaurantName, tableNumber, qrCodeUrl }) => {
  return (
    <div className="branded-qr-tent-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&display=swap');

        .branded-qr-tent {
          width: 10.16cm;
          height: 15.24cm;
          background-color: #f7f3e8; /* Soft cream */
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Cormorant Garamond', serif;
          color: #123524;
          box-shadow: 0 0 0 2px #123524 inset; /* Subtle inner border */
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 0 auto;
          box-sizing: border-box;
          z-index: 1;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          page-break-inside: avoid;
        }

        /* Subtle botanical background patterns */
        .tent-bg-leaf {
          position: absolute;
          opacity: 0.15;
          z-index: -1;
        }
        .tent-bg-leaf.top-left {
          top: -10px;
          left: -10px;
          width: 100px;
          transform: rotate(15deg);
        }
        .tent-bg-leaf.right-mid {
          top: 30%;
          right: -20px;
          width: 120px;
          transform: rotate(-15deg) scaleX(-1);
        }

        /* Top Right Ribbon */
        .tent-ribbon {
          position: absolute;
          top: 0;
          right: 20px;
          background-color: #123524;
          color: #c59b5f;
          padding: 10px 8px 15px 8px;
          width: 50px;
          text-align: center;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.5px;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%);
          line-height: 1.3;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .tent-header {
          margin-top: 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tent-logo-icon {
          color: #c59b5f;
          margin-bottom: 10px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tent-logo-icon::before {
          content: '';
          position: absolute;
          top: -10px;
          width: 60px;
          height: 30px;
          border-top-left-radius: 30px;
          border-top-right-radius: 30px;
          border: 1.5px solid #123524;
          border-bottom: none;
        }

        .tent-restaurant-name {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 0;
          line-height: 1.1;
          color: #123524;
        }

        .tent-subtitle {
          font-size: 9px;
          font-family: sans-serif;
          letter-spacing: 2px;
          color: #c59b5f;
          text-transform: uppercase;
          margin-top: 3px;
          font-weight: 600;
        }

        .tent-tagline {
          font-family: 'Great Vibes', cursive;
          font-size: 20px;
          margin-top: 4px;
          color: #123524;
        }

        /* Central QR Area */
        .tent-qr-section {
          margin-top: 20px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .tent-qr-card {
          background: #fff;
          padding: 10px;
          border-radius: 12px;
          border: 2px solid #c59b5f;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          position: relative;
          z-index: 2;
        }

        .tent-qr-card img {
          width: 130px;
          height: 130px;
          display: block;
        }

        .tent-qr-center-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #123524;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #c59b5f;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c59b5f;
        }

        /* Side Indicators */
        .tent-side-indicator {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .tent-side-indicator.left { left: 15px; }
        .tent-side-indicator.right { right: 15px; }

        .tent-side-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.2px solid #123524;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
          background: transparent;
        }

        .tent-side-text {
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .tent-side-subtext {
          font-size: 7px;
          font-family: sans-serif;
          letter-spacing: 0.5px;
        }

        /* Bottom Green Section */
        .tent-bottom {
          margin-top: auto;
          width: 100%;
          background: #123524;
          color: #c59b5f;
          padding: 25px 15px 15px 15px;
          border-top-left-radius: 50% 10px; 
          border-top-right-radius: 50% 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .tent-bottom::before {
           content: '';
           position: absolute;
           top: -12px;
           left: 0;
           width: 100%;
           height: 25px;
           background: #123524;
           border-top-left-radius: 50% 20px;
           border-top-right-radius: 50% 15px;
           z-index: -1;
        }

        .tent-features {
          display: flex;
          justify-content: space-between;
          width: 100%;
          max-width: 300px;
          margin-bottom: 10px;
        }

        .tent-feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
        }

        .tent-feature-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px dashed #c59b5f;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
          position: relative;
        }
        
        .tent-feature-icon::before {
           content: '';
           position: absolute;
           top: -2px; left: 50%; transform: translateX(-50%);
           width: 6px; height: 1px; background: #c59b5f;
        }

        .tent-feature-title {
          font-size: 8px;
          font-family: sans-serif;
          font-weight: 700;
          letter-spacing: 0.5px;
          line-height: 1.1;
          color: #fff;
        }
        
        .tent-feature-subtitle {
          font-size: 7px;
          font-family: sans-serif;
          color: #c59b5f;
          margin-top: 1px;
        }

        .tent-footer {
          text-align: center;
          margin-top: 5px;
          position: relative;
          width: 100%;
        }

        .tent-footer-script {
          font-family: 'Great Vibes', cursive;
          font-size: 18px;
          color: #c59b5f;
          margin-bottom: -3px;
        }

        .tent-footer-caps {
          font-size: 8px;
          font-family: sans-serif;
          letter-spacing: 3px;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .tent-footer-caps::before,
        .tent-footer-caps::after {
          content: '';
          height: 1px;
          width: 20px;
          background: #c59b5f;
        }

        .table-number-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          font-size: 10px;
          font-weight: 700;
          font-family: sans-serif;
          color: rgba(255,255,255,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* ----- Print specific styles ----- */
        @media print {
          @page {
             margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          /* Hide scrollbars during print */
          ::-webkit-scrollbar { display: none; }
        }
      ` }} />

      <div className="branded-qr-tent printable-area">
        {/* Placeholder Botanical SVG Backgrounds */}
        <svg className="tent-bg-leaf top-left" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M10,90 Q10,10 90,10 Q80,50 50,60 Q20,70 10,90 Z" fill="none" stroke="#123524" strokeWidth="1"/>
          <path d="M10,90 Q40,60 90,10" fill="none" stroke="#123524" strokeWidth="1"/>
          <path d="M30,70 Q40,40 70,30" fill="none" stroke="#123524" strokeWidth="1"/>
          <path d="M45,80 Q60,60 80,45" fill="none" stroke="#123524" strokeWidth="1"/>
        </svg>

        <svg className="tent-bg-leaf right-mid" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M10,90 Q10,10 90,10 Q80,50 50,60 Q20,70 10,90 Z" fill="none" stroke="#123524" strokeWidth="1"/>
          <path d="M10,90 Q40,60 90,10" fill="none" stroke="#123524" strokeWidth="1"/>
          <path d="M30,70 Q40,40 70,30" fill="none" stroke="#123524" strokeWidth="1"/>
        </svg>

        <div className="tent-ribbon">
          THANK YOU<br/>FOR DINING<br/>WITH US!<br/>
          <span style={{ fontSize: '14px', marginTop: '4px', display: 'block' }}>♥</span>
        </div>

        <div className="tent-header">
          <div className="tent-logo-icon">
            <Utensils size={32} />
          </div>
          <h1 className="tent-restaurant-name">{restaurantName || 'The Flavor House'}</h1>
          <div className="tent-subtitle">Restaurant</div>
          <div className="tent-tagline">Good Food. Great Moments.</div>
        </div>

        <div className="tent-qr-section">
          {/* Left Indicator */}
          <div className="tent-side-indicator left">
            <div className="tent-side-icon-wrap">
              <Smartphone size={20} color="#123524" />
            </div>
            <div className="tent-side-text">SCAN</div>
            <div className="tent-side-subtext">THE QR CODE</div>
          </div>

          {/* QR Code */}
          <div className="tent-qr-card">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" crossOrigin="anonymous" />
            ) : (
              <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>No QR</div>
            )}
            <div className="tent-qr-center-logo">
              <ChefHat size={22} />
            </div>
          </div>

          {/* Right Indicator */}
          <div className="tent-side-indicator right">
            <div className="tent-side-icon-wrap">
              <BookOpen size={20} color="#123524" />
            </div>
            <div className="tent-side-text">VIEW</div>
            <div className="tent-side-subtext">OUR MENU</div>
          </div>
        </div>

        {/* Arrow indicators (using simple unicode/svg) */}
        <div style={{ position: 'absolute', top: '50%', left: '100px', transform: 'translateY(-50%)' }}>
           <svg width="24" height="12" viewBox="0 0 24 12"><path d="M18 0l6 6-6 6v-4H0V4h18z" fill="#123524"/></svg>
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '100px', transform: 'translateY(-50%) rotate(180deg)' }}>
           <svg width="24" height="12" viewBox="0 0 24 12"><path d="M18 0l6 6-6 6v-4H0V4h18z" fill="#123524"/></svg>
        </div>

        <div className="tent-bottom">
          <div className="table-number-badge">TABLE {tableNumber}</div>
          
          <div className="tent-features">
            <div className="tent-feature">
              <div className="tent-feature-icon"><ChefHat size={18} /></div>
              <div className="tent-feature-title">EXPLORE</div>
              <div className="tent-feature-subtitle">OUR MENU</div>
            </div>
            <div className="tent-feature">
              <div className="tent-feature-icon"><Percent size={18} /></div>
              <div className="tent-feature-title">EXCLUSIVE</div>
              <div className="tent-feature-subtitle">OFFERS</div>
            </div>
            <div className="tent-feature">
              <div className="tent-feature-icon"><Zap size={18} /></div>
              <div className="tent-feature-title">FAST & EASY</div>
              <div className="tent-feature-subtitle">ORDERING</div>
            </div>
            <div className="tent-feature">
              <div className="tent-feature-icon"><Star size={18} /></div>
              <div className="tent-feature-title">RATE US</div>
              <div className="tent-feature-subtitle">& REVIEW</div>
            </div>
          </div>

          <div className="tent-footer">
            <div className="tent-footer-script">Your Feedback</div>
            <div className="tent-footer-caps">MAKES US BETTER</div>
          </div>
        </div>

      </div>
    </div>
  );
};
