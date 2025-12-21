'use client';

import { useEffect, useState } from 'react';
import PracticeFeed from '@/components/practices/PracticeFeed';

export default function PracticesPage() {
  return (
    <main style={{ 
      padding: 'var(--spacing-xl)', 
      maxWidth: 1400, 
      margin: '0 auto',
      background: 'var(--color-background)',
      minHeight: 'calc(100vh - 200px)'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--spacing-xxl)',
        paddingBottom: 'var(--spacing-xl)',
        borderBottom: '2px solid var(--color-border-light)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-md)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: 'var(--shadow-md)'
          }}>
            ✊
          </div>
          <h1 style={{ 
            margin: 0,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            实践记录
          </h1>
        </div>
        <p style={{ 
          color: 'var(--color-text-secondary)', 
          margin: 0,
          fontSize: 'var(--font-size-lg)',
          lineHeight: 'var(--line-height-relaxed)',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          记录你的实践，分享经验，共同学习
        </p>
      </div>
      
      <PracticeFeed />
    </main>
  );
}











