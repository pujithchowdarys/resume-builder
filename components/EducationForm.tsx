import React from 'react';
import { Education } from '../types';
import InputField from './InputField';
import DateInput from './DateInput';
import Button from './Button';
import SectionHeader from './SectionHeader';
import { INITIAL_EDUCATION } from '../constants';

interface EducationFormProps {
  educationList: Education[];
  onUpdateEducation: (education: Education) => void;
  onAddEducation: () => void;
  onRemoveEducation: (id: string) => void;
}

const EducationForm: React.FC<EducationFormProps> = ({
  educationList,
  onUpdateEducation,
  onAddEducation,
  onRemoveEducation,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    const { name, value } = e.target;
    onUpdateEducation({ ...educationList.find((edu) => edu.id === id)!, [name]: value });
  };

  return (
    <section className="mb-6 p-6 bg-white shadow-md rounded-lg">
      <SectionHeader title="Education">
        <Button onClick={onAddEducation} variant="secondary" size="sm">
          Add Education
        </Button>
      </SectionHeader>
      {educationList.map((edu) => (
        <div key={edu.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
          <InputField
            id={`degree-${edu.id}`}
            label="Degree"
            name="degree"
            value={edu.degree}
            onChange={(e) => handleInputChange(e, edu.id)}
            placeholder="e.g., Bachelor of Technology in Computer Science"
          />
          <InputField
            id={`university-${edu.id}`}
            label="University"
            name="university"
            value={edu.university}
            onChange={(e) => handleInputChange(e, edu.id)}
            placeholder="e.g., University of California, Berkeley"
          />
          <InputField
            id={`location-edu-${edu.id}`}
            label="Location"
            name="location"
            value={edu.location}
            onChange={(e) => handleInputChange(e, edu.id)}
            placeholder="e.g., Berkeley, CA"
          />
          <InputField
            id={`gpa-${edu.id}`}
            label="GPA/Grade"
            name="gpa"
            value={edu.gpa}
            onChange={(e) => handleInputChange(e, edu.id)}
            placeholder="e.g., 3.8/4.0 or First Class"
          />
          <DateInput
            id={`startDate-edu-${edu.id}`}
            label="Start Date"
            value={edu.startDate}
            onChange={(e) => handleInputChange(e, edu.id)}
          />
          <DateInput
            id={`endDate-edu-${edu.id}`}
            label="End Date"
            value={edu.endDate}
            onChange={(e) => handleInputChange(e, edu.id)}
          />
          <div className="md:col-span-2 text-right">
            <Button onClick={() => onRemoveEducation(edu.id)} variant="danger" size="sm">
              Remove Education
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
};

export default EducationForm;