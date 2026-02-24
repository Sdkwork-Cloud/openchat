
import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import './PromptTextInput.css';

export interface PromptTextInputRef {
    focus: () => void;
    blur: () => void;
    clear: () => void;
}

interface PromptTextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
    className?: string;
    style?: React.CSSProperties;
    autoFocus?: boolean;
    disabled?: boolean;
    maxHeight?: string;
}

export const PromptTextInput = forwardRef<PromptTextInputRef, PromptTextInputProps>(({ 
    value, 
    onChange, 
    placeholder = '请输入...', 
    onSubmit,
    className = '',
    style,
    autoFocus = false,
    disabled = false,
    maxHeight
}, ref) => {
    
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: value,
        editable: !disabled,
        editorProps: {
            attributes: {
                class: 'prompt-text-input-content',
            },
            handleKeyDown: (view, event) => {
                if (onSubmit && event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    onSubmit();
                    return true;
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            const text = editor.getText();
            onChange(text);
        },
    });

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        focus: () => {
            editor?.commands.focus('end');
        },
        blur: () => {
            editor?.commands.blur();
        },
        clear: () => {
            editor?.commands.clearContent();
        }
    }));

    // Sync external value changes
    useEffect(() => {
        if (editor && value !== editor.getText()) {
            const currentText = editor.getText();
            if (value === '' && currentText !== '') {
                editor.commands.clearContent();
            } else if (value !== currentText) {
                editor.commands.setContent(value);
                if (value.length > currentText.length) {
                    editor.commands.focus('end');
                }
            }
        }
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [editor, disabled]);

    useEffect(() => {
        if (autoFocus && editor) {
            setTimeout(() => editor.commands.focus('end'), 100);
        }
    }, [editor, autoFocus]);

    if (!editor) {
        return null;
    }

    return (
        <div 
            className={`prompt-text-input ${className}`}
            style={{ 
                cursor: disabled ? 'not-allowed' : 'text',
                overflowY: 'auto',
                maxHeight: maxHeight,
                ...style 
            }}
            onClick={() => editor.commands.focus()}
        >
            <EditorContent editor={editor} />
        </div>
    );
});

PromptTextInput.displayName = 'PromptTextInput';
