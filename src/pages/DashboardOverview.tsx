import { useDashboardData } from '@/hooks/useDashboardData';
import type { SchlaglochMelden } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SchlaglochMeldenDialog } from '@/components/dialogs/SchlaglochMeldenDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconMapPin, IconPhoto, IconAlertTriangle,
  IconCircleCheck, IconPencil, IconTrash, IconFilter,
  IconX, IconRoad
} from '@tabler/icons-react';

const APPGROUP_ID = '6a02bdc65053cf8234a6bd0a';
const REPAIR_ENDPOINT = '/claude/build/repair';

type SchwereFilter = 'alle' | 'gering' | 'mittel' | 'hoch';

const SCHWEREGRAD_CONFIG = {
  gering: {
    label: 'Gering',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotColor: 'bg-yellow-400',
    cardBorder: 'border-l-yellow-400',
  },
  mittel: {
    label: 'Mittel',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    dotColor: 'bg-orange-400',
    cardBorder: 'border-l-orange-400',
  },
  hoch: {
    label: 'Hoch',
    color: 'bg-red-100 text-red-800 border-red-200',
    dotColor: 'bg-red-500',
    cardBorder: 'border-l-red-500',
  },
};

export default function DashboardOverview() {
  const { schlaglochMelden, loading, error, fetchAll } = useDashboardData();

  const [filter, setFilter] = useState<SchwereFilter>('alle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SchlaglochMelden | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchlaglochMelden | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const gering = schlaglochMelden.filter(r => r.fields.schweregrad?.key === 'gering').length;
    const mittel = schlaglochMelden.filter(r => r.fields.schweregrad?.key === 'mittel').length;
    const hoch = schlaglochMelden.filter(r => r.fields.schweregrad?.key === 'hoch').length;
    return { gering, mittel, hoch, gesamt: schlaglochMelden.length };
  }, [schlaglochMelden]);

  const filtered = useMemo(() => {
    if (filter === 'alle') return [...schlaglochMelden].sort((a, b) => {
      const order = { hoch: 0, mittel: 1, gering: 2, undefined: 3 };
      const ak = (a.fields.schweregrad?.key ?? 'undefined') as keyof typeof order;
      const bk = (b.fields.schweregrad?.key ?? 'undefined') as keyof typeof order;
      return (order[ak] ?? 3) - (order[bk] ?? 3);
    });
    return schlaglochMelden.filter(r => r.fields.schweregrad?.key === filter);
  }, [schlaglochMelden, filter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchlaglochMeldenEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schlagloch-Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle gemeldeten Straßenschäden im Überblick</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Schlagloch melden
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(counts.gesamt)}
          description="Meldungen"
          icon={<IconRoad size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gefährlich"
          value={String(counts.hoch)}
          description="Hoher Schweregrad"
          icon={<IconAlertTriangle size={18} className="text-red-500" />}
        />
        <StatCard
          title="Deutlich"
          value={String(counts.mittel)}
          description="Mittlerer Schweregrad"
          icon={<IconAlertCircle size={18} className="text-orange-500" />}
        />
        <StatCard
          title="Gering"
          value={String(counts.gering)}
          description="Kleiner Schaden"
          icon={<IconCircleCheck size={18} className="text-yellow-500" />}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <IconFilter size={14} className="text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground mr-1">Filter:</span>
        {(['alle', 'hoch', 'mittel', 'gering'] as SchwereFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all border ${
              filter === f
                ? f === 'alle'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : f === 'hoch'
                    ? 'bg-red-500 text-white border-red-500'
                    : f === 'mittel'
                      ? 'bg-orange-400 text-white border-orange-400'
                      : 'bg-yellow-400 text-white border-yellow-400'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {f === 'alle' ? 'Alle' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'alle' && (
              <span className="ml-1.5 opacity-80">
                {f === 'hoch' ? counts.hoch : f === 'mittel' ? counts.mittel : counts.gering}
              </span>
            )}
          </button>
        ))}
        {filter !== 'alle' && (
          <button onClick={() => setFilter('alle')} className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* Meldungen List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <IconRoad size={28} className="text-muted-foreground" stroke={1.5} />
          </div>
          <p className="text-muted-foreground text-sm">Keine Meldungen vorhanden</p>
          <Button variant="outline" size="sm" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
            <IconPlus size={14} className="mr-1" /> Erste Meldung erfassen
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(record => {
            const sg = record.fields.schweregrad?.key as keyof typeof SCHWEREGRAD_CONFIG | undefined;
            const cfg = sg ? SCHWEREGRAD_CONFIG[sg] : null;
            const isExpanded = expandedId === record.record_id;

            return (
              <div
                key={record.record_id}
                className={`rounded-2xl bg-card shadow-sm border-l-4 overflow-hidden transition-shadow hover:shadow-md ${
                  cfg ? cfg.cardBorder : 'border-l-border'
                }`}
              >
                {/* Card Header */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : record.record_id)}
                >
                  {/* Foto Thumbnail */}
                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                    {record.fields.foto ? (
                      <img
                        src={record.fields.foto}
                        alt="Schlagloch"
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <IconPhoto size={22} className="text-muted-foreground" stroke={1.5} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cfg && (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                          {cfg.label}
                        </span>
                      )}
                      {!cfg && (
                        <Badge variant="secondary" className="text-xs">Unbekannt</Badge>
                      )}
                      {record.fields.meldedatum && (
                        <span className="text-xs text-muted-foreground">{formatDate(record.fields.meldedatum)}</span>
                      )}
                    </div>
                    {record.fields.standort?.info && (
                      <div className="flex items-center gap-1 mt-1 min-w-0">
                        <IconMapPin size={12} className="shrink-0 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate">{record.fields.standort.info}</span>
                      </div>
                    )}
                    {!record.fields.standort?.info && record.fields.standort && (
                      <div className="flex items-center gap-1 mt-1">
                        <IconMapPin size={12} className="shrink-0 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {record.fields.standort.lat?.toFixed(5)}, {record.fields.standort.long?.toFixed(5)}
                        </span>
                      </div>
                    )}
                    {record.fields.beschreibung && (
                      <p className={`text-sm text-foreground mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {record.fields.beschreibung}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditRecord(record); setDialogOpen(true); }}
                    >
                      <IconPencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(record)}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(record.fields.melder_vorname || record.fields.melder_nachname) && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Gemeldet von</p>
                        <p className="text-sm font-medium">
                          {[record.fields.melder_vorname, record.fields.melder_nachname].filter(Boolean).join(' ')}
                        </p>
                      </div>
                    )}
                    {record.fields.melder_email && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">E-Mail</p>
                        <a href={`mailto:${record.fields.melder_email}`} className="text-sm text-primary hover:underline truncate block">
                          {record.fields.melder_email}
                        </a>
                      </div>
                    )}
                    {record.fields.melder_telefon && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Telefon</p>
                        <a href={`tel:${record.fields.melder_telefon}`} className="text-sm text-primary hover:underline">
                          {record.fields.melder_telefon}
                        </a>
                      </div>
                    )}
                    {record.fields.standort && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">GPS-Koordinaten</p>
                        <p className="text-sm font-mono">
                          {record.fields.standort.lat?.toFixed(6)}, {record.fields.standort.long?.toFixed(6)}
                        </p>
                      </div>
                    )}
                    {record.fields.meldedatum && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Meldedatum</p>
                        <p className="text-sm">{formatDate(record.fields.meldedatum)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <SchlaglochMeldenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateSchlaglochMeldenEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createSchlaglochMeldenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['SchlaglochMelden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SchlaglochMelden']}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Meldung löschen"
        description="Soll diese Meldung wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
