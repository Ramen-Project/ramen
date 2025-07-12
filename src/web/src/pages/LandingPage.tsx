import React from 'react';
import { Card, Button, Text, Theme } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';

const panelStyle: React.CSSProperties = {
  minWidth: 360,
  maxWidth: 420,
  margin: '0 auto',
  marginTop: '15vh',
  padding: 32,
  borderRadius: 16,
  boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
  background: 'var(--gray-2)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <Theme accentColor='blue' appearance='dark' grayColor='mauve'>
      <div style={{ width: '100vw', height: '100vh', background: 'var(--gray-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card style={panelStyle}>
          <Text size="6" weight="bold" style={{ marginBottom: 16 }}>Welcome to Ramen</Text>
          <Text size="3" color="gray" style={{ marginBottom: 32, textAlign: 'center' }}>
            Get started by creating a new project or opening an existing one.
          </Text>
          <Button size="4" style={{ width: '100%', marginBottom: 16 }} onClick={() => navigate('/editor')}>
            Create New Project
          </Button>
          <Button size="4" variant="outline" style={{ width: '100%' }} onClick={() => navigate('/editor')}>
            Open Project
          </Button>
        </Card>
      </div>
    </Theme>
  );
}
