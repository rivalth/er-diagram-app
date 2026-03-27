import { useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { X, Plus, Trash2, Save, Edit3 } from 'lucide-react';
import type { Template, FieldType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const FIELD_TYPES: FieldType[] = ['int', 'string', 'number', 'boolean', 'date', 'decimal'];

export function TemplateManager({ isOpen, onClose }: TemplateManagerProps) {
    const { templates, addTemplate, updateTemplate, deleteTemplate } = useDiagramStore();
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // New template form state
    const [name, setName] = useState('');
    const [fields, setFields] = useState<{ name: string; type: FieldType; isPrimaryKey: boolean }[]>([]);

    if (!isOpen) return null;

    const startCreate = () => {
        setIsCreating(true);
        setEditingTemplate(null);
        setName('');
        setFields([{ name: 'id', type: 'int', isPrimaryKey: true }]);
    };

    const startEdit = (template: Template) => {
        setIsCreating(false);
        setEditingTemplate(template);
        setName(template.name);
        setFields(template.fields.map(f => ({
            name: f.name,
            type: f.type,
            isPrimaryKey: f.isPrimaryKey || false,
        })));
    };

    const handleSave = () => {
        if (!name.trim()) return;

        const templateFields = fields.map(f => ({
            name: f.name,
            type: f.type,
            isPrimaryKey: f.isPrimaryKey,
            isForeignKey: false,
        }));

        if (isCreating) {
            addTemplate({ id: uuidv4(), name: name.trim(), fields: templateFields });
        } else if (editingTemplate) {
            updateTemplate(editingTemplate.id, { name: name.trim(), fields: templateFields });
        }

        setEditingTemplate(null);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setEditingTemplate(null);
        setIsCreating(false);
    };

    const addFieldRow = () => {
        setFields([...fields, { name: 'new_field', type: 'string', isPrimaryKey: false }]);
    };

    const updateFieldRow = (index: number, data: Partial<{ name: string; type: FieldType; isPrimaryKey: boolean }>) => {
        setFields(fields.map((f, i) => i === index ? { ...f, ...data } : f));
    };

    const removeFieldRow = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const isEditing = isCreating || editingTemplate !== null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[600px] max-h-[500px] flex flex-col overflow-hidden font-mono border border-gray-300 dark:border-gray-700 transition-colors duration-300">
                {/* Header */}
                <div className="bg-gray-800 dark:bg-black text-white px-4 py-3 flex items-center justify-between">
                    <h2 className="font-bold">Templates</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none p-1 cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {!isEditing ? (
                        /* Template List */
                        <div className="space-y-2">
                            {templates.length === 0 && (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-6 text-sm">
                                    No templates yet. Create one to quickly scaffold tables.
                                </p>
                            )}
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className="flex items-center justify-between px-3 py-2.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div>
                                        <span className="font-bold text-gray-800 dark:text-gray-100">{template.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            {template.fields.length} fields
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => startEdit(template)}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 bg-transparent border-none cursor-pointer transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteTemplate(template.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Edit/Create Form */
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold block mb-1">Template Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 text-sm"
                                    placeholder="e.g. BaseEntity"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold block mb-1">Fields</label>
                                <div className="space-y-1.5">
                                    {fields.map((field, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateFieldRow(i, { isPrimaryKey: !field.isPrimaryKey })}
                                                className={`text-xs px-1.5 py-0.5 rounded border-none cursor-pointer transition-colors ${field.isPrimaryKey ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
                                                title="Toggle PK"
                                            >
                                                PK
                                            </button>
                                            <input
                                                value={field.name}
                                                onChange={(e) => updateFieldRow(i, { name: e.target.value })}
                                                className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none text-sm"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateFieldRow(i, { type: e.target.value as FieldType })}
                                                className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none text-xs cursor-pointer"
                                            >
                                                {FIELD_TYPES.map(t => (
                                                    <option key={t} value={t}>{t.toUpperCase()}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => removeFieldRow(i)}
                                                className="p-1 text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addFieldRow}
                                    className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white bg-transparent border-none cursor-pointer transition-colors"
                                >
                                    <Plus size={12} /> Add Field
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 px-4 py-3 flex items-center justify-between transition-colors">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={startCreate}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-blue-600 text-white rounded hover:bg-gray-700 dark:hover:bg-blue-500 transition-colors text-sm font-medium border-none cursor-pointer"
                            >
                                <Plus size={14} /> New Template
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition-colors bg-transparent border-none cursor-pointer"
                            >
                                Close
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm transition-colors bg-transparent border-none cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-blue-600 text-white rounded hover:bg-gray-700 dark:hover:bg-blue-500 transition-colors text-sm font-medium border-none cursor-pointer"
                            >
                                <Save size={14} /> {isCreating ? 'Create' : 'Save'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
