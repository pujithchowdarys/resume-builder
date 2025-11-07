import React from 'react';
import { Project } from '../types';
import InputField from './InputField';
import TextAreaField from './TextAreaField';
import DateInput from './DateInput';
import Button from './Button';
import SectionHeader from './SectionHeader';
import { INITIAL_PROJECT } from '../constants';

interface ExperienceFormProps {
  projects: Project[];
  onUpdateProject: (project: Project) => void;
  onAddProject: () => void;
  onRemoveProject: (id: string) => void;
}

const ExperienceForm: React.FC<ExperienceFormProps> = ({
  projects,
  onUpdateProject,
  onAddProject,
  onRemoveProject,
}) => {
  const handleProjectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    id: string
  ) => {
    const { name, value } = e.target;
    onUpdateProject({ ...projects.find((proj) => proj.id === id)!, [name]: value });
  };

  return (
    <section className="mb-6 p-6 bg-white shadow-md rounded-lg">
      <SectionHeader title="Experience & Projects">
        <Button onClick={onAddProject} variant="secondary" size="sm">
          Add Project
        </Button>
      </SectionHeader>

      {projects.map((proj, index) => (
        <div key={proj.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
          <h3 className="md:col-span-2 text-lg font-semibold text-gray-800 mb-2">Project {index + 1}</h3>
          <InputField
            id={`companyName-${proj.id}`}
            label="Company Name (Optional)"
            name="companyName"
            value={proj.companyName}
            onChange={(e) => handleProjectChange(e, proj.id)}
          />
          <InputField
            id={`location-${proj.id}`}
            label="Location"
            name="location"
            value={proj.location}
            onChange={(e) => handleProjectChange(e, proj.id)}
          />
          <InputField
            id={`role-${proj.id}`}
            label="Role"
            name="role"
            value={proj.role}
            onChange={(e) => handleProjectChange(e, proj.id)}
          />
          <div className="flex flex-col md:flex-row gap-4">
            <DateInput
              id={`startDate-proj-${proj.id}`}
              label="Start Date"
              value={proj.startDate}
              onChange={(e) => handleProjectChange(e, proj.id)}
            />
            <DateInput
              id={`endDate-proj-${proj.id}`}
              label="End Date"
              value={proj.endDate}
              onChange={(e) => handleProjectChange(e, proj.id)}
            />
          </div>
          <div className="md:col-span-2">
            <TextAreaField
              id={`description-${proj.id}`}
              label="Project Description"
              name="description"
              value={proj.description}
              onChange={(e) => handleProjectChange(e, proj.id)}
              placeholder="Briefly describe the project and its goals."
            />
          </div>
          <div className="md:col-span-2">
            <TextAreaField
              id={`responsibilities-${proj.id}`}
              label="Responsibilities (One per line/bullet point)"
              name="responsibilities"
              value={proj.responsibilities}
              onChange={(e) => handleProjectChange(e, proj.id)}
              placeholder="List your key responsibilities and achievements."
            />
          </div>
          <div className="md:col-span-2">
            <InputField
              id={`tools-${proj.id}`}
              label="Tools Used (Comma separated)"
              name="tools"
              value={proj.tools}
              onChange={(e) => handleProjectChange(e, proj.id)}
              placeholder="e.g., React, Node.js, Express, MongoDB"
            />
          </div>
          <div className="md:col-span-2 text-right">
            <Button onClick={() => onRemoveProject(proj.id)} variant="danger" size="sm">
              Remove Project
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
};

export default ExperienceForm;