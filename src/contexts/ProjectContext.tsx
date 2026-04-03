import { createContext, useContext, useState } from 'react';

interface ProjectTheme {
  color: string;
  name: string;
}

interface ProjectContextValue {
  project: ProjectTheme | null;
  setProject: (theme: ProjectTheme | null) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  project: null,
  setProject: () => {},
});

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<ProjectTheme | null>(null);
  return (
    <ProjectContext.Provider value={{ project, setProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
