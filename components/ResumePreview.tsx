import React from 'react';
import { ResumeData, EnhancedProject, Education } from '../types';

interface ResumePreviewProps {
  resumeData: ResumeData;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ resumeData }) => {
  const { personalInfo, education, projects, summary, skills } = resumeData;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Present';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch (e) {
      return dateString; // Fallback for invalid date strings
    }
  };

  const renderBulletPoints = (text: string | undefined) => {
    if (!text) return null;
    return (
      <ul className="list-disc pl-5 text-gray-700 text-sm mt-1">
        {text.split('\n').map((line, index) => line.trim() && <li key={index}>{line.trim()}</li>)}
      </ul>
    );
  };

  const renderProjectDetails = (project: EnhancedProject) => (
    <div key={project.id} className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline">
        <h4 className="font-semibold text-md text-gray-800">
          {project.role} {project.companyName ? `at ${project.companyName}` : ''}
        </h4>
        <p className="text-sm text-gray-600">
          {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)} | {project.location}
        </p>
      </div>
      <p className="text-gray-700 text-sm mt-1">
        {project.enhancedDescription
          ? project.enhancedDescription
          : project.description}
      </p>
      {renderBulletPoints(
        project.enhancedResponsibilities
          ? project.enhancedResponsibilities
          : project.responsibilities
      )}
      <p className="text-gray-700 text-sm mt-1">
        <span className="font-medium">Tools:</span>{' '}
        {project.enhancedTools
          ? project.enhancedTools
          : project.tools}
        {project.suggestedDatabase &&
          ` | Database: ${project.suggestedDatabase}`}
        {project.suggestedCloud &&
          ` | Cloud: ${project.suggestedCloud}`}
        {project.suggestedDashboard &&
          ` | Dashboard: ${project.suggestedDashboard}`}
      </p>
    </div>
  );

  return (
    <div className="resume-preview p-8 bg-white shadow-xl rounded-lg border border-gray-200">
      {/* Personal Info */}
      <div className="text-center pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">{personalInfo.name || 'Your Name'}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {personalInfo.phoneNumber && <span>{personalInfo.phoneNumber} | </span>}
          {personalInfo.email && <span>{personalInfo.email} | </span>}
          {personalInfo.linkedin && (
            <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              LinkedIn
            </a>
          )}
          {personalInfo.portfolio && (
            <span className="ml-2">| <a href={personalInfo.portfolio} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              Portfolio
            </a></span>
          )}
        </p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="pb-4 mb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Summary</h2>
          <p className="text-gray-700 text-sm">{summary}</p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="pb-4 mb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Skills</h2>
          <div className="flex flex-wrap gap-2 text-sm text-gray-700">
            {skills.map((skill, index) => (
              <span key={index} className="bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="pb-4 mb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Education</h2>
          {education.map((edu: Education) => (
            <div key={edu.id} className="mb-2 last:mb-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-semibold text-md text-gray-800">{edu.degree || 'Degree'}</h3>
                <p className="text-sm text-gray-600">
                  {formatDate(edu.startDate)} &ndash; {formatDate(edu.endDate)}
                </p>
              </div>
              <p className="text-gray-700 text-sm">
                {edu.university || 'University'}, {edu.location || 'Location'}
              </p>
              {edu.gpa && <p className="text-gray-700 text-sm">GPA: {edu.gpa}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Experience / Projects */}
      {projects.length > 0 && (
        <div className="pb-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Experience & Projects</h2>
          {projects.map(renderProjectDetails)}
        </div>
      )}
    </div>
  );
};

export default ResumePreview;