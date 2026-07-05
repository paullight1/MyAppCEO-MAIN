import React from 'react';
import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => (
    <Layout>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-muted flex items-center justify-center">
                    <Search size={32} className="text-muted-foreground" />
                </div>
                <p className="text-primary text-[14px] font-semibold uppercase tracking-wide mb-2">404</p>
                <h1 className="text-foreground text-[32px] sm:text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] mb-4">
                    Page not found
                </h1>
                <p className="text-muted-foreground text-[15px] mb-8 max-w-xs mx-auto">
                    The page you are looking for may have been removed or the URL may be incorrect.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-[15px] font-normal hover:bg-primary/90 active:scale-[0.98] transition-all">
                        <ArrowLeft size={14} /> Go Home
                    </Link>
                    <Link to="/marketplace" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full text-[15px] font-normal hover:bg-secondary/80 active:scale-[0.98] transition-all">
                        Browse Marketplace
                    </Link>
                </div>
            </div>
        </div>
    </Layout>
);
