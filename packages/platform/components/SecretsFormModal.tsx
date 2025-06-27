'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface SecretField {
    key: string;
    name: string;
    description: string;
    required: boolean;
    type: 'text' | 'password' | 'url' | 'token';
    validation?: string;
    placeholder?: string;
}

export interface SecretsFormRequest {
    id: string;
    title: string;
    description: string;
    secrets: SecretField[];
    projectId?: string;
    context: {
        action: string;
        details: string;
        priority: 'low' | 'medium' | 'high';
    };
}

interface SecretsFormModalProps {
    isOpen: boolean;
    formRequest: SecretsFormRequest | null;
    onSubmit: (secrets: Record<string, string>) => void;
    onCancel: () => void;
}

export const SecretsFormModal: React.FC<SecretsFormModalProps> = ({
    isOpen,
    formRequest,
    onSubmit,
    onCancel
}) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitComplete, setSubmitComplete] = useState(false);

    useEffect(() => {
        if (formRequest && isOpen) {
            // Reset form state when a new form is opened
            setFormData({});
            setShowPassword({});
            setValidationErrors({});
            setIsSubmitting(false);
            setSubmitComplete(false);
        }
    }, [formRequest, isOpen]);

    if (!isOpen || !formRequest) {
        return null;
    }

    const validateField = (field: SecretField, value: string): string | null => {
        if (field.required && !value.trim()) {
            return `${field.name} is required`;
        }

        if (field.validation && value.trim()) {
            try {
                const regex = new RegExp(field.validation);
                if (!regex.test(value)) {
                    return `${field.name} format is invalid`;
                }
            } catch (error) {
                console.warn('Invalid regex pattern:', field.validation);
            }
        }

        // Additional built-in validations
        if (field.type === 'url' && value.trim()) {
            try {
                new URL(value);
            } catch {
                return 'Please enter a valid URL';
            }
        }

        if (field.type === 'token' && value.trim()) {
            if (value.length < 10) {
                return 'Token appears to be too short';
            }
        }

        return null;
    };

    const handleFieldChange = (fieldKey: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
        
        // Clear validation error when user starts typing
        if (validationErrors[fieldKey]) {
            setValidationErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldKey];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const errors: Record<string, string> = {};
        
        for (const field of formRequest.secrets) {
            const value = formData[field.key] || '';
            const error = validateField(field, value);
            if (error) {
                errors[field.key] = error;
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Submit the form data
            await onSubmit(formData);
            setSubmitComplete(true);
            
            // Auto-close after showing success
            setTimeout(() => {
                onCancel();
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting secrets form:', error);
            setValidationErrors({ _form: 'Failed to save configuration. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (confirm('Are you sure you want to cancel? Your configuration will not be saved.')) {
            onCancel();
        }
    };

    const togglePasswordVisibility = (fieldKey: string) => {
        setShowPassword(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'border-red-500 bg-red-50';
            case 'medium': return 'border-yellow-500 bg-yellow-50';
            default: return 'border-blue-500 bg-blue-50';
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'high') {
            return <AlertCircle className="w-5 h-5 text-red-600" />;
        }
        return <Lock className="w-5 h-5 text-blue-600" />;
    };

    if (submitComplete) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="secrets-form-modal">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                    <div className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuration Saved!</h3>
                        <p className="text-gray-600">Your configuration has been securely saved and the setup will continue.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="secrets-form-modal">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`p-6 border-b border-l-4 ${getPriorityColor(formRequest.context.priority)}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            {getPriorityIcon(formRequest.context.priority)}
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900" data-testid="form-title">
                                    {formRequest.title}
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    {formRequest.description}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            data-testid="close-button"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    {/* Context Info */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                            <span className="font-medium">Action:</span> {formRequest.context.action} - {formRequest.context.details}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-6">
                        {formRequest.secrets.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <label 
                                    htmlFor={field.key}
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    {field.name} 
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                
                                <p className="text-sm text-gray-600">{field.description}</p>
                                
                                <div className="relative">
                                    <input
                                        id={field.key}
                                        name={field.key}
                                        type={field.type === 'password' && !showPassword[field.key] ? 'password' : 'text'}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            validationErrors[field.key] 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300'
                                        }`}
                                        data-testid={`input-${field.key}`}
                                    />
                                    
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility(field.key)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            data-testid={`toggle-password-${field.key}`}
                                        >
                                            {showPassword[field.key] ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                
                                {validationErrors[field.key] && (
                                    <p className="text-sm text-red-600" data-testid={`error-${field.key}`}>
                                        {validationErrors[field.key]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Form-level error */}
                    {validationErrors._form && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600" data-testid="form-error">
                                {validationErrors._form}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            data-testid="cancel-button"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            data-testid="submit-button"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>

                {/* Security Notice */}
                <div className="px-6 pb-6">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-start space-x-2">
                            <Lock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-600">
                                Your configuration values are encrypted and stored securely. 
                                They will only be used for this project and can be updated at any time.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};