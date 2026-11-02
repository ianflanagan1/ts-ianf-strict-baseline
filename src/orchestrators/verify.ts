import { findProblems, type ProjectFacts } from '../core/findProblems.ts';

// The port for a project's files: what its configs say, as plain facts.
export interface Project {
  readonly facts: (root: string) => Promise<ProjectFacts>;
}

// Every way the project at `root` falls short of the baseline.
export async function verify(project: Project, root: string): Promise<ReadonlyArray<string>> {
  return findProblems(await project.facts(root));
}
