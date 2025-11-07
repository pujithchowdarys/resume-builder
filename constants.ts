import { Education, PersonalInfo, Project, Internship, ResumeData } from './types';

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

export const INITIAL_INTERNSHIP: Internship = {
  id: 'intern-1',
  companyName: 'Placeholder Corp',
  location: 'Remote',
  startDate: '', // Will be calculated based on B.Tech end date
  endDate: '',   // Will be calculated based on B.Tech end date
  role: 'Software Development Intern',
  description: 'Gained hands-on experience in software development lifecycle, contributing to various projects and learning industry best practices.',
  responsibilities: 'Assisted senior engineers with coding tasks, participated in code reviews, debugged applications, and documented project modules.',
  tools: 'Git, VS Code, Basic programming language (e.g., Python/Java)',
};

export const INITIAL_RESUME_DATA: ResumeData = {
  personalInfo: INITIAL_PERSONAL_INFO,
  education: [],
  internship: null,
  projects: [],
  summary: '',
  skills: [],
};

export const DEFAULT_PROFILE_NAME = "New Profile";
export const UPLOADED_PROFILE_NAME = "Uploaded Resume";