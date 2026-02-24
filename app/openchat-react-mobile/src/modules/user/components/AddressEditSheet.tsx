
import React, { useState, useEffect } from 'react';
import { Address } from '../services/AddressService';
import { Toast } from '../../../components/Toast';
import { smartParseAddress } from '../../../utils/algorithms';
import { Platform } from '../../../platform';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Input } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';

interface AddressEditSheetProps {
    visible: boolean;
    onClose: () => void;
    onSave: (val: Partial<Address>) => void;
    onDelete?: (id: string) => void;
    initialVal?: Address;
}

export const AddressEditSheet: React.FC<AddressEditSheetProps> = ({ visible, onClose, onSave, onDelete, initialVal }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [detail, setDetail] = useState('');
    const [tag, setTag] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (visible) {
            if (initialVal) {
                setName(initialVal.name);
                setPhone(initialVal.phone);
                setDetail(initialVal.detail);
                setTag(initialVal.tag || '');
                setIsDefault(initialVal.isDefault || false);
            } else {
                setName(''); setPhone(''); setDetail(''); setTag(''); setIsDefault(false);
            }
        }
    }, [visible, initialVal]);

    const handleSave = () => {
        if (!name.trim()) { Toast.info('请输入联系人'); return; }
        if (!phone.trim()) { Toast.info('请输入手机号码'); return; }
        if (!detail.trim()) { Toast.info('请输入详细地址'); return; }
        
        onSave({ id: initialVal?.id, name, phone, detail, tag, isDefault });
        onClose();
    };

    const handleSmartPaste = async () => {
        try {
            const text = await Platform.clipboard.read();
            if (!text || !text.trim()) {
                const manualText = prompt("请粘贴地址信息：");
                if (manualText) processSmartText(manualText);
                return;
            }
            processSmartText(text);
        } catch (e) {
            const manualText = prompt("请粘贴地址信息：");
            if (manualText) processSmartText(manualText);
        }
    };

    const processSmartText = (text: string) => {
        const result = smartParseAddress(text);
        if (result.phone || result.detail) {
            if (result.name) setName(result.name);
            if (result.phone) setPhone(result.phone);
            if (result.detail) setDetail(result.detail);
            Toast.success('已智能填写');
        } else {
            Toast.info('未识别到有效地址信息');
        }
    };

    const Header = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>{initialVal ? '编辑地址' : '新增地址'}</span>
            <div onClick={handleSmartPaste} style={{ fontSize: '13px', color: 'var(--primary-color)', cursor: 'pointer' }}>智能粘贴</div>
        </div>
    );

    return (
        <ActionSheet visible={visible} onClose={onClose} title={Header} height="auto">
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                        <Input placeholder="联系人" value={name} onChange={e => setName(e.target.value)} clearable />
                    </div>
                    <div style={{ width: '140px' }}>
                        <Input placeholder="手机号码" type="tel" value={phone} onChange={e => setPhone(e.target.value)} clearable />
                    </div>
                </div>
                
                <div style={{ margin: '12px 0' }}>
                    <Input 
                        placeholder="详细地址 (地区、街道、门牌)" 
                        value={detail} 
                        onChange={e => setDetail(e.target.value)} 
                        clearable
                        containerStyle={{ marginBottom: 0 }}
                    />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['家', '公司', '学校'].map(t => (
                            <span key={t} onClick={() => setTag(t)} style={{ 
                                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                                background: tag === t ? 'var(--primary-color)' : 'var(--bg-body)',
                                color: tag === t ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s', fontWeight: tag === t ? 500 : 400
                            }}>{t}</span>
                        ))}
                    </div>
                    <div onClick={() => setIsDefault(!isDefault)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <div style={{ 
                            width: '20px', height: '20px', borderRadius: '50%', 
                            border: isDefault ? 'none' : '2px solid var(--border-color)',
                            background: isDefault ? 'var(--primary-color)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}>
                            {isDefault && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        设为默认
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {initialVal && onDelete && (
                        <Button variant="secondary" onClick={() => { onDelete(initialVal.id); onClose(); }} style={{ width: '80px', color: '#fa5151', borderColor: 'transparent', background: 'var(--bg-body)' }}>删除</Button>
                    )}
                    <Button block onClick={handleSave}>保存</Button>
                </div>
            </div>
        </ActionSheet>
    );
};
