import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Download,
    Eye,
    History,
    Key,
    Loader2,
    RefreshCw,
    Search,
    ShieldCheck,
    UserPlus,
} from 'lucide-react';
import { AuditLogRecord, useAdminAuditLog } from '../hooks/useAdminOperations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui';
import { formatDateTime, formatNumber } from '../utils/format';
import { downloadCsv } from '../utils/exportCsv';

type SeverityFilter = 'all' | 'success' | 'warning' | 'failure';

const PAGE_SIZE = 50;

const RESOURCE_TYPES = ['listing', 'user', 'app', 'payout', 'campaign', 'sync', 'system', 'generated_code', 'app_submission'];

const getField = (event: AuditLogRecord, snake: keyof AuditLogRecord, camel: keyof AuditLogRecord) => (
    event[snake] || event[camel] || ''
);

/** Compact, human-readable one-line summary of a metadata object for table cells. */
const summarizeMetadata = (metadata?: Record<string, unknown> | null): string => {
    if (!metadata || typeof metadata !== 'object') return '';
    const keys = Object.keys(metadata);
    if (keys.length === 0) return '';
    const shown = keys.slice(0, 4).map((key) => {
        const value = metadata[key];
        const rendered = value == null ? '—' : typeof value === 'object' ? '{…}' : String(value);
        return `${key}: ${rendered}`;
    }).join(' · ');
    return keys.length > 4 ? `${shown} · +${keys.length - 4} more` : shown;
};

const formatLabel = (value?: string | null) => {
    if (!value) return 'Not provided';
    return value.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

const getSeverity = (event: AuditLogRecord): Exclude<SeverityFilter, 'all'> => {
    const action = String(event.action || '').toLowerCase();
    if (action.includes('reject') || action.includes('delete') || action.includes('failed') || action.includes('unauthorized')) {
        return 'failure';
    }
    if (action.includes('pause') || action.includes('warning') || action.includes('changes_requested') || action.includes('suspend')) {
        return 'warning';
    }
    return 'success';
};

const getStatusStyles = (severity: Exclude<SeverityFilter, 'all'>) => {
    switch (severity) {
        case 'success': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        case 'failure': return 'bg-destructive/10 text-destructive border-destructive/20';
        case 'warning': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        default: return 'bg-muted text-muted-foreground border-border';
    }
};

const getCategoryIcon = (resourceType?: string | null) => {
    switch (resourceType) {
        case 'payout':
        case 'campaign':
            return <DollarSign size={18} className="text-emerald-600" />;
        case 'user':
            return <UserPlus size={18} className="text-blue-600" />;
        case 'system':
        case 'sync':
            return <Key size={18} className="text-primary" />;
        default:
            return <ShieldCheck size={18} className="text-primary" />;
    }
};

export const AuditLogPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [actorId, setActorId] = useState('');
    const [action, setAction] = useState('');
    const [resourceType, setResourceType] = useState('');
    const [resourceId, setResourceId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [severity, setSeverity] = useState<SeverityFilter>('all');
    const [page, setPage] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState<AuditLogRecord | null>(null);

    // Ignore an inverted date range instead of querying the API with it.
    const invalidRange = Boolean(startDate && endDate && startDate > endDate);

    const filters = useMemo(() => ({
        actorId,
        action,
        resourceType,
        resourceId,
        startDate: invalidRange ? '' : startDate,
        endDate: invalidRange ? '' : endDate,
        page,
        limit: PAGE_SIZE,
    }), [action, actorId, endDate, invalidRange, page, resourceId, resourceType, startDate]);

    const { events, meta, isLoading, error, refetch } = useAdminAuditLog(filters);

    const total = meta?.total ?? events.length;
    const totalPages = meta?.total ? Math.ceil(meta.total / PAGE_SIZE) : 0;

    // Reset to the first page whenever a server-side filter changes.
    const resetPage = () => setPage(1);

    const filteredEvents = events.filter((event) => {
        const eventSeverity = getSeverity(event);
        const actor = String(getField(event, 'actor_email', 'actorEmail') || getField(event, 'actor_id', 'actorId'));
        const ipAddress = String(getField(event, 'ip_address', 'ipAddress'));
        const haystack = [
            event.id,
            event.action,
            actor,
            ipAddress,
            getField(event, 'resource_type', 'resourceType'),
            getField(event, 'resource_id', 'resourceId'),
        ].join(' ').toLowerCase();
        return (severity === 'all' || eventSeverity === severity)
            && (searchQuery.trim() === '' || haystack.includes(searchQuery.toLowerCase()));
    });

    const summary = filteredEvents.reduce((acc, event) => {
        acc[getSeverity(event)] += 1;
        return acc;
    }, { success: 0, warning: 0, failure: 0 });

    const handleExport = () => {
        downloadCsv(
            `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
            filteredEvents,
            [
                { header: 'id', accessor: (event) => event.id },
                { header: 'timestamp', accessor: (event) => event.timestamp || event.created_at || '' },
                { header: 'actor', accessor: (event) => String(getField(event, 'actor_email', 'actorEmail') || getField(event, 'actor_id', 'actorId')) },
                { header: 'role', accessor: (event) => String(getField(event, 'actor_role', 'actorRole')) },
                { header: 'action', accessor: (event) => event.action || '' },
                { header: 'resource_type', accessor: (event) => String(getField(event, 'resource_type', 'resourceType')) },
                { header: 'resource_id', accessor: (event) => String(getField(event, 'resource_id', 'resourceId')) },
                { header: 'severity', accessor: (event) => getSeverity(event) },
                { header: 'ip_address', accessor: (event) => String(getField(event, 'ip_address', 'ipAddress')) },
            ],
        );
    };

    return (
        <Layout>
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-primary font-black text-[10px] uppercase tracking-[0.2em] bg-primary/10 w-fit px-4 py-1.5 rounded-full border border-primary/20">
                            <ShieldCheck size={14} /> Immutable Audit Ledger
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                            System <span className="text-muted-foreground">Accountability</span>
                        </h1>
                        <p className="text-muted-foreground text-lg font-medium max-w-2xl leading-relaxed">
                            Read-only admin actions from the backend audit log. Filters query the API where supported, with severity applied locally.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleExport}
                            disabled={filteredEvents.length === 0}
                            className="px-6 py-3 bg-card border border-border text-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-muted transition-all disabled:opacity-50"
                        >
                            <Download size={18} /> Export CSV
                        </button>
                        <button
                            onClick={refetch}
                            className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all"
                        >
                            <RefreshCw size={18} /> Refresh Log
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Events', value: formatNumber(total), icon: History, tone: 'text-primary bg-primary/10' },
                        { label: 'Success · this page', value: formatNumber(summary.success), icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10' },
                        { label: 'Warnings · this page', value: formatNumber(summary.warning), icon: AlertTriangle, tone: 'text-amber-600 bg-amber-500/10' },
                        { label: 'Failures · this page', value: formatNumber(summary.failure), icon: Clock, tone: 'text-destructive bg-destructive/10' },
                    ].map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-card p-5 rounded-2xl border border-border flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${card.tone}`}>
                                    <Icon size={22} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{card.label}</p>
                                    <p className="text-2xl font-black text-foreground">{card.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3">
                        <AlertTriangle size={20} className="text-destructive flex-shrink-0" />
                        <p className="text-destructive text-sm font-medium">{error}</p>
                        <button onClick={refetch} className="ml-auto text-xs font-bold text-destructive hover:underline">Retry</button>
                    </div>
                )}

                <section className="bg-card rounded-3xl border border-border overflow-hidden">
                    <div className="p-6 border-b border-border space-y-5">
                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                            <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                                <History className="text-muted-foreground" size={28} />
                                Activity Ledger
                            </h2>
                            <div className="relative w-full lg:w-96 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search action, actor, resource, or IP..."
                                    aria-label="Search audit events"
                                    className="w-full pl-14 pr-6 py-4 bg-muted border border-border rounded-2xl focus:ring-4 focus:ring-accent/5 outline-none font-bold text-sm text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                            <input value={actorId} onChange={event => { setActorId(event.target.value); resetPage(); }} placeholder="Actor ID" aria-label="Filter by actor ID" className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground" />
                            <input value={action} onChange={event => { setAction(event.target.value); resetPage(); }} placeholder="Action" aria-label="Filter by action" className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground" />
                            <select value={resourceType} onChange={event => { setResourceType(event.target.value); resetPage(); }} aria-label="Filter by resource type" className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground">
                                <option value="">All resources</option>
                                {RESOURCE_TYPES.map(type => <option key={type} value={type}>{formatLabel(type)}</option>)}
                            </select>
                            <input value={resourceId} onChange={event => { setResourceId(event.target.value); resetPage(); }} placeholder="Resource ID" aria-label="Filter by resource ID" className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground" />
                            <input type="date" value={startDate} onChange={event => { setStartDate(event.target.value); resetPage(); }} aria-label="Start date" className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground" />
                            <input type="date" value={endDate} onChange={event => { setEndDate(event.target.value); resetPage(); }} aria-label="End date" className="px-4 py-3 bg-muted border border-border rounded-xl text-sm text-foreground" />
                        </div>

                        {invalidRange && (
                            <p className="text-xs font-bold text-amber-600">Start date must be on or before the end date — the date range is not applied.</p>
                        )}

                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {(['all', 'success', 'warning', 'failure'] as SeverityFilter[]).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setSeverity(filter)}
                                    aria-pressed={severity === filter}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${severity === filter ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted border border-border'}`}
                                >
                                    {formatLabel(filter)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Timestamp & ID</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resource</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Action</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actor / IP</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Severity</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                            <Loader2 size={34} className="mx-auto mb-3 animate-spin text-accent" />
                                            Loading audit events...
                                        </td>
                                    </tr>
                                ) : filteredEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                            <History size={42} className="mx-auto mb-4 opacity-30" />
                                            No audit events match the selected filters.
                                        </td>
                                    </tr>
                                ) : filteredEvents.map(event => {
                                    const resource = String(getField(event, 'resource_type', 'resourceType'));
                                    const eventSeverity = getSeverity(event);
                                    return (
                                        <tr key={event.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-6">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-foreground">{formatDateTime(event.timestamp || event.created_at)}</p>
                                                    <p className="text-[10px] font-black text-muted-foreground font-mono tracking-widest">{event.id}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-muted rounded-xl">
                                                        {getCategoryIcon(resource)}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-black text-foreground uppercase tracking-widest">{formatLabel(resource)}</span>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{String(getField(event, 'resource_id', 'resourceId') || 'No ID')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <p className="text-sm font-black text-foreground">{formatLabel(event.action)}</p>
                                                <p className="text-xs text-muted-foreground max-w-[280px] truncate font-mono">{summarizeMetadata(event.metadata) || '—'}</p>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-foreground opacity-80">{String(getField(event, 'actor_email', 'actorEmail') || getField(event, 'actor_id', 'actorId') || 'System')}</p>
                                                    <p className="text-[10px] font-black text-muted-foreground font-mono">{String(getField(event, 'ip_address', 'ipAddress') || 'No IP')}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(eventSeverity)}`}>
                                                    {eventSeverity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button
                                                    onClick={() => setSelectedEvent(event)}
                                                    className="p-3 bg-card border border-border rounded-2xl text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                                                    aria-label={`View audit event ${event.id}`}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 bg-muted/30 border-t border-border space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Showing <span className="text-foreground">{filteredEvents.length}</span> on this page · <span className="text-foreground">{formatNumber(total)}</span> total audit events
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Page {page}{totalPages ? ` of ${totalPages}` : ''}
                                </span>
                                <button
                                    onClick={() => setPage(current => Math.max(1, current - 1))}
                                    disabled={page <= 1 || isLoading}
                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-card border border-border text-foreground flex items-center gap-1 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                <button
                                    onClick={() => setPage(current => current + 1)}
                                    disabled={isLoading || page * PAGE_SIZE >= total}
                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-card border border-border text-foreground flex items-center gap-1 hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Severity is derived from each action and filtered on the loaded page. Audit records are read-only — changes must be made by the backend audit service.</p>
                    </div>
                </section>

                <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Audit Event Details</DialogTitle>
                            <DialogDescription className="font-mono">{selectedEvent?.id}</DialogDescription>
                        </DialogHeader>
                        <pre className="mt-5 max-h-[60vh] overflow-auto rounded-2xl bg-muted p-4 text-xs text-foreground whitespace-pre-wrap">
                            {selectedEvent ? JSON.stringify(selectedEvent, null, 2) : ''}
                        </pre>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
};
