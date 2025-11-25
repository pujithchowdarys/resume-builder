import React, { useRef, useState } from 'react';
import { ResumeData, EnhancedProject, Education } from '../types';
import Button from './Button';

// Declare globals from CDN scripts to satisfy TypeScript
declare const html2canvas: any;
declare const jspdf: any;

interface ResumePreviewProps {
  resumeData: ResumeData;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ resumeData }) => {
  const resumeContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { personalInfo, education, projects, summary, skills } = resumeData;

  const handleDownload = async () => {
    const element = resumeContentRef.current;
    if (!element) return;
    setIsDownloading(true);

    try {
        const { jsPDF } = jspdf;
        const canvas = await html2canvas(element, { 
            scale: 2, // Higher scale for better quality
            logging: false,
            useCORS: true,
        });
        const data = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProperties = pdf.getImageProperties(data);
        const imgWidth = imgProperties.width;
        const imgHeight = imgProperties.height;

        const ratio = imgWidth / imgHeight;
        let widthInPdf = pdfWidth;
        let heightInPdf = widthInPdf / ratio;

        // If the content is short and doesn't fill a page, don't stretch it.
        // Instead, fit it to the width and let height be proportional.
        if (heightInPdf > pdfHeight) {
            heightInPdf = pdfHeight;
            widthInPdf = heightInPdf * ratio;
        }
        
        let heightLeft = heightInPdf;
        let position = 0;

        pdf.addImage(data, 'PNG', 0, position, widthInPdf, heightInPdf);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = position - pdfHeight;
            pdf.addPage();
            pdf.addImage(data, 'PNG', 0, position, widthInPdf, heightInPdf);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`${(personalInfo.name || 'resume').replace(/\s/g, '_')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF. Please check the console for details.");
    } finally {
        setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Present';
    try {
      const date = new Date(dateString);
      // Adding timeZone to prevent off-by-one-day errors
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });
    } catch (e) {
      return dateString; // Fallback for invalid date strings
    }
  };

  const renderBulletPoints = (text: string | undefined) => {
    if (!text) return null;
    return (
      <ul className="list-disc pl-5 text-gray-700 text-sm mt-1 space-y-1">
        {text.split('\n').map((line, index) => {
            const trimmedLine = line.trim();
            // Remove any leading bullet-like characters that might be added by the AI
            const cleanLine = trimmedLine.replace(/^[-*•]\s*/, '');
            return cleanLine && <li key={index}>{cleanLine}</li>;
        })}
      </ul>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider border-b-2 border-gray-300 pb-1 mb-3">{title}</h2>
  );
  
  const renderProjectDetails = (project: EnhancedProject) => (
    <div key={project.id} className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline">
        <h4 className="font-semibold text-base text-gray-800">
          {project.role} {project.companyName ? <span className="font-normal">at {project.companyName}</span> : ''}
        </h4>
        <div className="text-right">
            <p className="text-sm text-gray-600 font-medium whitespace-nowrap">{project.location}</p>
            <p className="text-sm text-gray-600 whitespace-nowrap">
              {formatDate(project.startDate)} &ndash; {formatDate(project.endDate)}
            </p>
        </div>
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
      <p className="text-gray-700 text-sm mt-2">
        <span className="font-semibold">Tools:</span>{' '}
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
    <div className="relative">
      <div className="absolute top-6 right-6 z-10">
        <Button onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Processing...' : 'Download as PDF'}
        </Button>
      </div>
      <div ref={resumeContentRef} className="resume-preview p-12 bg-white shadow-xl rounded-lg border border-gray-200 text-sm">
        {/* Personal Info */}
        <div className="text-center pb-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{personalInfo.name || 'Your Name'}</h1>
          <p className="text-sm text-gray-600 mt-2">
            {personalInfo.phoneNumber && <span>{personalInfo.phoneNumber} &bull; </span>}
            {personalInfo.email && <span>{personalInfo.email} &bull; </span>}
            {personalInfo.linkedin && (
              <a href={personalInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                LinkedIn
              </a>
            )}
            {personalInfo.portfolio && (
              <span> &bull; <a href={personalInfo.portfolio} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                Portfolio
              </a></span>
            )}
          </p>
        </div>

        {/* Summary */}
        {summary && (
          <div className="pb-2 mb-2">
            <SectionHeader title="Summary" />
            <p className="text-gray-700 text-sm">{summary}</p>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="pb-2 mb-2">
            <SectionHeader title="Skills" />
            <div className="text-sm text-gray-700 space-y-1">
                {skills.map((skillLine, index) => {
                    const parts = skillLine.split(':');
                    if (parts.length === 2 && parts[0].trim().length < 30) { // Check for a valid category format
                        return (
                        <div key={index} className="flex">
                            <span className="font-semibold w-40 flex-shrink-0">{parts[0].trim()}</span>
                            <span>{parts[1].trim()}</span>
                        </div>
                        );
                    }
                    return <p key={index}>{skillLine}</p>; // Fallback for non-categorized skills
                })}
            </div>
          </div>
        )}

        {/* Experience / Projects */}
        {projects.length > 0 && (
          <div className="pb-2 mb-2">
            <SectionHeader title="Experience & Projects" />
            {projects.map(renderProjectDetails)}
          </div>
        )}

        {/* Education */}
        {education.length > 0 && (
          <div className="pb-2 mb-2">
            <SectionHeader title="Education" />
            {education.map((edu: Education) => (
              <div key={edu.id} className="mb-2 last:mb-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-base text-gray-800">{edu.degree || 'Degree'}</h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">{edu.location || 'Location'}</p>
                    <p className="text-sm text-gray-600">
                        {formatDate(edu.startDate)} &ndash; {formatDate(edu.endDate)}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">
                  {edu.university || 'University'}
                </p>
                {edu.gpa && <p className="text-gray-700 text-sm">GPA: {edu.gpa}</p>}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ResumePreview;
