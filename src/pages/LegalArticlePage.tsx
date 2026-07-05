import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { Layout } from '../components/Layout';

type LegalHighlight = {
    title: string;
    description: string;
};

type LegalSection = {
    title: string;
    body: React.ReactNode;
    bullets?: React.ReactNode[];
};

type LegalArticlePageProps = {
    eyebrow: string;
    title: string;
    description: string;
    highlights: LegalHighlight[];
    sections: LegalSection[];
};

export const LegalArticlePage: React.FC<LegalArticlePageProps> = ({
    eyebrow,
    title,
    description,
    highlights,
    sections,
}) => {
    return (
        <Layout>
            <div className="relative overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] transition-colors duration-300 dark:bg-black dark:text-white">
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#0071e3]/10 via-transparent to-transparent blur-3xl" />

                <div className="relative mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">
                    <div className="max-w-3xl space-y-6">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#1d1d1f]/10 bg-white/70 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#1d1d1f]/70 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                            <ShieldCheck size={14} />
                            {eyebrow}
                        </span>

                        <div className="space-y-4">
                            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0071e3]">
                                Active policy
                            </p>
                            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                                {title}
                            </h1>
                            <p className="max-w-3xl text-lg leading-8 text-[#1d1d1f]/68 dark:text-white/68">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {highlights.map((item) => (
                            <div
                                key={item.title}
                                className="rounded-[28px] border border-[#1d1d1f]/10 bg-white/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.6)] backdrop-blur transition-colors dark:border-white/10 dark:bg-white/5"
                            >
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
                                    <FileText size={18} />
                                </div>
                                <h2 className="text-[15px] font-semibold">{item.title}</h2>
                                <p className="mt-2 text-[14px] leading-6 text-[#1d1d1f]/65 dark:text-white/65">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 space-y-5">
                        {sections.map((section) => (
                            <section
                                key={section.title}
                                className="rounded-[32px] border border-[#1d1d1f]/10 bg-white/90 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] backdrop-blur transition-colors dark:border-white/10 dark:bg-white/5 sm:p-8"
                            >
                                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                                    {section.title}
                                </h2>

                                <div className="mt-4 space-y-4 text-[15px] leading-7 text-[#1d1d1f]/75 dark:text-white/75">
                                    <div>{section.body}</div>

                                    {section.bullets && section.bullets.length > 0 && (
                                        <ul className="grid gap-3 sm:grid-cols-2">
                                            {section.bullets.map((bullet, index) => (
                                                <li
                                                    key={index}
                                                    className="flex gap-3 rounded-2xl bg-[#f5f5f7] p-4 dark:bg-white/5"
                                                >
                                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0071e3]" />
                                                    <span>{bullet}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="mt-12 rounded-[32px] border border-[#1d1d1f]/10 bg-[#1d1d1f] px-6 py-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] sm:px-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                                    <ShieldCheck size={13} />
                                    Need help?
                                </div>
                                <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                                    Questions about this policy?
                                </h2>
                                <p className="text-[15px] leading-7 text-white/70">
                                    Use support if you need help understanding an account, legal, privacy, or investment question.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:w-56">
                                <Link
                                    to="/support"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:bg-white/90"
                                >
                                    Contact Support
                                    <ArrowRight size={16} />
                                </Link>
                                <Link
                                    to="/docs"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                    Open Documentation
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
