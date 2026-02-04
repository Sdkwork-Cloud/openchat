/**
 * IM 聊天页面 - 支持通话功能
 * 
 * 职责：
 * 1. 渲染聊天界面
 * 2. 协调组件交互
 * 3. 调用 IM Service 处理业务
 * 4. 管理通话状态和显示 CallModal
 * 
 * 架构路径：ChatPage → imService → repository → API/Platform
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RichTextEditorRef } from '../../../components/ui/RichTextEditor';
import type { MediaItem } from '../../../components/ui/MediaViewer';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { useRTC } from '../../rtc/hooks/useRTC';
import { ConversationList } from '../components/ConversationList';
import { ChatHeader } from '../components/ChatHeader';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { EmptyChat } from '../components/EmptyChat';
import { CallModal } from '../../rtc/components/CallModal';
import type { CallType } from '../../rtc/entities/rtc.entity';
import { deviceService } from '../../device/services/device.service';
import type { Device, DeviceCommand } from '../../device/entities/device.entity';
import { DeviceStatus } from '../../device/entities/device.entity';

/**
 * AI聊天页面
 */
export function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>('1');
  const [devices, setDevices] = useState<Device[]>([]);
  const [showDevicePanel, setShowDevicePanel] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const editorRef = useRef<RichTextEditorRef>(null);
  
  const { conversations, selectedConversation } = useConversations(selectedId);
  const { messages, sendMessage, isTyping } = useMessages(selectedId);
  
  // RTC 通话功能
  const {
    session,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useRTC();

  // 包装RTC方法，使返回类型符合CallModal要求
  const wrappedAcceptCall = useCallback(async (): Promise<void> => {
    await acceptCall();
  }, [acceptCall]);

  const wrappedRejectCall = useCallback(async (): Promise<void> => {
    await rejectCall();
  }, [rejectCall]);

  const wrappedHangup = useCallback(async (): Promise<void> => {
    await hangup();
  }, [hangup]);

  // 获取设备列表
  useEffect(() => {
    const fetchDevices = async () => {
      const deviceList = await deviceService.getDevices();
      setDevices(deviceList);
    };

    fetchDevices();
    
    // 每5秒刷新一次设备状态
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  // 处理发送消息（支持多媒体附件）
  const handleSendMessage = useCallback((content: string, attachments?: MediaItem[]) => {
    if (content.trim() || (attachments && attachments.length > 0)) {
      const messageContent: any = {
        type: 'text',
        text: content
      };
      sendMessage(messageContent, undefined, undefined);
      editorRef.current?.clear();
    }
  }, [sendMessage]);

  // 处理发起通话
  const handleCall = useCallback((callType: CallType) => {
    if (!selectedConversation) return;
    
    initiateCall(
      selectedConversation.id,
      selectedConversation.name,
      selectedConversation.avatar,
      callType
    );
  }, [selectedConversation, initiateCall]);

  // 处理设备控制
  const handleControlDevice = useCallback(async (deviceId: string, command: DeviceCommand) => {
    try {
      await deviceService.controlDevice(deviceId, command);
      // 刷新设备状态
      const deviceList = await deviceService.getDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Error controlling device:', error);
    }
  }, []);

  // 处理设备选择
  const handleSelectDevice = useCallback((device: Device) => {
    setSelectedDevice(device);
  }, []);

  return (
    <>
      {/* 左侧会话列表 */}
      <div className="flex h-full">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* 右侧对话区域 */}
        <div className="flex-1 flex flex-col bg-[var(--bg-primary)] min-w-0">
          {selectedConversation ? (
            <>
              <ChatHeader 
                conversation={selectedConversation} 
                onCall={handleCall}
                onToggleDevicePanel={() => setShowDevicePanel(!showDevicePanel)}
                showDeviceButton={true}
              />
              <MessageList messages={messages} isTyping={isTyping} />
              <ChatInput
                editorRef={editorRef}
                onSend={handleSendMessage}
              />
            </>
          ) : (
            <EmptyChat />
          )}
        </div>

        {/* 设备管理面板 */}
        {showDevicePanel && (
          <div className="w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-semibold">设备管理</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                在线设备: {devices.filter(d => d.status === DeviceStatus.ONLINE).length}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {devices.map((device) => (
                <div 
                  key={device.id} 
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${selectedDevice?.id === device.id ? 'bg-[var(--primary-light)]' : 'hover:bg-[var(--bg-tertiary)]'}`}
                  onClick={() => handleSelectDevice(device)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{device.name}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{device.deviceId}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${device.status === DeviceStatus.ONLINE ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                    {device.type === 'xiaozhi' ? '开源小智' : '其他设备'}
                  </div>
                </div>
              ))}
            </div>
            {selectedDevice && (
              <div className="p-4 border-t border-[var(--border-color)]">
                <h4 className="font-medium mb-2">控制 {selectedDevice.name}</h4>
                <div className="flex space-x-2">
                  <button 
                    className="px-3 py-1 bg-[var(--primary)] text-white rounded-md text-sm hover:bg-[var(--primary-dark)]"
                    onClick={() => handleControlDevice(selectedDevice.deviceId, { action: 'turnOn' })}
                  >
                    开启
                  </button>
                  <button 
                    className="px-3 py-1 bg-[var(--primary)] text-white rounded-md text-sm hover:bg-[var(--primary-dark)]"
                    onClick={() => handleControlDevice(selectedDevice.deviceId, { action: 'turnOff' })}
                  >
                    关闭
                  </button>
                  <button 
                    className="px-3 py-1 bg-[var(--primary)] text-white rounded-md text-sm hover:bg-[var(--primary-dark)]"
                    onClick={() => handleControlDevice(selectedDevice.deviceId, { action: 'refresh' })}
                  >
                    刷新
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 通话弹窗 */}
      <CallModal
        session={session}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={wrappedAcceptCall}
        onReject={wrappedRejectCall}
        onHangup={wrappedHangup}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleSpeaker={toggleSpeaker}
      />
    </>
  );
}

export default ChatPage;
