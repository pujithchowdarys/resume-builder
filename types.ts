export interface PersonalInfo {
  name: string;
  phoneNumber: string;
  email: string;
  linkedin: string;
  portfolio: string;
}

export interface Education {
  id: string;
  degree: string;
  university: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

export interface Project {
  id: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  role: string;
  description: string; // Original description
  responsibilities: string; // Original responsibilities
  tools: string; // Original tools
}

export interface EnhancedProject extends Project {
  enhancedDescription?: string;
  enhancedResponsibilities?: string;
  enhancedTools?: string;
  suggestedDatabase?: string;
  suggestedCloud?: string;
  suggestedDashboard?: string;
}

export interface Internship {
  id: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  role: string;
  description: string;
  responsibilities: string;
  tools: string;
  // Internship can also be enhanced, so it can carry these fields
  enhancedDescription?: string;
  enhancedResponsibilities?: string;
  enhancedTools?: string;
  suggestedDatabase?: string;
  suggestedCloud?: string;
  suggestedDashboard?: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  education: Education[];
  internship: Internship | null;
  projects: EnhancedProject[];
  summary: string; // Field for AI-generated summary
  skills: string[]; // Field for AI-generated skills list
}

export interface Profile {
  id: string;
  name: string;
  resumeData: ResumeData;
}

export interface GeminiEnhancementResponse { // For individual project enhancement modal
  enhancedDescription: string;
  enhancedResponsibilities: string;
  enhancedTools: string;
  suggestedDatabase: string;
  suggestedCloud: string;
  suggestedDashboard: string;
}

export interface GeminiTailoredResumeResponse { // For global resume tailoring
  summary: string;
  skills: string[];
  enhancedProjects: EnhancedProject[];
  enhancedInternship: Internship | null; // Nullable as internship might not always be present or fully enhanced
}

export interface ResumeExtractionResponse { // For initial resume parsing
  personalInfo: PersonalInfo;
  education: Education[];
  internship: Internship | null;
  projects: Project[]; // Note: Projects are not "enhanced" during initial extraction
  summary: string;
  skills: string[];
}