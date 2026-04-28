import React, { useState } from 'react';
import AISettingsPanel from './AISettingsPanel';

const AISettingsPage: React.FC = () => {
  return <AISettingsPanel open={true} onClose={() => {}} embedded />;
};

export default AISettingsPage;
