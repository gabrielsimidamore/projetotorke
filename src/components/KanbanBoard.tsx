import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

export type KanbanColumn<T> = {
  id: string;
  title: string;
  color: string;
  items: T[];
};

type KanbanProps<T extends { id: string | number }> = {
  columns: KanbanColumn<T>[];
  onMove: (itemId: string | number, newColumnId: string) => void;
  renderCard: (item: T) => React.ReactNode;
  getId: (item: T) => string;
};

function DroppableColumn({ id, title, color, count, children }: { id: string; title: string; color: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{title}</h3>
        <span className="ml-auto" style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 999 }}>{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 p-2 rounded-xl min-h-[120px] transition-all duration-200"
        style={{
          background: isOver ? 'rgba(245,197,24,0.04)' : 'rgba(255,255,255,0.02)',
          border: isOver ? '2px dashed rgba(245,197,24,0.3)' : '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SortableCard<T extends { id: string | number }>({ item, getId, renderCard }: { item: T; getId: (i: T) => string; renderCard: (i: T) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getId(item) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {renderCard(item)}
    </div>
  );
}

export function KanbanBoard<T extends { id: string | number }>({ columns, onMove, renderCard, getId }: KanbanProps<T>) {
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const allItems = columns.flatMap(c => c.items);

  const handleDragStart = (event: DragStartEvent) => {
    const item = allItems.find(i => getId(i) === String(event.active.id));
    if (item) setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const targetColumn = columns.find(c => c.id === overId);
    if (targetColumn) {
      onMove(active.id, targetColumn.id);
      return;
    }
    for (const col of columns) {
      if (col.items.some(i => getId(i) === overId)) {
        onMove(active.id, col.id);
        return;
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(col => (
          <DroppableColumn key={col.id} id={col.id} title={col.title} color={col.color} count={col.items.length}>
            <SortableContext items={col.items.map(i => getId(i))} strategy={verticalListSortingStrategy}>
              {col.items.length === 0 && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '24px 0' }}>Sem itens</p>
              )}
              {col.items.map(item => (
                <SortableCard key={getId(item)} item={item} getId={getId} renderCard={renderCard} />
              ))}
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeItem && (
          <div style={{ opacity: 0.92, transform: 'rotate(1.5deg) scale(1.03)', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.4))' }}>
            {renderCard(activeItem)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
