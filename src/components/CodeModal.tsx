import { useState, useEffect } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { X, Save, Download } from 'lucide-react';
import type { DiagramJSON, Field, FieldType } from '../types';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import { v4 as uuidv4 } from 'uuid';

interface CodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// SQL type → app type mapping
const sqlTypeToAppType = (sqlType: string): FieldType => {
    const upper = sqlType.toUpperCase().replace(/\(.*\)/, '').trim();
    const map: Record<string, FieldType> = {
        'INT': 'int',
        'INTEGER': 'int',
        'BIGINT': 'int',
        'SMALLINT': 'int',
        'TINYINT': 'int',
        'SERIAL': 'int',
        'VARCHAR': 'string',
        'CHAR': 'string',
        'TEXT': 'string',
        'NVARCHAR': 'string',
        'FLOAT': 'number',
        'DOUBLE': 'number',
        'REAL': 'number',
        'BOOLEAN': 'boolean',
        'BOOL': 'boolean',
        'BIT': 'boolean',
        'DATE': 'date',
        'DATETIME': 'date',
        'TIMESTAMP': 'date',
        'TIME': 'date',
        'DECIMAL': 'decimal',
        'NUMERIC': 'decimal',
        'MONEY': 'decimal',
    };
    return map[upper] || 'string';
};

// Parse CREATE TABLE statements from SQL
function parseSqlToTables(sql: string): { name: string; fields: Field[] }[] {
    const tables: { name: string; fields: Field[] }[] = [];

    // Match CREATE TABLE blocks
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\)\s*;/gi;
    let match;

    while ((match = createTableRegex.exec(sql)) !== null) {
        const tableName = match[1];
        const body = match[2];

        // Split by commas that are not inside parentheses
        const parts: string[] = [];
        let depth = 0;
        let current = '';
        for (const char of body) {
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        if (current.trim()) parts.push(current.trim());

        const fields: Field[] = [];
        const pkFields = new Set<string>();

        // First pass: find table-level PRIMARY KEY constraints
        for (const part of parts) {
            const pkMatch = part.match(/^\s*PRIMARY\s+KEY\s*\(([^)]+)\)/i);
            if (pkMatch) {
                pkMatch[1].split(',').forEach(f => pkFields.add(f.trim().replace(/[`"']/g, '')));
            }
        }

        // Second pass: parse fields
        for (const part of parts) {
            const trimmed = part.trim();

            // Skip constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, CONSTRAINT, INDEX)
            if (/^\s*(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT|INDEX|KEY)/i.test(trimmed)) {
                continue;
            }
            // Skip ALTER-like or empty
            if (!trimmed || /^\s*--/.test(trimmed)) continue;

            // Parse: field_name TYPE ... [PRIMARY KEY] ...
            const fieldMatch = trimmed.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\([^)]*\))?)/i);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const isPK = /PRIMARY\s+KEY/i.test(trimmed) || pkFields.has(fieldName);

                fields.push({
                    id: uuidv4(),
                    name: fieldName,
                    type: sqlTypeToAppType(fieldType),
                    isPrimaryKey: isPK,
                    isForeignKey: false,
                });
            }
        }

        if (fields.length > 0) {
            tables.push({ name: tableName, fields });
        }
    }

    return tables;
}

export function CodeModal({ isOpen, onClose }: CodeModalProps) {
    const { nodes, edges, setDiagram } = useDiagramStore();
    const [code, setCode] = useState('');
    const [sqlCode, setSqlCode] = useState('');
    const [activeTab, setActiveTab] = useState<'json' | 'sql'>('json');
    const [error, setError] = useState<string | null>(null);

    // Generate current JSON representation on open
    useEffect(() => {
        if (isOpen) {
            const data: DiagramJSON = {
                metadata: { projectName: 'ER_Diagram', version: '1.0' },
                tables: nodes.map(node => ({
                    id: node.id,
                    name: node.data.name as string,
                    position: node.position,
                    fields: (node.data.fields as any[]).map(f => ({
                        id: f.id,
                        name: f.name,
                        type: f.type,
                        isPrimaryKey: f.isPrimaryKey,
                        isForeignKey: f.isForeignKey,
                    })),
                })),
                relationships: edges.map(edge => ({
                    id: edge.id,
                    source: edge.source,
                    sourceField: (edge.sourceHandle || '').replace(/-left$|-right$/, ''),
                    target: edge.target,
                    targetField: (edge.targetHandle || '').replace(/-left$|-right$/, ''),
                    type: (edge.data?.label as string) || '1:M',
                    sourceSide: edge.data?.sourceSide || 'right',
                    targetSide: edge.data?.targetSide || 'left',
                })),
            };
            setCode(JSON.stringify(data, null, 2));

            // Generate SQL
            let sql = `-- Generated by ER Diagram Studio\n\n`;
            data.tables.forEach(table => {
                sql += `CREATE TABLE ${table.name} (\n`;
                const fieldDefs = table.fields.map(f => {
                    const typeMap: Record<string, string> = {
                        'int': 'INT',
                        'string': 'VARCHAR(255)',
                        'number': 'FLOAT',
                        'boolean': 'BOOLEAN',
                        'date': 'DATE',
                        'decimal': 'DECIMAL'
                    };
                    const sqlType = typeMap[f.type] || 'VARCHAR(255)';
                    let def = `  ${f.name} ${sqlType}`;
                    if (f.isPrimaryKey) def += ` PRIMARY KEY`;
                    return def;
                });
                sql += fieldDefs.join(',\n');
                sql += `\n);\n\n`;
            });

            data.relationships.forEach(rel => {
                const sourceTable = data.tables.find(t => t.id === rel.source);
                const targetTable = data.tables.find(t => t.id === rel.target);
                if (sourceTable && targetTable) {
                    const sourceField = sourceTable.fields.find(f => f.id === rel.sourceField);
                    const targetField = targetTable.fields.find(f => f.id === rel.targetField);
                    if (sourceField && targetField) {
                        sql += `ALTER TABLE ${targetTable.name} ADD CONSTRAINT fk_${targetTable.name}_${targetField.name} FOREIGN KEY (${targetField.name}) REFERENCES ${sourceTable.name}(${sourceField.name});\n`;
                    }
                }
            });
            setSqlCode(sql);

            setError(null);
        }
    }, [isOpen, nodes, edges]);

    if (!isOpen) return null;

    const handleApplyJson = () => {
        try {
            const json = JSON.parse(code) as DiagramJSON;

            const newNodes = json.tables.map(table => ({
                id: table.id,
                type: 'table',
                position: table.position,
                data: {
                    name: table.name,
                    fields: table.fields.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        type: f.type || 'string',
                        isPrimaryKey: f.isPrimaryKey || false,
                        isForeignKey: f.isForeignKey || false,
                    })),
                },
            }));

            const newEdges = json.relationships.map(rel => ({
                id: rel.id,
                source: rel.source,
                sourceHandle: `${rel.sourceField}-${(rel as any).sourceSide || 'right'}`,
                target: rel.target,
                targetHandle: `${rel.targetField}-${(rel as any).targetSide || 'left'}`,
                type: 'custom',
                data: {
                    label: rel.type || '1:M',
                    sourceSide: (rel as any).sourceSide || 'right',
                    targetSide: (rel as any).targetSide || 'left',
                }
            }));

            setDiagram(newNodes, newEdges);
            setError(null);
            onClose();
        } catch (err) {
            setError('Invalid JSON syntax. Please check your format.');
        }
    };

    const handleApplySql = () => {
        try {
            const parsedTables = parseSqlToTables(sqlCode);

            if (parsedTables.length === 0) {
                setError('No valid CREATE TABLE statements found. Make sure your SQL uses standard CREATE TABLE syntax.');
                return;
            }

            // Position tables in a grid layout
            const COLS = 3;
            const SPACING_X = 350;
            const SPACING_Y = 300;

            const newNodes = parsedTables.map((table, i) => ({
                id: uuidv4(),
                type: 'table',
                position: {
                    x: 100 + (i % COLS) * SPACING_X,
                    y: 100 + Math.floor(i / COLS) * SPACING_Y,
                },
                data: {
                    name: table.name,
                    fields: table.fields,
                },
            }));

            setDiagram(newNodes, []);
            setError(null);
            onClose();
        } catch (err) {
            setError('Failed to parse SQL. Please check your syntax.');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schema.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[800px] h-[600px] flex flex-col overflow-hidden font-mono border border-gray-300 dark:border-gray-700 transition-colors duration-300">

                {/* Header */}
                <div className="bg-gray-800 dark:bg-black text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold">Export / Import</h2>
                        <div className="flex bg-gray-700 dark:bg-gray-800 rounded text-sm">
                            <button
                                onClick={() => { setActiveTab('json'); setError(null); }}
                                className={`px-3 py-1 transition-colors border-none cursor-pointer rounded-l ${activeTab === 'json' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white bg-transparent'}`}
                            >JSON</button>
                            <button
                                onClick={() => { setActiveTab('sql'); setError(null); }}
                                className={`px-3 py-1 transition-colors border-none cursor-pointer rounded-r ${activeTab === 'sql' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white bg-transparent'}`}
                            >SQL</button>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-transparent border-none p-1 cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative overflow-auto bg-[#1d1f21] dark:bg-gray-950 transition-colors duration-300">
                    <Editor
                        value={activeTab === 'json' ? code : sqlCode}
                        onValueChange={(newCode) => {
                            if (activeTab === 'json') {
                                setCode(newCode);
                            } else {
                                setSqlCode(newCode);
                            }
                            setError(null);
                        }}
                        highlight={(codeToHighlight) => {
                            const grammar = activeTab === 'json' ? Prism.languages.json : Prism.languages.sql;
                            const language = activeTab === 'json' ? 'json' : 'sql';
                            return Prism.highlight(codeToHighlight, grammar, language);
                        }}
                        padding={16}
                        className="w-full min-h-full font-mono text-sm text-gray-100"
                        style={{
                            fontFamily: '"IBM Plex Mono", monospace',
                            outline: 'none',
                        }}
                    />
                    {error && (
                        <div className="absolute bottom-4 left-4 right-4 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded text-xs shadow-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 px-4 py-3 flex items-center justify-between transition-colors duration-300">
                    <div className="flex gap-2">
                        {activeTab === 'json' && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium cursor-pointer"
                            >
                                <Download size={14} /> Download JSON
                            </button>
                        )}
                        {activeTab === 'sql' && (
                            <button
                                onClick={() => {
                                    const blob = new Blob([sqlCode], { type: 'text/sql' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'schema.sql';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium cursor-pointer"
                            >
                                <Download size={14} /> Download SQL
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-sm font-medium transition-colors cursor-pointer border-none"
                        >
                            Cancel
                        </button>
                        {activeTab === 'json' && (
                            <button
                                onClick={handleApplyJson}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-blue-600 text-white rounded hover:bg-gray-700 dark:hover:bg-blue-500 transition-colors text-sm font-medium border-none cursor-pointer"
                            >
                                <Save size={14} /> Apply Changes
                            </button>
                        )}
                        {activeTab === 'sql' && (
                            <button
                                onClick={handleApplySql}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-blue-600 text-white rounded hover:bg-gray-700 dark:hover:bg-blue-500 transition-colors text-sm font-medium border-none cursor-pointer"
                            >
                                <Save size={14} /> Apply SQL
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
