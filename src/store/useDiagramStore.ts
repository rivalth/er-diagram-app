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
import type { TableData, Field } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type TableNode = Node<TableData, 'table'>;

export interface DiagramState {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addTable: (position: { x: number; y: number }) => void;
    updateTable: (id: string, data: Partial<TableData>) => void;
    deleteTable: (id: string) => void;
    addField: (tableId: string) => void;
    updateField: (tableId: string, fieldId: string, data: Partial<{ name: string; type: any; isPrimaryKey: boolean; isForeignKey: boolean }>) => void;
    removeField: (tableId: string, fieldId: string) => void;
    updateEdge: (edgeId: string, label: string) => void;
    updateEdgeWaypoint: (edgeId: string, waypointX: number, waypointY: number) => void;
    setDiagram: (nodes: Node[], edges: Edge[]) => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
    theme: (localStorage.getItem('er-diagram-theme') as 'light' | 'dark') || 'light',
    nodes: [],
    edges: [],
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
    addTable: (position) => {
        const newTable: TableNode = {
            id: uuidv4(),
            type: 'table',
            position,
            data: {
                name: 'New_Table',
                fields: [{ id: uuidv4(), name: 'id', type: 'int', isPrimaryKey: true }],
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
    setDiagram: (nodes, edges) => {
        set({ nodes, edges });
    },
    toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('er-diagram-theme', next);
        set({ theme: next });
    },
}));
