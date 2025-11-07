import React, { useState } from 'react';
import { Profile } from '../types';
import Button from './Button';
import InputField from './InputField';

interface ProfileSelectorProps {
  profiles: Profile[];
  currentProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onNewProfile: () => void;
  onUpdateProfileName: (id: string, newName: string) => void;
  onDeleteProfile: (id: string) => void;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  currentProfileId,
  onSelectProfile,
  onNewProfile,
  onUpdateProfileName,
  onDeleteProfile,
}) => {
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState<string>('');

  const handleEditClick = (id: string, currentName: string) => {
    setEditingProfileId(id);
    setNewProfileName(currentName);
  };

  const handleSaveName = (id: string) => {
    if (newProfileName.trim() && newProfileName !== profiles.find(p => p.id === id)?.name) {
      onUpdateProfileName(id, newProfileName.trim());
    }
    setEditingProfileId(null);
    setNewProfileName('');
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-lg mb-6 sticky top-4 z-10">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 border-b pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 sm:mb-0">Manage Profiles</h2>
        <Button onClick={onNewProfile}>
          Create New Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`flex flex-col p-4 border rounded-md shadow-sm transition-all duration-200
                        ${profile.id === currentProfileId ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
          >
            {editingProfileId === profile.id ? (
              <div className="flex items-center space-x-2">
                <InputField
                  id={`edit-profile-name-${profile.id}`}
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName(profile.id);
                    if (e.key === 'Escape') setEditingProfileId(null);
                  }}
                />
                <Button variant="primary" size="sm" onClick={() => handleSaveName(profile.id)}>
                  Save
                </Button>
              </div>
            ) : (
              <h3 className={`font-medium ${profile.id === currentProfileId ? 'text-indigo-800' : 'text-gray-800'}`}>
                {profile.name}
              </h3>
            )}
            <div className="flex justify-end gap-2 mt-3 text-sm">
              <Button
                variant={profile.id === currentProfileId ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onSelectProfile(profile.id)}
                disabled={profile.id === currentProfileId}
              >
                {profile.id === currentProfileId ? 'Current' : 'Select'}
              </Button>
              {editingProfileId !== profile.id && (
                <>
                  <Button variant="secondary" size="sm" onClick={() => handleEditClick(profile.id, profile.name)}>
                    Edit Name
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDeleteProfile(profile.id)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileSelector;