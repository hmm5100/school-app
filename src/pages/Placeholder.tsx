// src/pages/Placeholder.tsx
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description?: string;
  phase?: string;
}

const Placeholder = ({ title, description, phase }: PlaceholderProps) => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        background: 'white',
        borderRadius: '20px',
        padding: '60px 40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid #f0f4f8',
        maxWidth: '480px',
        width: '100%',
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Construction size={32} color="#94a3b8" />
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2244', marginBottom: '12px' }}>
          {title}
        </h2>

        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
          {description || 'هذه الصفحة قيد التطوير وستكون متاحة قريباً.'}
        </p>

        {phase && (
          <span style={{
            display: 'inline-block',
            background: '#eff6ff',
            color: '#2555a0',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '28px',
          }}>
            {phase}
          </span>
        )}

        <div style={{ marginTop: '28px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #1a3a6b, #2555a0)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={15} />
            العودة للخلف
          </button>
        </div>
      </div>
    </div>
  );
};

export default Placeholder;
