
import React from 'react';
import { Picker } from '../../../components/Picker/Picker';

interface GenderSheetProps {
    visible: boolean;
    current: string;
    onClose: () => void;
    onSelect: (gender: 'male' | 'female') => void;
}

export const GenderSheet: React.FC<GenderSheetProps> = ({ visible, current, onClose, onSelect }) => {
    const options = [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' }
    ];

    return (
        <Picker 
            visible={visible}
            title="选择性别"
            options={options}
            value={current}
            onClose={onClose}
            onConfirm={(val) => onSelect(val as 'male' | 'female')}
        />
    );
};
