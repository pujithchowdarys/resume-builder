import React, { useState } from 'react';
import { Project, EnhancedProject, GeminiEnhancementResponse } from '../types';
import Button from './Button';
import TextAreaField from './TextAreaField';
import LoadingSpinner from './LoadingSpinner';
import { enhanceProject as callGeminiEnhanceProject } from '../services/geminiService';
import InputField from './InputField';

interface ProjectEnhancementModalProps {
  project: Project;
  onClose: () => void;
  onSave: (enhancedProject: EnhancedProject) => void;
  isApiKeyConfigured: boolean; // New prop to indicate if API key is set
}

const ProjectEnhancementModal: React.FC<ProjectEnhancementModalProps> = ({
  project,
  onClose,
  onSave,
  isApiKeyConfigured,
}) => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedData, setEnhancedData] = useState<GeminiEnhancementResponse | null>(null);

  const [currentDescription, setCurrentDescription] = useState<string>(project.description);
  const [currentResponsibilities, setCurrentResponsibilities] = useState<string>(project.responsibilities);
  const [currentTools, setCurrentTools] = useState<string>(project.tools);
  const [currentDatabase, setCurrentDatabase] = useState<string>('');
  const [currentCloud, setCurrentCloud] = useState<string>('');
  const [currentDashboard, setCurrentDashboard] = useState<string>('');

  const handleEnhance = async () => {
    if (!isApiKeyConfigured) {
      setError("API Key is not configured. Please set NEXT_PUBLIC_API_KEY environment variable.");
      return;
    }
    setLoading(true);
    setError(null);
    setEnhancedData(null);
    try {
      const response = await callGeminiEnhanceProject(project, jobDescription);
      setEnhancedData(response);
      setCurrentDescription(response.enhancedDescription);
      setCurrentResponsibilities(response.enhancedResponsibilities);
      setCurrentTools(response.enhancedTools);
      setCurrentDatabase(response.suggestedDatabase);
      setCurrentCloud(response.suggestedCloud);
      setCurrentDashboard(response.suggestedDashboard);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during enhancement.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const finalEnhancedProject: EnhancedProject = {
      ...project,
      enhancedDescription: currentDescription,
      enhancedResponsibilities: currentResponsibilities,
      enhancedTools: currentTools,
      suggestedDatabase: currentDatabase,
      suggestedCloud: currentCloud,
      suggestedDashboard: currentDashboard,
    };
    onSave(finalEnhancedProject);
    onClose();
  };

  if (!project) return null;

  const enhanceButtonDisabled = loading || !isApiKeyConfigured;
  const enhanceButtonTooltip = !isApiKeyConfigured ? "API Key not configured." : "";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="relative bg-white w-full max-w-4xl p-6 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Enhance Project: {project.companyName || project.role}</h2>

        <div className="flex-grow overflow-y-auto pr-2 no-scrollbar">
          <div className="mb-4">
            <TextAreaField
              id="jobDescription"
              label="Optional: Paste Job Description for tailored enhancement"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to help the AI tailor the project details."
              rows={5}
            />
            <Button
              onClick={handleEnhance}
              disabled={enhanceButtonDisabled}
              className="w-full"
              title={enhanceButtonTooltip} // Add tooltip for disabled state
            >
              {loading ? 'Enhancing...' : 'Enhance with AI'}
            </Button>
          </div>

          {loading && <LoadingSpinner message="AI is crafting your project enhancements..." />}
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">{error}</div>}

          {enhancedData && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">AI Suggested Enhancements</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Original Description:</h4>
                  <p className="text-sm text-gray-600 italic mb-3">{project.description}</p>
                  <TextAreaField
                    id="currentDescription"
                    label="Enhanced Description (Editable)"
                    value={currentDescription}
                    onChange={(e) => setCurrentDescription(e.target.value)}
                    rows={5}
                  />
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Original Responsibilities:</h4>
                  <p className="text-sm text-gray-600 italic mb-3">{project.responsibilities}</p>
                  <TextAreaField
                    id="currentResponsibilities"
                    label="Enhanced Responsibilities (Editable)"
                    value={currentResponsibilities}
                    onChange={(e) => setCurrentResponsibilities(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-1">Original Tools:</h4>
                <p className="text-sm text-gray-600 italic mb-3">{project.tools}</p>
                <TextAreaField
                  id="currentTools"
                  label="Enhanced Tools (Editable)"
                  value={currentTools}
                  onChange={(e) => setCurrentTools(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <InputField
                  id="currentDatabase"
                  label="Suggested Database (Editable)"
                  value={currentDatabase}
                  onChange={(e) => setCurrentDatabase(e.target.value)}
                />
                <InputField
                  id="currentCloud"
                  label="Suggested Cloud (Editable)"
                  value={currentCloud}
                  onChange={(e) => setCurrentCloud(e.target.value)}
                />
                <InputField
                  id="currentDashboard"
                  label="Suggested Dashboard (Editable)"
                  value={currentDashboard}
                  onChange={(e) => setCurrentDashboard(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!enhancedData}>
            Save Enhancements
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectEnhancementModal;