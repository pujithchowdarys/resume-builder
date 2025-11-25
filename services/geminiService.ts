import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Project, GeminiEnhancementResponse, ResumeData, GeminiTailoredResumeResponse, ResumeExtractionResponse, PersonalInfo, Education, GeminiMatchAnalysisResponse } from '../types';

/**
 * Encodes a Uint8Array into a base64 string.
 * This is a utility function, not directly used in this service but kept for completeness
 * based on the general code structure guidance for audio/video.
 */
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string into a Uint8Array.
 * This is a utility function, not directly used in this service but kept for completeness
 * based on the general code structure guidance for audio/video.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  // Fix: Initialize the 'bytes' Uint8Array before populating it
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Enhances a project description, responsibilities, and tools using the Gemini API,
 * and suggests relevant database, cloud, and dashboard technologies.
 *
 * @param apiKey The Google Gemini API key.
 * @param project The original project details.
 * @param jobDescription An optional job description to tailor the enhancement.
 * @returns A promise that resolves to an object containing enhanced details and suggestions.
 */
export async function enhanceProject(
  apiKey: string,
  project: Project,
  jobDescription: string = ''
): Promise<GeminiEnhancementResponse> {
  // Create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key.
  
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey });


  const prompt = `As an expert resume writer and AI career coach, your task is to significantly enhance the following project details for a professional resume. Focus on making the description and responsibilities more impactful, quantifiable, and aligned with industry best practices. 

Crucially, suggest ONLY ONE technology for each category (database, cloud, dashboard). Companies typically standardize on a single tool per category to reduce costs, so avoid listing multiple options like 'PostgreSQL/MongoDB' for the database.

Project Details:
Company: ${project.companyName}
Role: ${project.role}
Original Description: ${project.description}
Original Responsibilities: ${project.responsibilities}
Original Tools: ${project.tools}

${jobDescription ? `Consider this Job Description for tailoring:
${jobDescription}` : ''}

Please provide the output in a JSON object with the following structure:
{
  "enhancedDescription": "A rewritten, impactful project description.",
  "enhancedResponsibilities": "Rewritten, quantifiable responsibilities in bullet points.",
  "enhancedTools": "A comprehensive list of tools, including original and suggested ones, formatted as a comma-separated string.",
  "suggestedDatabase": "A single, relevant database technology (e.g., PostgreSQL, MongoDB, DynamoDB).",
  "suggestedCloud": "A single, relevant cloud platform (e.g., AWS, Azure, Google Cloud).",
  "suggestedDashboard": "A single, relevant dashboard/visualization tool (e.g., Tableau, Power BI, Looker Studio, Grafana)."
}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using a more capable model for complex reasoning
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedDescription: {
              type: Type.STRING,
              description: 'A rewritten, impactful project description.',
            },
            enhancedResponsibilities: {
              type: Type.STRING,
              description: 'Rewritten, quantifiable responsibilities in bullet points.',
            },
            enhancedTools: {
              type: Type.STRING,
              description: 'A comprehensive list of tools, including original and suggested ones, formatted as a comma-separated string.',
            },
            suggestedDatabase: {
              type: Type.STRING,
              description: 'A single, relevant database technology (e.g., PostgreSQL, MongoDB, DynamoDB).',
            },
            suggestedCloud: {
              type: Type.STRING,
              description: 'A single, relevant cloud platform (e.g., AWS, Azure, Google Cloud).',
            },
            suggestedDashboard: {
              type: Type.STRING,
              description: 'A single, relevant dashboard/visualization tool (e.g., Tableau, Power BI, Looker Studio, Grafana).',
            },
          },
          required: [
            'enhancedDescription',
            'enhancedResponsibilities',
            'enhancedTools',
            'suggestedDatabase',
            'suggestedCloud',
            'suggestedDashboard',
          ],
        },
      },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as GeminiEnhancementResponse;

  } catch (error: any) {
    console.error('Error enhancing project with Gemini:', error);
    let errorMessage = 'Failed to enhance project.';

    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('API_KEY') || error.message.includes('invalid') || error.message.includes('not found')) {
        errorMessage = 'API Key is invalid or not configured. Please enter a valid API Key.';
      } else {
        errorMessage += ` Details: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

/**
 * Generates a tailored resume (summary, skills, and enhanced projects/internship)
 * based on the provided resume data and a job description using the Gemini API.
 *
 * @param apiKey The Google Gemini API key.
 * @param resumeData The complete resume data.
 * @param jobDescription The job description to tailor the resume to.
 * @param resumeLength The desired length of the resume ('1-page' or '2-page').
 * @returns A promise that resolves to an object containing the tailored resume sections.
 */
export async function generateTailoredResume(
  apiKey: string,
  resumeData: ResumeData,
  jobDescription: string,
  resumeLength: '1-page' | '2-page'
): Promise<GeminiTailoredResumeResponse> {
  
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey });

  if (!jobDescription || jobDescription.trim() === '') {
    throw new Error("Job description cannot be empty for tailoring the resume.");
  }

  // Combine projects and internship for a unified enhancement loop in the prompt
  const allExperience = [
    ...resumeData.projects
  ];

  const experienceDetailsForPrompt = allExperience.map(item => ({
    id: item.id,
    type: 'Project', // All experiences are now projects
    companyName: item.companyName,
    location: item.location,
    startDate: item.startDate,
    endDate: item.endDate,
    role: item.role,
    description: item.description,
    responsibilities: item.responsibilities,
    tools: item.tools,
  }));

  const lengthInstruction = resumeLength === '1-page'
    ? "The final resume must be concise and fit perfectly onto a single page. Be selective and prioritize only the most impactful information relevant to the job description."
    : "The final resume should be detailed and comprehensive, designed to fill two pages. Provide more depth in the project descriptions and responsibilities to showcase a wide range of experience.";

  const prompt = `As an expert resume writer and AI career coach, your task is to craft a complete, tailored resume output based on the provided user's current resume data and a specific job description.

**IMPORTANT RULE: ${lengthInstruction}**

You need to:
1.  **Generate a professional summary** (3-5 sentences) that highlights the candidate's key qualifications and career aspirations, highly relevant to the provided job description.
2.  **Generate a comprehensive list of technical skills** (as an array of strings, categorize if appropriate, e.g., "Programming Languages", "Databases", "Cloud Platforms", "Tools") derived from the user's personal projects, original tools, and keywords from the job description.
3.  **Enhance each provided experience entry (projects)**: For each entry, rewrite the 'description' and 'responsibilities' to be more impactful, quantifiable, and aligned with the job description. Responsibilities should be presented as bullet points, each on a new line.
4.  **Suggest ONE tool per category**: For each experience entry, suggest ONLY ONE relevant database technology, ONE cloud platform, and ONE dashboard tool that would logically fit. It is crucial not to list multiple options for the same category within a single project, as companies typically standardize on a single tool to manage costs. Combine original and suggested 'tools' into a single, comprehensive, comma-separated string.

Here's the current resume data (Personal Info, Education, Experience):
${JSON.stringify({
    personalInfo: resumeData.personalInfo,
    education: resumeData.education,
    experience: experienceDetailsForPrompt,
  })}

Here's the Job Description to tailor for:
${jobDescription}

Please provide the output as a single JSON object with the following structure. Ensure all original fields for projects (id, companyName, location, startDate, endDate, role, description, responsibilities, tools) are included alongside their enhanced versions. The 'enhancedProjects' array should contain all enhanced project entries.
{
  "summary": "Generated professional summary tailored to the job description.",
  "skills": [
    "Programming Languages: Python, Java",
    "Databases: SQL, MongoDB",
    "Cloud Platforms: AWS",
    "Tools: Git, Docker, JIRA"
  ],
  "enhancedProjects": [
    {
      "id": "project-id-1",
      "companyName": "Original Company",
      "location": "Original Location",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "role": "Original Role",
      "description": "Original Project Description",
      "responsibilities": "Original Project Responsibilities",
      "tools": "Original Project Tools",
      "enhancedDescription": "AI-enhanced description for project 1, aligned with JD.",
      "enhancedResponsibilities": "Bullet point 1.\\nBullet point 2.\\nBullet point 3.",
      "enhancedTools": "Comma-separated list of original and suggested tools.",
      "suggestedDatabase": "Suggested database for project 1.",
      "suggestedCloud": "Suggested cloud for project 1.",
      "suggestedDashboard": "Suggested dashboard for project 1."
    }
    // ... more enhanced projects ...
  ]
}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro', // Using a more capable model for complex reasoning
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'AI-generated professional summary.',
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'AI-generated list of skills.',
            },
            enhancedProjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  companyName: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING }, // Original
                  responsibilities: { type: Type.STRING }, // Original
                  tools: { type: Type.STRING }, // Original
                  enhancedDescription: { type: Type.STRING },
                  enhancedResponsibilities: { type: Type.STRING },
                  enhancedTools: { type: Type.STRING },
                  suggestedDatabase: { type: Type.STRING },
                  suggestedCloud: { type: Type.STRING },
                  suggestedDashboard: { type: Type.STRING },
                },
                required: ['id', 'companyName', 'location', 'startDate', 'endDate', 'role', 'description', 'responsibilities', 'tools', 'enhancedDescription', 'enhancedResponsibilities', 'enhancedTools', 'suggestedDatabase', 'suggestedCloud', 'suggestedDashboard'],
              },
            },
          },
          required: ['summary', 'skills', 'enhancedProjects'],
        },
      },
    });

    const jsonStr = response.text.trim();
    //console.log("Gemini Response JSON:", jsonStr); // Debugging
    return JSON.parse(jsonStr) as GeminiTailoredResumeResponse;

  } catch (error: any) {
    console.error('Error generating tailored resume with Gemini:', error);
    let errorMessage = 'Failed to generate tailored resume.';

    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('API_KEY') || error.message.includes('invalid') || error.message.includes('not found')) {
        errorMessage = 'API Key is invalid or not configured. Please enter a valid API Key.';
      } else {
        errorMessage += ` Details: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Extracts structured resume data from raw text using the Gemini API.
 *
 * @param apiKey The Google Gemini API key.
 * @param rawResumeText The plain text content of a resume.
 * @returns A promise that resolves to a ResumeExtractionResponse object.
 */
export async function extractResumeData(
  apiKey: string,
  rawResumeText: string
): Promise<ResumeExtractionResponse> {
  
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey });

  if (!rawResumeText || rawResumeText.trim() === '') {
    throw new Error("Resume text cannot be empty for extraction.");
  }

  const prompt = `As an expert resume parser, your task is to extract structured information from the following raw resume text. Identify personal information, education, all work experiences as 'projects', skills, and a summary.

For projects, infer missing details like location, dates, or tools if not explicitly stated, but prioritize accuracy from the text. For skills, provide a concise list of technologies, tools, and soft skills. The summary should be concise and reflective of the resume content.

Raw Resume Text:
${rawResumeText}

Please provide the output as a single JSON object with the following structure. Use YYYY-MM-DD for dates if specific days are available, otherwise YYYY-MM or YYYY. If a date is "Present", represent the endDate as an empty string. If GPA/Grade is not found, use an empty string.

{
  "personalInfo": {
    "name": "Full Name",
    "phoneNumber": "Phone Number",
    "email": "Email Address",
    "linkedin": "LinkedIn Profile URL",
    "portfolio": "Portfolio/Website URL (if any, otherwise empty string)"
  },
  "education": [
    {
      "id": "unique-id-for-edu1",
      "degree": "Degree Name",
      "university": "University Name",
      "location": "City, State",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA or Grade"
    }
  ],
  "projects": [
    {
      "id": "unique-id-for-proj1",
      "companyName": "Company Name (if applicable, else empty)",
      "location": "City, State",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "role": "Role/Title in Project",
      "description": "Brief description of the project",
      "responsibilities": "Bullet points of responsibilities, separated by \\n",
      "tools": "Comma-separated tools used"
    }
  ],
  "summary": "Concise professional summary (2-5 sentences).",
  "skills": [
    "Skill 1",
    "Skill 2",
    "Skill 3"
  ]
}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                phoneNumber: { type: Type.STRING },
                email: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                portfolio: { type: Type.STRING },
              },
              required: ['name', 'phoneNumber', 'email', 'linkedin', 'portfolio'],
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  university: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  gpa: { type: Type.STRING },
                },
                required: ['id', 'degree', 'university', 'location', 'startDate', 'endDate', 'gpa'],
              },
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  companyName: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING },
                  responsibilities: { type: Type.STRING },
                  tools: { type: Type.STRING },
                },
                required: ['id', 'companyName', 'location', 'startDate', 'endDate', 'role', 'description', 'responsibilities', 'tools'],
              },
            },
            summary: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['personalInfo', 'education', 'projects', 'summary', 'skills'],
        },
      },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as ResumeExtractionResponse;

  } catch (error: any) {
    console.error('Error extracting resume data with Gemini:', error);
    let errorMessage = 'Failed to extract resume data.';
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('API_KEY') || error.message.includes('invalid') || error.message.includes('not found')) {
        errorMessage = 'API Key is invalid or not configured. Please enter a valid API Key.';
      } else {
        errorMessage += ` Details: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Analyzes the match between a resume and a job description.
 *
 * @param apiKey The Google Gemini API key.
 * @param resumeData The user's current resume data.
 * @param jobDescription The job description to compare against.
 * @returns A promise that resolves to a match analysis object.
 */
export async function analyzeResumeJobMatch(
  apiKey: string,
  resumeData: ResumeData,
  jobDescription: string
): Promise<GeminiMatchAnalysisResponse> {
  if (!apiKey) {
    throw new Error("API Key is not configured.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey });

  if (!jobDescription || jobDescription.trim() === '') {
    throw new Error("Job description cannot be empty for analysis.");
  }

  const projectsForPrompt = resumeData.projects.map(p => ({
    id: p.id,
    name: `${p.role} at ${p.companyName || 'Personal Project'}`,
    description: p.description,
    responsibilities: p.responsibilities,
    tools: p.tools,
  }));

  const prompt = `As an expert career coach and recruiter, your task is to analyze the following resume against the provided job description. Provide a detailed analysis including a match percentage, a summary of the match, a list of missing keywords, and specific, actionable improvement suggestions for each project.

Here is the candidate's resume data (note the project IDs):
${JSON.stringify({
  summary: resumeData.summary,
  skills: resumeData.skills,
  projects: projectsForPrompt,
})}

Here is the Job Description to analyze against:
${jobDescription}

Please provide the output as a single JSON object with the following structure. It is crucial that you return the correct 'projectId' for each improvement suggestion.

{
  "matchPercentage": "A number between 0 and 100 representing the match score.",
  "matchSummary": "A concise summary (2-3 sentences) explaining the match score and highlighting key strengths and weaknesses of the resume for this specific job.",
  "missingKeywords": [
    "A list of critical keywords, skills, or technologies from the job description that are missing from the resume."
  ],
  "improvementSuggestions": [
    {
      "projectId": "The ID of the project this suggestion applies to (e.g., 'proj-1').",
      "projectName": "The name of the project for display (e.g., 'Software Engineer at ABC Corp').",
      "suggestion": "A specific, actionable suggestion on how to rephrase or add details to this project's description or responsibilities to better align with the job description."
    }
  ]
}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchPercentage: { type: Type.NUMBER },
            matchSummary: { type: Type.STRING },
            missingKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvementSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  projectId: { type: Type.STRING },
                  projectName: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ['projectId', 'projectName', 'suggestion'],
              },
            },
          },
          required: ['matchPercentage', 'matchSummary', 'missingKeywords', 'improvementSuggestions'],
        },
      },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as GeminiMatchAnalysisResponse;
  } catch (error: any) {
    console.error('Error analyzing resume-job match with Gemini:', error);
    let errorMessage = 'Failed to analyze resume match.';
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('API_KEY') || error.message.includes('invalid') || error.message.includes('not found')) {
        errorMessage = 'API Key is invalid or not configured. Please enter a valid API Key.';
      } else {
        errorMessage += ` Details: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
}
