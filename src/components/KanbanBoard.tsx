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
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-auto">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 p-2 rounded-lg min-h-[120px] transition-colors ${isOver ? 'bg-primary/10 border-2 border-dashed border-primary/30' : 'bg-muted/30'}`}
      >
        {children}
      </div>
    </div>
  );
}

function SortableCard<T extends { id: string | number }>({ item, getId, renderCard }: { item: T; getId: (i: T) => string; renderCard: (i: T) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getId(item) });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any };
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
    // Check if dropped on a column
    const targetColumn = columns.find(c => c.id === overId);
    if (targetColumn) {
      onMove(active.id, targetColumn.id);
      return;
    }
    // Dropped on another card — find which column that card belongs to
    for (const col of columns) {
      if (col.items.some(i => getId(i) === overId)) {
        onMove(active.id, col.id);
        return;
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <DroppableColumn key={col.id} id={col.id} title={col.title} color={col.color} count={col.items.length}>
            <SortableContext items={col.items.map(i => getId(i))} strategy={verticalListSortingStrategy}>
              {col.items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Sem itens</p>
              )}
              {col.items.map(item => (
                <SortableCard key={getId(item)} item={item} getId={getId} renderCard={renderCard} />
              ))}
            </SortableContext>
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeItem && <div className="opacity-90 rotate-2 shadow-xl">{renderCard(activeItem)}</div>}
      </DragOverlay>
    </DndContext>
  );
}
