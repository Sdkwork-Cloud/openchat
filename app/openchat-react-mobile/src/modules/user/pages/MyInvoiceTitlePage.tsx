
import React, { useState, useEffect } from 'react';
import { navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { Toast } from '../../../components/Toast';
import { InvoiceService, InvoiceTitle } from '../services/InvoiceService';
import { InvoiceEditSheet } from '../components/InvoiceEditSheet';

export const MyInvoiceTitlePage: React.FC = () => {
    const [titles, setTitles] = useState<InvoiceTitle[]>([]);
    const [editingItem, setEditingItem] = useState<InvoiceTitle | undefined>(undefined);
    const [showSheet, setShowSheet] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await InvoiceService.getInvoices();
        if (res.success && res.data) setTitles(res.data);
    };

    const handleSave = async (item: Partial<InvoiceTitle>) => {
        const res = await InvoiceService.saveInvoice(item);
        if (res.success) {
            Toast.success('保存成功');
            loadData();
        } else {
            Toast.error('保存失败');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('确定删除该抬头吗？')) {
            await InvoiceService.deleteById(id);
            Toast.success('已删除');
            loadData();
        }
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="我的发票抬头" onBack={() => navigateBack('/profile/self')} />
            
            <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                {titles.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', opacity: 0.5 }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧾</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>暂无发票抬头</div>
                    </div>
                ) : (
                    titles.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => { setEditingItem(item); setShowSheet(true); }}
                            style={{
                                background: 'var(--bg-card)', borderRadius: '12px', padding: '16px',
                                marginBottom: '12px', border: '0.5px solid var(--border-color)',
                                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                transition: 'transform 0.1s'
                            }}
                            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.99)'}
                            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                                    {item.isDefault && <span style={{ fontSize: '10px', color: '#fa5151', background: 'rgba(250, 81, 81, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>默认</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <span>{item.type === 'company' ? '单位' : '个人'}</span>
                                    {item.type === 'company' && <span>{item.taxNo}</span>}
                                </div>
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                <button 
                    onClick={() => { setEditingItem(undefined); setShowSheet(true); }}
                    style={{ width: '100%', padding: '14px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
                >
                    + 添加发票抬头
                </button>
            </div>

            {showSheet && (
                <InvoiceEditSheet 
                    visible={showSheet} 
                    onClose={() => setShowSheet(false)} 
                    onSave={handleSave}
                    onDelete={handleDelete}
                    initialVal={editingItem}
                />
            )}
        </div>
    );
};
