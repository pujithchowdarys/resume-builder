import { Education, PersonalInfo, Project, ResumeData } from './types';

export const INITIAL_PERSONAL_INFO: PersonalInfo = {
  name: '',
  phoneNumber: '',
  email: '',
  linkedin: '',
  portfolio: '',
};

export const INITIAL_EDUCATION: Education = {
  id: 'edu-1',
  degree: '',
  university: '',
  location: '',
  startDate: '',
  endDate: '',
  gpa: '',
};

export const INITIAL_PROJECT: Project = {
  id: 'proj-1',
  companyName: '',
  location: '',
  startDate: '',
  endDate: '',
  role: '',
  description: '',
  responsibilities: '',
  tools: '',
};

export const INITIAL_RESUME_DATA: ResumeData = {
  personalInfo: INITIAL_PERSONAL_INFO,
  education: [],
  projects: [],
  summary: '',
  skills: [],
};

export const DEFAULT_PROFILE_NAME = "New Profile";
export const UPLOADED_PROFILE_NAME = "Uploaded Resume";