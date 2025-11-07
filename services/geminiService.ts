import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Project, GeminiEnhancementResponse, ResumeData, GeminiTailoredResumeResponse, Internship, ResumeExtractionResponse, PersonalInfo, Education } from '../types';

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
 * @param project The original project details.
 * @param jobDescription An optional job description to tailor the enhancement.
 * @returns A promise that resolves to an object containing enhanced details and suggestions.
 */
export async function enhanceProject(
  project: Project,
  jobDescription: string = ''
): Promise<GeminiEnhancementResponse> {
  // Create a new GoogleGenAI instance right before making an API call
  // to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined. Please ensure it's set in your environment.");
  }

  const prompt = `As an expert resume writer and AI career coach, your task is to significantly enhance the following project details for a professional resume. Focus on making the description and responsibilities more impactful, quantifiable, and aligned with industry best practices. Additionally, identify and suggest ONE relevant database technology, ONE cloud platform, and ONE dashboard tool that would logically fit or substantially enhance this project, even if not explicitly stated by the user, to make it sound more impressive and modern for a tech resume. If any of these are already mentioned, ensure they are highlighted and potentially expanded upon.

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
      if (error.message.includes('API_KEY')) {
        errorMessage = 'API Key error. Please ensure your API_KEY is valid.';
      } else if (error.message.includes('Requested entity was not found.')) {
         // This typically happens if the API key is not selected or invalid for Veo.
         // For general models, it might indicate a different issue, but we can offer to re-select.
         errorMessage = 'API key invalid or not selected. Please re-select your API key.';
         // In a real app, you might trigger window.aistudio.openSelectKey() here.
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
 * @param resumeData The complete resume data.
 * @param jobDescription The job description to tailor the resume to.
 * @returns A promise that resolves to an object containing the tailored resume sections.
 */
export async function generateTailoredResume(
  resumeData: ResumeData,
  jobDescription: string
): Promise<GeminiTailoredResumeResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined. Please ensure it's set in your environment.");
  }
  if (!jobDescription || jobDescription.trim() === '') {
    throw new Error("Job description cannot be empty for tailoring the resume.");
  }

  // Combine projects and internship for a unified enhancement loop in the prompt
  const allExperience = [
    ...(resumeData.internship ? [{
      ...resumeData.internship,
      isInternship: true // Flag to differentiate in prompt
    }] : []),
    ...resumeData.projects
  ];

  const experienceDetailsForPrompt = allExperience.map(item => ({
    id: item.id,
    type: (item as any).isInternship ? 'Internship' : 'Project',
    companyName: item.companyName,
    location: item.location,
    startDate: item.startDate,
    endDate: item.endDate,
    role: item.role,
    description: item.description,
    responsibilities: item.responsibilities,
    tools: item.tools,
  }));

  const prompt = `As an expert resume writer and AI career coach, your task is to craft a complete, tailored resume output based on the provided user's current resume data and a specific job description.

You need to:
1.  **Generate a professional summary** (3-5 sentences) that highlights the candidate's key qualifications and career aspirations, highly relevant to the provided job description.
2.  **Generate a comprehensive list of technical skills** (as an array of strings, categorize if appropriate, e.g., "Programming Languages", "Databases", "Cloud Platforms", "Tools") derived from the user's personal projects, internship, original tools, and keywords from the job description.
3.  **Enhance each provided experience entry (projects and internship)**: For each entry, rewrite the 'description' and 'responsibilities' to be more impactful, quantifiable, and aligned with the job description. Responsibilities should be presented as bullet points, each on a new line. Suggest ONE relevant database technology, ONE cloud platform, and ONE dashboard tool that would logically fit or substantially enhance this entry, even if not explicitly explicitly stated by the user, to make it sound more impressive and modern for a tech resume. Combine original and suggested 'tools' into a single, comprehensive, comma-separated string.

Here's the current resume data (Personal Info, Education, Experience):
${JSON.stringify({
    personalInfo: resumeData.personalInfo,
    education: resumeData.education,
    experience: experienceDetailsForPrompt,
  })}

Here's the Job Description to tailor for:
${jobDescription}

Please provide the output as a single JSON object with the following structure. Ensure all original fields for projects and internship (id, companyName, location, startDate, endDate, role, description, responsibilities, tools) are included alongside their enhanced versions. The 'enhancedProjects' array should contain all enhanced project entries, and 'enhancedInternship' should contain the enhanced internship entry if an internship was provided. If no internship was provided, 'enhancedInternship' should be null.
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
      "enhancedResponsibilities": "Bullet point 1.\nBullet point 2.\nBullet point 3.",
      "enhancedTools": "Comma-separated list of original and suggested tools.",
      "suggestedDatabase": "Suggested database for project 1.",
      "suggestedCloud": "Suggested cloud for project 1.",
      "suggestedDashboard": "Suggested dashboard for project 1."
    }
    // ... more enhanced projects ...
  ],
  "enhancedInternship": {
      "id": "intern-id-1",
      "companyName": "Original Internship Company",
      "location": "Original Internship Location",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "role": "Original Internship Role",
      "description": "Original Internship Description",
      "responsibilities": "Original Internship Responsibilities",
      "tools": "Original Internship Tools",
      "enhancedDescription": "AI-enhanced description for internship, aligned with JD.",
      "enhancedResponsibilities": "Bullet point A.\nBullet point B.",
      "enhancedTools": "Comma-separated list of original and suggested internship tools.",
      "suggestedDatabase": "Suggested database for internship.",
      "suggestedCloud": "Suggested cloud for internship.",
      "suggestedDashboard": "Suggested dashboard for internship."
  }
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
            enhancedInternship: {
              type: Type.OBJECT,
              nullable: true, // Internship is optional
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
          required: ['summary', 'skills', 'enhancedProjects', 'enhancedInternship'],
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
      if (error.message.includes('API_KEY')) {
        errorMessage = 'API Key error. Please ensure your API_KEY is valid.';
      } else if (error.message.includes('Requested entity was not found.')) {
         errorMessage = 'API key invalid or not selected. Please re-select your API key.';
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
 * @param rawResumeText The plain text content of a resume.
 * @returns A promise that resolves to a ResumeExtractionResponse object.
 */
export async function extractResumeData(
  rawResumeText: string
): Promise<ResumeExtractionResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined. Please ensure it's set in your environment.");
  }
  if (!rawResumeText || rawResumeText.trim() === '') {
    throw new Error("Resume text cannot be empty for extraction.");
  }

  const prompt = `As an expert resume parser, your task is to extract structured information from the following raw resume text. Identify personal information, education, all work experiences (categorizing as either an 'internship' if clearly indicated by role or duration, or a 'project' otherwise), skills, and a summary.

If multiple similar experiences exist, structure them as projects. If there's a clear single internship, extract it into the 'internship' field; otherwise, include all work experience under 'projects'. For projects and internship, infer missing details like location, dates, or tools if not explicitly stated, but prioritize accuracy from the text. For skills, provide a concise list of technologies, tools, and soft skills. The summary should be concise and reflective of the resume content.

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
  "internship": {
    "id": "unique-id-for-internship",
    "companyName": "Internship Company Name",
    "location": "City, State",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "role": "Internship Role",
    "description": "Brief description of internship",
    "responsibilities": "Bullet points of responsibilities, separated by \\n",
    "tools": "Comma-separated tools used"
  } | null,
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
            internship: {
              type: Type.OBJECT,
              nullable: true,
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
          required: ['personalInfo', 'education', 'internship', 'projects', 'summary', 'skills'],
        },
      },
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as ResumeExtractionResponse;

  } catch (error: any) {
    console.error('Error extracting resume data with Gemini:', error);
    let errorMessage = 'Failed to extract resume data.';
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('API_KEY')) {
        errorMessage = 'API Key error. Please ensure your API_KEY is valid.';
      } else if (error.message.includes('Requested entity was not found.')) {
        errorMessage = 'API key invalid or not selected. Please re-select your API key.';
      } else {
        errorMessage += ` Details: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
}