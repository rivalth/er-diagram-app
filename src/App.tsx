import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react';
import type { Node, Edge, OnSelectionChangeParams } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from './store/useDiagramStore';
import { TableNode } from './components/TableNode';
import { Toolbar } from './components/Toolbar';
import { RelationshipEdge } from './components/RelationshipEdge';
import { ContextMenu, type ContextMenuSection } from './components/ContextMenu';
import { SelectionToolbar } from './components/SelectionToolbar';
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, Key, CopyPlus, MousePointerSquareDashed } from 'lucide-react';
import type { TableData, Field } from './types';

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  custom: RelationshipEdge,
};

interface ContextMenuState {
  x: number;
  y: number;
  type: 'canvas' | 'node' | 'edge' | 'field';
  nodeId?: string;
  edgeId?: string;
  fieldId?: string;
}

function DiagramFlow() {
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, setDiagram, theme,
    addTable, deleteTable, cloneTable, addField, deleteEdge, updateEdge,
    removeField, duplicateField, moveField
  } = useDiagramStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const reactFlowInstance = useReactFlow();

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('er-diagram-data-v1');
    if (saved) {
      try {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
        if (savedNodes?.length > 0 || savedEdges?.length > 0) {
          setDiagram(savedNodes, savedEdges);
        }
      } catch (e) {
        console.error('Failed to parse saved diagram', e);
      }
    } else {
      setDiagram(
        [
          {
            id: 't1',
            type: 'table',
            position: { x: 100, y: 100 },
            data: {
              name: 'Users',
              fields: [
                { id: 'f1', name: 'id', type: 'PK' },
                { id: 'f2', name: 'email', type: 'string' },
              ]
            }
          }
        ],
        []
      );
    }
    setIsLoaded(true);
  }, [setDiagram]);

  // Save to local storage on change
  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        localStorage.setItem('er-diagram-data-v1', JSON.stringify({ nodes, edges }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, isLoaded]);

  // Handle dark mode DOM sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Track selected nodes
  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedNodeIds(params.nodes.map(n => n.id));
  }, []);

  // Canvas context menu
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'canvas',
    });
  }, []);

  // Node context menu
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      nodeId: node.id,
    });
  }, []);

  // Edge context menu
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      edgeId: edge.id,
    });
  }, []);

  // Field context menu (called from TableNode via custom event)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setContextMenu({
        x: e.detail.x,
        y: e.detail.y,
        type: 'field',
        nodeId: e.detail.nodeId,
        fieldId: e.detail.fieldId,
      });
    };
    window.addEventListener('field-context-menu' as any, handler);
    return () => window.removeEventListener('field-context-menu' as any, handler);
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Build context menu sections based on type
  const getContextMenuSections = useCallback((): ContextMenuSection[] => {
    if (!contextMenu) return [];

    switch (contextMenu.type) {
      case 'canvas': {
        return [
          {
            items: [
              {
                label: 'New Table',
                icon: <Plus size={14} />,
                onClick: () => {
                  const pos = reactFlowInstance.screenToFlowPosition({
                    x: contextMenu.x,
                    y: contextMenu.y,
                  });
                  addTable(pos);
                },
              },
            ],
          },
          {
            items: [
              {
                label: 'Select All',
                icon: <MousePointerSquareDashed size={14} />,
                onClick: () => {
                  const allNodeIds = nodes.map(n => n.id);
                  onNodesChange(allNodeIds.map(id => ({ type: 'select' as const, id, selected: true })));
                },
              },
            ],
          },
        ];
      }

      case 'node': {
        const nodeId = contextMenu.nodeId!;
        return [
          {
            items: [
              {
                label: 'Add Field',
                icon: <Plus size={14} />,
                onClick: () => addField(nodeId),
              },
              {
                label: 'Clone Table',
                icon: <Copy size={14} />,
                onClick: () => cloneTable(nodeId),
              },
            ],
          },
          {
            items: [
              {
                label: 'Delete Table',
                icon: <Trash2 size={14} />,
                onClick: () => deleteTable(nodeId),
                danger: true,
              },
            ],
          },
        ];
      }

      case 'edge': {
        const edgeId = contextMenu.edgeId!;
        const edge = edges.find(e => e.id === edgeId);
        const currentLabel = (edge?.data?.label as string) || '1:M';
        const types = ['1:1', '1:M', 'M:1', 'M:M'];
        return [
          {
            items: types.map(t => ({
              label: t,
              onClick: () => updateEdge(edgeId, t),
              disabled: t === currentLabel,
            })),
          },
          {
            items: [
              {
                label: 'Delete Relationship',
                icon: <Trash2 size={14} />,
                onClick: () => deleteEdge(edgeId),
                danger: true,
              },
            ],
          },
        ];
      }

      case 'field': {
        const nodeId = contextMenu.nodeId!;
        const fieldId = contextMenu.fieldId!;
        const node = nodes.find(n => n.id === nodeId);
        const tData = node?.data as TableData | undefined;
        const field = tData?.fields.find((f: Field) => f.id === fieldId);
        const fieldIndex = tData?.fields.findIndex((f: Field) => f.id === fieldId) ?? -1;
        const isFirst = fieldIndex === 0;
        const isLast = fieldIndex === (tData?.fields.length ?? 0) - 1;

        return [
          {
            items: [
              {
                label: field?.isPrimaryKey ? 'Remove Primary Key' : 'Set as Primary Key',
                icon: <Key size={14} />,
                onClick: () => {
                  if (field) {
                    const { updateField } = useDiagramStore.getState();
                    updateField(nodeId, fieldId, { isPrimaryKey: !field.isPrimaryKey });
                  }
                },
              },
              {
                label: 'Duplicate Field',
                icon: <CopyPlus size={14} />,
                onClick: () => duplicateField(nodeId, fieldId),
              },
            ],
          },
          {
            items: [
              {
                label: 'Move Up',
                icon: <ArrowUp size={14} />,
                onClick: () => moveField(nodeId, fieldId, 'up'),
                disabled: isFirst,
              },
              {
                label: 'Move Down',
                icon: <ArrowDown size={14} />,
                onClick: () => moveField(nodeId, fieldId, 'down'),
                disabled: isLast,
              },
            ],
          },
          {
            items: [
              {
                label: 'Delete Field',
                icon: <Trash2 size={14} />,
                onClick: () => removeField(nodeId, fieldId),
                danger: true,
              },
            ],
          },
        ];
      }

      default:
        return [];
    }
  }, [contextMenu, nodes, edges, reactFlowInstance, addTable, addField, cloneTable, deleteTable, deleteEdge, updateEdge, removeField, duplicateField, moveField, onNodesChange]);

  if (!isLoaded) return null;

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#f3f4f6] dark:bg-gray-950 transition-colors duration-300">
      <Toolbar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'custom',
        }}
        // Multi-select
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Meta"
        deleteKeyCode="Delete"
        onSelectionChange={handleSelectionChange}
        // Context menus
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        fitView
        className="bg-[#f3f4f6] dark:bg-gray-950 transition-colors duration-300"
      >
        <Background color={theme === 'dark' ? '#374151' : '#d1d5db'} gap={20} size={2} />
        <Controls className="dark:bg-gray-800 dark:border-gray-700 dark:fill-gray-300" />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sections={getContextMenuSections()}
          onClose={closeContextMenu}
        />
      )}

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedNodeIds.length}
        selectedNodeIds={selectedNodeIds}
        onClearSelection={() => setSelectedNodeIds([])}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <DiagramFlow />
    </ReactFlowProvider>
  );
}
