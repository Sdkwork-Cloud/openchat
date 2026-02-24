
import React from 'react';
import { RegionNode } from '../../utils/regionData';
import { Cascader, CascaderOption } from '../Cascader/Cascader';

interface RegionPickerProps {
    visible: boolean;
    data: RegionNode[];
    title?: string;
    placeholder?: string;
    initialValue?: string[]; // Array of region names e.g. ['中国', '上海市']
    onClose: () => void;
    onSelect: (path: RegionNode[]) => void;
}

// Adapter: Convert RegionNode to CascaderOption
const mapRegionToOption = (nodes: RegionNode[]): CascaderOption[] => {
    return nodes.map(node => ({
        value: node.code,
        label: node.name,
        children: node.children ? mapRegionToOption(node.children) : undefined
    }));
};

export const RegionPicker: React.FC<RegionPickerProps> = ({ 
    visible, 
    data, 
    title = '选择所在地区', 
    placeholder = '请选择',
    initialValue = [],
    onClose, 
    onSelect 
}) => {
    // Memoize options to prevent unnecessary re-calculations
    const cascaderOptions = React.useMemo(() => mapRegionToOption(data), [data]);

    // Helper to find codes from names (Reverse lookup for initial value)
    const findCodesByNames = (names: string[], options: CascaderOption[]): (string | number)[] => {
        const codes: (string | number)[] = [];
        let currentOptions = options;
        
        for (const name of names) {
            const found = currentOptions.find(o => o.label === name || name.includes(o.label));
            if (found) {
                codes.push(found.value);
                currentOptions = found.children || [];
            } else {
                break;
            }
        }
        return codes;
    };

    const initialCodes = React.useMemo(() => 
        findCodesByNames(initialValue, cascaderOptions), 
    [initialValue, cascaderOptions]);

    const handleFinish = (selectedOptions: CascaderOption[]) => {
        // Convert back to RegionNode structure expected by parent
        // Since CascaderOption is a subset/mapping, we construct nodes with code/name
        const path: RegionNode[] = selectedOptions.map(opt => ({
            code: String(opt.value),
            name: opt.label
            // children intentionally omitted as parent only needs path trace
        }));
        onSelect(path);
    };

    return (
        <Cascader 
            visible={visible}
            title={title}
            placeholder={placeholder}
            options={cascaderOptions}
            value={initialCodes}
            onClose={onClose}
            onFinish={handleFinish}
        />
    );
};
