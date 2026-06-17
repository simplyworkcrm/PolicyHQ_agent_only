import React, { createContext, useContext, useEffect, useState } from 'react';
import { XanoClient } from '@xano/js-sdk';
import { useAuth } from './AuthContext';

export interface Notification {
  id: number;
  content: string;
  timestamp: Date;
  type: 'direct' | 'broadcast' | 'leaderboard';
  isRead: boolean;
}

export interface SaleEvent {
  id: string;
  created_at: number;
  annual_premium: number;
  agentOwner_name: string;
  agentId: string;
  teamName: string;
  teamId: string;
  sourceName: string;
  policyStatus: string;
  policyCarrier: string;
}

interface RealtimeContextType {
  xanoClient: XanoClient | null;
  isConnected: boolean;
  notifications: Notification[];
  hasNew: boolean;
  latestSale: SaleEvent | null;
  setHasNew: (hasNew: boolean) => void;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setLatestSale: React.Dispatch<React.SetStateAction<SaleEvent | null>>;
  markAsRead: (id: number) => void;
  markAllAsRead: (type?: 'direct' | 'broadcast' | 'leaderboard') => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// --- AUDIO SYSTEM ---

let sharedAudioCtx: AudioContext | null = null;
let hasInstalledSafeWebSocketSend = false;

const installSafeWebSocketSend = () => {
  if (hasInstalledSafeWebSocketSend || typeof window === 'undefined' || !window.WebSocket) return;
  hasInstalledSafeWebSocketSend = true;

  const originalSend = window.WebSocket.prototype.send;
  window.WebSocket.prototype.send = function safeSend(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.readyState === window.WebSocket.OPEN) {
      return originalSend.call(this, data);
    }

    if (this.readyState === window.WebSocket.CONNECTING) {
      const pendingSocket = this;
      const sendWhenOpen = () => {
        try {
          if (pendingSocket.readyState === window.WebSocket.OPEN) {
            originalSend.call(pendingSocket, data);
          }
        } catch (error) {
          console.warn('Deferred WebSocket send failed:', error);
        }
      };
      pendingSocket.addEventListener('open', sendWhenOpen, { once: true });
      return;
    }

    console.warn('Skipped WebSocket send because socket is not open.');
  };
};

const getAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtor) {
      sharedAudioCtx = new AudioCtor();
    }
  }
  return sharedAudioCtx;
};

const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(1046.50, t); 
    osc2.frequency.setValueAtTime(1318.51, t);
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.1, t + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.5);
    osc2.stop(t + 1.5);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
};

const playVictorySound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
    const t = ctx.currentTime + 0.05;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);
    const playNote = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sawtooth') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02); 
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); 
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
    };
    playNote(523.25, t, 0.15);
    playNote(659.25, t + 0.12, 0.15);
    playNote(783.99, t + 0.24, 0.15);
    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();
    oscHigh.type = 'square';
    oscHigh.frequency.setValueAtTime(1046.50, t + 0.36);
    gainHigh.gain.setValueAtTime(0, t + 0.36);
    gainHigh.gain.linearRampToValueAtTime(0.4, t + 0.38);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    oscHigh.connect(gainHigh);
    gainHigh.connect(masterGain);
    oscHigh.start(t + 0.36);
    oscHigh.stop(t + 1.5);
    playNote(261.63, t + 0.36, 0.8, 'triangle');
  } catch (error) {
    console.error("Failed to play victory sound:", error);
  }
};

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [xanoClient, setXanoClient] = useState<XanoClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const [latestSale, setLatestSale] = useState<SaleEvent | null>(null);
  const [realtimeSetupAttempt, setRealtimeSetupAttempt] = useState(0);

  useEffect(() => {
    installSafeWebSocketSend();

    const unlockAudio = () => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                console.log('Audio Context Resumed by user interaction.');
            }).catch(e => console.error(e));
        }
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const client = new XanoClient({
      instanceBaseUrl: 'https://api1.simplyworkcrm.com/',
      realtimeConnectionHash: 'fVSAvpXTYFZhd0OgCr2-OVEplV4',
    });
    setXanoClient(client);
    return () => {
      if (client) {
          const c = client as any;
          if (typeof c.close === 'function') c.close();
          else if (typeof c.disconnect === 'function') c.disconnect();
      }
    };
  }, []);

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    // If all read, set hasNew to false
    setNotifications(current => {
        const unreadCount = current.filter(n => !n.isRead).length;
        if (unreadCount === 0) setHasNew(false);
        return current;
    });
  };

  const markAllAsRead = (type?: 'direct' | 'broadcast' | 'leaderboard') => {
    setNotifications(prev => prev.map(n => (!type || n.type === type) ? { ...n, isRead: true } : n));
    setHasNew(false);
  };

  useEffect(() => {
    if (!xanoClient || !token || !user) return;

    let userChannel: any = null;
    let broadcastChannel: any = null;
    let leaderBoardChannel: any = null;
    let retryTimer: number | undefined;
    let isCancelled = false;

    try {
      xanoClient.setRealtimeAuthToken(token);
      userChannel = xanoClient.channel(`notification_channel/${user.id}`);
      broadcastChannel = xanoClient.channel(`notification_channel/*`);
      leaderBoardChannel = xanoClient.channel(`vipaleaderboard`);
      setIsConnected(true);
    } catch (e) {
      setIsConnected(false);
      console.warn('Realtime channel setup delayed while WebSocket connects.');
      if (realtimeSetupAttempt < 8) {
        retryTimer = window.setTimeout(() => {
          if (!isCancelled) setRealtimeSetupAttempt(attempt => attempt + 1);
        }, 500);
      }
    }

    const notificationListener = (message: any, type: 'direct' | 'broadcast') => {
      const content = message.payload || message.data || message;
      const newNotification: Notification = {
        id: Date.now(),
        content: typeof content === 'object' ? (content.message || JSON.stringify(content)) : content,
        timestamp: new Date(),
        type: type,
        isRead: false
      };
      setNotifications(prev => [newNotification, ...prev]);
      setHasNew(true);
      playNotificationSound();
    };

    const saleListener = (message: any) => {
      let payload = message.payload || message;
      if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch (e) {}
      }
      const record = payload.data || payload;
      const saleEvent: SaleEvent = {
          id: record.id,
          created_at: record.created_at,
          annual_premium: Number(record.annual_premium) || 0,
          agentOwner_name: record.agentOwner_name,
          agentId: record.agentId,
          teamName: record.teamName,
          teamId: record.teamId,
          sourceName: record.sourceName,
          policyStatus: record.policyStatus,
          policyCarrier: record.policyCarrier
      };
      if (saleEvent.agentOwner_name) {
          setLatestSale(saleEvent);
          const saleNotification: Notification = {
              id: Date.now(),
              content: `New Sale! ${saleEvent.agentOwner_name} - ${saleEvent.policyCarrier} ($${saleEvent.annual_premium.toLocaleString()})`,
              timestamp: new Date(),
              type: 'leaderboard',
              isRead: false
          };
          setNotifications(prev => [saleNotification, ...prev]);
          setHasNew(true);
          playVictorySound();
      }
    };

    if (userChannel && typeof userChannel.on === 'function') userChannel.on((msg: any) => notificationListener(msg, 'direct'));
    if (broadcastChannel && typeof broadcastChannel.on === 'function') broadcastChannel.on((msg: any) => notificationListener(msg, 'broadcast'));
    if (leaderBoardChannel && typeof leaderBoardChannel.on === 'function') leaderBoardChannel.on(saleListener);

    return () => {
      isCancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      const safeUnsubscribe = (channel: any) => {
          if (!channel) return;
          try {
            if (typeof channel.destroy === 'function') channel.destroy();
            else if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
          } catch (e) {
            // WebSocket may still be in CONNECTING state; ignore
          }
      };
      safeUnsubscribe(userChannel);
      safeUnsubscribe(broadcastChannel);
      safeUnsubscribe(leaderBoardChannel);
    };
  }, [xanoClient, token, user, realtimeSetupAttempt]);

  return (
    <RealtimeContext.Provider value={{ 
        xanoClient, 
        isConnected, 
        notifications, 
        hasNew, 
        latestSale,
        setHasNew, 
        setNotifications,
        setLatestSale,
        markAsRead,
        markAllAsRead
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) throw new Error('useRealtime must be used within a RealtimeProvider');
  return context;
};
