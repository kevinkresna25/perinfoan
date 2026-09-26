import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LobbyView } from '../src/components/lobby/LobbyView';

describe('LobbyView Component', () => {
  it('renders both Copy Link and Copy Code buttons when in a room', () => {
    const html = renderToString(
      <LobbyView
        roomId="TEST99"
        players={[{ id: 'p1', name: 'Alice', isHost: true, isConnected: true }]}
        isHost={true}
        onCreateRoom={() => {}}
        onJoinRoom={() => {}}
        onStartGame={() => {}}
        onCustomImageUploaded={() => {}}
      />
    );

    expect(html).toContain('Copy Link');
    expect(html).toContain('Copy Code');
  });
});
