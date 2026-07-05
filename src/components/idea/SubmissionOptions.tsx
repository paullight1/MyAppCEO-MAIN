import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
    Rocket,
    Users,
    Save,
    X,
    CheckCircle2,
    ArrowRight,
    Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubmissionOptionsProps {
    isOpen: boolean;
    onClose: () => void;
    ideaId: string;
    ideaName: string;
}

type SubmissionOption = 'campaign' | 'developers' | 'save';

const SUBMISSION_OPTIONS = [
    {
        id: 'campaign' as SubmissionOption,
        title: 'Create Campaign',
        description: 'Start a crowdfunding campaign to raise funds for development',
        icon: Rocket,
        color: 'from-emerald-500 to-teal-600',
        borderColor: 'border-emerald-500/30',
        hoverBorder: 'hover:border-emerald-500/60',
    },
    {
        id: 'developers' as SubmissionOption,
        title: 'Find Developers',
        description: 'Post a job and connect with talented developers',
        icon: Users,
        color: 'from-blue-500 to-indigo-600',
        borderColor: 'border-blue-500/30',
        hoverBorder: 'hover:border-blue-500/60',
    },
    {
        id: 'save' as SubmissionOption,
        title: 'Save to Ideas',
        description: 'Continue working on this idea later',
        icon: Save,
        color: 'from-purple-500 to-pink-600',
        borderColor: 'border-purple-500/30',
        hoverBorder: 'hover:border-purple-500/60',
    },
];

export function SubmissionOptions({
    isOpen,
    onClose,
    ideaId,
    ideaName,
}: SubmissionOptionsProps) {
    const navigate = useNavigate();
    const [selectedOption, setSelectedOption] = useState<SubmissionOption | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleOptionSelect = async (option: SubmissionOption) => {
        setSelectedOption(option);
        setIsProcessing(true);

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 800));

        setIsProcessing(false);

        switch (option) {
            case 'campaign':
                navigate(`/campaigns/new?ideaId=${ideaId}`);
                break;
            case 'developers':
                navigate(`/developers?ideaId=${ideaId}`);
                break;
            case 'save':
                navigate(`/ideas/${ideaId}`);
                break;
        }

        onClose();
        setSelectedOption(null);
    };

    const handleClose = () => {
        setSelectedOption(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-foreground">
                        Your app is ready!
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-2">
                        "{ideaName}" has been created with PRD and designs. What would you like to do next?
                    </DialogDescription>
                </DialogHeader>

                <AnimatePresence mode="wait">
                    {isProcessing ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-8"
                        >
                            <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                            <p className="text-foreground font-medium">Processing...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid gap-4 mt-4"
                        >
                            {SUBMISSION_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = selectedOption === option.id;

                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        disabled={isProcessing}
                                        className={`
                                            relative p-5 rounded-xl border-2 bg-card text-left transition-all
                                            ${option.borderColor} ${option.hoverBorder}
                                            hover:shadow-lg hover:shadow-accent/5
                                            ${isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}
                                            group
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                                                w-12 h-12 rounded-xl bg-gradient-to-br ${option.color}
                                                flex items-center justify-center flex-shrink-0
                                                group-hover:scale-110 transition-transform
                                            `}>
                                                <Icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-foreground text-lg">
                                                    {option.title}
                                                </h3>
                                                <p className="text-muted-foreground text-sm mt-1">
                                                    {option.description}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-muted-foreground 
                                                group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex justify-center mt-6">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default SubmissionOptions;
