import React from 'react';
import Button from './Button';
import SectionHeader from './SectionHeader';

interface ResumeLengthModalProps {
  onClose: () => void;
  onSelectLength: (length: '1-page' | '2-page') => void;
}

const ResumeLengthModal: React.FC<ResumeLengthModalProps> = ({ onClose, onSelectLength }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="relative bg-white w-full max-w-md p-6 rounded-lg shadow-xl">
        <SectionHeader title="Choose Resume Length" />
        <p className="text-gray-600 mb-6">
          Select the desired length for your AI-generated resume. A concise resume is best for most applicants, while a detailed one can be useful for experienced professionals.
        </p>
        <div className="flex flex-col gap-4">
          <Button onClick={() => onSelectLength('1-page')} variant="primary" size="lg" fullWidth>
            Concise (1-Page)
          </Button>
          <Button onClick={() => onSelectLength('2-page')} variant="outline" size="lg" fullWidth>
            Detailed (2-Page)
          </Button>
        </div>
        <div className="mt-6 text-center">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumeLengthModal;
