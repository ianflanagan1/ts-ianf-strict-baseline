import path from 'node:path';
import { listingJson } from '../../core/listing.ts';
import { verify, type Project } from '../../orchestrators/verify.ts';

const usage = 'Usage: ts-baseline verify [<project dir>] | rulebook';

// Runs the command `args` names, writing its output, and returns the exit code.
export async function run(args: ReadonlyArray<string>, project: Project): Promise<number> {
  const [command, dir] = args;
  if (command === 'rulebook' && args.length === 1) {
    process.stdout.write(listingJson());
    return 0;
  }
  if (command !== 'verify' || args.length > 2) {
    console.error(usage);
    return 2;
  }
  const root = path.resolve(dir ?? '.');
  const problems = await verify(project, root);
  if (problems.length === 0) {
    console.log(`ts-baseline: ${root} follows the baseline.`);
    return 0;
  }
  console.error(`ts-baseline: ${root} departs from the baseline:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  return 1;
}
