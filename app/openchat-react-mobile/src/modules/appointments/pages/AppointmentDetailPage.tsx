
import React, { useEffect, useState } from 'react';
import { navigateBack, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { AppointmentService, Appointment } from '../services/AppointmentService';
import { Toast } from '../../../components/Toast';
import { Platform } from '../../../platform';

export const AppointmentDetailPage: React.FC = () => {
    const query = useQueryParams();
    const id = query.get('id');
    const [apt, setApt] = useState<Appointment | null>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            const res = await AppointmentService.findById(id);
            if (res.success && res.data) {
                setApt(res.data);
            }
        };
        load();
    }, [id]);

    if (!apt) return null;

    const isUpcoming = apt.status === 'confirmed' || apt.status === 'pending';
    const isCancelled = apt.status === 'cancelled';

    const handleCancel = async () => {
        if (window.confirm('确定取消该预约吗？')) {
            await AppointmentService.cancelAppointment(apt.id);
            Toast.success('预约已取消');
            setApt({ ...apt, status: 'cancelled' });
        }
    };

    const handleAddToCalendar = () => {
        Platform.device.vibrate(10);
        Toast.success('已添加到系统日历');
    };

    // Time Formatting Logic
    const formatFullTime = (ts: number) => new Date(ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    let timeString = formatFullTime(apt.startTime);
    if (apt.endTime) {
        timeString += ` - ${formatFullTime(apt.endTime)}`;
    }

    return (
        <div style={{ minHeight: '100%', background: 'var(--primary-color)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="预约详情" variant="transparent" backFallback="/appointments" />
            
            <div style={{ padding: '10px 16px 40px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                
                {/* Header Status */}
                <div style={{ color: 'white', marginBottom: '20px', paddingLeft: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>
                        {isCancelled ? '已取消' : (isUpcoming ? '等待履约' : '已完成')}
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>
                        {isUpcoming ? '请按时前往，出示下方凭证' : '感谢您的使用'}
                    </div>
                </div>

                {/* Ticket Card */}
                <div style={{ 
                    background: 'var(--bg-card)', borderRadius: '16px', 
                    overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    {/* Provider Info */}
                    <div style={{ padding: '20px', borderBottom: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundImage: `url(${apt.providerAvatar})`, backgroundSize: 'cover', marginRight: '16px' }}></div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{apt.providerName}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>预约编号: {apt.bookingId}</div>
                        </div>
                    </div>

                    {/* Core Info */}
                    <div style={{ padding: '24px 20px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', textAlign: 'center' }}>
                            {apt.serviceName}
                        </div>

                        {/* Meta Data Grid (New) */}
                        {apt.meta && (
                            <div style={{ 
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', 
                                background: 'var(--bg-cell-top)', padding: '12px', borderRadius: '8px', marginBottom: '20px' 
                            }}>
                                {Object.entries(apt.meta).map(([key, value]) => (
                                    <div key={key}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{key}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* QR Code Area */}
                        {isUpcoming && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0 24px 0' }}>
                                <div style={{ 
                                    width: '180px', height: '180px', background: 'var(--text-primary)', opacity: 0.9,
                                    maskImage: 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjwvc3ZnPg==")', 
                                    maskSize: '20px 20px', imageRendering: 'pixelated'
                                }} />
                                <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-primary)' }}>
                                    {apt.ticketCode}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>向商家出示此码核销</div>
                            </div>
                        )}

                        {/* KV Rows */}
                        <div style={{ display: 'flex', marginBottom: '12px' }}>
                            <span style={{ width: '70px', color: 'var(--text-secondary)', fontSize: '14px' }}>时间</span>
                            <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                                {timeString}
                            </span>
                        </div>
                        <div style={{ display: 'flex', marginBottom: '12px' }}>
                            <span style={{ width: '70px', color: 'var(--text-secondary)', fontSize: '14px' }}>地点</span>
                            <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '14px' }}>
                                {apt.location}
                            </span>
                            <span style={{ color: 'var(--primary-color)', fontSize: '18px' }}>📍</span>
                        </div>
                        {apt.price && (
                            <div style={{ display: 'flex', marginBottom: '12px' }}>
                                <span style={{ width: '70px', color: 'var(--text-secondary)', fontSize: '14px' }}>费用</span>
                                <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '14px' }}>¥{apt.price}</span>
                            </div>
                        )}
                        {apt.notes && (
                            <div style={{ display: 'flex' }}>
                                <span style={{ width: '70px', color: 'var(--text-secondary)', fontSize: '14px' }}>备注</span>
                                <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '14px' }}>{apt.notes}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {isUpcoming && (
                        <div style={{ padding: '16px', background: 'var(--bg-cell-top)', display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={handleCancel}
                                style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', color: 'var(--text-secondary)', fontSize: '14px' }}
                            >
                                取消预约
                            </button>
                            <button 
                                onClick={handleAddToCalendar}
                                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: 'var(--primary-color)', color: 'white', fontSize: '14px', fontWeight: 500 }}
                            >
                                添加到日历
                            </button>
                        </div>
                    )}
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    OpenChat 预约服务提供技术支持
                </div>
            </div>
        </div>
    );
};
