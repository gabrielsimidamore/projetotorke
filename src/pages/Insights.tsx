import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Loader2, Trash2, ZoomIn, ZoomOut, Maximize2, Link2, Link2Off,
  StickyNote, FolderKanban, Lightbulb, MessageSquare, Users, GripVertical,
  X, LayoutGrid, Network,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { COR_OPCOES } from '@/lib/constants';

const TIPO_CFG: Record<string, { label: string; icon: any; defaultColor: string }> = {
  nota:      { label: 'Nota',      icon: StickyNote,     defaultColor: '#f59e0b' },
  ideia:     { label: 'Ideia',     icon: Lightbulb,      defaultColor: '#6366f1' },
  projeto:   { label: 'Projeto',   icon: FolderKanban,   defaultColor: '#22c55e' },
  insight:   { label: 'Insight',   icon: Network,        defaultColor: '#a855f7' },
  interacao: { label: 'Interação', icon: MessageSquare,  defaultColor: '#3b82f6' },
  cliente:   { label: 'Cliente',   icon: Users,          defaultColor: '#06b6d4' },
};

type CanvasNode = {
  id: string;
  canvas_id: string;
  tipo: string;
  titulo: string;
  conteudo: string | null;
  cor: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  entidade_tipo: string | null;
  entidade_id: string | null;
};

type CanvasEdge = {
  id: string;
  canvas_id: string;
  source_id: string;
  target_id: string;
  label: string | null;
};

type Canvas = {
  id: string;
  titulo: string;
  descricao: string | null;
  projeto_id: string | null;
  created_at: string;
};

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

export default function Insights() {
  const { toast } = useToast();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<Canvas | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [projetos, setProjetos] = useState<{ id: string; nome: string; cor: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'canvas'>('list');

  // Canvas interaction state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [resizing, setResizing] = useState<{ nodeId: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null); // source node id
  const [selected, setSelected] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<CanvasNode | null>(null);

  // Dialogs
  const [canvasDialog, setCanvasDialog] = useState(false);
  const [nodeDialog, setNodeDialog] = useState(false);
  const [savingCanvas, setSavingCanvas] = useState(false);
  const [savingNode, setSavingNode] = useState(false);

  const [canvasForm, setCanvasForm] = useState({ titulo: '', descricao: '', projeto_id: '' });
  const [nodeForm, setNodeForm] = useState({ tipo: 'nota', titulo: '', conteudo: '', cor: '#f59e0b' });

  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('canvases').select('*').order('created_at', { ascending: false }),
      supabase.from('projetos').select('id, nome, cor').order('nome'),
    ]);
    setCanvases(c ?? []);
    setProjetos(p ?? []);
    setLoading(false);
  };

  const loadCanvas = async (canvas: Canvas) => {
    setActiveCanvas(canvas);
    setViewMode('canvas');
    const [{ data: n }, { data: e }] = await Promise.all([
      supabase.from('canvas_nodes').select('*').eq('canvas_id', canvas.id),
      supabase.from('canvas_edges').select('*').eq('canvas_id', canvas.id),
    ]);
    setNodes(n ?? []);
    setEdges(e ?? []);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => { fetchData(); }, []);

  // Canvas creation
  const handleCreateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCanvas(true);
    const { data, error } = await supabase.from('canvases').insert({
      titulo: canvasForm.titulo,
      descricao: canvasForm.descricao || null,
      projeto_id: canvasForm.projeto_id || null,
    }).select().single();
    setSavingCanvas(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Canvas criado!' });
    setCanvasDialog(false);
    setCanvasForm({ titulo: '', descricao: '', projeto_id: '' });
    await fetchData();
    if (data) loadCanvas(data);
  };

  const handleDeleteCanvas = async (id: string) => {
    await supabase.from('canvases').delete().eq('id', id);
    toast({ title: 'Canvas removido' });
    if (activeCanvas?.id === id) { setActiveCanvas(null); setViewMode('list'); }
    fetchData();
  };

  // Node creation
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCanvas) return;
    setSavingNode(true);

    // Place near center of visible area
    const cx = (canvasRef.current?.clientWidth ?? 800) / 2;
    const cy = (canvasRef.current?.clientHeight ?? 600) / 2;
    const worldX = (cx - pan.x) / zoom;
    const worldY = (cy - pan.y) / zoom;

    const { data, error } = await supabase.from('canvas_nodes').insert({
      canvas_id: activeCanvas.id,
      tipo: nodeForm.tipo,
      titulo: nodeForm.titulo,
      conteudo: nodeForm.conteudo || null,
      cor: nodeForm.cor,
      x: worldX - 100,
      y: worldY - 60,
      largura: 200,
      altura: 120,
    }).select().single();
    setSavingNode(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    if (data) setNodes(prev => [...prev, data]);
    setNodeDialog(false);
    setNodeForm({ tipo: 'nota', titulo: '', conteudo: '', cor: '#f59e0b' });
  };

  const handleDeleteNode = async (nodeId: string) => {
    await supabase.from('canvas_nodes').delete().eq('id', nodeId);
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source_id !== nodeId && e.target_id !== nodeId));
    if (selected === nodeId) setSelected(null);
  };

  // Drag node
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (connecting) {
      // Create edge
      handleConnect(nodeId);
      return;
    }
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelected(nodeId);
    setDragging({ nodeId, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y });
  };

  const handleConnect = async (targetId: string) => {
    if (!connecting || !activeCanvas || connecting === targetId) { setConnecting(null); return; }
    const already = edges.find(e => (e.source_id === connecting && e.target_id === targetId) || (e.source_id === targetId && e.target_id === connecting));
    if (already) { setConnecting(null); return; }
    const { data, error } = await supabase.from('canvas_edges').insert({
      canvas_id: activeCanvas.id, source_id: connecting, target_id: targetId, label: null,
    }).select().single();
    if (!error && data) setEdges(prev => [...prev, data]);
    setConnecting(null);
  };

  const handleDeleteEdge = async (edgeId: string) => {
    await supabase.from('canvas_edges').delete().eq('id', edgeId);
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      setNodes(prev => prev.map(n => n.id === dragging.nodeId ? { ...n, x: dragging.nodeX + dx, y: dragging.nodeY + dy } : n));
    } else if (resizing) {
      const dx = (e.clientX - resizing.startX) / zoom;
      const dy = (e.clientY - resizing.startY) / zoom;
      setNodes(prev => prev.map(n => n.id === resizing.nodeId
        ? { ...n, largura: Math.max(140, resizing.startW + dx), altura: Math.max(80, resizing.startH + dy) }
        : n));
    } else if (panning) {
      setPan({ x: panning.panX + (e.clientX - panning.startX), y: panning.panY + (e.clientY - panning.startY) });
    }
  }, [dragging, resizing, panning, zoom]);

  const handleMouseUp = useCallback(async () => {
    if (dragging) {
      const node = nodes.find(n => n.id === dragging.nodeId);
      if (node) await supabase.from('canvas_nodes').update({ x: node.x, y: node.y }).eq('id', node.id);
      setDragging(null);
    }
    if (resizing) {
      const node = nodes.find(n => n.id === resizing.nodeId);
      if (node) await supabase.from('canvas_nodes').update({ largura: node.largura, altura: node.altura }).eq('id', node.id);
      setResizing(null);
    }
    if (panning) setPanning(null);
  }, [dragging, resizing, panning, nodes]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts: Ctrl+C, Ctrl+V, Delete
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!activeCanvas) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const node = nodes.find(n => n.id === selected);
        if (node) { setClipboard(node); toast({ title: 'Nó copiado' }); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!clipboard) return;
        e.preventDefault();
        const { data, error } = await supabase.from('canvas_nodes').insert({
          canvas_id: activeCanvas.id, tipo: clipboard.tipo,
          titulo: clipboard.titulo ? clipboard.titulo + ' (cópia)' : '',
          conteudo: clipboard.conteudo, cor: clipboard.cor,
          x: clipboard.x + 24, y: clipboard.y + 24,
          largura: clipboard.largura, altura: clipboard.altura,
        }).select().single();
        if (!error && data) { setNodes(prev => [...prev, data]); setSelected(data.id); }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        await handleDeleteNode(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, clipboard, activeCanvas, nodes]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && !connecting)) {
      setSelected(null);
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * delta)));
  };

  const fitView = () => {
    if (nodes.length === 0) { setZoom(1); setPan({ x: 0, y: 0 }); return; }
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + n.largura));
    const maxY = Math.max(...nodes.map(n => n.y + n.altura));
    const cw = canvasRef.current?.clientWidth ?? 800;
    const ch = canvasRef.current?.clientHeight ?? 600;
    const fw = cw / (maxX - minX + 100);
    const fh = ch / (maxY - minY + 100);
    const newZoom = Math.min(fw, fh, MAX_ZOOM);
    setZoom(newZoom);
    setPan({ x: -(minX - 50) * newZoom, y: -(minY - 50) * newZoom });
  };

  // Compute edge midpoints for SVG rendering
  const getNodeCenter = (nodeId: string) => {
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return { x: 0, y: 0 };
    return { x: n.x + n.largura / 2, y: n.y + n.altura / 2 };
  };

  // ─── LIST VIEW ───
  if (viewMode === 'list') {
    return (
      <Layout>
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Insights & Canvas</h1>
              <p className="text-sm text-muted-foreground">Quadros visuais para conectar ideias, projetos e insights</p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setCanvasDialog(true)}>
              <Plus className="w-3.5 h-3.5" />Novo Canvas
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : canvases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Network className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Nenhum canvas ainda</p>
                <p className="text-xs mt-1">Crie um canvas para conectar ideias visualmente como no Miro</p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setCanvasDialog(true)}>
                <Plus className="w-3.5 h-3.5" />Criar primeiro canvas
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {canvases.map(canvas => {
                const proj = projetos.find(p => p.id === canvas.projeto_id);
                return (
                  <div
                    key={canvas.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div
                      className="h-28 flex items-center justify-center relative"
                      style={{ background: proj ? `linear-gradient(135deg, ${proj.cor || '#6366f1'}22, ${proj.cor || '#6366f1'}44)` : 'linear-gradient(135deg, #6366f122, #a855f744)' }}
                      onClick={() => loadCanvas(canvas)}
                    >
                      <Network className="w-10 h-10 text-primary/30" />
                      {proj && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: proj.cor || '#6366f1' }}>
                          {proj.nome}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => loadCanvas(canvas)}>
                        <p className="text-sm font-semibold text-foreground truncate">{canvas.titulo}</p>
                        {canvas.descricao && <p className="text-xs text-muted-foreground truncate">{canvas.descricao}</p>}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteCanvas(canvas.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* New canvas card */}
              <div
                onClick={() => setCanvasDialog(true)}
                className="border-2 border-dashed border-border rounded-2xl h-[160px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium">Novo canvas</p>
              </div>
            </div>
          )}
        </div>

        {/* Create canvas dialog */}
        <Dialog open={canvasDialog} onOpenChange={setCanvasDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Canvas</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateCanvas} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Canvas *</Label>
                <Input value={canvasForm.titulo} onChange={e => setCanvasForm({ ...canvasForm, titulo: e.target.value })} required placeholder="Ex: Brainstorm campanha Q2" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={canvasForm.descricao} onChange={e => setCanvasForm({ ...canvasForm, descricao: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" />Vincular Projeto</Label>
                <Select value={canvasForm.projeto_id} onValueChange={v => setCanvasForm({ ...canvasForm, projeto_id: v === '__none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum projeto (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Nenhum projeto</SelectItem>
                    {projetos.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.cor || '#6366f1' }} />
                          {p.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={savingCanvas}>
                {savingCanvas && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Canvas
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // ─── CANVAS VIEW ───
  return (
    <Layout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className="gap-1.5 text-xs">
              <LayoutGrid className="w-3.5 h-3.5" />Canvases
            </Button>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="text-sm font-semibold text-foreground">{activeCanvas?.titulo}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Connect mode */}
            <Button
              variant={connecting ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => setConnecting(connecting ? null : 'select')}
              title="Modo conectar: clique em dois nós para ligá-los"
            >
              {connecting ? <Link2Off className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              {connecting ? 'Cancelar' : 'Conectar'}
            </Button>

            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => setNodeDialog(true)}>
              <Plus className="w-3.5 h-3.5" />Nó
            </Button>

            <div className="flex items-center gap-0.5 border border-border rounded-md">
              <button className="p-1.5 hover:bg-accent text-muted-foreground rounded-l-md" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.1))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs px-2 text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button className="p-1.5 hover:bg-accent text-muted-foreground rounded-r-md" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.1))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            <button className="p-1.5 hover:bg-accent text-muted-foreground rounded-md border border-border" onClick={fitView} title="Ajustar tela">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status bar when connecting */}
        {connecting && connecting !== 'select' && (
          <div className="bg-primary text-primary-foreground text-xs px-4 py-1.5 text-center shrink-0">
            Nó de origem selecionado. Clique em outro nó para criar a conexão.
          </div>
        )}
        {connecting === 'select' && (
          <div className="bg-primary/10 text-primary text-xs px-4 py-1.5 text-center border-b border-primary/20 shrink-0">
            Clique no nó de <strong>origem</strong> da conexão.
          </div>
        )}

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative select-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            cursor: connecting ? 'crosshair' : panning ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
        >
          {/* SVG for edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
          >
            <defs>
              <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5"
                markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" fillOpacity="0.8" />
              </marker>
            </defs>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {edges.map(edge => {
                const s = getNodeCenter(edge.source_id);
                const t = getNodeCenter(edge.target_id);
                const dx = t.x - s.x;
                const cp1x = s.x + dx * 0.4;
                const cp2x = t.x - dx * 0.4;
                const d = `M ${s.x} ${s.y} C ${cp1x} ${s.y}, ${cp2x} ${t.y}, ${t.x} ${t.y}`;
                const mx = (s.x + cp1x + cp2x + t.x) / 4;
                const my = (s.y + s.y + t.y + t.y) / 4;
                return (
                  <g key={edge.id} className="pointer-events-auto">
                    <path
                      d={d}
                      stroke="hsl(var(--primary))"
                      strokeWidth={1.5 / zoom}
                      strokeOpacity={0.75}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                    {/* Delete edge button at midpoint */}
                    <circle
                      cx={mx} cy={my} r={8 / zoom}
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--border))"
                      strokeWidth={1 / zoom}
                      className="cursor-pointer hover:fill-destructive/20"
                      onClick={() => handleDeleteEdge(edge.id)}
                    />
                    <text
                      x={mx} y={my}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={8 / zoom}
                      fill="hsl(var(--muted-foreground))"
                      className="pointer-events-none"
                    >×</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Nodes */}
          <div
            className="absolute inset-0"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          >
            {nodes.map(node => {
              const cfg = TIPO_CFG[node.tipo] ?? TIPO_CFG.nota;
              const Icon = cfg.icon;
              const isSelected = selected === node.id;
              const isConnectSource = connecting === node.id;
              return (
                <div
                  key={node.id}
                  className={`absolute rounded-xl border-2 shadow-md transition-shadow group ${isSelected ? 'shadow-lg' : 'shadow-sm hover:shadow-md'} ${isConnectSource ? 'ring-2 ring-primary' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.largura,
                    minHeight: node.altura,
                    borderColor: isSelected ? node.cor : `${node.cor}80`,
                    backgroundColor: `${node.cor}12`,
                    cursor: connecting ? 'pointer' : dragging?.nodeId === node.id ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={e => {
                    if (connecting === 'select') {
                      setConnecting(node.id);
                    } else {
                      handleNodeMouseDown(e, node.id);
                    }
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5"
                    style={{ borderBottom: `1px solid ${node.cor}30` }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: node.cor }} />
                    <span className="text-xs font-semibold truncate flex-1" style={{ color: node.cor }}>
                      {node.titulo || cfg.label}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onMouseDown={e => { e.stopPropagation(); handleDeleteNode(node.id); }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Content */}
                  {node.conteudo && (
                    <p className="text-xs text-foreground/80 px-2.5 py-2 leading-relaxed whitespace-pre-wrap">{node.conteudo}</p>
                  )}
                  {/* Resize handle — bottom-right corner */}
                  <div
                    className="absolute bottom-0 right-0 w-5 h-5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                    style={{ cursor: 'se-resize' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      const n = nodes.find(x => x.id === node.id)!;
                      setResizing({ nodeId: node.id, startX: e.clientX, startY: e.clientY, startW: n.largura, startH: n.altura });
                    }}
                  >
                    <svg viewBox="0 0 10 10" className="w-5 h-5 text-muted-foreground">
                      <line x1="4" y1="10" x2="10" y2="4" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="7" y1="10" x2="10" y2="7" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground pointer-events-none">
              <Network className="w-12 h-12 text-muted-foreground/20" />
              <p className="text-sm font-medium">Canvas vazio</p>
              <p className="text-xs">Clique em "+ Nó" para adicionar elementos e conecte-os clicando em "Conectar"</p>
            </div>
          )}
        </div>
      </div>

      {/* Create node dialog */}
      <Dialog open={nodeDialog} onOpenChange={setNodeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Nó</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateNode} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(TIPO_CFG).map(([tipo, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setNodeForm({ ...nodeForm, tipo, cor: cfg.defaultColor })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs border transition-all ${nodeForm.tipo === tipo ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-muted'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input value={nodeForm.titulo} onChange={e => setNodeForm({ ...nodeForm, titulo: e.target.value })} placeholder="Título do nó..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Conteúdo</Label>
              <Textarea value={nodeForm.conteudo} onChange={e => setNodeForm({ ...nodeForm, conteudo: e.target.value })} rows={3} placeholder="Descreva a ideia, insight ou observação..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor</Label>
              <div className="flex gap-1.5 flex-wrap">
                {COR_OPCOES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNodeForm({ ...nodeForm, cor: c })}
                    className={`w-6 h-6 rounded-full transition-all ${nodeForm.cor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={savingNode}>
              {savingNode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Adicionar ao Canvas
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
