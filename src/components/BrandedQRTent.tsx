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
          width: 500px;
          height: 700px; /* Adjust height to match the ratio */
          background-color: #f7f3e8; /* Soft cream */
          border-radius: 24px;
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
        }

        /* Subtle botanical background patterns */
        .tent-bg-leaf {
          position: absolute;
          opacity: 0.15;
          z-index: -1;
        }
        .tent-bg-leaf.top-left {
          top: -20px;
          left: -20px;
          width: 150px;
          transform: rotate(15deg);
        }
        .tent-bg-leaf.right-mid {
          top: 30%;
          right: -40px;
          width: 180px;
          transform: rotate(-15deg) scaleX(-1);
        }

        /* Top Right Ribbon */
        .tent-ribbon {
          position: absolute;
          top: 0;
          right: 30px;
          background-color: #123524;
          color: #c59b5f;
          padding: 15px 12px 25px 12px;
          width: 70px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%);
          line-height: 1.4;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .tent-header {
          margin-top: 50px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tent-logo-icon {
          color: #c59b5f;
          margin-bottom: 15px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tent-logo-icon::before {
          content: '';
          position: absolute;
          top: -15px;
          width: 80px;
          height: 40px;
          border-top-left-radius: 40px;
          border-top-right-radius: 40px;
          border: 1.5px solid #123524;
          border-bottom: none;
        }

        .tent-restaurant-name {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin: 5px 0 0 0;
          line-height: 1.1;
          color: #123524;
        }

        .tent-subtitle {
          font-size: 12px;
          font-family: sans-serif;
          letter-spacing: 3px;
          color: #c59b5f;
          text-transform: uppercase;
          margin-top: 5px;
          font-weight: 600;
        }

        .tent-tagline {
          font-family: 'Great Vibes', cursive;
          font-size: 28px;
          margin-top: 5px;
          color: #123524;
        }

        /* Central QR Area */
        .tent-qr-section {
          margin-top: 30px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .tent-qr-card {
          background: #fff;
          padding: 15px;
          border-radius: 16px;
          border: 3px solid #c59b5f;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          position: relative;
          z-index: 2;
        }

        .tent-qr-card img {
          width: 180px;
          height: 180px;
          display: block;
        }

        .tent-qr-center-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #123524;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 3px solid #c59b5f;
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
        
        .tent-side-indicator.left { left: 35px; }
        .tent-side-indicator.right { right: 35px; }

        .tent-side-icon-wrap {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1.5px solid #123524;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          background: transparent;
        }

        .tent-side-text {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        .tent-side-subtext {
          font-size: 10px;
          font-family: sans-serif;
          letter-spacing: 0.5px;
        }

        /* Bottom Green Section */
        .tent-bottom {
          margin-top: auto;
          width: 100%;
          background: #123524;
          color: #c59b5f;
          padding: 40px 20px 20px 20px;
          border-top-left-radius: 50% 15px; /* Creates the slight wave effect */
          border-top-right-radius: 50% 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .tent-bottom::before {
           content: '';
           position: absolute;
           top: -20px;
           left: 0;
           width: 100%;
           height: 40px;
           background: #123524;
           border-top-left-radius: 50% 30px;
           border-top-right-radius: 50% 20px;
           z-index: -1;
        }

        .tent-features {
          display: flex;
          justify-content: space-between;
          width: 100%;
          max-width: 400px;
          margin-bottom: 20px;
        }

        .tent-feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex: 1;
        }

        .tent-feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px dashed #c59b5f;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          position: relative;
        }
        
        .tent-feature-icon::before {
           content: '';
           position: absolute;
           top: -3px; left: 50%; transform: translateX(-50%);
           width: 8px; height: 1.5px; background: #c59b5f;
        }

        .tent-feature-title {
          font-size: 11px;
          font-family: sans-serif;
          font-weight: 700;
          letter-spacing: 0.5px;
          line-height: 1.2;
          color: #fff;
        }
        
        .tent-feature-subtitle {
          font-size: 10px;
          font-family: sans-serif;
          color: #c59b5f;
          margin-top: 2px;
        }

        .tent-footer {
          text-align: center;
          margin-top: 10px;
          position: relative;
          width: 100%;
        }

        .tent-footer-script {
          font-family: 'Great Vibes', cursive;
          font-size: 26px;
          color: #c59b5f;
          margin-bottom: -5px;
        }

        .tent-footer-caps {
          font-size: 12px;
          font-family: sans-serif;
          letter-spacing: 4px;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }
        
        .tent-footer-caps::before,
        .tent-footer-caps::after {
          content: '';
          height: 1px;
          width: 30px;
          background: #c59b5f;
        }

        .table-number-badge {
          position: absolute;
          bottom: 20px;
          left: 20px;
          font-size: 14px;
          font-weight: 700;
          font-family: sans-serif;
          color: rgba(255,255,255,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 4px 10px;
          border-radius: 4px;
        }

        /* ----- Print specific styles ----- */
        @media print {
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
