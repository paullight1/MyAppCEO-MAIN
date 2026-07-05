import React, { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Checkbox, Radio, Toggle, Select } from '../components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';

export const ThemeTestPage: React.FC = () => {
    const [checkboxState, setCheckboxState] = useState(false);
    const [radioValue, setRadioValue] = useState('option1');
    const [toggleState, setToggleState] = useState(false);
    const [selectValue, setSelectValue] = useState('');

    const categoryOptions = [
        { value: 'mobile_app', label: 'Mobile App' },
        { value: 'web_app', label: 'Web App' },
        { value: 'game', label: 'Game' },
        { value: 'saas', label: 'SaaS' },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-8 space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Theme Engine Test</h1>
                    <p className="text-muted-foreground mt-1">
                        Testing new UI components with theme tokens
                    </p>
                </div>

                {/* Checkbox Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Checkbox Component</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Checkbox
                            label="Default Checkbox"
                            description="A standard checkbox with label"
                            checked={checkboxState}
                            onCheckedChange={setCheckboxState}
                        />

                        <Checkbox
                            label="Checked State"
                            description="This checkbox is checked"
                            checked={true}
                        />

                        <Checkbox
                            label="Disabled Checkbox"
                            description="Cannot interact with this"
                            disabled
                        />

                        <Checkbox
                            label="Error State"
                            description="This checkbox has an error"
                            error="This field is required"
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <Checkbox label="Small" size="sm" />
                            <Checkbox label="Medium" size="md" />
                            <Checkbox label="Large" size="lg" />
                        </div>
                    </CardContent>
                </Card>

                {/* Radio Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Radio Component</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Radio
                            name="test"
                            label="Option 1"
                            description="First option description"
                            checked={radioValue === 'option1'}
                            onCheckedChange={(c) => c && setRadioValue('option1')}
                        />

                        <Radio
                            name="test"
                            label="Option 2"
                            description="Second option description"
                            checked={radioValue === 'option2'}
                            onCheckedChange={(c) => c && setRadioValue('option2')}
                        />

                        <Radio
                            name="test"
                            label="Option 3"
                            checked={radioValue === 'option3'}
                            onCheckedChange={(c) => c && setRadioValue('option3')}
                        />

                        <Radio
                            name="test-disabled"
                            label="Disabled Option"
                            description="Cannot select this"
                            disabled
                        />
                    </CardContent>
                </Card>

                {/* Toggle Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Toggle Component</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Toggle
                            label="Enable Notifications"
                            description="Get notified about important updates"
                            checked={toggleState}
                            onCheckedChange={setToggleState}
                        />

                        <Toggle
                            label="Email Alerts"
                            description="Receive email notifications"
                            checked={true}
                        />

                        <Toggle
                            label="Push Notifications"
                            description="Receive push notifications"
                            checked={false}
                        />

                        <Toggle
                            label="Disabled Toggle"
                            description="Cannot change this setting"
                            disabled
                        />

                        <div className="grid grid-cols-3 gap-4">
                            <Toggle label="Small" size="sm" />
                            <Toggle label="Medium" size="md" />
                            <Toggle label="Large" size="lg" />
                        </div>
                    </CardContent>
                </Card>

                {/* Select Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Component</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Select
                            label="Category"
                            placeholder="Select a category"
                            options={categoryOptions}
                            value={selectValue}
                            onValueChange={setSelectValue}
                        />

                        <Select
                            label="Platform"
                            description="Choose your target platform"
                            placeholder="Select platform"
                            options={[
                                { value: 'ios', label: 'iOS' },
                                { value: 'android', label: 'Android' },
                                { value: 'both', label: 'Both' },
                            ]}
                        />

                        <Select
                            label="Disabled Select"
                            placeholder="Cannot select"
                            options={categoryOptions}
                            disabled
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Small" size="sm" options={categoryOptions} placeholder="Size sm" />
                            <Select label="Large" size="lg" options={categoryOptions} placeholder="Size lg" />
                        </div>
                    </CardContent>
                </Card>

                {/* Button Test */}
                <Card>
                    <CardHeader>
                        <CardTitle>Button Click States</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                            <button className="btn-primary">
                                Primary Button
                            </button>
                            <button className="btn-secondary">
                                Secondary Button
                            </button>
                            <button className="btn-accent">
                                Accent Button
                            </button>
                            <button className="btn-ghost">
                                Ghost Button
                            </button>
                            <button className="btn-danger">
                                Danger Button
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <button className="btn-primary btn-sm">
                                Small
                            </button>
                            <button className="btn-primary btn-lg">
                                Large
                            </button>
                            <button className="btn-primary btn-full">
                                Full Width
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Card Test */}
                <Card>
                    <CardHeader>
                        <CardTitle>Interactive Card</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card-link p-4 cursor-pointer">
                                <p className="font-semibold">Clickable Card</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Hover and click to see effects
                                </p>
                            </div>
                            <div className="card-link p-4 cursor-pointer">
                                <p className="font-semibold">Another Card</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click animation works here too
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};