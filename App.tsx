import React, { useState, useEffect, useCallback } from 'react';
import {
  PersonalInfo,
  Education,
  Project,
  ResumeData,
  Profile,
  EnhancedProject,
  GeminiTailoredResumeResponse,
  ResumeExtractionResponse,
} from './types';
import {
  INITIAL_PERSONAL_INFO,
  INITIAL_EDUCATION,
  INITIAL_PROJECT,
  INITIAL_RESUME_DATA,
  DEFAULT_PROFILE_NAME,
  UPLOADED_PROFILE_NAME,
} from './constants';
import { generateTailoredResume } from './services/geminiService'; // Import new service
import { extractResumeData } from './services/geminiService'; // Import new service

import Layout from './components/Layout';
import InputField from './components/InputField';
import EducationForm from './components/EducationForm';
import ExperienceForm from './components/ExperienceForm';
import ResumePreview from './components/ResumePreview';
import SectionHeader from './components/SectionHeader';
import ProfileSelector from './components/ProfileSelector';
import ProjectEnhancementModal from './components/ProjectEnhancementModal';
import ResumeUploadModal from './components/ResumeUploadModal'; // New component
import Button from './components/Button';
import TextAreaField from './components/TextAreaField';
import LoadingSpinner from './components/LoadingSpinner';

// Utility to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

const LOCAL_STORAGE_API_KEY = 'gemini_api_key'; // Constant for local storage key

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentResumeData, setCurrentResumeData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [showEnhancementModal, setShowEnhancementModal] = useState<boolean>(false);
  const [projectToEnhance, setProjectToEnhance] = useState<Project | null>(null);
  
  // States for API Key management
  const [manualApiKey, setManualApiKey] = useState<string>(''); // For the input field
  const [effectiveApiKey, setEffectiveApiKey] = useState<string | null>(null); // The key actually used
  const isApiKeyConfigured = !!effectiveApiKey;
  const [aiKeyError, setAiKeyError] = useState<string | null>(null);


  // New states for global tailoring
  const [jobDescription, setJobDescription] = useState<string>('');
  const [loadingTailor, setLoadingTailor] = useState<boolean>(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  // New state for resume upload
  const [showResumeUploadModal, setShowResumeUploadModal] = useState<boolean>(false);


  // Load profiles and API Key from localStorage on initial render
  useEffect(() => {
    // --- Load Profiles ---
    const savedProfiles = localStorage.getItem('resumeProfiles');
    const lastSelectedProfileId = localStorage.getItem('lastSelectedProfileId');

    if (savedProfiles) {
      const parsedProfiles: Profile[] = JSON.parse(savedProfiles);
      setProfiles(parsedProfiles);

      if (parsedProfiles.length > 0) {
        let profileToLoad = parsedProfiles[0];
        if (lastSelectedProfileId) {
          const foundProfile = parsedProfiles.find(p => p.id === lastSelectedProfileId);
          if (foundProfile) {
            profileToLoad = foundProfile;
          }
        }
        setCurrentProfileId(profileToLoad.id);
        setCurrentResumeData(profileToLoad.resumeData);
      } else {
        // No profiles, create a default one
        const newProfile: Profile = {
          id: generateId(),
          name: DEFAULT_PROFILE_NAME,
          resumeData: INITIAL_RESUME_DATA,
        };
        setProfiles([newProfile]);
        setCurrentProfileId(newProfile.id);
        setCurrentResumeData(newProfile.resumeData);
        localStorage.setItem('resumeProfiles', JSON.stringify([newProfile]));
        localStorage.setItem('lastSelectedProfileId', newProfile.id);
      }
    } else {
      // No saved profiles, create the first one
      const newProfile: Profile = {
        id: generateId(),
        name: DEFAULT_PROFILE_NAME,
        resumeData: INITIAL_RESUME_DATA,
      };
      setProfiles([newProfile]);
      setCurrentProfileId(newProfile.id);
      setCurrentResumeData(newProfile.resumeData);
      localStorage.setItem('resumeProfiles', JSON.stringify([newProfile]));
      localStorage.setItem('lastSelectedProfileId', newProfile.id);
    }

    // --- Load API Key ---
    const storedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedKey) {
      setEffectiveApiKey(storedKey);
      setManualApiKey(storedKey); // Pre-fill input if found
    } else if (process.env.API_KEY) {
      // Fallback to process.env.API_KEY (for AI Studio/local .env)
      setEffectiveApiKey(process.env.API_KEY);
    } else {
      setEffectiveApiKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('resumeProfiles', JSON.stringify(profiles));
    if (currentProfileId) {
      localStorage.setItem('lastSelectedProfileId', currentProfileId);
    }
  }, [profiles, currentProfileId]);

  // Update current resume data when currentProfileId changes
  useEffect(() => {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (profile) {
      setCurrentResumeData(profile.resumeData);
    }
  }, [currentProfileId, profiles]);

  // Check AI Key status based on effectiveApiKey
  useEffect(() => {
    if (!effectiveApiKey) {
      setAiKeyError("API Key is not configured. AI features will be disabled. Please enter your API Key below.");
    } else {
      setAiKeyError(null);
    }
  }, [effectiveApiKey]);

  // Handle manual API Key input and storage
  const handleManualApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualApiKey(e.target.value);
  };

  const handleSaveApiKey = () => {
    const trimmedKey = manualApiKey.trim();
    if (trimmedKey) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, trimmedKey);
      setEffectiveApiKey(trimmedKey);
      setAiKeyError(null); // Clear error on save
    } else {
      localStorage.removeItem(LOCAL_STORAGE_API_KEY);
      setEffectiveApiKey(null);
      setAiKeyError("API Key is not configured. AI features will be disabled. Please enter your API Key below.");
    }
  };


  const updateResumeData = (newData: Partial<ResumeData>) => {
    setCurrentResumeData(prev => {
      const updatedData = { ...prev, ...newData };
      setProfiles(prevProfiles =>
        prevProfiles.map(p =>
          p.id === currentProfileId ? { ...p, resumeData: updatedData } : p
        )
      );
      return updatedData;
    });
  };

  // Personal Info handlers
  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateResumeData({ personalInfo: { ...currentResumeData.personalInfo, [name]: value } });
  };

  // Education handlers
  const handleUpdateEducation = (updatedEdu: Education) => {
    updateResumeData({
      education: currentResumeData.education.map(edu =>
        edu.id === updatedEdu.id ? updatedEdu : edu
      ),
    });
  };

  const handleAddEducation = () => {
    updateResumeData({
      education: [...currentResumeData.education, { ...INITIAL_EDUCATION, id: generateId() }],
    });
  };

  const handleRemoveEducation = (id: string) => {
    updateResumeData({
      education: currentResumeData.education.filter(edu => edu.id !== id),
    });
  };

  // Project handlers
  const handleUpdateProject = (updatedProject: Project) => {
    updateResumeData({
      projects: currentResumeData.projects.map(proj =>
        proj.id === updatedProject.id ? updatedProject : proj
      ),
    });
  };

  const handleAddProject = () => {
    const btechEducation = currentResumeData.education.find(edu => edu.degree.toLowerCase().includes('bachelor') || edu.degree.toLowerCase().includes('b.tech'));
    let defaultStartDate = '';

    if (btechEducation && btechEducation.endDate) {
      // Set project start date to one year after B.Tech end
      const btechEndDate = new Date(btechEducation.endDate);
      const projectStartDate = new Date(btechEndDate.setFullYear(btechEndDate.getFullYear() + 1));
      defaultStartDate = projectStartDate.toISOString().split('T')[0];
    } else {
      // Fallback if no B.Tech 
      defaultStartDate = new Date().toISOString().split('T')[0];
    }

    updateResumeData({
      projects: [...currentResumeData.projects, { ...INITIAL_PROJECT, id: generateId(), startDate: defaultStartDate }],
    });
  };

  const handleRemoveProject = (id: string) => {
    updateResumeData({
      projects: currentResumeData.projects.filter(proj => proj.id !== id),
    });
  };

  // Profile management
  const handleSelectProfile = (id: string) => {
    setCurrentProfileId(id);
  };

  const handleNewProfile = () => {
    const newProfile: Profile = {
      id: generateId(),
      name: `New Profile ${profiles.length + 1}`,
      resumeData: JSON.parse(JSON.stringify(INITIAL_RESUME_DATA)), // Deep copy
    };
    setProfiles(prev => [...prev, newProfile]);
    setCurrentProfileId(newProfile.id);
  };

  const handleUpdateProfileName = (id: string, newName: string) => {
    setProfiles(prev =>
      prev.map(p => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length === 1) {
      alert("You cannot delete the last profile. Please create a new one first if you wish to clear data.");
      return;
    }
    const filteredProfiles = profiles.filter(p => p.id !== id);
    setProfiles(filteredProfiles);
    if (currentProfileId === id) {
      // If deleted current, select the first available
      setCurrentProfileId(filteredProfiles[0].id);
    }
  };

  // AI Enhancement Modal handlers
  const openEnhancementModal = (project: Project) => {
    setProjectToEnhance(project);
    setShowEnhancementModal(true);
  };

  const closeEnhancementModal = () => {
    setProjectToEnhance(null);
    setShowEnhancementModal(false);
  };

  const handleSaveEnhancedProject = (enhancedProject: EnhancedProject) => {
    updateResumeData({
      projects: currentResumeData.projects.map(p =>
        p.id === enhancedProject.id ? enhancedProject : p
      ),
    });
  };

  // Global Resume Tailoring Handler
  const handleGenerateTailoredResume = async () => {
    if (!isApiKeyConfigured || !effectiveApiKey) {
      setTailorError("API Key is not configured. Please enter your API Key below.");
      return;
    }
    if (!jobDescription.trim()) {
      setTailorError("Please paste a job description to tailor your resume.");
      return;
    }

    setLoadingTailor(true);
    setTailorError(null);

    try {
      const tailoredResponse: GeminiTailoredResumeResponse = await generateTailoredResume(
        effectiveApiKey, // Pass effectiveApiKey
        currentResumeData,
        jobDescription
      );
      
      const updatedProjects: EnhancedProject[] = tailoredResponse.enhancedProjects.map(ep => {
        // Find existing project to ensure all original fields are preserved if AI misses any.
        const originalProject = currentResumeData.projects.find(p => p.id === ep.id);
        return originalProject ? { ...originalProject, ...ep } : ep;
      });

      updateResumeData({
        summary: tailoredResponse.summary,
        skills: tailoredResponse.skills,
        projects: updatedProjects,
      });
      setTailorError(null); // Clear any previous errors
    } catch (error: any) {
      console.error("Error generating tailored resume:", error);
      setTailorError(error.message || "An unexpected error occurred during resume tailoring.");
    } finally {
      setLoadingTailor(false);
    }
  };

  // Resume Upload Handlers
  const handleOpenResumeUploadModal = () => {
    setShowResumeUploadModal(true);
  };

  const handleCloseResumeUploadModal = () => {
    setShowResumeUploadModal(false);
  };

  const handleSaveExtractedResumeData = (extractedData: ResumeExtractionResponse) => {
    const newProfileId = generateId();
    const newProfileName = UPLOADED_PROFILE_NAME;

    // Create a new resume data object, explicitly mapping extracted projects to EnhancedProject
    const newResumeData: ResumeData = {
      personalInfo: extractedData.personalInfo,
      education: extractedData.education.map(edu => ({...edu, id: edu.id || generateId()})), // Ensure IDs
      // Map extracted Project to EnhancedProject type for consistency.
      projects: extractedData.projects.map(proj => ({...proj, id: proj.id || generateId()})),
      summary: extractedData.summary,
      skills: extractedData.skills,
    };

    const newProfile: Profile = {
      id: newProfileId,
      name: newProfileName,
      resumeData: newResumeData,
    };

    setProfiles(prev => [...prev, newProfile]);
    setCurrentProfileId(newProfileId);
    setCurrentResumeData(newResumeData); // Update current data directly
    setShowResumeUploadModal(false); // Close modal
  };

  const tailorButtonDisabled = loadingTailor || !isApiKeyConfigured || !jobDescription.trim();
  const tailorButtonTooltip = !isApiKeyConfigured ? "API Key not configured. Enter it below." : "";


  return (
    <Layout>
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        AI-Powered Resume Builder
      </h1>

      {/* Global API Key Input and Error Display */}
      {aiKeyError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{aiKeyError}</span>
        </div>
      )}

      {!isApiKeyConfigured && (
        <section className="mb-6 p-6 bg-yellow-50 border border-yellow-200 shadow-md rounded-lg">
          <SectionHeader title="Enter Your Gemini API Key" />
          <p className="text-gray-700 mb-4 text-sm">
            To enable AI features, please enter your Google Gemini API Key. This will be stored locally in your browser.
            Get your API key from <a href="https://ai.google.dev/gemini-api/docs/get-started/web" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ai.google.dev</a>.
          </p>
          <div className="flex gap-2">
            <InputField
              id="apiKeyInput"
              type="password" // Use password type for security
              placeholder="YOUR_GEMINI_API_KEY"
              value={manualApiKey}
              onChange={handleManualApiKeyChange}
              className="flex-grow"
            />
            <Button onClick={handleSaveApiKey} variant="primary">
              Save Key
            </Button>
          </div>
        </section>
      )}

      <ProfileSelector
        profiles={profiles}
        currentProfileId={currentProfileId}
        onSelectProfile={handleSelectProfile}
        onNewProfile={handleNewProfile}
        onUpdateProfileName={handleUpdateProfileName}
        onDeleteProfile={handleDeleteProfile}
      />
      <div className="mb-6 text-center">
        <Button onClick={handleOpenResumeUploadModal} variant="secondary" className="px-6 py-3 text-base">
          Start from Existing Resume (Paste Text)
        </Button>
      </div>


      {/* Job Description Input for Global Tailoring */}
      <section className="mb-6 p-6 bg-white shadow-md rounded-lg">
        <SectionHeader title="Tailor Resume for a Job" />
        <p className="text-gray-700 mb-4">
          Paste a job description below, and AI will generate a tailored summary, skills, and enhance your project details to match the role!
        </p>
        <TextAreaField
          id="jobDescriptionInput"
          label="Job Description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={8}
        />
        <Button
          onClick={handleGenerateTailoredResume}
          disabled={tailorButtonDisabled}
          fullWidth
          className="mt-4"
          title={tailorButtonTooltip}
        >
          {loadingTailor ? (
            <LoadingSpinner message="Generating tailored resume..." />
          ) : (
            'Generate Tailored Resume'
          )}
        </Button>
        {tailorError && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md mt-4">{tailorError}</div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Forms Column */}
        <div className="space-y-6">
          <section className="p-6 bg-white shadow-md rounded-lg">
            <SectionHeader title="Personal Information" />
            <InputField
              id="name"
              label="Full Name"
              name="name"
              value={currentResumeData.personalInfo.name}
              onChange={handlePersonalInfoChange}
              placeholder="John Doe"
            />
            <InputField
              id="phoneNumber"
              label="Phone Number"
              name="phoneNumber"
              value={currentResumeData.personalInfo.phoneNumber}
              onChange={handlePersonalInfoChange}
              type="tel"
              placeholder="+1 (123) 456-7890"
            />
            <InputField
              id="email"
              label="Email Address"
              name="email"
              value={currentResumeData.personalInfo.email}
              onChange={handlePersonalInfoChange}
              type="email"
              placeholder="john.doe@example.com"
            />
            <InputField
              id="linkedin"
              label="LinkedIn Profile URL"
              name="linkedin"
              value={currentResumeData.personalInfo.linkedin}
              onChange={handlePersonalInfoChange}
              placeholder="https://www.linkedin.com/in/johndoe"
            />
            <InputField
              id="portfolio"
              label="Portfolio/Website URL"
              name="portfolio"
              value={currentResumeData.personalInfo.portfolio}
              onChange={handlePersonalInfoChange}
              placeholder="https://www.johndoe.com"
            />
          </section>

          <EducationForm
            educationList={currentResumeData.education}
            onUpdateEducation={handleUpdateEducation}
            onAddEducation={handleAddEducation}
            onRemoveEducation={handleRemoveEducation}
          />

          <ExperienceForm
            projects={currentResumeData.projects}
            onUpdateProject={handleUpdateProject}
            onAddProject={handleAddProject}
            onRemoveProject={handleRemoveProject}
          />

          <section className="p-6 bg-white shadow-md rounded-lg">
            <SectionHeader title="AI Individual Project Enhancements" />
            <p className="text-gray-700 mb-4">
              Select a project below to enhance its description, responsibilities, and tools
              using Gemini AI for specific, granular adjustments.
            </p>
            <div className="space-y-3">
              {currentResumeData.projects.map(proj => (
                <div key={proj.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                  <span className="font-medium text-gray-800">{proj.role} {proj.companyName && `at ${proj.companyName}`}</span>
                  <Button
                    onClick={() => openEnhancementModal(proj)}
                    variant="outline"
                    size="sm"
                    disabled={!isApiKeyConfigured}
                    title={!isApiKeyConfigured ? "API Key not configured. Enter it below." : ""}
                  >
                    Enhance Project
                  </Button>
                </div>
              ))}
              {currentResumeData.projects.length === 0 && (
                <p className="text-gray-600 italic">No projects added yet. Add a project above to enhance it.</p>
              )}
            </div>
          </section>
        </div>

        {/* Resume Preview Column */}
        <div className="sticky top-4 lg:top-8 self-start bg-white shadow-xl rounded-lg p-0">
          <ResumePreview resumeData={currentResumeData} />
        </div>
      </div>

      {showEnhancementModal && projectToEnhance && (
        <ProjectEnhancementModal
          project={projectToEnhance}
          onClose={closeEnhancementModal}
          onSave={handleSaveEnhancedProject}
          apiKey={effectiveApiKey} // Pass apiKey
        />
      )}

      {showResumeUploadModal && (
        <ResumeUploadModal
          onClose={handleCloseResumeUploadModal}
          onSave={handleSaveExtractedResumeData}
          apiKey={effectiveApiKey} // Pass apiKey
        />
      )}
    </Layout>
  );
}

export default App;