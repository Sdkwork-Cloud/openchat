/**
 * 通讯录页面
 *
 * 职责：
 * 1. 渲染通讯录界面
 * 2. 协调组件交互
 * 3. 调用 Contacts Service 处理业务
 * 4. 集成 RTC 通话功能
 *
 * 架构路径：ContactsPage → contactsService → repository → API/Platform
 */

import { useContacts } from '../hooks/useContacts';
import { ContactSidebar } from '../components/ContactSidebar';
import { ContactDetail } from '../components/ContactDetail';
import { useRTC, CallModal } from '../../rtc';
import type { CallType } from '../../rtc/entities/rtc.entity';

/**
 * 通讯录页面
 */
export function ContactsPage() {
  const {
    friends,
    groups,
    activeTab,
    filter,
    selectedFriend,
    selectedGroup,
    groupedFriends,
    sortedInitials,
    setActiveTab,
    setFilter,
    selectContact,
  } = useContacts();

  // RTC 通话功能
  const {
    session,
    localStream,
    remoteStream,
    isInCall,
    initiateCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useRTC();

  /**
   * 处理发起通话
   */
  const handleCall = async (callType: CallType) => {
    if (!selectedFriend) return;

    await initiateCall(
      selectedFriend.id,
      selectedFriend.name,
      selectedFriend.avatar,
      callType
    );
  };

  return (
    <>
      {/* 左侧列表 */}
      <ContactSidebar
        friends={friends}
        groups={groups}
        activeTab={activeTab}
        filter={filter}
        groupedFriends={groupedFriends}
        sortedInitials={sortedInitials}
        selectedId={selectedFriend?.id || selectedGroup?.id || null}
        onTabChange={setActiveTab}
        onFilterChange={setFilter}
        onSelect={selectContact}
      />

      {/* 右侧详情区域 */}
      <ContactDetail
        friend={selectedFriend}
        group={selectedGroup}
        onCall={selectedFriend ? handleCall : undefined}
      />

      {/* 通话弹窗 */}
      {isInCall && (
        <CallModal
          session={session}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={acceptCall}
          onReject={rejectCall}
          onHangup={hangup}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleSpeaker={toggleSpeaker}
        />
      )}
    </>
  );
}

export default ContactsPage;
