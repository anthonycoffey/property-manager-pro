import { createContext } from 'react';

export interface PropertyManagerContextType {
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

export const PropertyManagerContext = createContext<PropertyManagerContextType | undefined>(undefined);
