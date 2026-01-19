import React from 'react';

const shimmerStyle = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  .shimmer {
    animation: shimmer 5s infinite;
    background: linear-gradient(90deg, rgba(51,65,85,0) 0%, rgba(51,65,85,0.5) 50%, rgba(51,65,85,0) 100%);
    background-size: 1000px 100%;
  }
`;

export const SkeletonCard: React.FC = () => (
  <>
    <style>{shimmerStyle}</style>
    <div className="bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-5 md:p-6 w-full" style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)' }}>
      <div>
        <div className="h-4 bg-white/20 rounded w-24 mb-4 shimmer" style={{ minHeight: '1rem' }}></div>
        <div className="h-8 bg-white/20 rounded w-32 shimmer" style={{ minHeight: '2rem' }}></div>
      </div>
    </div>
  </>
);

export const SkeletonChart: React.FC = () => (
  <>
    <style>{shimmerStyle}</style>
    <div className="glass-card p-3 sm:p-4 md:p-6 w-full">
      <div>
        <div className="h-6 bg-white/20 rounded w-32 mb-6 shimmer" style={{ minHeight: '1.5rem' }}></div>
        <div className="h-64 bg-white/10 rounded shimmer" style={{ minHeight: '16rem' }}></div>
      </div>
    </div>
  </>
);

export const SkeletonTable: React.FC = () => (
  <>
    <style>{shimmerStyle}</style>
    <div className="glass-card p-3 sm:p-4 md:p-6 w-full">
      <div>
        <div className="h-6 bg-white/20 rounded w-48 mb-6 shimmer" style={{ minHeight: '1.5rem' }}></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-white/10 rounded shimmer" style={{ minHeight: '2.5rem', animationDelay: `${i * 0.1}s` }}></div>
          ))}
        </div>
      </div>
    </div>
  </>
);

export const SkeletonTransaction: React.FC = () => (
  <>
    <style>{shimmerStyle}</style>
    <div className="glass-card p-3 sm:p-4 md:p-5 rounded-2xl">
      <div>
        <div className="flex flex-col xs:flex-row xs:justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="h-5 bg-white/20 rounded w-40 mb-2 shimmer" style={{ minHeight: '1.25rem' }}></div>
            <div className="h-3 bg-white/10 rounded w-24 shimmer" style={{ minHeight: '0.75rem', animationDelay: '0.1s' }}></div>
          </div>
          <div className="h-6 bg-white/20 rounded w-28 shimmer" style={{ minHeight: '1.5rem', animationDelay: '0.2s' }}></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-white/15 rounded-lg w-24 shimmer" style={{ minHeight: '2rem', animationDelay: '0.3s' }}></div>
          <div className="h-8 bg-white/15 rounded-lg w-24 shimmer" style={{ minHeight: '2rem', animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  </>
);
