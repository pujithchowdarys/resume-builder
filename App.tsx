import React, { useState, useEffect, useCallback } from 'react';
import {
  PersonalInfo,
  Education,
  Project,
  Internship,
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
  INITIAL_INTERNSHIP,
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

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentResumeData, setCurrentResumeData] = useState<ResumeData>(INITIAL_RESUME_DATA);
  const [showEnhancementModal, setShowEnhancementModal] = useState<boolean>(false);
  const [projectToEnhance, setProjectToEnhance] = useState<Project | null>(null);
  
  // aiKeySelected will now be true if process.env.NEXT_PUBLIC_API_KEY is defined
  const isApiKeyConfigured = !!process.env.NEXT_PUBLIC_API_KEY;
  const [aiKeyError, setAiKeyError] = useState<string | null>(null);

  // New states for global tailoring
  const [jobDescription, setJobDescription] = useState<string>('');
  const [loadingTailor, setLoadingTailor] = useState<boolean>(false);
  const [tailorError, setTailorError] = useState<string | null>(null);

  // New state for resume upload
  const [showResumeUploadModal, setShowResumeUploadModal] = useState<boolean>(false);


  // Load profiles from localStorage on initial render
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

  // Check AI Key status based on process.env.NEXT_PUBLIC_API_KEY
  useEffect(() => {
    if (!isApiKeyConfigured) {
      setAiKeyError("API_KEY environment variable is not configured. AI features will be disabled.");
    } else {
      setAiKeyError(null);
    }
  }, [isApiKeyConfigured]);


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
      // Set project start date to one year after B.Tech end, ensuring internship space
      const btechEndDate = new Date(btechEducation.endDate);
      const projectStartDate = new Date(btechEndDate.setFullYear(btechEndDate.getFullYear() + 1));
      defaultStartDate = projectStartDate.toISOString().split('T')[0];
    } else if (currentResumeData.internship && currentResumeData.internship.endDate) {
      // If no B.Tech but an internship exists, start project after internship
      const internshipEndDate = new Date(currentResumeData.internship.endDate);
      const projectStartDate = new Date(internshipEndDate.setDate(internshipEndDate.getDate() + 1)); // Day after internship
      defaultStartDate = projectStartDate.toISOString().split('T')[0];
    } else {
      // Fallback if no B.Tech or internship
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

  // Internship handler (always one, auto-generated)
  const handleUpdateInternship = (updatedInternship: Internship) => {
      updateResumeData({ internship: updatedInternship });
  };

  // Effect to ensure internship is present and dated correctly
  useEffect(() => {
    // Only auto-generate internship if it's currently null or has default placeholder values
    if (!currentResumeData.internship || currentResumeData.internship.companyName === INITIAL_INTERNSHIP.companyName) {
      const btechEducation = currentResumeData.education.find(edu =>
        edu.degree.toLowerCase().includes('bachelor') || edu.degree.toLowerCase().includes('b.tech')
      );

      if (btechEducation && btechEducation.endDate) {
        const btechEndDate = new Date(btechEducation.endDate);
        const internshipEndDate = new Date(btechEndDate); // Internship ends same time B.Tech ends
        // Internship starts 1 year before B.Tech ends
        const internshipStartDate = new Date(btechEndDate.setFullYear(btechEndDate.getFullYear() - 1));

        const newInternship: Internship = {
          ...INITIAL_INTERNSHIP,
          id: currentResumeData.internship?.id || generateId(), // Preserve ID if exists
          startDate: internshipStartDate.toISOString().split('T')[0],
          endDate: internshipEndDate.toISOString().split('T')[0],
        };

        // Update if current internship is null or if dates are significantly off
        if (!currentResumeData.internship ||
            currentResumeData.internship.startDate !== newInternship.startDate ||
            currentResumeData.internship.endDate !== newInternship.endDate) {
          updateResumeData({ internship: newInternship });
        }
      } else if (!currentResumeData.internship) {
        // If no B.Tech end date, but no internship, set a generic one
        const genericEndDate = new Date();
        const genericStartDate = new Date(genericEndDate.setFullYear(genericEndDate.getFullYear() - 1));
        const newInternship: Internship = {
          ...INITIAL_INTERNSHIP,
          id: generateId(),
          startDate: genericStartDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0], // Today's date as end
        };
        updateResumeData({ internship: newInternship });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResumeData.education]); // Recalculate if education changes


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
    if (!isApiKeyConfigured) {
      setTailorError("API_KEY environment variable is not configured. Please set it in your Vercel project settings or .env file (as NEXT_PUBLIC_API_KEY).");
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
        currentResumeData,
        jobDescription
      );
      
      const updatedProjects: EnhancedProject[] = tailoredResponse.enhancedProjects.map(ep => {
        // Find existing project to ensure all original fields are preserved if AI misses any.
        const originalProject = currentResumeData.projects.find(p => p.id === ep.id);
        return originalProject ? { ...originalProject, ...ep } : ep;
      });

      const updatedInternship: Internship | null = tailoredResponse.enhancedInternship ?
        ({ ...currentResumeData.internship, ...tailoredResponse.enhancedInternship } as Internship)
        : currentResumeData.internship;

      updateResumeData({
        summary: tailoredResponse.summary,
        skills: tailoredResponse.skills,
        projects: updatedProjects,
        internship: updatedInternship,
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
      internship: extractedData.internship ? {...extractedData.internship, id: extractedData.internship.id || generateId()} : null,
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
  const tailorButtonTooltip = !isApiKeyConfigured ? "API Key not configured." : "";


  return (
    <Layout>
      <h1 className="text-4xl font-extrabold text-center text-gray-900 mb-8">
        AI-Powered Resume Builder
      </h1>

      {aiKeyError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex justify-between items-center" role="alert">
          <span className="block sm:inline">{aiKeyError}</span>
          {!isApiKeyConfigured && ( // Only show hint if API key is truly not configured
            <span className="text-sm ml-4">Please set the `NEXT_PUBLIC_API_KEY` environment variable in your Vercel project settings or .env file.</span>
          )}
        </div>
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
          Paste a job description below, and AI will generate a tailored summary, skills, and enhance your project/internship details to match the role!
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
            internship={currentResumeData.internship}
            onUpdateProject={handleUpdateProject}
            onAddProject={handleAddProject}
            onRemoveProject={handleRemoveProject}
            onUpdateInternship={handleUpdateInternship}
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
                    title={!isApiKeyConfigured ? "API Key not configured." : ""}
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
          isApiKeyConfigured={isApiKeyConfigured}
        />
      )}

      {showResumeUploadModal && (
        <ResumeUploadModal
          onClose={handleCloseResumeUploadModal}
          onSave={handleSaveExtractedResumeData}
          isApiKeyConfigured={isApiKeyConfigured}
        />
      )}
    </Layout>
  );
}

export default App;