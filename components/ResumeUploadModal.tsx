import React, { useState } from 'react';
import Button from './Button';
import TextAreaField from './TextAreaField';
import LoadingSpinner from './LoadingSpinner';
import SectionHeader from './SectionHeader';
import { extractResumeData } from '../services/geminiService';
import { ResumeExtractionResponse } from '../types';
import InputField from './InputField';

// --- Important: Client-side PDF and DOCX parsing requires external libraries ---
// For PDF.js (pdfjs-dist):
// You would typically include it via a CDN or npm install.
// Example for CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs"></script>
// and configure the worker source: pdfjsLib.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
// For this environment, we'll simulate the import and assume it's available.
// If not using a module-based CDN, you might access it via window.pdfjsLib.
//
// For Mammoth.js:
// Similarly, include via CDN or npm install.
// Example for CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.0/mammoth.browser.min.js"></script>
// For this environment, we'll simulate the import.
// If not using a module-based CDN, you might access it via window.mammoth.
// -----------------------------------------------------------------------------------

// Placeholder for PDF.js and Mammoth imports. In a real project, ensure these are properly loaded.
// For the purpose of this exercise, we assume they are globally available or correctly imported.
declare const pdfjsLib: any; // Global access for PDF.js
declare const mammoth: any; // Global access for Mammoth.js


interface ResumeUploadModalProps {
  onClose: () => void;
  onSave: (extractedData: ResumeExtractionResponse) => void;
  isApiKeyConfigured: boolean; // New prop to indicate if API key is set
}

const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({ onClose, onSave, isApiKeyConfigured }) => {
  const [rawResumeText, setRawResumeText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [fileProcessingMessage, setFileProcessingMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileUploadError(null);
    setSelectedFileName(null);
    setRawResumeText(''); // Clear text area when a new file is selected
    setFileProcessingMessage(null);
    setError(null); // Clear any previous AI errors

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setFileProcessingMessage('Reading file...');

    try {
      const reader = new FileReader();

      if (file.type === 'text/plain') {
        reader.onload = (event) => {
          if (event.target?.result) {
            setRawResumeText(event.target.result as string);
            setFileProcessingMessage('Text file loaded successfully.');
          }
        };
        reader.onerror = () => {
          setFileUploadError('Failed to read text file.');
          setFileProcessingMessage(null);
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        if (!pdfjsLib || !pdfjsLib.getDocument) {
          setFileUploadError('PDF.js library not loaded. Cannot parse PDF files. Ensure the PDF.js CDN script is correctly linked in index.html.');
          setFileProcessingMessage(null);
          return;
        }
        // Configure workerSrc for PDF.js (important for web deployment)
        if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`; // Use a CDN path
        }

        reader.onload = async (event) => {
          if (event.target?.result) {
            setFileProcessingMessage('Extracting text from PDF...');
            try {
              const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
              let fullText = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
              }
              setRawResumeText(fullText.trim());
              setFileProcessingMessage('PDF text extracted successfully.');
            } catch (pdfError) {
              console.error('Error parsing PDF:', pdfError);
              setFileUploadError('Failed to parse PDF. It might be corrupted or encrypted.');
              setFileProcessingMessage(null);
            }
          }
        };
        reader.onerror = () => {
          setFileUploadError('Failed to read PDF file.');
          setFileProcessingMessage(null);
        };
        reader.readAsArrayBuffer(file);
      } else if (
        file.type === 'application/msword' || // .doc
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
      ) {
        if (!mammoth || !mammoth.extractRawText) {
          setFileUploadError('Mammoth.js library not loaded. Cannot parse DOC/DOCX files. Ensure the Mammoth.js CDN script is correctly linked in index.html.');
          setFileProcessingMessage(null);
          return;
        }

        reader.onload = async (event) => {
          if (event.target?.result) {
            setFileProcessingMessage('Extracting text from DOCX...');
            try {
              const result = await mammoth.extractRawText({ arrayBuffer: event.target.result });
              setRawResumeText(result.value.trim()); // The raw text
              setFileProcessingMessage('DOCX text extracted successfully.');
            } catch (docError) {
              console.error('Error parsing DOCX:', docError);
              setFileUploadError('Failed to parse DOCX. It might be corrupted or an older .doc format not fully supported.');
              setFileProcessingMessage(null);
            }
          }
        };
        reader.onerror = () => {
          setFileUploadError('Failed to read DOCX file.');
          setFileProcessingMessage(null);
        };
        reader.readAsArrayBuffer(file);
      } else {
        setFileUploadError('Unsupported file type. Please upload a .txt, .pdf, .doc, or .docx file.');
        setFileProcessingMessage(null);
      }
    } catch (err) {
      console.error('File change handler error:', err);
      setFileUploadError('An unexpected error occurred during file processing.');
      setFileProcessingMessage(null);
    }
  };

  const handleParseResume = async () => {
    if (!isApiKeyConfigured) {
      setError("API Key is not configured. Please set NEXT_PUBLIC_API_KEY environment variable.");
      return;
    }
    if (!rawResumeText.trim()) {
      setError("Please paste your resume text or upload a file to parse.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const extractedData = await extractResumeData(rawResumeText);
      onSave(extractedData);
      onClose();
    } catch (err: any) {
      console.error("Error parsing resume with AI:", err);
      setError(err.message || 'An unexpected error occurred during AI resume parsing.');
    } finally {
      setLoading(false);
    }
  };

  const parseButtonDisabled = loading || !rawResumeText.trim() || !isApiKeyConfigured;
  const parseButtonTooltip = !isApiKeyConfigured ? "API Key not configured." : "";


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="relative bg-white w-full max-w-3xl p-6 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <SectionHeader title="Upload Your Existing Resume" />
        <p className="text-gray-700 mb-4 text-sm">
          You can upload a .txt, .pdf, .doc, or .docx file, or paste your resume content directly. The AI will then structure it for you.
        </p>

        <div className="flex-grow overflow-y-auto pr-2 no-scrollbar">
          <div className="mb-4">
            <label htmlFor="resumeFile" className="block text-sm font-medium text-gray-700 mb-1">
              Upload Resume File (Optional)
            </label>
            <InputField
              id="resumeFile"
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {selectedFileName && (
              <p className="mt-1 text-sm text-gray-600">Selected file: <span className="font-medium">{selectedFileName}</span></p>
            )}
            {fileProcessingMessage && (
              <p className="mt-1 text-sm text-indigo-700 font-medium">{fileProcessingMessage}</p>
            )}
            {fileUploadError && <p className="mt-1 text-sm text-red-600">{fileUploadError}</p>}
          </div>

          <TextAreaField
            id="rawResumeText"
            label="Or Paste Resume Text Here"
            value={rawResumeText}
            onChange={(e) => setRawResumeText(e.target.value)}
            placeholder={
              selectedFileName && rawResumeText
                ? "Review and edit the extracted text before AI parsing."
                : "Paste your resume content here..."
            }
            rows={15}
            className="font-mono text-sm"
            disabled={!!fileProcessingMessage && fileProcessingMessage !== 'Text file loaded successfully.' && fileProcessingMessage !== 'PDF text extracted successfully.' && fileProcessingMessage !== 'DOCX text extracted successfully.'}
          />
        </div>

        {loading && <LoadingSpinner message="AI is parsing your resume..." />}
        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mt-4">{error}</div>}

        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleParseResume}
            disabled={parseButtonDisabled}
            variant="primary"
            title={parseButtonTooltip} // Add tooltip for disabled state
          >
            Parse Resume with AI
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumeUploadModal;