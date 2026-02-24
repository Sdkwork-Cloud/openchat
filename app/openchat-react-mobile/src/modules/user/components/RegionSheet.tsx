
import React from 'react';
import { RegionPicker } from '../../../components/RegionPicker/RegionPicker';
import { REGION_DATA, RegionNode } from '../../../utils/regionData';

interface RegionSheetProps {
    visible: boolean;
    current: string;
    onClose: () => void;
    onSelect: (region: string) => void;
}

export const RegionSheet: React.FC<RegionSheetProps> = ({ visible, current, onClose, onSelect }) => {
    
    const handlePickerSelect = (path: RegionNode[]) => {
        // Flatten the path to a string string, e.g. "中国 上海市 浦东新区"
        const fullRegionName = path.map(node => node.name).join(' ');
        onSelect(fullRegionName);
    };

    // Parse current value to simulate initial selection (Simplified for demo)
    // In a real app, you might parse "China Shanghai" back to ['China', 'Shanghai']
    const initialValue = current ? current.split(' ') : [];

    return (
        <RegionPicker
            visible={visible}
            data={REGION_DATA}
            initialValue={initialValue}
            title="选择地区"
            placeholder="请选择"
            onClose={onClose}
            onSelect={handlePickerSelect}
        />
    );
};
