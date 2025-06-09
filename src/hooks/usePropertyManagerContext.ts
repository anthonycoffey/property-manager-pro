import { useContext } from 'react';
import { PropertyManagerContext } from '../contexts/PropertyManagerContextDefinition'; // Updated path
import type { PropertyManagerContextType } from '../contexts/PropertyManagerContextDefinition'; // Updated path

export const usePropertyManagerContext = (): PropertyManagerContextType => {
  const context = useContext(PropertyManagerContext);
  if (!context) {
    throw new Error('usePropertyManagerContext must be used within a PropertyManagerProvider');
  }
  return context;
};
