import { create } from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import type {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
} from '@xyflow/react';
import type { TableData, Field, Template } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type TableNode = Node<TableData, 'table'>;

export interface DiagramState {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addTable: (position: { x: number; y: number }, templateFields?: Omit<Field, 'id'>[]) => void;
    updateTable: (id: string, data: Partial<TableData>) => void;
    deleteTable: (id: string) => void;
    deleteTables: (ids: string[]) => void;
    cloneTable: (id: string) => void;
    cloneTables: (ids: string[]) => void;
    addField: (tableId: string) => void;
    updateField: (tableId: string, fieldId: string, data: Partial<{ name: string; type: any; isPrimaryKey: boolean; isForeignKey: boolean }>) => void;
    removeField: (tableId: string, fieldId: string) => void;
    duplicateField: (tableId: string, fieldId: string) => void;
    moveField: (tableId: string, fieldId: string, direction: 'up' | 'down') => void;
    updateEdge: (edgeId: string, label: string) => void;
    updateEdgeWaypoint: (edgeId: string, waypointX: number, waypointY: number) => void;
    deleteEdge: (edgeId: string) => void;
    setDiagram: (nodes: Node[], edges: Edge[]) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    // Templates
    templates: Template[];
    addTemplate: (template: Template) => void;
    updateTemplate: (id: string, data: Partial<Omit<Template, 'id'>>) => void;
    deleteTemplate: (id: string) => void;
}

const loadTemplates = (): Template[] => {
    try {
        const saved = localStorage.getItem('er-diagram-templates-v1');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

const saveTemplates = (templates: Template[]) => {
    localStorage.setItem('er-diagram-templates-v1', JSON.stringify(templates));
};

export const useDiagramStore = create<DiagramState>((set, get) => ({
    theme: (localStorage.getItem('er-diagram-theme') as 'light' | 'dark') || 'light',
    nodes: [],
    edges: [],
    templates: loadTemplates(),

    onNodesChange: (changes: NodeChange<Node>[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes: EdgeChange<Edge>[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection: Connection) => {
        const edge = { ...connection, type: 'custom' };
        set({
            edges: addEdge(edge, get().edges),
        });
    },

    addTable: (position, templateFields) => {
        const fields: Field[] = templateFields
            ? templateFields.map(f => ({ ...f, id: uuidv4() }))
            : [{ id: uuidv4(), name: 'id', type: 'int', isPrimaryKey: true }];

        const newTable: TableNode = {
            id: uuidv4(),
            type: 'table',
            position,
            data: {
                name: templateFields ? 'New_Table' : 'New_Table',
                fields,
            },
        };
        set({ nodes: [...get().nodes, newTable] });
    },

    updateTable: (id, data) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            }),
        });
    },

    deleteTable: (id) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== id),
            edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
        });
    },

    deleteTables: (ids) => {
        const idSet = new Set(ids);
        set({
            nodes: get().nodes.filter((node) => !idSet.has(node.id)),
            edges: get().edges.filter((edge) => !idSet.has(edge.source) && !idSet.has(edge.target)),
        });
    },

    cloneTable: (id) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        const tData = node.data as TableData;
        const newId = uuidv4();
        const cloned: TableNode = {
            id: newId,
            type: 'table',
            position: { x: node.position.x + 30, y: node.position.y + 30 },
            data: {
                name: `${tData.name}_copy`,
                fields: tData.fields.map((f: Field) => ({ ...f, id: uuidv4() })),
            },
        };
        set({ nodes: [...get().nodes, cloned] });
    },

    cloneTables: (ids) => {
        const cloned: TableNode[] = [];
        for (const id of ids) {
            const node = get().nodes.find((n) => n.id === id);
            if (!node) continue;
            const tData = node.data as TableData;
            cloned.push({
                id: uuidv4(),
                type: 'table',
                position: { x: node.position.x + 30, y: node.position.y + 30 },
                data: {
                    name: `${tData.name}_copy`,
                    fields: tData.fields.map((f: Field) => ({ ...f, id: uuidv4() })),
                },
            });
        }
        set({ nodes: [...get().nodes, ...cloned] });
    },

    addField: (tableId) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === tableId) {
                    const tData = node.data as TableData;
                    return {
                        ...node,
                        data: {
                            ...tData,
                            fields: [...tData.fields, { id: uuidv4(), name: 'new_field', type: 'string', isPrimaryKey: false, isForeignKey: false }],
                        },
                    };
                }
                return node;
            }),
        });
    },

    updateField: (tableId, fieldId, data) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === tableId) {
                    const tData = node.data as TableData;
                    return {
                        ...node,
                        data: {
                            ...tData,
                            fields: tData.fields.map((f: Field) => (f.id === fieldId ? { ...f, ...data } : f)),
                        },
                    };
                }
                return node;
            }),
        });
    },

    removeField: (tableId, fieldId) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === tableId) {
                    const tData = node.data as TableData;
                    return {
                        ...node,
                        data: {
                            ...tData,
                            fields: tData.fields.filter((f: Field) => f.id !== fieldId),
                        },
                    };
                }
                return node;
            }),
            edges: get().edges.filter(
                (edge) => !(edge.source === tableId && edge.sourceHandle === fieldId) && !(edge.target === tableId && edge.targetHandle === fieldId)
            ),
        });
    },

    duplicateField: (tableId, fieldId) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === tableId) {
                    const tData = node.data as TableData;
                    const fieldIndex = tData.fields.findIndex((f: Field) => f.id === fieldId);
                    if (fieldIndex === -1) return node;
                    const original = tData.fields[fieldIndex];
                    const duplicate: Field = {
                        ...original,
                        id: uuidv4(),
                        name: `${original.name}_copy`,
                        isPrimaryKey: false, // copies shouldn't be PK
                    };
                    const newFields = [...tData.fields];
                    newFields.splice(fieldIndex + 1, 0, duplicate);
                    return {
                        ...node,
                        data: { ...tData, fields: newFields },
                    };
                }
                return node;
            }),
        });
    },

    moveField: (tableId, fieldId, direction) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === tableId) {
                    const tData = node.data as TableData;
                    const fields = [...tData.fields];
                    const index = fields.findIndex((f: Field) => f.id === fieldId);
                    if (index === -1) return node;
                    const newIndex = direction === 'up' ? index - 1 : index + 1;
                    if (newIndex < 0 || newIndex >= fields.length) return node;
                    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
                    return {
                        ...node,
                        data: { ...tData, fields },
                    };
                }
                return node;
            }),
        });
    },

    updateEdge: (edgeId, label) => {
        set({
            edges: get().edges.map((edge) => {
                if (edge.id === edgeId) {
                    return { ...edge, data: { ...edge.data, label } };
                }
                return edge;
            }),
        });
    },
    updateEdgeWaypoint: (edgeId, waypointX, waypointY) => {
        set({
            edges: get().edges.map((edge) => {
                if (edge.id === edgeId) {
                    return { ...edge, data: { ...edge.data, waypointX, waypointY } };
                }
                return edge;
            }),
        });
    },
    deleteEdge: (edgeId) => {
        set({
            edges: get().edges.filter((edge) => edge.id !== edgeId),
        });
    },

    setDiagram: (nodes, edges) => {
        set({ nodes, edges });
    },

    toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('er-diagram-theme', next);
        set({ theme: next });
    },

    // Template CRUD
    addTemplate: (template) => {
        const newTemplates = [...get().templates, template];
        saveTemplates(newTemplates);
        set({ templates: newTemplates });
    },
    updateTemplate: (id, data) => {
        const newTemplates = get().templates.map((t) =>
            t.id === id ? { ...t, ...data } : t
        );
        saveTemplates(newTemplates);
        set({ templates: newTemplates });
    },
    deleteTemplate: (id) => {
        const newTemplates = get().templates.filter((t) => t.id !== id);
        saveTemplates(newTemplates);
        set({ templates: newTemplates });
    },
}));
