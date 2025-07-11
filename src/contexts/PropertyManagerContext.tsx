import React, { useState } from 'react'; // Removed createContext, useContext
import type { ReactNode } from 'react';
import { PropertyManagerContext } from './PropertyManagerContextDefinition'; // Import from new definition file

// PropertyManagerContextType and PropertyManagerContext are now imported

interface PropertyManagerProviderProps {
  children: ReactNode;
  // initialProperties?: PropertyType[];
  initialSelectedPropertyId?: string | null;
  initialSelectedPropertyName?: string | null;
}

export const PropertyManagerProvider: React.FC<
  PropertyManagerProviderProps
> = ({
  children,
  // initialProperties = [],
  initialSelectedPropertyId = null,
  initialSelectedPropertyName = null,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    initialSelectedPropertyId
  );
  const [selectedPropertyName, setSelectedPropertyName] = useState<
    string | null
  >(initialSelectedPropertyName);

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
