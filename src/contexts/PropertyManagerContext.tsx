import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react'; // Import ReactNode as type

interface PropertyManagerContextType {
  selectedPropertyId: string | null;
  setSelectedPropertyId: (propertyId: string | null) => void;
  selectedPropertyName: string | null;
  setSelectedPropertyName: (name: string | null) => void;
  // organizationId is passed to the panel, so it can be part of the context
  // if needed by multiple child views, or passed directly.
  // For now, child views that need organizationId can get it from useAuth or props if their parent has it.
  // If we find many PM views need it, we can add it here.
  // properties: PropertyType[]; // List of properties PM manages
  // setProperties: (properties: PropertyType[]) => void;
}

const PropertyManagerContext = createContext<PropertyManagerContextType | undefined>(undefined);

export const usePropertyManagerContext = () => {
  const context = useContext(PropertyManagerContext);
  if (!context) {
    throw new Error('usePropertyManagerContext must be used within a PropertyManagerProvider');
  }
  return context;
};

interface PropertyManagerProviderProps {
  children: ReactNode;
  // initialProperties?: PropertyType[];
  initialSelectedPropertyId?: string | null;
  initialSelectedPropertyName?: string | null;
}

export const PropertyManagerProvider: React.FC<PropertyManagerProviderProps> = ({
  children,
  // initialProperties = [],
  initialSelectedPropertyId = null,
  initialSelectedPropertyName = null,
}) => {
  // const [properties, setProperties] = useState<PropertyType[]>(initialProperties);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(initialSelectedPropertyId);
  const [selectedPropertyName, setSelectedPropertyName] = useState<string | null>(initialSelectedPropertyName);

  return (
    <PropertyManagerContext.Provider
      value={{
        selectedPropertyId,
        setSelectedPropertyId,
        selectedPropertyName,
        setSelectedPropertyName,
        // properties,
        // setProperties,
      }}
    >
      {children}
    </PropertyManagerContext.Provider>
  );
};
