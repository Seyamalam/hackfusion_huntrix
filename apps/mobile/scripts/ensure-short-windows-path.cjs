const cwd = process.cwd().toUpperCase();

const allowedPrefixes = ['X:\\APPS\\MOBILE', 'C:\\HF\\APPS\\MOBILE'];

if (process.platform === 'win32' && !allowedPrefixes.some((prefix) => cwd.startsWith(prefix))) {
  console.error(
    'Run this from X:\\apps\\mobile via subst or from C:\\hf\\apps\\mobile via the short junction path.',
  );
  process.exit(1);
}
