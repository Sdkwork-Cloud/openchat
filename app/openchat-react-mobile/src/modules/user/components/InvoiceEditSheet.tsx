
import React, { useState, useEffect } from 'react';
import { InvoiceTitle } from '../services/InvoiceService';
import { Toast } from '../../../components/Toast';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { Tabs } from '../../../components/Tabs/Tabs';

interface InvoiceEditSheetProps {
    visible: boolean;
    onClose: () => void;
    onSave: (val: Partial<InvoiceTitle>) => void;
    onDelete?: (id: string) => void;
    initialVal?: InvoiceTitle;
}

export const InvoiceEditSheet: React.FC<InvoiceEditSheetProps> = ({ visible, onClose, onSave, onDelete, initialVal }) => {
    const [type, setType] = useState<'company' | 'personal'>('company');
    const [title, setTitle] = useState('');
    const [taxNo, setTaxNo] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialVal) {
                setType(initialVal.type); setTitle(initialVal.title); setTaxNo(initialVal.taxNo || ''); setIsDefault(initialVal.isDefault || false);
            } else {
                setType('company'); setTitle(''); setTaxNo(''); setIsDefault(false);
            }
        }
    }, [visible, initialVal]);

    if (!visible) return null;

    const handleSave = () => {
        if (!title.trim()) { Toast.info('请输入抬头名称'); return; }
        if (type === 'company' && !taxNo.trim()) { Toast.info('请输入税号'); return; }
        
        onSave({ id: initialVal?.id, type, title, taxNo, isDefault });
        onClose();
    };

    const Header = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>{initialVal ? '编辑抬头' : '添加抬头'}</span>
        </div>
    );

    return (
        <ActionSheet visible={visible} onClose={onClose} title={Header} height="auto">
            <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                    <Tabs 
                        items={[
                            { id: 'company', label: '单位' },
                            { id: 'personal', label: '个人' }
                        ]}
                        activeId={type}
                        onChange={(id) => setType(id as any)}
                        variant="segment"
                        scrollable={false}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Input 
                        placeholder="抬头名称" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        clearable 
                        containerStyle={{ marginBottom: 0 }}
                    />
                    
                    {type === 'company' && (
                        <div style={{ animation: 'fadeIn 0.2s' }}>
                            <Input 
                                placeholder="税号" 
                                value={taxNo} 
                                onChange={e => setTaxNo(e.target.value.toUpperCase())} 
                                clearable 
                                containerStyle={{ marginBottom: 0 }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px', gap: '8px', cursor: 'pointer' }} onClick={() => setIsDefault(!isDefault)}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isDefault ? 'none' : '2px solid var(--border-color)', background: isDefault ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        {isDefault && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>设为默认抬头</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    {initialVal && onDelete && (
                        <Button variant="secondary" onClick={() => { onDelete(initialVal.id); onClose(); }} style={{ width: '80px', color: '#fa5151', borderColor: 'transparent', background: 'var(--bg-body)' }}>删除</Button>
                    )}
                    <Button block onClick={handleSave}>保存</Button>
                </div>
            </div>
        </ActionSheet>
    );
};
