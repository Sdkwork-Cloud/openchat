
import React, { useState, useEffect } from 'react';
import { navigateBack } from '../../../router';
import { Page } from '../../../components/Page/Page';
import { Button } from '../../../components/Button/Button';
import { Empty } from '../../../components/Empty/Empty';
import { Toast } from '../../../components/Toast';
import { AddressService, Address } from '../services/AddressService';
import { AddressEditSheet } from '../components/AddressEditSheet';
import { useTranslation } from '../../../core/i18n/I18nContext';

export const MyAddressPage: React.FC = () => {
    const { t } = useTranslation();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showSheet, setShowSheet] = useState(false);
    const [editingItem, setEditingItem] = useState<Address | undefined>(undefined);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await AddressService.getAddresses();
        if (res.success && res.data) setAddresses(res.data);
    };

    const handleSave = async (addr: Partial<Address>) => {
        const res = await AddressService.saveAddress(addr);
        if (res.success) {
            Toast.success(t('common.save') + ' ' + t('common.complete'));
            loadData();
        } else {
            Toast.error('保存失败');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm(t('common.delete') + ' ?')) {
            await AddressService.deleteById(id);
            Toast.success(t('common.delete') + ' ' + t('common.complete'));
            loadData();
        }
    };

    const renderContent = () => {
        if (addresses.length === 0) {
            return (
                <Empty 
                    icon="📪" 
                    text={t('address.empty')} 
                    subText={t('address.empty_desc')}
                />
            );
        }

        return addresses.map(addr => (
            <div 
                key={addr.id}
                onClick={() => { setEditingItem(addr); setShowSheet(true); }}
                style={{
                    background: 'var(--bg-card)', borderRadius: '12px', padding: '16px',
                    marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                    border: '0.5px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s'
                }}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.99)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {addr.name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '14px' }}>{addr.phone}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {addr.isDefault && <span style={{ fontSize: '10px', color: '#fa5151', background: 'rgba(250, 81, 81, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>默认</span>}
                        {addr.tag && <span style={{ fontSize: '10px', color: '#2979FF', background: 'rgba(41, 121, 255, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{addr.tag}</span>}
                    </div>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {addr.detail}
                </div>
                <div style={{ borderTop: '0.5px solid var(--border-color)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        {t('common.edit')}
                    </div>
                </div>
            </div>
        ));
    };

    return (
        <Page title={t('address.title')} onBack={() => navigateBack('/profile/self')}>
            <div style={{ paddingBottom: '80px' }}>
                {renderContent()}
            </div>

            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                padding: '16px', background: 'var(--bg-card)', 
                borderTop: '0.5px solid var(--border-color)', 
                paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                zIndex: 10
            }}>
                <Button 
                    variant="primary" 
                    block 
                    size="lg"
                    onClick={() => { setEditingItem(undefined); setShowSheet(true); }}
                >
                    + {t('address.add')}
                </Button>
            </div>

            {showSheet && (
                <AddressEditSheet 
                    visible={showSheet} 
                    onClose={() => setShowSheet(false)} 
                    onSave={handleSave} 
                    onDelete={handleDelete}
                    initialVal={editingItem} 
                />
            )}
        </Page>
    );
};
