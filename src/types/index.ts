export type FieldType = 'int' | 'string' | 'number' | 'boolean' | 'date' | 'decimal';
export type RelationshipType = '1:1' | '1:M' | 'M:1' | 'M:M';

export interface Field {
    id: string;
    name: string;
    type: FieldType;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
}

export interface TableData extends Record<string, unknown> {
    name: string;
    fields: Field[];
}

export interface Template {
    id: string;
    name: string;
    fields: Omit<Field, 'id'>[];
}

// Diagram JSON format exactly as requested by user
export interface RelationshipJSON {
    id: string;
    source: string;
    sourceField: string;
    target: string;
    targetField: string;
    type: RelationshipType | string;
    waypointX?: number;
    waypointY?: number;
}

export interface EdgeData extends Record<string, unknown> {
    label: string;
    waypointX?: number;
    waypointY?: number;
}

export interface DiagramJSON {
    metadata: {
        projectName: string;
        version: string;
    };
    tables: {
        id: string;
        name: string;
        position: { x: number; y: number };
        fields: Field[];
    }[];
    relationships: RelationshipJSON[];
}
