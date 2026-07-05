import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AIChat } from '../components/AIChat';
import {
    HelpCircle,
    Mail,
    Plus,
    Minus,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Inbox,
} from 'lucide-react';
import { Button, Select, FormField, EmptyState, LoadingState, ErrorState } from '../components/ui';
import { formatDateTime } from '../utils/format';
import { SUPPORT_CATEGORIES, SupportPriority, SupportTicket, useSupport } from '../hooks/useSupport';

const FAQS = [
    { q: "How do I list my app for group investment?", a: "Go to your 'Create New App' wizard and select 'Group Investment' as the listing type. You can set your target raise and equity available there." },
    { q: "What is the platform commission?", a: "We take a flat 5% on outright sales and a 2.5% facilitation fee on successful stake offerings." },
    { q: "How are creators paid?", a: "Payments are held in our secure Escrow system and released only after you approve the content submission." }
];

const PRIORITY_OPTIONS: { value: SupportPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export const SupportPage: React.FC = () => {
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [ticketsError, setTicketsError] = useState<string | null>(null);
    const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
    const [priority, setPriority] = useState<SupportPriority>('normal');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const { createTicket, getTickets, isLoading, error } = useSupport();

    const isMountedRef = useRef(true);
    useEffect(() => () => { isMountedRef.current = false; }, []);

    const loadTickets = useCallback(async () => {
        setTicketsLoading(true);
        setTicketsError(null);
        const result = await getTickets();
        if (!isMountedRef.current) return;
        if (result === null) {
            setTicketsError('We could not load your recent tickets. Please try again.');
        } else {
            const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
            setTickets(data);
        }
        setTicketsLoading(false);
    }, [getTickets]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const handleSubmitTicket = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);
        const result = await createTicket({ category, priority, subject, message });
        const ticket = result && 'data' in result ? result.data : result;
        if (ticket) {
            setTickets(prev => [ticket as SupportTicket, ...prev]);
            setSubject('');
            setMessage('');
            setSubmitSuccess(true);
        } else {
            setSubmitError(error || 'Unable to create support ticket');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">CEO Support Suite</h1>
                    <p className="text-muted-foreground font-medium">Get instant help from our AI or open a priority ticket with our human team.</p>
                </div>

                {(error || submitError) && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-300 flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5" />
                        <span>{submitError || error}</span>
                    </div>
                )}

                {submitSuccess && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
                        <CheckCircle2 size={18} />
                        Support ticket created.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 1. Talk with AI — real, wired-up assistant */}
                    <div className="lg:col-span-2">
                        <div className="h-[600px]">
                            <AIChat contextType="general" />
                        </div>
                    </div>

                    {/* 2. FAQ & Support Links */}
                    <div className="space-y-8">
                        <div className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <HelpCircle size={20} className="text-accent" />
                                Common Questions
                            </h3>
                            <div className="space-y-3">
                                {FAQS.map((faq, i) => (
                                    <div key={i} className="border-b border-border last:border-0 pb-3">
                                        <button
                                            onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                                            className="w-full flex justify-between items-center text-left py-2 group"
                                        >
                                            <span className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">{faq.q}</span>
                                            {activeFaq === i ? <Minus size={16} className="text-muted-foreground" /> : <Plus size={16} className="text-muted-foreground" />}
                                        </button>
                                        {activeFaq === i && (
                                            <div className="p-4 bg-muted rounded-2xl mt-2 animate-in slide-in-from-top-2 duration-300">
                                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{faq.a}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-accent to-accent/80 p-8 rounded-3xl text-accent-foreground shadow-xl shadow-accent/20 space-y-6">
                            <h3 className="text-xl font-bold">Priority Support</h3>
                            <p className="opacity-90 text-sm leading-relaxed">As a verified CEO, you have access to 24/7 human support for financial and asset transfer issues.</p>
                            <form onSubmit={handleSubmitTicket} className="space-y-3">
                                <Select
                                    aria-label="Support category"
                                    value={category}
                                    onValueChange={setCategory}
                                    options={SUPPORT_CATEGORIES.map(item => ({ value: item, label: item }))}
                                    size="sm"
                                />
                                <Select
                                    aria-label="Priority"
                                    value={priority}
                                    onValueChange={(value) => setPriority(value as SupportPriority)}
                                    options={PRIORITY_OPTIONS}
                                    size="sm"
                                />
                                <FormField label="Subject" hideLabel>
                                    {(field) => (
                                        <input
                                            {...field}
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            placeholder="Subject"
                                            className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30"
                                        />
                                    )}
                                </FormField>
                                <FormField label="Describe the issue" hideLabel>
                                    {(field) => (
                                        <textarea
                                            {...field}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Describe the issue"
                                            rows={4}
                                            className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                                        />
                                    )}
                                </FormField>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    size="lg"
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                                    Open Ticket
                                </Button>
                            </form>
                        </div>

                        <div className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-4">
                            <h3 className="text-xl font-bold text-foreground">Recent Tickets</h3>
                            {ticketsLoading ? (
                                <LoadingState
                                    variant="skeleton"
                                    rows={3}
                                    title="Loading your tickets"
                                    className="border-0 bg-transparent p-0"
                                />
                            ) : ticketsError ? (
                                <ErrorState
                                    title="Couldn't load tickets"
                                    description={ticketsError}
                                    action={{ label: 'Retry', onClick: loadTickets }}
                                    className="border-0 bg-transparent p-0 shadow-none"
                                />
                            ) : tickets.length === 0 ? (
                                <EmptyState
                                    icon={Inbox}
                                    size="sm"
                                    title="No tickets yet"
                                    description="Open a priority ticket above and it will appear here with live SLA tracking."
                                    className="border-0 bg-transparent p-0 shadow-none"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {tickets.slice(0, 4).map(ticket => (
                                        <div key={ticket.id} className="rounded-2xl bg-muted p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm font-bold text-foreground truncate">{ticket.subject}</p>
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground">{ticket.status}</span>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">{ticket.category} · {ticket.priority}</p>
                                            {ticket.slaDueAt && <p className="mt-1 text-xs text-muted-foreground">SLA: {formatDateTime(ticket.slaDueAt)}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
