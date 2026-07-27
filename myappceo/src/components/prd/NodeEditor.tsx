import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { PRDNode, NodeStatus } from './types';

interface NodeEditorProps {
    node: PRDNode;
    onSave: (label: string, description: string, status: NodeStatus) => void;
    onClose: () => void;
}

const statusOptions: { value: NodeStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-gray-400' },
    { value: 'needs_review', label: 'Needs Review', color: 'bg-yellow-500' },
    { value: 'approved', label: 'Approved', color: 'bg-green-500' }
];

export function NodeEditor({ node, onSave, onClose }: NodeEditorProps) {
    const [label, setLabel] = useState(node.label);
    const [description, setDescription] = useState(node.description || '');
    const [status, setStatus] = useState<NodeStatus>(node.status);

    const handleSave = () => {
        if (label.trim()) {
            onSave(label.trim(), description, status);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-4 w-80">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Edit Node</h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Label</label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
                        placeholder="Add detailed description..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <div className="flex gap-2">
                        {statusOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setStatus(opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all
                                    ${status === opt.value 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 
                               text-white py-2 rounded-lg transition-colors"
                >
                    <Save size={18} />
                    Save Changes
                </button>
            </div>
        </div>
    );
}