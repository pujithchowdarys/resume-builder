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
  GeminiMatchAnalysisResponse,
} from './types';
import {
  INITIAL_PERSONAL_INFO,
  INITIAL_EDUCATION,
  INITIAL_PROJECT,
  INITIAL_RESUME_DATA,
  DEFAULT_PROFILE_NAME,
  UPLOADED_PROFILE_NAME,
} from './constants';
import { generateTailoredResume, extractResumeData, analyzeResumeJobMatch } from './services/geminiService';

import Layout from './components/Layout';
import InputField from './components/InputField';
import EducationForm from './components/EducationForm';
import ExperienceForm from './components/ExperienceForm';
import ResumePreview from './components/ResumePreview';
import SectionHeader from './components/SectionHeader';
import ProfileSelector from './components/ProfileSelector';
import ProjectEnhancementModal from './components/ProjectEnhancementModal';
import ResumeUploadModal from './components/ResumeUploadModal';
import Button from './components/Button';
import TextAreaField from './components/TextAreaField';
import LoadingSpinner from './components/LoadingSpinner';
import ResumeLengthModal from './components/ResumeLengthModal';

// Utility to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

const LOCAL_STORAGE_API_KEY = 'gemini_api_key'; // Constant for local storage key

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentResumeData, setCurrentResumeData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [showEnhancementModal, setShowEnhancementModal] = useState<boolean>(false);
  const [projectToEnhance, setProjectToEnhance] = useState<Project | null>(null);
  
  const [manualApiKey, setManualApiKey] = useState<string>('');
  const [effectiveApiKey, setEffectiveApiKey] = useState<string | null>(null);
  const isApiKeyConfigured = !!effectiveApiKey;
  const [aiKeyError, setAiKeyError] = useState<string | null>(null);

  const [jobDescription, setJobDescription] = useState<string>('');
  const [loadingTailor, setLoadingTailor] = useState<boolean>(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  const [showResumeUploadModal, setShowResumeUploadModal] = useState<boolean>(false);
  const [isLengthModalVisible, setIsLengthModalVisible] = useState<boolean>(false);


  // New states for Match Analysis
  const [matchAnalysis, setMatchAnalysis] = useState<GeminiMatchAnalysisResponse | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]); // Track applied suggestions by their text

  // Clear analysis when job description or profile changes
  useEffect(() => {
    setMatchAnalysis(null);
    setAppliedSuggestions([]);
  }, [jobDescription, currentProfileId]);

  useEffect(() => {
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
        const newProfile: Profile = { id: generateId(), name: DEFAULT_PROFILE_NAME, resumeData: INITIAL_RESUME_DATA };
        setProfiles([newProfile]);
        setCurrentProfileId(newProfile.id);
        setCurrentResumeData(newProfile.resumeData);
        localStorage.setItem('resumeProfiles', JSON.stringify([newProfile]));
        localStorage.setItem('lastSelectedProfileId', newProfile.id);
      }
    } else {
      const newProfile: Profile = { id: generateId(), name: DEFAULT_PROFILE_NAME, resumeData: INITIAL_RESUME_DATA };
      setProfiles([newProfile]);
      setCurrentProfileId(newProfile.id);
      setCurrentResumeData(newProfile.resumeData);
      localStorage.setItem('resumeProfiles', JSON.stringify([newProfile]));
      localStorage.setItem('lastSelectedProfileId', newProfile.id);
    }

    const storedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedKey) {
      setEffectiveApiKey(storedKey);
      setManualApiKey(storedKey);
    } else if (process.env.API_KEY) {
      setEffectiveApiKey(process.env.API_KEY);
    } else {
      setEffectiveApiKey(null);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('resumeProfiles', JSON.stringify(profiles));
    if (currentProfileId) {
      localStorage.setItem('lastSelectedProfileId', currentProfileId);
    }
  }, [profiles, currentProfileId]);

  useEffect(() => {
    const profile = profiles.find(p => p.id === currentProfileId);
    if (profile) {
      setCurrentResumeData(profile.resumeData);
    }
  }, [currentProfileId, profiles]);

  useEffect(() => {
    if (!effectiveApiKey) {
      setAiKeyError("API Key is not configured. AI features will be disabled. Please enter your API Key below.");
    } else {
      setAiKeyError(null);
    }
  }, [effectiveApiKey]);

  const handleManualApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualApiKey(e.target.value);
  };

  const handleSaveApiKey = () => {
    const trimmedKey = manualApiKey.trim();
    if (trimmedKey) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, trimmedKey);
      setEffectiveApiKey(trimmedKey);
      setAiKeyError(null);
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

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateResumeData({ personalInfo: { ...currentResumeData.personalInfo, [name]: value } });
  };

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

  const handleUpdateProject = (updatedProject: Project) => {
    updateResumeData({
      projects: currentResumeData.projects.map(proj =>
        proj.id === updatedProject.id ? updatedProject : proj
      ),
    });
  };

  const handleAddProject = () => {
    updateResumeData({
      projects: [...currentResumeData.projects, { ...INITIAL_PROJECT, id: generateId() }],
    });
  };

  const handleRemoveProject = (id: string) => {
    updateResumeData({
      projects: currentResumeData.projects.filter(proj => proj.id !== id),
    });
  };

  const handleSelectProfile = (id: string) => {
    setCurrentProfileId(id);
  };

  const handleNewProfile = () => {
    const newProfile: Profile = {
      id: generateId(),
      name: `New Profile ${profiles.length + 1}`,
      resumeData: JSON.parse(JSON.stringify(INITIAL_RESUME_DATA)),
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
      setCurrentProfileId(filteredProfiles[0].id);
    }
  };

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

  const handleAnalyzeMatch = async () => {
    if (!isApiKeyConfigured || !effectiveApiKey) {
      setAnalysisError("API Key is not configured. Please enter your API Key below.");
      return;
    }
    if (!jobDescription.trim()) {
      setAnalysisError("Please paste a job description to analyze.");
      return;
    }

    setLoadingAnalysis(true);
    setAnalysisError(null);
    setMatchAnalysis(null);
    setAppliedSuggestions([]); // Reset applied suggestions on new analysis

    try {
      const analysisResponse = await analyzeResumeJobMatch(effectiveApiKey, currentResumeData, jobDescription);
      setMatchAnalysis(analysisResponse);
    } catch (error: any) {
      setAnalysisError(error.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoadingAnalysis(false);
    }
  };
  
  const handleApplySuggestion = (suggestion: { projectId: string; suggestion: string }) => {
    const projectIndex = currentResumeData.projects.findIndex(p => p.id === suggestion.projectId);

    if (projectIndex === -1) {
      console.warn("Could not find project to apply suggestion:", suggestion.projectId);
      return;
    }

    // Create a new array and a new project object to avoid direct mutation
    const updatedProjects = [...currentResumeData.projects];
    const projectToUpdate = { ...updatedProjects[projectIndex] };

    // Use enhancedResponsibilities if it exists, otherwise fall back to original
    const baseResponsibilities = projectToUpdate.enhancedResponsibilities || projectToUpdate.responsibilities || '';
    
    // Append the new suggestion as a new line/bullet point
    projectToUpdate.enhancedResponsibilities = `${baseResponsibilities}\n${suggestion.suggestion}`.trim();
    
    updatedProjects[projectIndex] = projectToUpdate;

    updateResumeData({ projects: updatedProjects });

    // Track that this suggestion has been applied
    setAppliedSuggestions(prev => [...prev, suggestion.suggestion]);
  };

  const handleGenerateTailoredResume = () => {
    if (!isApiKeyConfigured) {
      setTailorError("API Key is not configured. Please enter your API Key below.");
      return;
    }
    if (!jobDescription.trim()) {
      setTailorError("Please paste a job description to tailor your resume.");
      return;
    }
    setIsLengthModalVisible(true);
  };

  const startResumeGeneration = async (length: '1-page' | '2-page') => {
    setIsLengthModalVisible(false);
    if (!effectiveApiKey) return; // Should be guarded by the initial check, but for type safety

    setLoadingTailor(true);
    setTailorError(null);

    try {
      const tailoredResponse = await generateTailoredResume(effectiveApiKey, currentResumeData, jobDescription, length);
      
      const updatedProjects: EnhancedProject[] = tailoredResponse.enhancedProjects.map(ep => {
        const originalProject = currentResumeData.projects.find(p => p.id === ep.id);
        return originalProject ? { ...originalProject, ...ep } : ep;
      });

      updateResumeData({
        summary: tailoredResponse.summary,
        skills: tailoredResponse.skills,
        projects: updatedProjects,
      });
      setTailorError(null);
    } catch (error: any) {
      setTailorError(error.message || "An unexpected error occurred during resume tailoring.");
    } finally {
      setLoadingTailor(false);
    }
  };

  const handleOpenResumeUploadModal = () => setShowResumeUploadModal(true);
  const handleCloseResumeUploadModal = () => setShowResumeUploadModal(false);

  const handleSaveExtractedResumeData = (extractedData: ResumeExtractionResponse) => {
    const newProfileId = generateId();
    const newProfileName = UPLOADED_PROFILE_NAME;

    const newResumeData: ResumeData = {
      personalInfo: extractedData.personalInfo,
      education: extractedData.education.map(edu => ({...edu, id: edu.id || generateId()})),
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
    setCurrentResumeData(newResumeData);
    setShowResumeUploadModal(false);
  };

  const actionButtonDisabled = !isApiKeyConfigured || !jobDescription.trim();
  const actionButtonTooltip = !isApiKeyConfigured ? "API Key not configured. Enter it below." : "";

  return (
    <Layout>
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        Pujiverse Resume Builder
      </h1>

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
              type="password"
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

      <section className="mb-6 p-6 bg-white shadow-md rounded-lg">
        <SectionHeader title="Tailor Resume for a Job" />
        <p className="text-gray-700 mb-4">
          Paste a job description to analyze your resume's match and then generate a tailored version.
        </p>
        <TextAreaField
          id="jobDescriptionInput"
          label="Job Description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={8}
        />
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button onClick={handleAnalyzeMatch} disabled={actionButtonDisabled || loadingAnalysis} fullWidth title={actionButtonTooltip}>
            {loadingAnalysis ? <LoadingSpinner message="Analyzing..." /> : 'Analyze Match'}
          </Button>
          <Button onClick={handleGenerateTailoredResume} disabled={actionButtonDisabled || loadingTailor} fullWidth title={actionButtonTooltip} variant="primary">
            {loadingTailor ? <LoadingSpinner message="Generating..." /> : 'Generate Tailored Resume'}
          </Button>
        </div>
        {analysisError && <div className="p-3 bg-red-100 text-red-700 rounded-md mt-4">{analysisError}</div>}
        {tailorError && <div className="p-3 bg-red-100 text-red-700 rounded-md mt-4">{tailorError}</div>}
      </section>

      {matchAnalysis && (
        <section className="mb-6 p-6 bg-indigo-50 border border-indigo-200 shadow-md rounded-lg">
          <SectionHeader title="Match Analysis Report" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center justify-center bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-800">Match Score</h3>
              <p className="text-5xl font-bold text-indigo-600 my-2">{matchAnalysis.matchPercentage}%</p>
              <p className="text-sm text-gray-600 text-center">{matchAnalysis.matchSummary}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Missing Keywords & Skills</h3>
              <div className="flex flex-wrap gap-2">
                {matchAnalysis.missingKeywords.length > 0 ? (
                  matchAnalysis.missingKeywords.map((keyword, index) => (
                    <span key={index} className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{keyword}</span>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No critical keywords seem to be missing. Great job!</p>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Improvement Suggestions</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {matchAnalysis.improvementSuggestions.length > 0 ? (
                  matchAnalysis.improvementSuggestions.map((sugg, index) => {
                    const isApplied = appliedSuggestions.includes(sugg.suggestion);
                    return (
                        <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-200 flex justify-between items-start gap-2">
                            <div>
                                <p className="font-semibold text-sm text-gray-800">{sugg.projectName}</p>
                                <p className="text-sm text-gray-600 italic">"{sugg.suggestion}"</p>
                            </div>
                            <Button
                                size="sm"
                                variant={isApplied ? "secondary" : "outline"}
                                onClick={() => handleApplySuggestion(sugg)}
                                disabled={isApplied}
                                className="flex-shrink-0"
                            >
                                {isApplied ? 'Applied' : 'Apply'}
                            </Button>
                        </div>
                    );
                })
                ) : (
                  <p className="text-sm text-gray-600">Your projects are well-aligned. No specific suggestions at this time.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="p-6 bg-white shadow-md rounded-lg">
            <SectionHeader title="Personal Information" />
            <InputField id="name" label="Full Name" name="name" value={currentResumeData.personalInfo.name} onChange={handlePersonalInfoChange} placeholder="John Doe" />
            <InputField id="phoneNumber" label="Phone Number" name="phoneNumber" value={currentResumeData.personalInfo.phoneNumber} onChange={handlePersonalInfoChange} type="tel" placeholder="+1 (123) 456-7890" />
            <InputField id="email" label="Email Address" name="email" value={currentResumeData.personalInfo.email} onChange={handlePersonalInfoChange} type="email" placeholder="john.doe@example.com" />
            <InputField id="linkedin" label="LinkedIn Profile URL" name="linkedin" value={currentResumeData.personalInfo.linkedin} onChange={handlePersonalInfoChange} placeholder="https://www.linkedin.com/in/johndoe" />
            <InputField id="portfolio" label="Portfolio/Website URL" name="portfolio" value={currentResumeData.personalInfo.portfolio} onChange={handlePersonalInfoChange} placeholder="https://www.johndoe.com" />
          </section>

          <EducationForm educationList={currentResumeData.education} onUpdateEducation={handleUpdateEducation} onAddEducation={handleAddEducation} onRemoveEducation={handleRemoveEducation} />
          <ExperienceForm projects={currentResumeData.projects} onUpdateProject={handleUpdateProject} onAddProject={handleAddProject} onRemoveProject={handleRemoveProject} />

          <section className="p-6 bg-white shadow-md rounded-lg">
            <SectionHeader title="AI Individual Project Enhancements" />
            <p className="text-gray-700 mb-4">Select a project below to enhance its description, responsibilities, and tools using Gemini AI for specific, granular adjustments.</p>
            <div className="space-y-3">
              {currentResumeData.projects.map(proj => (
                <div key={proj.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                  <span className="font-medium text-gray-800">{proj.role} {proj.companyName && `at ${proj.companyName}`}</span>
                  <Button onClick={() => openEnhancementModal(proj)} variant="outline" size="sm" disabled={!isApiKeyConfigured} title={!isApiKeyConfigured ? "API Key not configured. Enter it below." : ""}>
                    Enhance Project
                  </Button>
                </div>
              ))}
              {currentResumeData.projects.length === 0 && <p className="text-gray-600 italic">No projects added yet. Add a project above to enhance it.</p>}
            </div>
          </section>
        </div>

        <div className="sticky top-4 lg:top-8 self-start bg-white shadow-xl rounded-lg p-0">
          <ResumePreview resumeData={currentResumeData} />
        </div>
      </div>

      {showEnhancementModal && projectToEnhance && (
        <ProjectEnhancementModal project={projectToEnhance} onClose={closeEnhancementModal} onSave={handleSaveEnhancedProject} apiKey={effectiveApiKey} />
      )}

      {showResumeUploadModal && (
        <ResumeUploadModal onClose={handleCloseResumeUploadModal} onSave={handleSaveExtractedResumeData} apiKey={effectiveApiKey} />
      )}

      {isLengthModalVisible && (
        <ResumeLengthModal
            onClose={() => setIsLengthModalVisible(false)}
            onSelectLength={startResumeGeneration}
        />
      )}
    </Layout>
  );
}

export default App;
