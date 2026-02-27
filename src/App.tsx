import { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from './store/useDiagramStore';
import { TableNode } from './components/TableNode';
import { Toolbar } from './components/Toolbar';
import { RelationshipEdge } from './components/RelationshipEdge';

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  custom: RelationshipEdge,
};

function DiagramFlow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setDiagram, theme } = useDiagramStore();
  const [isLoaded, setIsLoaded] = useState(false);

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
      // Default initial state
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
      }, 500); // debounce save
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
        fitView
        className="bg-[#f3f4f6] dark:bg-gray-950 transition-colors duration-300"
      >
        <Background color={theme === 'dark' ? '#374151' : '#d1d5db'} gap={20} size={2} />
        <Controls className="dark:bg-gray-800 dark:border-gray-700 dark:fill-gray-300" />
        {/* <MiniMap
          nodeStrokeWidth={3}
          nodeColor={theme === 'dark' ? '#374151' : '#1f2937'}
          maskColor={theme === 'dark' ? 'rgba(3, 7, 18, 0.7)' : 'rgba(243, 244, 246, 0.7)'}
          style={{ backgroundColor: theme === 'dark' ? '#111827' : '#f3f4f6' }}
          className="dark:border-gray-800 transition-colors duration-300"
        /> */}
      </ReactFlow>
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
